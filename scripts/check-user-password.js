#!/usr/bin/env node
/**
 * Check user password hash in database
 * Usage: node scripts/check-user-password.js <username>
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

async function checkUserPassword(username) {
  const db = new Database(dbPath, { readonly: true });

  try {
    const user = db.prepare('SELECT * FROM User WHERE username = ?').get(username);

    if (!user) {
      console.error(`❌ User "${username}" not found`);
      process.exit(1);
    }

    console.log(`\n✓ User found: ${user.username}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email || 'N/A'}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${user.createdAt}`);
    console.log(`  Updated: ${user.updatedAt}`);
    console.log(`  Last Login: ${user.lastLoginAt || 'Never'}`);
    console.log(`\n  Password Hash: ${user.passwordHash.substring(0, 60)}...`);
    console.log(`  Hash starts with: ${user.passwordHash.substring(0, 7)}`);

    // Check if it's a valid bcrypt hash
    const isBcrypt = user.passwordHash.startsWith('$2a$') ||
                     user.passwordHash.startsWith('$2b$') ||
                     user.passwordHash.startsWith('$2y$');

    if (isBcrypt) {
      console.log(`  ✓ Hash format: Valid bcrypt hash`);

      // Extract rounds
      const rounds = parseInt(user.passwordHash.split('$')[2]);
      console.log(`  ✓ Bcrypt rounds: ${rounds}`);
    } else {
      console.log(`  ❌ Hash format: NOT a valid bcrypt hash!`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

const username = process.argv[2];
if (!username) {
  console.error('Usage: node scripts/check-user-password.js <username>');
  process.exit(1);
}

checkUserPassword(username);
