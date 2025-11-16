#!/usr/bin/env node
/**
 * Initialize locations.sqlite database
 * This creates the schema for location tracking data
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'locations.sqlite');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✓ Created data directory');
}

// Create database
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and crash resistance
db.pragma('journal_mode = WAL');
console.log('✓ Enabled WAL mode');

// Create Location table
db.exec(`
  CREATE TABLE IF NOT EXISTS Location (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp TEXT NOT NULL,
    user_id INTEGER DEFAULT 0,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    marker_label TEXT,
    display_time TEXT,
    chat_id INTEGER DEFAULT 0,
    battery INTEGER,
    speed REAL,
    created_at TEXT DEFAULT (datetime('now')),

    -- Index for fast filtering by timestamp and device
    CHECK (latitude >= -90 AND latitude <= 90),
    CHECK (longitude >= -180 AND longitude <= 180)
  );
`);
console.log('✓ Created Location table');

// Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_location_timestamp
  ON Location(timestamp DESC);

  CREATE INDEX IF NOT EXISTS idx_location_username
  ON Location(username);

  CREATE INDEX IF NOT EXISTS idx_location_user_id
  ON Location(user_id);

  CREATE INDEX IF NOT EXISTS idx_location_composite
  ON Location(user_id, username, timestamp DESC);

  -- Prevent duplicates: unique combination of timestamp, username, and coordinates
  CREATE UNIQUE INDEX IF NOT EXISTS idx_location_unique
  ON Location(timestamp, username, latitude, longitude);
`);
console.log('✓ Created indexes (including unique constraint)');

// Get stats
const count = db.prepare('SELECT COUNT(*) as count FROM Location').get();
console.log(`\n✓ Database initialized successfully!`);
console.log(`  Path: ${dbPath}`);
console.log(`  Records: ${count.count}`);
console.log(`  WAL mode: enabled`);

db.close();
