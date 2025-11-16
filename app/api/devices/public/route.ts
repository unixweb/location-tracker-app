import { NextResponse } from "next/server";
import { deviceDb } from "@/lib/db";

// GET /api/devices/public - Public endpoint for device names and colors (no auth required)
export async function GET() {
  try {
    const devices = deviceDb.findAll();

    // Return only public information (id, name, color)
    const publicDevices = devices.map((device) => ({
      id: device.id,
      name: device.name,
      color: device.color,
    }));

    return NextResponse.json({ devices: publicDevices });
  } catch (error) {
    console.error("Error fetching public devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}
