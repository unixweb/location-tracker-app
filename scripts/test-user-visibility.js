#!/usr/bin/env node

/**
 * Test script to verify user visibility restrictions
 * - Admin can see all users including "admin"
 * - Non-admin users (like "joachim") cannot see the "admin" user
 */

const baseUrl = 'http://localhost:3001';

async function login(username, password) {
  const response = await fetch(`${baseUrl}/api/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function getUsers(cookies) {
  const response = await fetch(`${baseUrl}/api/users`, {
    headers: {
      'Cookie': cookies,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get users: ${error.error}`);
  }

  const data = await response.json();
  return data.users;
}

async function testAdminUser() {
  console.log('\n🔍 Testing with "admin" user:');
  console.log('================================');

  try {
    const cookies = await login('admin', 'admin123');
    const users = await getUsers(cookies);

    console.log(`✓ Admin can see ${users.length} user(s):`);
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });

    const hasAdminUser = users.some(u => u.username === 'admin');
    if (hasAdminUser) {
      console.log('✓ Admin can see the "admin" user ✓');
    } else {
      console.log('✗ FAIL: Admin cannot see the "admin" user');
    }
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
  }
}

async function testJoachimUser() {
  console.log('\n🔍 Testing with "joachim" user:');
  console.log('================================');

  try {
    const cookies = await login('joachim', 'joachim123');
    const users = await getUsers(cookies);

    console.log(`✓ Joachim can see ${users.length} user(s):`);
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });

    const hasAdminUser = users.some(u => u.username === 'admin');
    if (!hasAdminUser) {
      console.log('✓ Joachim cannot see the "admin" user ✓');
    } else {
      console.log('✗ FAIL: Joachim can see the "admin" user (should be hidden)');
    }
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
  }
}

async function main() {
  console.log('Testing User Visibility Restrictions');
  console.log('=====================================\n');
  console.log('Expected behavior:');
  console.log('  - Admin user can see all users including "admin"');
  console.log('  - Non-admin users (joachim) cannot see "admin" user\n');

  await testAdminUser();
  await testJoachimUser();

  console.log('\n✓ Test completed!');
}

main().catch(console.error);
