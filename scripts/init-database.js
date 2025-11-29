#!/usr/bin/env node
/**
 * Initialize database.sqlite with User and Device tables
 * This creates the schema for authentication and device management
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'database.sqlite');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✓ Created data directory');
}

// Create database
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
console.log('✓ Enabled WAL mode');

// Create User table
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'VIEWER',
    parent_user_id TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    lastLoginAt TEXT,

    FOREIGN KEY (parent_user_id) REFERENCES User(id) ON DELETE SET NULL,
    CHECK (role IN ('ADMIN', 'VIEWER'))
  );
`);
console.log('✓ Created User table');

// Create Device table
db.exec(`
  CREATE TABLE IF NOT EXISTS Device (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    ownerId TEXT,
    isActive INTEGER DEFAULT 1,
    description TEXT,
    icon TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (ownerId) REFERENCES User(id) ON DELETE SET NULL,
    CHECK (isActive IN (0, 1))
  );
`);
console.log('✓ Created Device table');

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_user_username ON User(username);
  CREATE INDEX IF NOT EXISTS idx_device_owner ON Device(ownerId);
  CREATE INDEX IF NOT EXISTS idx_device_active ON Device(isActive);
`);
console.log('✓ Created indexes');

// Create Settings table for app configuration
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('✓ Created settings table');

// Create password reset tokens table
db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
  );
`);
console.log('✓ Created password_reset_tokens table');

// Create index for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id
  ON password_reset_tokens(user_id);
`);
console.log('✓ Created password reset tokens index');

// Create MQTT credentials table
db.exec(`
  CREATE TABLE IF NOT EXISTS mqtt_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    mqtt_username TEXT UNIQUE NOT NULL,
    mqtt_password_hash TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (device_id) REFERENCES Device(id) ON DELETE CASCADE,
    CHECK (enabled IN (0, 1))
  );
`);
console.log('✓ Created mqtt_credentials table');

// Create MQTT ACL rules table
db.exec(`
  CREATE TABLE IF NOT EXISTS mqtt_acl_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    topic_pattern TEXT NOT NULL,
    permission TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (device_id) REFERENCES Device(id) ON DELETE CASCADE,
    CHECK (permission IN ('read', 'write', 'readwrite'))
  );
`);
console.log('✓ Created mqtt_acl_rules table');

// Create MQTT sync status table
db.exec(`
  CREATE TABLE IF NOT EXISTS mqtt_sync_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    pending_changes INTEGER DEFAULT 0,
    last_sync_at TEXT,
    last_sync_status TEXT DEFAULT 'never',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    CHECK (id = 1)
  );
`);
console.log('✓ Created mqtt_sync_status table');

// Initialize mqtt_sync_status with default row
db.exec(`
  INSERT OR IGNORE INTO mqtt_sync_status (id, pending_changes, last_sync_status)
  VALUES (1, 0, 'never');
`);
console.log('✓ Initialized mqtt_sync_status');

// Create indexes for MQTT tables
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_mqtt_credentials_device_id ON mqtt_credentials(device_id);
  CREATE INDEX IF NOT EXISTS idx_mqtt_credentials_username ON mqtt_credentials(mqtt_username);
  CREATE INDEX IF NOT EXISTS idx_mqtt_acl_device_id ON mqtt_acl_rules(device_id);
`);
console.log('✓ Created MQTT indexes');

// Check if admin user exists
const existingAdmin = db.prepare('SELECT * FROM User WHERE username = ?').get('admin');

if (!existingAdmin) {
  // Create default admin user
  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO User (id, username, email, passwordHash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin-001', 'admin', 'admin@example.com', passwordHash, 'ADMIN');
  console.log('✓ Created default admin user (username: admin, password: admin123)');
} else {
  console.log('✓ Admin user already exists');
}

// Check if default devices exist
const deviceCount = db.prepare('SELECT COUNT(*) as count FROM Device').get();

if (deviceCount.count === 0) {
  // Create default devices
  db.prepare(`
    INSERT INTO Device (id, name, color, ownerId, isActive, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('10', 'Device A', '#e74c3c', null, 1, 'Default OwnTracks device');

  db.prepare(`
    INSERT INTO Device (id, name, color, ownerId, isActive, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('11', 'Device B', '#3498db', null, 1, 'Default OwnTracks device');

  console.log('✓ Created default devices (10, 11)');
} else {
  console.log(`✓ Devices already exist (${deviceCount.count} devices)`);
}

// Get stats
const userCount = db.prepare('SELECT COUNT(*) as count FROM User').get();
const activeDeviceCount = db.prepare('SELECT COUNT(*) as count FROM Device WHERE isActive = 1').get();

console.log(`\n✓ Database initialized successfully!`);
console.log(`  Path: ${dbPath}`);
console.log(`  Users: ${userCount.count}`);
console.log(`  Active Devices: ${activeDeviceCount.count}`);
console.log(`  WAL mode: enabled`);

db.close();
