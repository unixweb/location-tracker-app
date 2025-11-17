import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { renderEmailTemplate } from '@/lib/email-renderer';

/**
 * GET /api/admin/emails/preview?template=welcome
 * Render email template with sample data for preview
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const template = searchParams.get('template');

    if (!template) {
      return NextResponse.json(
        { error: 'Template parameter is required' },
        { status: 400 }
      );
    }

    // Sample data for each template
    const sampleData: Record<string, any> = {
      welcome: {
        username: 'John Doe',
        loginUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`,
        temporaryPassword: 'TempPass123!',
      },
      'password-reset': {
        username: 'John Doe',
        resetUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=sample-token-123`,
        expiresIn: '1 hour',
      },
    };

    if (!sampleData[template]) {
      return NextResponse.json(
        { error: `Unknown template: ${template}` },
        { status: 400 }
      );
    }

    const html = await renderEmailTemplate(template, sampleData[template]);

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[API] Email preview failed:', error);
    return NextResponse.json(
      { error: 'Failed to render email template' },
      { status: 500 }
    );
  }
}
