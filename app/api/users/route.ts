import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { userDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// GET /api/users - List all users (admin only)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view users
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = userDb.findAll();

    // Remove password hashes from response
    const safeUsers = users.map(({ passwordHash, ...user }) => user);

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (admin only)
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create users
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, password, role } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing required fields: username, password" },
        { status: 400 }
      );
    }

    if (role && !['ADMIN', 'VIEWER'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN or VIEWER" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = userDb.findByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = userDb.create({
      id: randomUUID(),
      username,
      email: email || null,
      passwordHash,
      role: role || 'VIEWER',
    });

    // Remove password hash from response
    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
