# SMTP Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement SMTP email integration for welcome emails and password reset functionality with hybrid configuration (DB + .env fallback).

**Architecture:** Hybrid config approach with database-stored SMTP settings and .env fallback. Nodemailer for SMTP transport, React Email for templates. Encrypted password storage using AES-256-GCM. Admin panel UI for configuration and live email previews.

**Tech Stack:** Next.js 16, Nodemailer, React Email, better-sqlite3, crypto (Node.js built-in)

---

## Phase 1: Foundation & Dependencies

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install required packages**

Run:
```bash
npm install nodemailer react-email @react-email/components
npm install --save-dev @types/nodemailer
```

Expected: Packages installed successfully

**Step 2: Verify installation**

Run:
```bash
npm list nodemailer react-email
```

Expected: Shows installed versions

**Step 3: Add email dev script**

In `package.json`, add to scripts section:
```json
"email:dev": "email dev"
```

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add email dependencies (nodemailer, react-email)"
```

---

### Task 2: Extend Database Schema

**Files:**
- Modify: `scripts/init-database.js:70-116`

**Step 1: Add settings table creation**

After line 70 (after indexes creation), add:

```javascript
// Create Settings table for app configuration
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('✓ Created settings table');
```

**Step 2: Add password reset tokens table**

After the settings table creation, add:

```javascript
// Create password reset tokens table
db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
  );
`);
console.log('✓ Created password_reset_tokens table');

// Create index for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id
  ON password_reset_tokens(user_id);
`);
console.log('✓ Created password reset tokens index');
```

**Step 3: Run database migration**

```bash
npm run db:init:app
```

Expected: See "✓ Created settings table" and "✓ Created password_reset_tokens table"

**Step 4: Verify tables exist**

```bash
sqlite3 data/database.sqlite "SELECT name FROM sqlite_master WHERE type='table';"
```

Expected: Should include "settings" and "password_reset_tokens"

**Step 5: Commit**

```bash
git add scripts/init-database.js
git commit -m "feat: add settings and password_reset_tokens tables"
```

---

### Task 3: Update .env.example

**Files:**
- Modify: `.env.example:14-18`

**Step 1: Update SMTP section**

Replace the commented SMTP section (lines 15-18) with:

```env
# SMTP Configuration (Fallback when DB config is empty)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=Location Tracker

# Encryption for SMTP passwords in database
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-32-byte-hex-key-here
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example with SMTP and encryption settings"
```

---

## Phase 2: Core Email Infrastructure

### Task 4: Create Crypto Utilities

**Files:**
- Create: `lib/crypto-utils.ts`

**Step 1: Write crypto utilities**

Create file with content:

```typescript
/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for encryption
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt text using AES-256-GCM
 * Returns base64 encoded string with format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt text encrypted with encrypt()
 * Expects base64 string with format: iv:authTag:encrypted
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a random encryption key (32 bytes as hex string)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

**Step 2: Test crypto functions**

Create a test file temporarily at `test-crypto.js`:

```javascript
const { encrypt, decrypt } = require('./lib/crypto-utils.ts');

// Set test key
process.env.ENCRYPTION_KEY = require('crypto').randomBytes(32).toString('hex');

const original = 'test-password-123';
const encrypted = encrypt(original);
const decrypted = decrypt(encrypted);

console.log('Original:', original);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', original === decrypted);
```

Run: `node test-crypto.js` (optional - for manual verification)

**Step 3: Commit**

```bash
git add lib/crypto-utils.ts
git commit -m "feat: add AES-256-GCM encryption utilities for sensitive data"
```

---

### Task 5: Create SMTP Configuration Types

**Files:**
- Create: `lib/types/smtp.ts`

**Step 1: Define SMTP types**

```typescript
/**
 * SMTP Configuration types
 */

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string; // Encrypted in DB
  };
  from: {
    email: string;
    name: string;
  };
  replyTo?: string;
  timeout?: number;
}

export interface SMTPConfigResponse {
  config: SMTPConfig | null;
  source: 'database' | 'env';
}

export interface SMTPTestRequest {
  config: SMTPConfig;
  testEmail: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  description: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    name: 'welcome',
    subject: 'Welcome to Location Tracker',
    description: 'Sent when a new user is created',
  },
  {
    name: 'password-reset',
    subject: 'Password Reset Request',
    description: 'Sent when user requests password reset',
  },
];
```

**Step 2: Commit**

```bash
git add lib/types/smtp.ts
git commit -m "feat: add SMTP configuration types"
```

---

### Task 6: Create Settings Database Operations

**Files:**
- Create: `lib/settings-db.ts`

**Step 1: Write settings DB helpers**

