#!/usr/bin/env node
/**
 * Test time filter logic to debug why old entries still show up
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'locations.sqlite');
const db = new Database(dbPath);

console.log('=== Time Filter Debug ===\n');

// Current time
const now = new Date();
console.log('Current time (local):', now.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }));
console.log('Current time (UTC):', now.toISOString());
console.log('SQLite now:', db.prepare("SELECT datetime('now') as now").get().now);
console.log();

// Get latest locations
const latest = db.prepare(`
  SELECT
    username,
    timestamp,
    display_time,
    datetime('now') as sqlite_now,
    julianday('now') - julianday(timestamp) as days_ago,
    (julianday('now') - julianday(timestamp)) * 24 as hours_ago
  FROM Location
  ORDER BY timestamp DESC
  LIMIT 5
`).all();

console.log('Latest 5 locations:');
latest.forEach((loc, idx) => {
  console.log(`${idx + 1}. ${loc.username} - ${loc.display_time}`);
  console.log(`   Timestamp: ${loc.timestamp}`);
  console.log(`   Hours ago: ${loc.hours_ago.toFixed(2)}`);
  console.log();
});

// Test 1 hour filter
console.log('--- Testing 1 hour filter ---');
const oneHour = db.prepare(`
  SELECT
    username,
    timestamp,
    display_time,
    (julianday('now') - julianday(timestamp)) * 24 as hours_ago
  FROM Location
  WHERE timestamp >= datetime('now', '-1 hours')
  ORDER BY timestamp DESC
`).all();

console.log(`Found ${oneHour.length} locations within last 1 hour:`);
oneHour.forEach((loc, idx) => {
  console.log(`${idx + 1}. ${loc.username} - ${loc.display_time} (${loc.hours_ago.toFixed(2)}h ago)`);
});
console.log();

// Test 6 hour filter
console.log('--- Testing 6 hour filter ---');
const sixHours = db.prepare(`
  SELECT
    username,
    timestamp,
    display_time,
    (julianday('now') - julianday(timestamp)) * 24 as hours_ago
  FROM Location
  WHERE timestamp >= datetime('now', '-6 hours')
  ORDER BY timestamp DESC
`).all();

console.log(`Found ${sixHours.length} locations within last 6 hours:`);
sixHours.forEach((loc, idx) => {
  console.log(`${idx + 1}. ${loc.username} - ${loc.display_time} (${loc.hours_ago.toFixed(2)}h ago)`);
});

db.close();
