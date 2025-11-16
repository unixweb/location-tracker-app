import { NextResponse } from 'next/server';
import { locationDb } from '@/lib/db';

/**
 * POST /api/locations/test
 *
 * Create a test location entry (for development/testing)
 * Body: { username, latitude, longitude, speed?, battery? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, latitude, longitude, speed, battery } = body;

    // Validation
    if (!username || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: username, latitude, longitude' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: 'Latitude must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    // Create location
    const now = new Date();
    const location = locationDb.create({
      latitude: lat,
      longitude: lon,
      timestamp: now.toISOString(),
      user_id: 0,
      username: String(username),
      display_time: now.toLocaleString('de-DE'),
      chat_id: 0,
      first_name: null,
      last_name: null,
      marker_label: null,
      battery: battery !== undefined ? Number(battery) : null,
      speed: speed !== undefined ? Number(speed) : null,
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Failed to create location (possibly duplicate)' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      location,
      message: 'Test location created successfully',
    });
  } catch (error) {
    console.error('Test location creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create test location' },
      { status: 500 }
    );
  }
}
