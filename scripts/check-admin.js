#!/usr/bin/env node
/**
 * Check admin user and test password verification
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new Database(dbPath);

// Get admin user
const user = db.prepare('SELECT * FROM User WHERE username = ?').get('admin');

if (!user) {
  console.log('❌ Admin user not found!');
  process.exit(1);
}

console.log('Admin user found:');
console.log('  ID:', user.id);
console.log('  Username:', user.username);
console.log('  Email:', user.email);
console.log('  Role:', user.role);
console.log('  Password Hash:', user.passwordHash.substring(0, 20) + '...');

// Test password verification
const testPassword = 'admin123';
console.log('\nTesting password verification...');
console.log('  Test password:', testPassword);

try {
  const isValid = bcrypt.compareSync(testPassword, user.passwordHash);
  console.log('  Result:', isValid ? '✅ VALID' : '❌ INVALID');

  if (!isValid) {
    console.log('\n⚠️  Password verification failed!');
    console.log('Recreating admin user with fresh hash...');

    const newHash = bcrypt.hashSync(testPassword, 10);
    db.prepare('UPDATE User SET passwordHash = ? WHERE username = ?').run(newHash, 'admin');

    console.log('✅ Admin password reset successfully');
    console.log('Try logging in again with: admin / admin123');
  }
} catch (error) {
  console.log('  Error:', error.message);
}

db.close();
