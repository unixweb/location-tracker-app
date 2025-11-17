import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { settingsDb } from '@/lib/settings-db';
import { emailService } from '@/lib/email-service';
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

    // Reset the cached transporter to use new config
    emailService.resetTransporter();

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

    // Reset the cached transporter to use env config
    emailService.resetTransporter();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to delete SMTP config:', error);
    return NextResponse.json(
      { error: 'Failed to reset SMTP configuration' },
      { status: 500 }
    );
  }
}
