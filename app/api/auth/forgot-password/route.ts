import { NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { passwordResetDb } from '@/lib/password-reset-db';
import { emailService } from '@/lib/email-service';

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    // Find user by email
    const users = userDb.findAll();
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // SECURITY: Always return success to prevent user enumeration
    // Even if user doesn't exist, return success but don't send email
    if (!user) {
      console.log('[ForgotPassword] Email not found, but returning success (security)');
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Create password reset token
    const token = passwordResetDb.create(user.id, 1); // 1 hour expiry

    // Send password reset email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await emailService.sendPasswordResetEmail({
        email: user.email!,
        username: user.username,
        resetUrl,
        expiresIn: '1 hour',
      });

      console.log('[ForgotPassword] Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('[ForgotPassword] Failed to send email:', emailError);
      // Don't fail the request if email fails - log and continue
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
