import { NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { emailService } from '@/lib/email-service';

/**
 * POST /api/auth/register
 * Public user registration endpoint
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: username, email, password' },
        { status: 400 }
      );
    }

    // Username validation (at least 3 characters, alphanumeric + underscore)
    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
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

    // Password validation (at least 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = userDb.findByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Check if email already exists
    const allUsers = userDb.findAll();
    const emailExists = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with VIEWER role (new users get viewer access by default)
    const user = userDb.create({
      id: randomUUID(),
      username,
      email,
      passwordHash,
      role: 'VIEWER', // New registrations get VIEWER role
    });

    console.log('[Register] New user registered:', username);

    // Send welcome email (don't fail registration if email fails)
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await emailService.sendWelcomeEmail({
        email,
        username,
        loginUrl: `${baseUrl}/login`,
      });
      console.log('[Register] Welcome email sent to:', email);
    } catch (emailError) {
      console.error('[Register] Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Remove password hash from response
    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: safeUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again later.' },
      { status: 500 }
    );
  }
}
