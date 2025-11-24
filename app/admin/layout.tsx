"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const username = session?.user?.name || '';
  const isAdmin = userRole === 'ADMIN';
  const isSuperAdmin = username === 'admin';

  const allNavigation = [
    { name: "Dashboard", href: "/admin", roles: ['ADMIN', 'VIEWER'], superAdminOnly: false },
    { name: "Devices", href: "/admin/devices", roles: ['ADMIN', 'VIEWER'], superAdminOnly: false },
    { name: "MQTT Provisioning", href: "/admin/mqtt", roles: ['ADMIN'], superAdminOnly: false },
    { name: "Setup Guide", href: "/admin/setup", roles: ['ADMIN', 'VIEWER'], superAdminOnly: false },
    { name: "Users", href: "/admin/users", roles: ['ADMIN'], superAdminOnly: false },
    { name: "Settings", href: "/admin/settings", roles: ['ADMIN'], superAdminOnly: true },
    { name: "Emails", href: "/admin/emails", roles: ['ADMIN'], superAdminOnly: true },
  ];

  // Filter navigation based on user role and super admin status
  const navigation = allNavigation.filter(item => {
    const hasRole = item.roles.includes(userRole as string);
    const hasAccess = item.superAdminOnly ? isSuperAdmin : true;
    return hasRole && hasAccess;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Top row: Title + User Info + Actions */}
          <div className="flex justify-between items-center mb-3 lg:mb-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-black">
                {isAdmin ? 'Admin Panel' : 'Dashboard'}
              </h1>
            </div>
            <div className="flex gap-2 sm:gap-4 items-center">
              {/* User info */}
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600">Angemeldet als:</span>
                <span className="font-semibold text-black">{username || session?.user?.email}</span>
                {!isAdmin && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Viewer</span>
                )}
                {isAdmin && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">Admin</span>
                )}
              </div>
              {/* Actions */}
              <div className="flex gap-2 items-center border-l border-gray-300 pl-2 sm:pl-4">
                <Link
                  href="/map"
                  className="px-2 sm:px-4 py-2 text-sm text-black font-semibold hover:text-blue-600"
                >
                  Map
                </Link>
                <button
                  onClick={async () => {
                    await signOut({ redirect: false });
                    window.location.href = '/login';
                  }}
                  className="px-2 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-semibold"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Navigation row (scrollable on mobile) */}
          <nav className="flex gap-2 overflow-x-auto lg:gap-4 pb-2 lg:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
                  pathname === item.href
                    ? "bg-blue-600 text-white"
                    : "text-black hover:bg-gray-200"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
