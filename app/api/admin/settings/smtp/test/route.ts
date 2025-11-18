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
    try {
      await emailService.testConnection(config);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'SMTP connection failed. Please check your settings.'
        },
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
