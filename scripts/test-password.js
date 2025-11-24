#!/usr/bin/env node
/**
 * Test if a password matches a user's stored hash
 * Usage: node scripts/test-password.js <username> <password>
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

async function testPassword(username, password) {
  const db = new Database(dbPath, { readonly: true });

  try {
    const user = db.prepare('SELECT * FROM User WHERE username = ?').get(username);

    if (!user) {
      console.error(`❌ User "${username}" not found`);
      process.exit(1);
    }

    console.log(`\n✓ User found: ${user.username}`);
    console.log(`  Testing password...`);

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (isValid) {
      console.log(`  ✅ Password is CORRECT!`);
    } else {
      console.log(`  ❌ Password is INCORRECT!`);
      console.log(`\n  Debug info:`);
      console.log(`  - Password provided: "${password}"`);
      console.log(`  - Password length: ${password.length}`);
      console.log(`  - Hash in DB: ${user.passwordHash.substring(0, 60)}...`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error('Usage: node scripts/test-password.js <username> <password>');
  process.exit(1);
}

testPassword(username, password);
