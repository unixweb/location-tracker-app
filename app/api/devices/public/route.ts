import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deviceDb, userDb } from "@/lib/db";

// GET /api/devices/public - Authenticated endpoint for device names and colors
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const username = session.user.name || '';

    // Get list of device IDs the user is allowed to access
    const allowedDeviceIds = userDb.getAllowedDeviceIds(userId, role, username);

    // Fetch all active devices
    const allDevices = deviceDb.findAll();

    // Filter to only devices the user can access
    const userDevices = allDevices.filter(device =>
      allowedDeviceIds.includes(device.id)
    );

    // Return only public information (id, name, color)
    const publicDevices = userDevices.map((device) => ({
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