```typescript
/**
 * Database operations for app settings
 */
import { getDb } from './db';
import { SMTPConfig } from './types/smtp';
import { encrypt, decrypt } from './crypto-utils';

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export const settingsDb = {
  /**
   * Get a setting by key
   */
  get: (key: string): Setting | null => {
    const db = getDb();
    const setting = db
      .prepare('SELECT * FROM settings WHERE key = ?')
      .get(key) as Setting | undefined;
    db.close();
    return setting || null;
  },

  /**
   * Set a setting value
   */
  set: (key: string, value: string): void => {
    const db = getDb();
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = datetime('now')`
    ).run(key, value);
    db.close();
  },

  /**
   * Delete a setting
   */
  delete: (key: string): boolean => {
    const db = getDb();
    const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    db.close();
    return result.changes > 0;
  },

  /**
   * Get SMTP config from database (password decrypted)
   */
  getSMTPConfig: (): SMTPConfig | null => {
    const setting = settingsDb.get('smtp_config');
    if (!setting) return null;

    try {
      const config = JSON.parse(setting.value) as SMTPConfig;

      // Decrypt password if present
      if (config.auth?.pass) {
        config.auth.pass = decrypt(config.auth.pass);
      }

      return config;
    } catch (error) {
      console.error('[SettingsDB] Failed to parse SMTP config:', error);
      return null;
    }
  },

  /**
   * Save SMTP config to database (password encrypted)
   */
  setSMTPConfig: (config: SMTPConfig): void => {
    // Encrypt password before saving
    const configToSave = {
      ...config,
      auth: {
        ...config.auth,
        pass: encrypt(config.auth.pass),
      },
    };

    settingsDb.set('smtp_config', JSON.stringify(configToSave));
  },
};
```

**Step 2: Commit**

```bash
git add lib/settings-db.ts
git commit -m "feat: add settings database operations with SMTP config helpers"
```

---

### Task 7: Create Password Reset Token Operations

**Files:**
- Create: `lib/password-reset-db.ts`

**Step 1: Write password reset DB helpers**

```typescript
/**
 * Database operations for password reset tokens
 */
import { getDb } from './db';
import { randomUUID } from 'crypto';

export interface PasswordResetToken {
  token: string;
  user_id: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export const passwordResetDb = {
  /**
   * Create a new password reset token
   * Returns token string
   */
  create: (userId: string, expiresInHours: number = 1): string => {
    const db = getDb();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(token, userId, expiresAt);

    db.close();
    return token;
  },

  /**
   * Get token by token string
   */
  findByToken: (token: string): PasswordResetToken | null => {
    const db = getDb();
    const result = db
      .prepare('SELECT * FROM password_reset_tokens WHERE token = ?')
      .get(token) as PasswordResetToken | undefined;
    db.close();
    return result || null;
  },

  /**
   * Validate token (exists, not used, not expired)
   */
  isValid: (token: string): boolean => {
    const resetToken = passwordResetDb.findByToken(token);
    if (!resetToken) return false;
    if (resetToken.used) return false;

    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    if (now > expiresAt) return false;

    return true;
  },

  /**
   * Mark token as used
   */
  markUsed: (token: string): boolean => {
    const db = getDb();
    const result = db
      .prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?')
      .run(token);
    db.close();
    return result.changes > 0;
  },

  /**
   * Delete expired tokens (cleanup)
   */
  deleteExpired: (): number => {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')")
      .run();
    db.close();
    return result.changes;
  },

  /**
   * Delete all tokens for a user
   */
  deleteByUserId: (userId: string): number => {
    const db = getDb();
    const result = db
      .prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')
      .run(userId);
    db.close();
    return result.changes;
  },
};
```

**Step 2: Commit**

```bash
git add lib/password-reset-db.ts
git commit -m "feat: add password reset token database operations"
```

---

## Phase 3: React Email Templates

### Task 8: Create Email Base Layout

**Files:**
- Create: `emails/components/email-layout.tsx`

**Step 1: Create base email layout**

```typescript
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>{children}</Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};
```

**Step 2: Create email header component**

Create `emails/components/email-header.tsx`:

```typescript
import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';

interface EmailHeaderProps {
  title: string;
}

export const EmailHeader = ({ title }: EmailHeaderProps) => {
  return (
    <Section style={header}>
      <Heading style={h1}>{title}</Heading>
      <Text style={subtitle}>Location Tracker</Text>
    </Section>
  );
};

const header = {
  padding: '20px 40px',
  borderBottom: '1px solid #eaeaea',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 8px',
};

const subtitle = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};
```

**Step 3: Create email footer component**

Create `emails/components/email-footer.tsx`:

```typescript
import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';

export const EmailFooter = () => {
  return (
    <>
      <Hr style={hr} />
      <Section style={footer}>
        <Text style={footerText}>
          This email was sent from Location Tracker.
        </Text>
        <Text style={footerText}>
          If you have questions, please contact your administrator.
        </Text>
      </Section>
    </>
  );
};

const hr = {
  borderColor: '#eaeaea',
  margin: '26px 0',
};

const footer = {
  padding: '0 40px',
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 8px',
};
```

**Step 4: Commit**

```bash
git add emails/components/
git commit -m "feat: add React Email base components (layout, header, footer)"
```

---

### Task 9: Create Welcome Email Template

**Files:**
- Create: `emails/welcome.tsx`

**Step 1: Write welcome email template**

```typescript
import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/email-layout';
import { EmailHeader } from './components/email-header';
import { EmailFooter } from './components/email-footer';

interface WelcomeEmailProps {
  username: string;
  loginUrl: string;
  temporaryPassword?: string;
}

