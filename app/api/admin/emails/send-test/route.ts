import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { emailService } from '@/lib/email-service';

// Simple rate limiting (in-memory)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5; // max requests
const RATE_WINDOW = 60 * 1000; // per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];

  // Filter out old requests
  const recentRequests = requests.filter(time => now - time < RATE_WINDOW);

  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

/**
 * POST /api/admin/emails/send-test
 * Send test email with specific template
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { template, email } = body;

    if (!template || !email) {
      return NextResponse.json(
        { error: 'Template and email are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Send appropriate template
    switch (template) {
      case 'welcome':
        await emailService.sendWelcomeEmail({
          email,
          username: 'Test User',
          loginUrl: `${baseUrl}/login`,
          temporaryPassword: 'TempPass123!',
        });
        break;

      case 'password-reset':
        await emailService.sendPasswordResetEmail({
          email,
          username: 'Test User',
          resetUrl: `${baseUrl}/reset-password?token=sample-token-123`,
          expiresIn: '1 hour',
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown template: ${template}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`,
    });
  } catch (error) {
    console.error('[API] Send test email failed:', error);
    return NextResponse.json(
      { error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
