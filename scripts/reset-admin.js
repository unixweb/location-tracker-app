#!/usr/bin/env node
/**
 * Reset admin user to default state
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔄 Resetting admin user...\n');

// Delete all existing admin users
const deleted = db.prepare('DELETE FROM User WHERE username = ?').run('admin');
console.log(`Deleted ${deleted.changes} existing admin user(s)`);

// Create fresh admin user
const passwordHash = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT INTO User (id, username, email, passwordHash, role)
  VALUES (?, ?, ?, ?, ?)
`).run('admin-001', 'admin', 'admin@example.com', passwordHash, 'ADMIN');

console.log('✅ Created fresh admin user\n');

// Verify
const user = db.prepare('SELECT * FROM User WHERE username = ?').get('admin');
console.log('Admin user details:');
console.log('  ID:', user.id);
console.log('  Username:', user.username);
console.log('  Email:', user.email);
console.log('  Role:', user.role);
console.log('  Password Hash:', user.passwordHash.substring(0, 30) + '...');

// Test password
const isValid = bcrypt.compareSync('admin123', user.passwordHash);
console.log('\n✅ Password verification:', isValid ? 'PASS' : 'FAIL');

if (isValid) {
  console.log('\n🎉 Admin user reset complete!');
  console.log('Login with:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
}

db.close();
