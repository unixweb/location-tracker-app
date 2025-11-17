#!/usr/bin/env node
/**
 * Test SMTP configuration and email sending
 * Usage: node scripts/test-smtp.js your-email@example.com
 */

require('dotenv').config({ path: '.env.local' });
const { emailService } = require('../lib/email-service.ts');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('Usage: node scripts/test-smtp.js your-email@example.com');
  process.exit(1);
}

async function testSMTP() {
  console.log('Testing SMTP configuration...\n');

  try {
    // Test connection
    console.log('1. Testing SMTP connection...');
    const connected = await emailService.testConnection();
    if (connected) {
      console.log('✓ SMTP connection successful\n');
    } else {
      console.error('✗ SMTP connection failed\n');
      process.exit(1);
    }

    // Test welcome email
    console.log('2. Sending test welcome email...');
    await emailService.sendWelcomeEmail({
      email: testEmail,
      username: 'Test User',
      loginUrl: 'http://localhost:3000/login',
      temporaryPassword: 'TempPass123!',
    });
    console.log('✓ Welcome email sent\n');

    // Test password reset email
    console.log('3. Sending test password reset email...');
    await emailService.sendPasswordResetEmail({
      email: testEmail,
      username: 'Test User',
      resetUrl: 'http://localhost:3000/reset-password?token=test-token-123',
      expiresIn: '1 hour',
    });
    console.log('✓ Password reset email sent\n');

    console.log('All tests passed! Check your inbox at:', testEmail);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testSMTP();
