import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/email-layout';
import { EmailHeader } from './components/email-header';
import { EmailFooter } from './components/email-footer';

interface MqttCredentialsEmailProps {
  deviceName: string;
  deviceId: string;
  mqttUsername: string;
  mqttPassword: string;
  brokerUrl: string;
  brokerHost?: string;
  brokerPort?: string;
}

export const MqttCredentialsEmail = ({
  deviceName = 'Device',
  deviceId = '10',
  mqttUsername = 'user_device10',
  mqttPassword = 'password123',
  brokerUrl = 'mqtt://localhost:1883',
  brokerHost = 'localhost',
  brokerPort = '1883',
}: MqttCredentialsEmailProps) => {
  return (
    <EmailLayout preview="MQTT Device Credentials">
      <EmailHeader title="MQTT Device Credentials" />

      <Section style={content}>
        <Text style={paragraph}>
          Your MQTT credentials for device <strong>{deviceName}</strong> (ID: {deviceId}):
        </Text>

        <Section style={credentialsBox}>
          <Text style={credentialLabel}>MQTT Broker:</Text>
          <Text style={credentialValue}>{brokerUrl}</Text>

          <Text style={credentialLabel}>Host:</Text>
          <Text style={credentialValue}>{brokerHost}</Text>

          <Text style={credentialLabel}>Port:</Text>
          <Text style={credentialValue}>{brokerPort}</Text>

          <Text style={credentialLabel}>Username:</Text>
          <Text style={credentialValue}>{mqttUsername}</Text>

          <Text style={credentialLabel}>Password:</Text>
          <Text style={credentialValue}>{mqttPassword}</Text>

          <Text style={credentialLabel}>Topic Pattern:</Text>
          <Text style={credentialValue}>owntracks/owntrack/{deviceId}</Text>
        </Section>

        <Section style={instructionsBox}>
          <Text style={instructionsTitle}>OwnTracks App Setup:</Text>

          <Text style={instructionStep}>1. Open OwnTracks app</Text>
          <Text style={instructionStep}>2. Go to Settings → Connection</Text>
          <Text style={instructionStep}>3. Set Mode to "MQTT"</Text>
          <Text style={instructionStep}>4. Enter the credentials above:</Text>
          <Text style={instructionDetail}>   • Host: {brokerHost}</Text>
          <Text style={instructionDetail}>   • Port: {brokerPort}</Text>
          <Text style={instructionDetail}>   • Username: {mqttUsername}</Text>
          <Text style={instructionDetail}>   • Password: {mqttPassword}</Text>
          <Text style={instructionDetail}>   • Device ID: {deviceId}</Text>
          <Text style={instructionStep}>5. Save settings</Text>
          <Text style={instructionStep}>6. The app will connect automatically</Text>
        </Section>

        <Text style={warningText}>
          ⚠️ Keep these credentials secure. Do not share them with unauthorized persons.
        </Text>

        <Text style={paragraph}>
          If you have any questions or need assistance, please contact your administrator.
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

export default MqttCredentialsEmail;

const content = {
  padding: '20px 40px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const credentialsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
};

const credentialLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '12px 0 4px',
};

const credentialValue = {
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  color: '#111827',
  fontSize: '14px',
  fontFamily: 'monospace',
  padding: '8px 12px',
  display: 'block',
  margin: '0 0 8px',
};

const instructionsBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
};

const instructionsTitle = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const instructionStep = {
  color: '#1e3a8a',
  fontSize: '14px',
  lineHeight: '1.8',
  margin: '4px 0',
  fontWeight: '500',
};

const instructionDetail = {
  color: '#3730a3',
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '2px 0',
  fontFamily: 'monospace',
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