export const WelcomeEmail = ({
  username = 'user',
  loginUrl = 'http://localhost:3000/login',
  temporaryPassword,
}: WelcomeEmailProps) => {
  return (
    <EmailLayout preview="Welcome to Location Tracker">
      <EmailHeader title="Welcome!" />

      <Section style={content}>
        <Text style={paragraph}>Hi {username},</Text>

        <Text style={paragraph}>
          Welcome to Location Tracker! Your account has been created and you can now access the system.
        </Text>

        {temporaryPassword && (
          <>
            <Text style={paragraph}>
              Your temporary password is: <strong style={code}>{temporaryPassword}</strong>
            </Text>
            <Text style={paragraph}>
              Please change this password after your first login for security.
            </Text>
          </>
        )}

        <Button style={button} href={loginUrl}>
          Login to Location Tracker
        </Button>

        <Text style={paragraph}>
          Or copy and paste this URL into your browser:{' '}
          <Link href={loginUrl} style={link}>
            {loginUrl}
          </Link>
        </Text>

        <Text style={paragraph}>
          If you have any questions, please contact your administrator.
        </Text>

        <Text style={paragraph}>
          Best regards,
          <br />
          Location Tracker Team
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
};

export default WelcomeEmail;

const content = {
  padding: '20px 40px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const code = {
  backgroundColor: '#f3f4f6',
  borderRadius: '4px',
  color: '#1f2937',
  fontFamily: 'monospace',
  fontSize: '14px',
  padding: '2px 6px',
};
```

**Step 2: Commit**

```bash
git add emails/welcome.tsx
git commit -m "feat: add welcome email template"
```

---

### Task 10: Create Password Reset Email Template

**Files:**
- Create: `emails/password-reset.tsx`

**Step 1: Write password reset email template**

```typescript
import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/email-layout';
import { EmailHeader } from './components/email-header';
import { EmailFooter } from './components/email-footer';

interface PasswordResetEmailProps {
  username: string;
  resetUrl: string;
  expiresIn?: string;
}

export const PasswordResetEmail = ({
  username = 'user',
  resetUrl = 'http://localhost:3000/reset-password?token=xxx',
  expiresIn = '1 hour',
}: PasswordResetEmailProps) => {
  return (
    <EmailLayout preview="Password Reset Request">
      <EmailHeader title="Password Reset" />

      <Section style={content}>
        <Text style={paragraph}>Hi {username},</Text>

        <Text style={paragraph}>
          We received a request to reset your password for your Location Tracker account.
        </Text>

        <Text style={paragraph}>
          Click the button below to reset your password:
        </Text>

        <Button style={button} href={resetUrl}>
          Reset Password
        </Button>

        <Text style={paragraph}>
          Or copy and paste this URL into your browser:{' '}
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>
        </Text>

        <Text style={warningText}>
          ⚠️ This link will expire in {expiresIn}. If you didn't request this password reset, please ignore this email or contact your administrator if you have concerns.
        </Text>

        <Text style={paragraph}>
          For security reasons, this password reset link can only be used once.
        </Text>

        <Text style={paragraph}>
          Best regards,
          <br />
          Location Tracker Team
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
};

export default PasswordResetEmail;

const content = {
  padding: '20px 40px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const warningText = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '6px',
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '20px 0',
  padding: '12px 16px',
};
```

**Step 2: Commit**

```bash
git add emails/password-reset.tsx
git commit -m "feat: add password reset email template"
```

---

## Phase 4: Email Service

### Task 11: Create Email Renderer

**Files:**
- Create: `lib/email-renderer.ts`

**Step 1: Write email renderer**

```typescript
/**
 * Renders React Email templates to HTML
 */
import { render } from '@react-email/components';
import WelcomeEmail from '@/emails/welcome';
import PasswordResetEmail from '@/emails/password-reset';

export interface WelcomeEmailData {
  username: string;
  loginUrl: string;
  temporaryPassword?: string;
}

export interface PasswordResetEmailData {
  username: string;
  resetUrl: string;
  expiresIn?: string;
}

export async function renderWelcomeEmail(data: WelcomeEmailData): Promise<string> {
  return render(WelcomeEmail(data));
}

export async function renderPasswordResetEmail(data: PasswordResetEmailData): Promise<string> {
  return render(PasswordResetEmail(data));
}

export async function renderEmailTemplate(
  template: string,
  data: any
): Promise<string> {
  switch (template) {
    case 'welcome':
      return renderWelcomeEmail(data);
    case 'password-reset':
      return renderPasswordResetEmail(data);
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}
```

**Step 2: Commit**

```bash
git add lib/email-renderer.ts
git commit -m "feat: add email renderer for React Email templates"
```

---

### Task 12: Create Email Service

**Files:**
- Create: `lib/email-service.ts`

**Step 1: Write email service (part 1 - config)**

```typescript
/**
 * Email service for sending emails via SMTP
 * Supports hybrid configuration (DB + .env fallback)
 */
import nodemailer, { Transporter } from 'nodemailer';
import { SMTPConfig } from './types/smtp';
import { settingsDb } from './settings-db';
import {
  renderWelcomeEmail,
  renderPasswordResetEmail,
  WelcomeEmailData,
  PasswordResetEmailData,
} from './email-renderer';

export class EmailService {
  private transporter: Transporter | null = null;

  /**
   * Get SMTP configuration (DB first, then .env fallback)
   */
  private async getConfig(): Promise<SMTPConfig> {
    // Try database first
    const dbConfig = settingsDb.getSMTPConfig();
    if (dbConfig) {
      console.log('[EmailService] Using SMTP config from database');
      return dbConfig;
    }

    // Fallback to environment variables
    console.log('[EmailService] Using SMTP config from environment');
    const envConfig: SMTPConfig = {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: {
        email: process.env.SMTP_FROM_EMAIL || '',
        name: process.env.SMTP_FROM_NAME || 'Location Tracker',
      },
      timeout: 10000,
    };

    // Validate env config
    if (!envConfig.host || !envConfig.auth.user || !envConfig.auth.pass) {
      throw new Error('SMTP configuration is incomplete. Please configure SMTP settings in admin panel or .env file.');
    }

    return envConfig;
  }

  /**
   * Create and configure nodemailer transporter
   */
  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const config = await this.getConfig();

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      connectionTimeout: config.timeout || 10000,
    });

    return this.transporter;
  }
```

**Step 2: Write email service (part 2 - send methods)**

Continue in same file:

```typescript
  /**
   * Send an email
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    try {
      const config = await this.getConfig();
      const transporter = await this.getTransporter();

      const info = await transporter.sendMail({
        from: `"${config.from.name}" <${config.from.email}>`,
        to,
        subject,
        html,
        replyTo: config.replyTo,
      });

      console.log('[EmailService] Email sent:', {
        messageId: info.messageId,
        to,
        subject,
      });
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(data: WelcomeEmailData & { email: string }): Promise<void> {
    const html = await renderWelcomeEmail({
      username: data.username,
      loginUrl: data.loginUrl,
      temporaryPassword: data.temporaryPassword,
    });

    await this.sendEmail(
      data.email,
      'Welcome to Location Tracker',
      html
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData & { email: string }): Promise<void> {
    const html = await renderPasswordResetEmail({
      username: data.username,
      resetUrl: data.resetUrl,
      expiresIn: data.expiresIn || '1 hour',
    });

    await this.sendEmail(
      data.email,
      'Password Reset Request - Location Tracker',
      html
    );
  }

  /**
   * Test SMTP connection
   */
  async testConnection(config?: SMTPConfig): Promise<boolean> {
    try {
      let transporter: Transporter;

      if (config) {
        // Test provided config
        transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.auth,
          connectionTimeout: config.timeout || 10000,
        });
      } else {
        // Test current config
        transporter = await this.getTransporter();
      }

      await transporter.verify();
      console.log('[EmailService] SMTP connection test successful');
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
```

**Step 3: Commit**

```bash
git add lib/email-service.ts
git commit -m "feat: add email service with SMTP support and hybrid config"
```

---

## Phase 5: Admin Panel - SMTP Settings

### Task 13: Create SMTP Settings API

**Files:**
- Create: `app/api/admin/settings/smtp/route.ts`

**Step 1: Write GET and POST handlers**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { settingsDb } from '@/lib/settings-db';
import { SMTPConfig, SMTPConfigResponse } from '@/lib/types/smtp';

/**
 * GET /api/admin/settings/smtp
 * Returns current SMTP configuration (password masked)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbConfig = settingsDb.getSMTPConfig();

    let response: SMTPConfigResponse;

    if (dbConfig) {
      // Mask password
      const maskedConfig = {
        ...dbConfig,
        auth: {
          ...dbConfig.auth,
          pass: '***',
        },
      };
      response = { config: maskedConfig, source: 'database' };
    } else {
      // Check if env config exists
      const hasEnvConfig =
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS;

      if (hasEnvConfig) {
        const envConfig: SMTPConfig = {
          host: process.env.SMTP_HOST!,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER!,
            pass: '***',
          },
          from: {
            email: process.env.SMTP_FROM_EMAIL || '',
            name: process.env.SMTP_FROM_NAME || 'Location Tracker',
          },
          replyTo: process.env.SMTP_REPLY_TO,
          timeout: 10000,
        };
        response = { config: envConfig, source: 'env' };
      } else {
        response = { config: null, source: 'env' };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Failed to get SMTP config:', error);
    return NextResponse.json(
      { error: 'Failed to get SMTP configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings/smtp
 * Save SMTP configuration to database
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const config = body.config as SMTPConfig;

    // Validation
    if (!config.host || !config.port || !config.auth?.user || !config.auth?.pass) {
      return NextResponse.json(
        { error: 'Missing required SMTP configuration fields' },
        { status: 400 }
      );
    }

    if (config.port < 1 || config.port > 65535) {
      return NextResponse.json(
        { error: 'Port must be between 1 and 65535' },
        { status: 400 }
      );
    }

    // Save to database (password will be encrypted)
    settingsDb.setSMTPConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to save SMTP config:', error);
    return NextResponse.json(
      { error: 'Failed to save SMTP configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/settings/smtp
 * Reset to environment config
 */
export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    settingsDb.delete('smtp_config');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to delete SMTP config:', error);
    return NextResponse.json(
      { error: 'Failed to reset SMTP configuration' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/admin/settings/smtp/route.ts
git commit -m "feat: add SMTP settings API endpoints"
```

---

### Task 14: Create SMTP Test API

**Files:**
- Create: `app/api/admin/settings/smtp/test/route.ts`

**Step 1: Write test endpoint**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { emailService } from '@/lib/email-service';
import { SMTPConfig } from '@/lib/types/smtp';

/**
 * POST /api/admin/settings/smtp/test
 * Test SMTP configuration by sending a test email
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config, testEmail } = body as { config?: SMTPConfig; testEmail: string };

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Test connection
    const connectionOk = await emailService.testConnection(config);
    if (!connectionOk) {
      return NextResponse.json(
        { error: 'SMTP connection failed. Please check your settings.' },
        { status: 500 }
      );
    }

    // Send test email
    try {
      await emailService.sendWelcomeEmail({
        email: testEmail,
        username: 'Test User',
        loginUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`,
        temporaryPassword: undefined,
      });

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      });
    } catch (sendError) {
      console.error('[API] Test email send failed:', sendError);
      return NextResponse.json(
        {
          error: `Email send failed: ${sendError instanceof Error ? sendError.message : 'Unknown error'}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] SMTP test failed:', error);
    return NextResponse.json(
      { error: 'SMTP test failed' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/admin/settings/smtp/test/route.ts
git commit -m "feat: add SMTP test API endpoint"
```

---

## Phase 6: Admin Panel - SMTP Settings UI

### Task 15: Create SMTP Settings Page

**Files:**
- Create: `app/admin/settings/page.tsx`

**Step 1: Write settings page (part 1 - state and fetch)**

```typescript
"use client";

import { useEffect, useState } from "react";
import { SMTPConfig, SMTPConfigResponse } from "@/lib/types/smtp";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'smtp'>('smtp');
  const [config, setConfig] = useState<SMTPConfig>({
    host: '',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
    from: { email: '', name: 'Location Tracker' },
    replyTo: '',
    timeout: 10000,
  });
  const [source, setSource] = useState<'database' | 'env'>('env');
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  // Fetch current config
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/settings/smtp');
      if (!response.ok) throw new Error('Failed to fetch config');

      const data: SMTPConfigResponse = await response.json();

      if (data.config) {
        setConfig(data.config);
        setHasPassword(data.config.auth.pass === '***');
      }
      setSource(data.source);
    } catch (error) {
      console.error('Failed to fetch SMTP config:', error);
      setMessage({ type: 'error', text: 'Failed to load SMTP configuration' });
    } finally {
      setLoading(false);
    }
  };
```

**Step 2: Write settings page (part 2 - handlers)**

Continue in same file:

```typescript
  // Save config
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      setMessage({ type: 'success', text: 'SMTP settings saved successfully' });
      setHasPassword(true);
      setSource('database');

      // Clear password field for security
      setConfig({ ...config, auth: { ...config.auth, pass: '' } });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Reset to environment defaults? This will delete database configuration.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/settings/smtp', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to reset');

      setMessage({ type: 'success', text: 'Reset to environment defaults' });
      await fetchConfig();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset settings' });
    }
  };

  // Test connection
  const handleTest = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: hasPassword ? undefined : config,
          testEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setMessage({ type: 'success', text: data.message });
      setShowTestModal(false);
      setTestEmail('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };
```

**Step 3: Write settings page (part 3 - render)**

Continue in same file:

```typescript
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Settings</h2>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('smtp')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'smtp'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            SMTP Settings
          </button>
        </nav>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Config Source Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-900">
          <strong>Current source:</strong> {source === 'database' ? 'Database (Custom)' : 'Environment (.env)'}
        </p>
      </div>

      {/* SMTP Form */}
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Host */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SMTP Host *
            </label>
            <input
              type="text"
              required
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Port and Secure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port *
              </label>
              <input
                type="number"
                required
                min="1"
                max="65535"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.secure}
                  onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Use TLS/SSL</span>
              </label>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              required
              value={config.auth.user}
              onChange={(e) => setConfig({ ...config, auth: { ...config.auth, user: e.target.value } })}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {hasPassword && '(leave empty to keep current)'}
            </label>
            <input
              type="password"
              required={!hasPassword}
              value={config.auth.pass}
              onChange={(e) => setConfig({ ...config, auth: { ...config.auth, pass: e.target.value } })}
              placeholder={hasPassword ? '••••••••' : 'your-password'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* From Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Email *
            </label>
            <input
              type="email"
              required
              value={config.from.email}
              onChange={(e) => setConfig({ ...config, from: { ...config.from, email: e.target.value } })}
              placeholder="noreply@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* From Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Name *
            </label>
            <input
              type="text"
              required
              value={config.from.name}
              onChange={(e) => setConfig({ ...config, from: { ...config.from, name: e.target.value } })}
              placeholder="Location Tracker"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reply-To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reply-To (optional)
            </label>
            <input
              type="email"
              value={config.replyTo || ''}
              onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
              placeholder="support@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeout (ms)
            </label>
            <input
              type="number"
              min="1000"
              value={config.timeout}
              onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Connection
          </button>
          {source === 'database' && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Reset to Defaults
            </button>
          )}
        </div>
      </form>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Test SMTP Connection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email address to receive a test email.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestEmail('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !testEmail}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add app/admin/settings/page.tsx
git commit -m "feat: add SMTP settings UI page"
```

---

### Task 16: Update Admin Navigation

**Files:**
- Modify: `app/admin/layout.tsx:14-18`

**Step 1: Add Settings link to navigation**

In the navigation array, add:

```typescript
const navigation = [
  { name: "Dashboard", href: "/admin" },
  { name: "Devices", href: "/admin/devices" },
  { name: "Users", href: "/admin/users" },
  { name: "Settings", href: "/admin/settings" },
];
```

**Step 2: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: add Settings to admin navigation"
```

---

## Phase 7: Email Preview & Testing

### Task 17: Create Email Preview API

**Files:**
- Create: `app/api/admin/emails/preview/route.ts`

**Step 1: Write preview endpoint**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { renderEmailTemplate } from '@/lib/email-renderer';

/**
 * GET /api/admin/emails/preview?template=welcome
 * Render email template with sample data for preview
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const template = searchParams.get('template');

    if (!template) {
      return NextResponse.json(
        { error: 'Template parameter is required' },
        { status: 400 }
      );
    }

    // Sample data for each template
    const sampleData: Record<string, any> = {
      welcome: {
        username: 'John Doe',
        loginUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`,
        temporaryPassword: 'TempPass123!',
      },
      'password-reset': {
        username: 'John Doe',
        resetUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=sample-token-123`,
        expiresIn: '1 hour',
      },
    };

    if (!sampleData[template]) {
      return NextResponse.json(
        { error: `Unknown template: ${template}` },
        { status: 400 }
      );
    }

    const html = await renderEmailTemplate(template, sampleData[template]);

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[API] Email preview failed:', error);
    return NextResponse.json(
      { error: 'Failed to render email template' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/admin/emails/preview/route.ts
git commit -m "feat: add email preview API endpoint"
```

---

### Task 18: Create Send Test Email API

**Files:**
- Create: `app/api/admin/emails/send-test/route.ts`

**Step 1: Write send test endpoint**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { emailService } from '@/lib/email-service';

// Simple rate limiting (in-memory)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5; // max requests
const RATE_WINDOW = 60 * 1000; // per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];

  // Filter out old requests
  const recentRequests = requests.filter(time => now - time < RATE_WINDOW);

  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

/**
 * POST /api/admin/emails/send-test
 * Send test email with specific template
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { template, email } = body;

    if (!template || !email) {
      return NextResponse.json(
        { error: 'Template and email are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Send appropriate template
    switch (template) {
      case 'welcome':
        await emailService.sendWelcomeEmail({
          email,
          username: 'Test User',
          loginUrl: `${baseUrl}/login`,
          temporaryPassword: 'TempPass123!',
        });
        break;

      case 'password-reset':
        await emailService.sendPasswordResetEmail({
          email,
          username: 'Test User',
          resetUrl: `${baseUrl}/reset-password?token=sample-token-123`,
          expiresIn: '1 hour',
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown template: ${template}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`,
    });
  } catch (error) {
    console.error('[API] Send test email failed:', error);
    return NextResponse.json(
      { error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/admin/emails/send-test/route.ts
git commit -m "feat: add send test email API with rate limiting"
```

---

### Task 19: Create Email Preview Page

**Files:**
- Create: `app/admin/emails/page.tsx`

**Step 1: Write emails preview page**

```typescript
"use client";

import { useState } from "react";
import { EMAIL_TEMPLATES, EmailTemplate } from "@/lib/types/smtp";

export default function EmailsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  const handleSendTest = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/emails/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          email: testEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send');
      }

      setMessage({ type: 'success', text: data.message });
      setShowSendModal(false);
      setTestEmail('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send test email' });
    } finally {
      setSending(false);
    }
  };

  const previewUrl = `/api/admin/emails/preview?template=${selectedTemplate}`;

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Email Templates</h2>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {EMAIL_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => setSelectedTemplate(template.name)}
                    className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                      selectedTemplate === template.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="font-medium">{template.subject}</p>
                    <p className={`text-sm mt-1 ${
                      selectedTemplate === template.name
                        ? 'text-blue-100'
                        : 'text-gray-600'
                    }`}>
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Send Test Button */}
          <button
            onClick={() => setShowSendModal(true)}
            className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Send Test Email
          </button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              <span className="text-sm text-gray-600">
                {EMAIL_TEMPLATES.find(t => t.name === selectedTemplate)?.subject}
              </span>
            </div>
            <div className="p-4">
              <iframe
                src={previewUrl}
                className="w-full border border-gray-300 rounded"
                style={{ height: '600px' }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Send Test Email Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Send Test Email</h3>
            <p className="text-sm text-gray-600 mb-2">
              Template: <strong>{EMAIL_TEMPLATES.find(t => t.name === selectedTemplate)?.subject}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email address to receive a test email.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setTestEmail('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sending || !testEmail}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {sending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add Emails link to navigation**

In `app/admin/layout.tsx`, update navigation:

```typescript
const navigation = [
  { name: "Dashboard", href: "/admin" },
  { name: "Devices", href: "/admin/devices" },
  { name: "Users", href: "/admin/users" },
  { name: "Settings", href: "/admin/settings" },
  { name: "Emails", href: "/admin/emails" },
];
```

**Step 3: Commit**

```bash
git add app/admin/emails/page.tsx app/admin/layout.tsx
git commit -m "feat: add email preview page with send test functionality"
```

---

## Phase 8: Password Reset Flow

### Task 20: Create Forgot Password API

**Files:**
- Create: `app/api/auth/forgot-password/route.ts`

**Step 1: Write forgot password endpoint**

```typescript
import { NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { passwordResetDb } from '@/lib/password-reset-db';
import { emailService } from '@/lib/email-service';

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Find user by email
    const users = userDb.findAll();
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // SECURITY: Always return success to prevent user enumeration
    // Even if user doesn't exist, return success but don't send email
    if (!user) {
      console.log('[ForgotPassword] Email not found, but returning success (security)');
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Create password reset token
    const token = passwordResetDb.create(user.id, 1); // 1 hour expiry

    // Send password reset email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await emailService.sendPasswordResetEmail({
        email: user.email!,
        username: user.username,
        resetUrl,
        expiresIn: '1 hour',
      });

      console.log('[ForgotPassword] Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('[ForgotPassword] Failed to send email:', emailError);
      // Don't fail the request if email fails - log and continue
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/auth/forgot-password/route.ts
git commit -m "feat: add forgot password API endpoint"
```

---

### Task 21: Create Reset Password API

**Files:**
- Create: `app/api/auth/reset-password/route.ts`

**Step 1: Write reset password endpoint**

```typescript
import { NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { passwordResetDb } from '@/lib/password-reset-db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Password validation
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate token
    if (!passwordResetDb.isValid(token)) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Get token details
    const resetToken = passwordResetDb.findByToken(token);
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Get user
    const user = userDb.findById(resetToken.user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    userDb.update(user.id, { passwordHash });

    // Mark token as used
    passwordResetDb.markUsed(token);

    console.log('[ResetPassword] Password reset successful for user:', user.username);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/reset-password?token=xxx
 * Validate reset token (for checking if link is still valid)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const isValid = passwordResetDb.isValid(token);

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('[ResetPassword] Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/auth/reset-password/route.ts
git commit -m "feat: add reset password API endpoint"
```

---

### Task 22: Create Forgot Password Page

**Files:**
- Create: `app/forgot-password/page.tsx`

**Step 1: Write forgot password page**

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              If an account exists with the email <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Forgot Password
        </h2>
        <p className="text-gray-600 mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your-email@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/forgot-password/page.tsx
git commit -m "feat: add forgot password page"
```

---

### Task 23: Create Reset Password Page

**Files:**
- Create: `app/reset-password/page.tsx`

**Step 1: Write reset password page**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
        } else {
          setError('This reset link is invalid or has expired');
        }
      } catch (err) {
        setError('Failed to validate reset link');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Validating reset link...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            <Link
              href="/forgot-password"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Request New Reset Link →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Password Reset Successful
            </h2>
            <p className="text-gray-600 mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Go to Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Reset Password
        </h2>
        <p className="text-gray-600 mb-6">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Re-enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/reset-password/page.tsx
git commit -m "feat: add reset password page"
```

---

### Task 24: Update Login Page

**Files:**
- Modify: `app/login/page.tsx`

**Step 1: Add forgot password link**

Find the login form and add a "Forgot Password?" link below the password field. Look for the password input section and add after it:

```typescript
{/* After password input field, before submit button */}
<div className="text-right mb-4">
  <Link
    href="/forgot-password"
    className="text-sm text-blue-600 hover:text-blue-700"
  >
    Forgot Password?
  </Link>
</div>
```

Don't forget to add the import at the top:

```typescript
import Link from "next/link";
```

**Step 2: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: add forgot password link to login page"
```

---

## Phase 9: Integration with User Management

### Task 25: Integrate Welcome Email in User Creation

**Files:**
- Modify: `app/api/users/route.ts:78-92`

**Step 1: Import email service**

At the top of the file, add import:

```typescript
import { emailService } from '@/lib/email-service';
```

**Step 2: Send welcome email after user creation**

After the user is created (around line 87-92), add email sending:

```typescript
// Create user
const user = userDb.create({
  id: randomUUID(),
  username,
  email: email || null,
  passwordHash,
  role: role || 'VIEWER',
});

// Send welcome email (don't fail if email fails)
if (email) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    await emailService.sendWelcomeEmail({
      email,
      username,
      loginUrl: `${baseUrl}/login`,
      temporaryPassword: password, // Send the original password
    });
    console.log('[UserCreate] Welcome email sent to:', email);
  } catch (emailError) {
    console.error('[UserCreate] Failed to send welcome email:', emailError);
    // Don't fail user creation if email fails
  }
}

