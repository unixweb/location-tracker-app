import { NextResponse } from 'next/server';

/**
 * GET /api/debug/env
 * Check environment variables (TEMP DEBUG - REMOVE IN PRODUCTION)
 */
export async function GET() {
  try {
    return NextResponse.json({
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET (length: ' + process.env.ENCRYPTION_KEY.length + ')' : 'NOT SET',
      SMTP_HOST: process.env.SMTP_HOST ? 'SET' : 'NOT SET',
      SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT SET',
      SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('[API] Failed to check env:', error);
    return NextResponse.json(
      { error: 'Failed to check environment' },
      { status: 500 }
    );
  }
}
