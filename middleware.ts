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

    const userRole = (session.user as any).role;

    // Define VIEWER-accessible routes (read-only)
    const viewerAllowedRoutes = [
      '/admin',           // Dashboard
      '/admin/devices',   // Devices list (read-only)
    ];

    // Check if VIEWER is accessing allowed route
    const isViewerAllowedRoute = viewerAllowedRoutes.some(route =>
      pathname === route || pathname.startsWith(route + '/')
    );

    // VIEWER can only access dashboard and devices (read-only)
    if (userRole === 'VIEWER' && !isViewerAllowedRoute) {
      const unauthorizedUrl = new URL('/unauthorized', req.url);
      unauthorizedUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(unauthorizedUrl);
    }

    // Non-ADMIN and non-VIEWER users are denied
    if (userRole !== 'ADMIN' && userRole !== 'VIEWER') {
      const unauthorizedUrl = new URL('/unauthorized', req.url);
      unauthorizedUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