// Remove password hash from response
const { passwordHash: _, ...safeUser } = user;
```

**Step 3: Commit**

```bash
git add app/api/users/route.ts
git commit -m "feat: integrate welcome email in user creation"
```

---

### Task 26: Add Manual Email Actions to Users Page

**Files:**
- Modify: `app/admin/users/page.tsx`

**Step 1: Add resend welcome email function**

After the `handleDelete` function (around line 129), add:

```typescript
// Resend welcome email
const handleResendWelcome = async (user: User) => {
  if (!user.email) {
    alert('This user has no email address');
    return;
  }

  if (!confirm(`Send welcome email to ${user.email}?`)) {
    return;
  }

  try {
    const response = await fetch('/api/admin/emails/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'welcome',
        email: user.email,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    alert('Welcome email sent successfully');
  } catch (err: any) {
    alert(err.message || 'Failed to send welcome email');
  }
};

// Send password reset
const handleSendPasswordReset = async (user: User) => {
  if (!user.email) {
    alert('This user has no email address');
    return;
  }

  if (!confirm(`Send password reset email to ${user.email}?`)) {
    return;
  }

  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    alert('Password reset email sent successfully');
  } catch (err: any) {
    alert(err.message || 'Failed to send password reset email');
  }
};
```

**Step 2: Add email action buttons to user cards**

Find the buttons section in the user card (around line 222-235) and update:

```typescript
<div className="flex gap-2">
  <button
    onClick={() => openEditModal(user)}
    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
  >
    Edit
  </button>
  <button
    onClick={() => openDeleteModal(user)}
    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
  >
    Delete
  </button>
