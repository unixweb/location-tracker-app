import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Location Tracker - POC",
  description: "MQTT Location Tracking with Admin Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
