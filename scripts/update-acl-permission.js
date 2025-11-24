#!/usr/bin/env node
/**
 * Update ACL rule permission to readwrite
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const db = new Database(dbPath);

try {
  // Update ACL rule 11 to readwrite
  db.prepare('UPDATE mqtt_acl_rules SET permission = ? WHERE id = ?').run('readwrite', 11);

  // Mark pending changes
  db.prepare(`UPDATE mqtt_sync_status
              SET pending_changes = pending_changes + 1,
                  updated_at = datetime('now')
              WHERE id = 1`).run();

  console.log('✓ ACL rule updated to readwrite');

  const updated = db.prepare('SELECT * FROM mqtt_acl_rules WHERE id = ?').get(11);
  console.log('\nUpdated rule:');
  console.log(JSON.stringify(updated, null, 2));

} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}
