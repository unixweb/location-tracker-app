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
