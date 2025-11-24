#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const db = new Database(dbPath);

const newPassword = 'joachim123';
const passwordHash = bcrypt.hashSync(newPassword, 10);

const result = db.prepare('UPDATE User SET passwordHash = ? WHERE username = ?').run(passwordHash, 'joachim');

if (result.changes > 0) {
  console.log('✓ Password reset successfully for user "joachim"');
  console.log(`  New password: ${newPassword}`);
} else {
  console.log('❌ User "joachim" not found');
}

db.close();
