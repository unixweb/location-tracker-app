export { auth as middleware } from "@/lib/auth";

// Force Node.js runtime for SQLite compatibility
export const runtime = 'nodejs';

export const config = {
  matcher: ["/admin/:path*"],
};
