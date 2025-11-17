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
