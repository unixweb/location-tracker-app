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
