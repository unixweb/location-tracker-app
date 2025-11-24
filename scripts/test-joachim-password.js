#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const db = new Database(dbPath);

const joachim = db.prepare('SELECT * FROM User WHERE username = ?').get('joachim');

if (!joachim) {
  console.log('❌ User "joachim" not found');
  process.exit(1);
}

console.log('Testing passwords for joachim:');

const passwords = ['joachim123', 'joachim', 'password', 'admin123'];
for (const pwd of passwords) {
  const match = bcrypt.compareSync(pwd, joachim.passwordHash);
  console.log(`  '${pwd}': ${match ? '✓ MATCH' : '✗ no match'}`);
}

db.close();
