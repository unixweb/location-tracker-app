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
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    lastLoginAt TEXT,

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
  `).run('10', 'Joachim Pixel', '#e74c3c', null, 1, 'Default OwnTracks device');

  db.prepare(`
    INSERT INTO Device (id, name, color, ownerId, isActive, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('11', 'Huawei Smartphone', '#3498db', null, 1, 'Default OwnTracks device');

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
