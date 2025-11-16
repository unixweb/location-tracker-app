#!/usr/bin/env node
/**
 * Add a test location via command line
 * Usage: node scripts/add-test-location.js <username> <lat> <lon>
 * Example: node scripts/add-test-location.js 10 48.1351 11.582
 */

const Database = require('better-sqlite3');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: node scripts/add-test-location.js <username> <lat> <lon> [speed] [battery]');
  console.error('Example: node scripts/add-test-location.js 10 48.1351 11.582 25 85');
  process.exit(1);
}

const [username, lat, lon, speed, battery] = args;

const dbPath = path.join(__dirname, '..', 'data', 'locations.sqlite');
const db = new Database(dbPath);

try {
  const stmt = db.prepare(`
    INSERT INTO Location (
      latitude, longitude, timestamp, user_id,
      username, display_time, battery, speed, chat_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const timestamp = now.toISOString();
  const displayTime = now.toLocaleString('de-DE');

  const result = stmt.run(
    parseFloat(lat),
    parseFloat(lon),
    timestamp,
    0,
    username,
    displayTime,
    battery ? parseInt(battery) : null,
    speed ? parseFloat(speed) : null,
    0
  );

  console.log('✓ Test location added successfully!');
  console.log(`  Username: ${username}`);
  console.log(`  Coordinates: ${lat}, ${lon}`);
  console.log(`  Timestamp: ${timestamp}`);
  if (speed) console.log(`  Speed: ${speed} km/h`);
  if (battery) console.log(`  Battery: ${battery}%`);
  console.log(`  ID: ${result.lastInsertRowid}`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
