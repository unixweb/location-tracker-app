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
  /**
   * Cached SMTP transporter instance.
   * Set to null initially and reused for subsequent emails to avoid reconnecting.
   * Call resetTransporter() when SMTP configuration changes to invalidate cache.
   */
  private transporter: Transporter | null = null;

  /**
   * Get SMTP configuration (DB first, then .env fallback)
   */
  private async getConfig(): Promise<SMTPConfig> {
    // Try database first
    const dbConfig = settingsDb.getSMTPConfig();
    if (dbConfig) {
      console.log('[EmailService] Using SMTP config from database');
      console.log('[EmailService] DB Config - Host:', dbConfig.host);
      console.log('[EmailService] DB Config - User:', dbConfig.auth.user);
      console.log('[EmailService] DB Config - Password length:', dbConfig.auth.pass?.length);
      console.log('[EmailService] DB Config - Password first 3 chars:', dbConfig.auth.pass?.substring(0, 3));
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
   * @throws Error with detailed message if connection fails
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
          auth: {
            user: config.auth.user,
            pass: config.auth.pass,
          },
          connectionTimeout: config.timeout || 10000,
        });
      } else {
        // Test current config
        transporter = await this.getTransporter();
      }

      await transporter.verify();
      console.log('[EmailService] SMTP connection test successful');
      return true;
    } catch (error: any) {
      console.error('[EmailService] SMTP connection test failed:', error);

      // Provide more helpful error messages
      if (error.code === 'EAUTH') {
        throw new Error(
          'Authentication failed. For Gmail, use an App Password (not your regular password). ' +
          'Enable 2FA and generate an App Password at: https://myaccount.google.com/apppasswords'
        );
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        throw new Error('Connection timeout. Check your host, port, and firewall settings.');
      } else if (error.code === 'ESOCKET') {
        throw new Error('Connection failed. Verify your SMTP host and port are correct.');
      } else {
        throw new Error(error.message || 'SMTP connection test failed');
      }
    }
  }

  /**
   * Reset the cached transporter (call when SMTP config changes)
   */
  resetTransporter(): void {
    this.transporter = null;
  }
}

// Export singleton instance
export const emailService = new EmailService();
