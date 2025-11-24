/**
 * Renders React Email templates to HTML
 */
import { render } from '@react-email/components';
import WelcomeEmail from '@/emails/welcome';
import PasswordResetEmail from '@/emails/password-reset';
import MqttCredentialsEmail from '@/emails/mqtt-credentials';

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

export interface MqttCredentialsEmailData {
  deviceName: string;
  deviceId: string;
  mqttUsername: string;
  mqttPassword: string;
  brokerUrl: string;
  brokerHost?: string;
  brokerPort?: string;
}

export async function renderWelcomeEmail(data: WelcomeEmailData): Promise<string> {
  return render(WelcomeEmail(data));
}

export async function renderPasswordResetEmail(data: PasswordResetEmailData): Promise<string> {
  return render(PasswordResetEmail(data));
}

export async function renderMqttCredentialsEmail(data: MqttCredentialsEmailData): Promise<string> {
  return render(MqttCredentialsEmail(data));
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
    case 'mqtt-credentials':
      return renderMqttCredentialsEmail(data);
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}
