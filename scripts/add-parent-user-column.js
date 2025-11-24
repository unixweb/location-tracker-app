#!/usr/bin/env node
/**
 * Add parent_user_id column to User table
 * This enables parent-child relationship for ADMIN -> VIEWER hierarchy
 */

const Database = require('better-sqlite3');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'database.sqlite');

console.log('Adding parent_user_id column to User table...');

const db = new Database(dbPath);

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(User)").all();
  const hasParentColumn = tableInfo.some(col => col.name === 'parent_user_id');

  if (hasParentColumn) {
    console.log('⚠ Column parent_user_id already exists, skipping...');
  } else {
    // Add parent_user_id column
    db.exec(`
      ALTER TABLE User ADD COLUMN parent_user_id TEXT;
    `);
    console.log('✓ Added parent_user_id column');

    // Create index for faster lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_parent ON User(parent_user_id);
    `);
    console.log('✓ Created index on parent_user_id');

    // Add foreign key constraint check
    // Note: SQLite doesn't enforce foreign keys on ALTER TABLE,
    // but we'll add the constraint in the application logic
    console.log('✓ Parent-child relationship enabled');
  }

  db.close();
  console.log('\n✓ Migration completed successfully!');
} catch (error) {
  console.error('Error during migration:', error);
  db.close();
  process.exit(1);
}