</div>

{/* Email Actions */}
{user.email && (
  <div className="flex gap-2 mt-2">
    <button
      onClick={() => handleResendWelcome(user)}
      className="flex-1 px-3 py-2 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
    >
      📧 Resend Welcome
    </button>
    <button
      onClick={() => handleSendPasswordReset(user)}
      className="flex-1 px-3 py-2 bg-orange-600 text-white text-xs rounded-md hover:bg-orange-700"
    >
      🔑 Reset Password
    </button>
  </div>
)}
```

**Step 3: Commit**

```bash
git add app/admin/users/page.tsx
git commit -m "feat: add email action buttons to user management"
```

---

## Phase 10: Testing & Documentation

### Task 27: Create Test Script

**Files:**
- Create: `scripts/test-smtp.js`

**Step 1: Write test script**

```javascript
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
```

**Step 2: Make script executable**

```bash
chmod +x scripts/test-smtp.js
```

**Step 3: Commit**

```bash
git add scripts/test-smtp.js
git commit -m "feat: add SMTP test script"
```

---

### Task 28: Update Documentation

**Files:**
- Create: `docs/SMTP-SETUP.md`

**Step 1: Write SMTP setup guide**

```markdown
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

1. Log in as admin
2. Navigate to **Settings** → **SMTP Settings**
3. Fill in SMTP configuration
4. Click **Test Connection** to verify
5. Click **Save Settings**

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

