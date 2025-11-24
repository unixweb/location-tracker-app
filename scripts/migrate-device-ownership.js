#!/usr/bin/env node
/**
 * Migrate devices with NULL ownerId to admin user
 * Usage: node scripts/migrate-device-ownership.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

function migrateDeviceOwnership() {
  const db = new Database(dbPath);

  try {
    // Find first admin user
    const adminUser = db.prepare(`
      SELECT * FROM User
      WHERE role = 'ADMIN'
      ORDER BY createdAt ASC
      LIMIT 1
    `).get();

    if (!adminUser) {
      console.error('❌ No admin user found in database');
      process.exit(1);
    }

    console.log(`✓ Admin user found: ${adminUser.username} (${adminUser.id})`);

    // Find devices with NULL ownerId
    const devicesWithoutOwner = db.prepare(`
      SELECT * FROM Device
      WHERE ownerId IS NULL
    `).all();

    console.log(`\n📊 Found ${devicesWithoutOwner.length} devices without owner`);

    if (devicesWithoutOwner.length === 0) {
      console.log('✓ All devices already have an owner');
      return;
    }

    // Update devices to assign to admin
    const updateStmt = db.prepare(`
      UPDATE Device
      SET ownerId = ?, updatedAt = datetime('now')
      WHERE ownerId IS NULL
    `);

    const result = updateStmt.run(adminUser.id);

    console.log(`\n✅ Updated ${result.changes} devices`);
    console.log(`   Assigned to: ${adminUser.username} (${adminUser.id})`);

    // Show updated devices
    const updatedDevices = db.prepare(`
      SELECT id, name, ownerId FROM Device
      WHERE ownerId = ?
    `).all(adminUser.id);

    console.log('\n📋 Devices now owned by admin:');
    updatedDevices.forEach(device => {
      console.log(`   - ${device.id}: ${device.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrateDeviceOwnership();
