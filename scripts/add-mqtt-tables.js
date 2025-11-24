#!/usr/bin/env node
/**
 * Migration script to add MQTT credentials and ACL tables
 * This extends the existing database with MQTT provisioning capabilities
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'database.sqlite');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found. Run npm run db:init:app first');
  process.exit(1);
}

// Open database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('Starting MQTT tables migration...\n');

// Create mqtt_credentials table
db.exec(`
  CREATE TABLE IF NOT EXISTS mqtt_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL UNIQUE,
    mqtt_username TEXT NOT NULL UNIQUE,
    mqtt_password_hash TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (device_id) REFERENCES Device(id) ON DELETE CASCADE,
    CHECK (enabled IN (0, 1))
  );
`);
console.log('✓ Created mqtt_credentials table');

// Create mqtt_acl_rules table
db.exec(`
  CREATE TABLE IF NOT EXISTS mqtt_acl_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    topic_pattern TEXT NOT NULL,
    permission TEXT NOT NULL CHECK(permission IN ('read', 'write', 'readwrite')),
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (device_id) REFERENCES Device(id) ON DELETE CASCADE
  );
`);
console.log('✓ Created mqtt_acl_rules table');

// Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_mqtt_credentials_device
    ON mqtt_credentials(device_id);

  CREATE INDEX IF NOT EXISTS idx_mqtt_credentials_username
    ON mqtt_credentials(mqtt_username);

  CREATE INDEX IF NOT EXISTS idx_mqtt_acl_device
    ON mqtt_acl_rules(device_id);
`);
console.log('✓ Created indexes');

// Create mqtt_sync_status table to track pending changes
db.exec(`
  CREATE TABLE IF NOT EXISTS mqtt_sync_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    pending_changes INTEGER DEFAULT 0,
    last_sync_at TEXT,
    last_sync_status TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);
console.log('✓ Created mqtt_sync_status table');

// Initialize sync status
const syncStatus = db.prepare('SELECT * FROM mqtt_sync_status WHERE id = 1').get();
if (!syncStatus) {
  db.prepare(`
    INSERT INTO mqtt_sync_status (id, pending_changes, last_sync_status)
    VALUES (1, 0, 'never_synced')
  `).run();
  console.log('✓ Initialized sync status');
} else {
  console.log('✓ Sync status already exists');
}

// Get stats
const mqttCredsCount = db.prepare('SELECT COUNT(*) as count FROM mqtt_credentials').get();
const aclRulesCount = db.prepare('SELECT COUNT(*) as count FROM mqtt_acl_rules').get();

console.log(`\n✓ MQTT tables migration completed successfully!`);
console.log(`  MQTT Credentials: ${mqttCredsCount.count}`);
console.log(`  ACL Rules: ${aclRulesCount.count}`);

db.close();
