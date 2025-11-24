#!/usr/bin/env node
/**
 * Test device access control after security fix
 * Tests that users can only see devices they own
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new Database(dbPath);

// Import the getAllowedDeviceIds logic
function getAllowedDeviceIds(userId, role, username) {
  try {
    // Super admin (username === "admin") can see ALL devices
    if (username === 'admin') {
      const allDevices = db.prepare('SELECT id FROM Device WHERE isActive = 1').all();
      return allDevices.map(d => d.id);
    }

    // VIEWER users see their parent user's devices
    if (role === 'VIEWER') {
      const user = db.prepare('SELECT parent_user_id FROM User WHERE id = ?').get(userId);
      if (user?.parent_user_id) {
        const devices = db.prepare('SELECT id FROM Device WHERE ownerId = ? AND isActive = 1').all(user.parent_user_id);
        return devices.map(d => d.id);
      }
      // If VIEWER has no parent, return empty array
      return [];
    }

    // Regular ADMIN users see only their own devices
    if (role === 'ADMIN') {
      const devices = db.prepare('SELECT id FROM Device WHERE ownerId = ? AND isActive = 1').all(userId);
      return devices.map(d => d.id);
    }

    // Default: no access
    return [];
  } catch (error) {
    console.error('Error in getAllowedDeviceIds:', error);
    return [];
  }
}

console.log('=== Device Access Control Test ===\n');

// Get all users
const users = db.prepare('SELECT id, username, role, parent_user_id FROM User').all();

// Get all devices
const allDevices = db.prepare('SELECT id, name, ownerId FROM Device WHERE isActive = 1').all();

console.log('All devices in system:');
allDevices.forEach(d => {
  console.log(`  - Device ${d.id} (${d.name}) owned by: ${d.ownerId}`);
});
console.log('');

// Test each user
users.forEach(user => {
  const allowedDevices = getAllowedDeviceIds(user.id, user.role, user.username);

  console.log(`User: ${user.username} (${user.role})`);
  console.log(`  ID: ${user.id}`);
  if (user.parent_user_id) {
    const parent = users.find(u => u.id === user.parent_user_id);
    console.log(`  Parent: ${parent?.username || 'unknown'}`);
  }
  console.log(`  Can see devices: ${allowedDevices.length > 0 ? allowedDevices.join(', ') : 'NONE'}`);

  // Show device names
  if (allowedDevices.length > 0) {
    allowedDevices.forEach(deviceId => {
      const device = allDevices.find(d => d.id === deviceId);
      console.log(`    - ${deviceId}: ${device?.name || 'unknown'}`);
    });
  }
  console.log('');
});

console.log('=== Expected Results ===');
console.log('✓ admin: Should see ALL devices (10, 11, 12, 15)');
console.log('✓ joachim: Should see only devices 12, 15 (owned by joachim)');
console.log('✓ hummel: Should see devices 12, 15 (parent joachim\'s devices)');
console.log('✓ joachiminfo: Should see NO devices (doesn\'t own any)');

db.close();
