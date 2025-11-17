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
