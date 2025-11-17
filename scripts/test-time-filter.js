#!/usr/bin/env node
/**
 * Test time filter logic to debug why old locations are still visible
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'locations.sqlite');
const db = new Database(dbPath, { readonly: true });

console.log('=== Current Time ===');
const nowJS = new Date();
console.log(`JavaScript Date.now(): ${nowJS.toISOString()}`);
console.log(`Local time (Europe/Berlin): ${nowJS.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);

console.log('\n=== Time Filter Test (1 Hour) ===');
const timeRangeHours = 1;
const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();
console.log(`Cutoff time (${timeRangeHours}h ago): ${cutoffTime}`);
console.log(`Cutoff local: ${new Date(cutoffTime).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);

console.log('\n=== All Locations (Last 10) ===');
const allLocations = db.prepare(`
  SELECT timestamp, username, display_time
  FROM Location
  ORDER BY timestamp DESC
  LIMIT 10
`).all();

allLocations.forEach((loc, idx) => {
  const locDate = new Date(loc.timestamp);
  const ageHours = (Date.now() - locDate.getTime()) / (1000 * 60 * 60);
  const shouldShow = loc.timestamp >= cutoffTime ? '✅ SHOW' : '❌ HIDE';
  console.log(`${idx + 1}. ${shouldShow} | ${loc.username} | ${loc.display_time} | Age: ${ageHours.toFixed(1)}h`);
});

console.log('\n=== Filtered Locations (1 Hour) ===');
const filteredLocations = db.prepare(`
  SELECT timestamp, username, display_time
  FROM Location
  WHERE timestamp >= ?
  ORDER BY timestamp DESC
  LIMIT 10
`).all(cutoffTime);

console.log(`Found ${filteredLocations.length} locations within last ${timeRangeHours} hour(s)`);
filteredLocations.forEach((loc, idx) => {
  console.log(`${idx + 1}. ${loc.username} | ${loc.display_time}`);
});

console.log('\n=== OLD SQLite Method (datetime now) ===');
const oldMethod = db.prepare(`
  SELECT COUNT(*) as count
  FROM Location
  WHERE timestamp >= datetime('now', '-1 hours')
`).get();
console.log(`OLD method (SQLite datetime): ${oldMethod.count} locations`);

console.log('\n=== NEW JavaScript Method ===');
const newMethod = db.prepare(`
  SELECT COUNT(*) as count
  FROM Location
  WHERE timestamp >= ?
`).get(cutoffTime);
console.log(`NEW method (JS Date): ${newMethod.count} locations`);

db.close();
