#!/usr/bin/env node
/**
 * Remove duplicate locations from database
 * Keeps the oldest entry for each unique (timestamp, username, lat, lon) combination
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'locations.sqlite');
const db = new Database(dbPath);

console.log('🔍 Checking for duplicates...\n');

// Get count before
const beforeCount = db.prepare('SELECT COUNT(*) as count FROM Location').get();
console.log(`Total locations before: ${beforeCount.count}`);

// Find and delete duplicates, keeping the oldest entry (lowest id)
const result = db.prepare(`
  DELETE FROM Location
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM Location
    GROUP BY timestamp, username, latitude, longitude
  )
`).run();

console.log(`\n✓ Deleted ${result.changes} duplicate records`);

// Get count after
const afterCount = db.prepare('SELECT COUNT(*) as count FROM Location').get();
console.log(`Total locations after: ${afterCount.count}`);

// Optimize database
db.exec('VACUUM');
console.log('✓ Database optimized\n');

db.close();
