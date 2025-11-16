#!/usr/bin/env node
/**
 * Cleanup old location data from locations.sqlite
 *
 * Usage:
 *   node scripts/cleanup-old-locations.js [hours]
 *
 * Examples:
 *   node scripts/cleanup-old-locations.js 168    # Delete older than 7 days
 *   node scripts/cleanup-old-locations.js 720    # Delete older than 30 days
 *
 * Default: Deletes data older than 7 days (168 hours)
 *
 * You can run this as a cron job:
 *   0 2 * * * cd /path/to/poc-app && node scripts/cleanup-old-locations.js >> /var/log/location-cleanup.log 2>&1
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'locations.sqlite');
const DEFAULT_RETENTION_HOURS = 168; // 7 days

// Get retention period from command line or use default
const retentionHours = process.argv[2]
  ? parseInt(process.argv[2], 10)
  : DEFAULT_RETENTION_HOURS;

if (isNaN(retentionHours) || retentionHours <= 0) {
  console.error('Error: Invalid retention hours. Must be a positive number.');
  process.exit(1);
}

try {
  const db = new Database(dbPath);

  // Get stats before cleanup
  const beforeCount = db.prepare('SELECT COUNT(*) as count FROM Location').get();
  const beforeSize = db.prepare("SELECT page_count * page_size / 1024 as sizeKB FROM pragma_page_count(), pragma_page_size()").get();

  console.log(`\n🗑️  Location Data Cleanup`);
  console.log(`================================`);
  console.log(`Database: ${dbPath}`);
  console.log(`Retention: ${retentionHours} hours (${Math.round(retentionHours / 24)} days)`);
  console.log(`\nBefore cleanup:`);
  console.log(`  Records: ${beforeCount.count}`);
  console.log(`  Size: ${Math.round(beforeSize.sizeKB)} KB`);

  // Delete old records
  const result = db.prepare(`
    DELETE FROM Location
    WHERE timestamp < datetime('now', '-' || ? || ' hours')
  `).run(retentionHours);

  // Optimize database (reclaim space)
  db.exec('VACUUM');
  db.exec('ANALYZE');

  // Get stats after cleanup
  const afterCount = db.prepare('SELECT COUNT(*) as count FROM Location').get();
  const afterSize = db.prepare("SELECT page_count * page_size / 1024 as sizeKB FROM pragma_page_count(), pragma_page_size()").get();

  console.log(`\nAfter cleanup:`);
  console.log(`  Records: ${afterCount.count}`);
  console.log(`  Size: ${Math.round(afterSize.sizeKB)} KB`);
  console.log(`\nResult:`);
  console.log(`  ✓ Deleted ${result.changes} old records`);
  console.log(`  ✓ Freed ${Math.round(beforeSize.sizeKB - afterSize.sizeKB)} KB`);

  db.close();
  console.log(`\n✓ Cleanup completed successfully\n`);

} catch (error) {
  console.error(`\n❌ Cleanup failed:`, error.message);
  process.exit(1);
}
