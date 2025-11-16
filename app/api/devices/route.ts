import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deviceDb } from "@/lib/db";
import type { LocationResponse } from "@/types/location";

const N8N_API_URL = "https://n8n.unixweb.home64.de/webhook/location";

// GET /api/devices - List all devices (from database)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get devices from database
    const devices = deviceDb.findAll();

    // Fetch location data from n8n to get latest locations
    let locationData: LocationResponse | null = null;
    try {
      const response = await fetch(N8N_API_URL, { cache: "no-store" });
      if (response.ok) {
        locationData = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }

    // Merge devices with latest location data
    const devicesWithLocation = devices.map((device) => {
      // Find latest location for this device
      const latestLocation = locationData?.history
        ?.filter((loc) => loc.username === device.id)
        ?.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      return {
        id: device.id,
        name: device.name,
        color: device.color,
        isActive: device.isActive === 1,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
        description: device.description,
        icon: device.icon,
        latestLocation: latestLocation || null,
        _count: {
          locations: locationData?.history?.filter((loc) => loc.username === device.id).length || 0,
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

// POST /api/devices - Create new device
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
