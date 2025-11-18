# SMTP Setup Guide

## Overview

This guide explains how to configure SMTP for email functionality in the Location Tracker app.

## Prerequisites

- SMTP server credentials (Gmail, SendGrid, Mailgun, etc.)
- For Gmail: App Password (not regular password)

## Configuration Methods

### Method 1: Environment Variables (Fallback)

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Generate encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Update SMTP settings in `.env.local`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM_EMAIL=noreply@example.com
   SMTP_FROM_NAME=Location Tracker
   ENCRYPTION_KEY=<generated-key-from-step-2>
   ```

### Method 2: Admin Panel (Recommended)

**IMPORTANT:** The `ENCRYPTION_KEY` environment variable is **required** for database-stored SMTP configuration. Generate and set it before using the admin panel:

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to your environment variables (e.g., .env.local)
ENCRYPTION_KEY=<generated-key>
```

Steps:
1. Ensure `ENCRYPTION_KEY` is set in your environment
2. Restart the application server to load the new environment variable
3. Log in as admin
4. Navigate to **Settings** → **SMTP Settings**
5. Fill in SMTP configuration
6. Click **Test Connection** to verify
7. Click **Save Settings**

## Provider-Specific Setup

### Gmail

1. Enable 2-Factor Authentication
2. Generate App Password:
   - Go to Google Account → Security → 2-Step Verification → App Passwords
   - Select "Mail" and generate password
3. Use generated password in SMTP_PASS

Settings:
- Host: `smtp.gmail.com`
- Port: `587`
- Secure: `false` (uses STARTTLS)

### SendGrid

Settings:
- Host: `smtp.sendgrid.net`
- Port: `587`
- Secure: `false`
- User: `apikey`
- Pass: Your SendGrid API key

### Mailgun

Settings:
- Host: `smtp.mailgun.org`
- Port: `587`
- Secure: `false`
- User: Your Mailgun SMTP username
- Pass: Your Mailgun SMTP password

## Testing

### Via Script

```bash
node scripts/test-smtp.js your-email@example.com
```

### Via Admin Panel

1. Go to **Emails** page
2. Select a template
3. Click **Send Test Email**
4. Enter your email and send

## Troubleshooting

### Connection Timeout

- Check firewall settings
- Verify port is correct (587 for STARTTLS, 465 for SSL)
- Try toggling "Use TLS/SSL" setting

### Authentication Failed

- **For Gmail:** Use App Password, not account password
  - Generate at: https://myaccount.google.com/apppasswords
  - Enable 2FA first before creating App Passwords
- Verify username and password have no trailing spaces
- Check if SMTP is enabled for your account
- **Database config users:** Ensure `ENCRYPTION_KEY` is set and server was restarted
- If using database config after upgrading, click "Reset to Defaults" and re-enter credentials

### Emails Not Received

- Check spam/junk folder
- Verify "From Email" is valid
- Check provider sending limits

## Email Templates

Available templates:
- **Welcome Email**: Sent when new user is created
- **Password Reset**: Sent when user requests password reset

Templates can be previewed in **Admin → Emails**.

## Security Notes

- Passwords stored in database are encrypted using AES-256-GCM
- ENCRYPTION_KEY must be kept secret
- Never commit `.env.local` to git
- Use environment-specific SMTP credentials
