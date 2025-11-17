import { NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { passwordResetDb } from '@/lib/password-reset-db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Password validation
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate token
    if (!passwordResetDb.isValid(token)) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Get token details
    const resetToken = passwordResetDb.findByToken(token);
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Get user
    const user = userDb.findById(resetToken.user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    userDb.update(user.id, { passwordHash });

    // Mark token as used
    passwordResetDb.markUsed(token);

    console.log('[ResetPassword] Password reset successful for user:', user.username);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/reset-password?token=xxx
 * Validate reset token (for checking if link is still valid)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const isValid = passwordResetDb.isValid(token);

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('[ResetPassword] Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}