- Verify username and password
- For Gmail: Use App Password, not account password
- Check if SMTP is enabled for your account

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
```

**Step 2: Commit**

```bash
git add docs/SMTP-SETUP.md
git commit -m "docs: add SMTP setup guide"
```

---

### Task 29: Final Integration Test

**Files:**
- N/A (Manual testing)

**Step 1: Generate encryption key**

Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output to `.env.local` as `ENCRYPTION_KEY`

**Step 2: Configure SMTP in admin panel**

1. Start dev server: `npm run dev`
2. Login as admin
3. Go to `/admin/settings`
4. Enter SMTP settings
5. Click "Test Connection"
6. If successful, click "Save Settings"

**Step 3: Test welcome email**

1. Go to `/admin/users`
2. Create new user with email address
3. Check email inbox for welcome message

**Step 4: Test password reset**

1. Logout
2. Go to `/forgot-password`
3. Enter email address
4. Check inbox for reset email
5. Click reset link
6. Enter new password
7. Login with new password

**Step 5: Test email templates**

1. Go to `/admin/emails`
2. Preview each template
3. Send test email for each template
4. Verify emails received

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: SMTP integration complete and tested"
```

---

## Completion Checklist

- [ ] All dependencies installed
- [ ] Database schema extended
- [ ] Crypto utilities working
- [ ] Email templates render correctly
- [ ] SMTP settings configurable via admin panel
- [ ] SMTP test connection works
- [ ] Welcome emails sent on user creation
- [ ] Password reset flow complete
- [ ] Email preview page functional
- [ ] Forgot password page works
- [ ] Reset password page works
- [ ] Login page has forgot password link
- [ ] User management has email actions
- [ ] Documentation complete
- [ ] All tests pass

---

## Notes

- **ENCRYPTION_KEY**: Must be 32-byte hex string (64 characters)
- **Password Storage**: Encrypted in DB, never logged
- **Email Failures**: Don't fail user creation if email fails
- **Rate Limiting**: 5 test emails per minute
- **Token Expiry**: Password reset tokens expire after 1 hour
- **Security**: Always return success on forgot password (prevent user enumeration)

## Future Enhancements

- Email queue for bulk sending
- Email templates editor in admin panel
- Email delivery tracking
- Multiple SMTP providers with failover
- Scheduled email reports
- Email preferences per user
