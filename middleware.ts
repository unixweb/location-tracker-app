import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Force Node.js runtime for SQLite compatibility
export const runtime = 'nodejs';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Check if accessing admin routes
  if (pathname.startsWith('/admin')) {
    const session = req.auth;

    // Require authentication
    if (!session?.user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Require ADMIN role for admin routes
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      // Redirect non-admin users to homepage with error
      const homeUrl = new URL('/', req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
