#!/usr/bin/env node
/**
 * Check SMTP config in database
 */

const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

console.log('Database path:', dbPath);
console.log('ENCRYPTION_KEY set:', process.env.ENCRYPTION_KEY ? 'YES (length: ' + process.env.ENCRYPTION_KEY.length + ')' : 'NO');

// Use dynamic import for better-sqlite3
const Database = require('better-sqlite3');

try {
  const db = new Database(dbPath);

  const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get('smtp_config');

  if (setting) {
    console.log('\n✓ SMTP config found in database');
    console.log('  Updated at:', setting.updated_at);
    console.log('  Value length:', setting.value.length);

    try {
      const config = JSON.parse(setting.value);
      console.log('  Host:', config.host);
      console.log('  User:', config.auth?.user);
      console.log('  Encrypted password:', config.auth?.pass?.substring(0, 50) + '...');
      console.log('  Encrypted password parts:', config.auth?.pass?.split(':').length);
    } catch (e) {
      console.log('  ✗ Failed to parse JSON:', e.message);
    }
  } else {
    console.log('\n✓ No SMTP config in database (will use .env fallback)');
  }

  db.close();
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
}
