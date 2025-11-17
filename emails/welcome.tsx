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
