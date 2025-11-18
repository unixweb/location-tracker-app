import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deviceDb, locationDb } from "@/lib/db";

// GET /api/devices - List all devices (from database)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get devices from database
    const devices = deviceDb.findAll();

    // Fetch location data from local SQLite cache (24h history)
    const allLocations = locationDb.findMany({
      user_id: 0, // MQTT devices only
      timeRangeHours: 24, // Last 24 hours
      limit: 10000,
    });

    // Merge devices with latest location data
    const devicesWithLocation = devices.map((device) => {
      // Find all locations for this device
      const deviceLocations = allLocations.filter((loc) => loc.username === device.id);

      // Get latest location (first one, already sorted by timestamp DESC)
      const latestLocation = deviceLocations[0] || null;

      return {
        id: device.id,
        name: device.name,
        color: device.color,
        isActive: device.isActive === 1,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
        description: device.description,
        icon: device.icon,
        latestLocation: latestLocation,
        _count: {
          locations: deviceLocations.length,
        },
      };
    });

    return NextResponse.json({ devices: devicesWithLocation });
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

// POST /api/devices - Create new device (ADMIN only)
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can create devices
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, color, description, icon } = body;

    // Validation
    if (!id || !name || !color) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, color" },
        { status: 400 }
      );
    }

    // Check if device with this ID already exists
    const existing = deviceDb.findById(id);
    if (existing) {
      return NextResponse.json(
        { error: "Device with this ID already exists" },
        { status: 409 }
      );
    }

    // Create device
    const device = deviceDb.create({
      id,
      name,
      color,
      ownerId: (session.user as any).id,
      description,
      icon,
    });

    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    console.error("Error creating device:", error);
    return NextResponse.json(
      { error: "Failed to create device" },
      { status: 500 }
    );
  }
}
