import { NextRequest, NextResponse } from 'next/server';
import { locationDb, Location } from '@/lib/db';

/**
 * POST /api/locations/ingest
 *
 * Endpoint for n8n to push location data to local SQLite cache.
 * This is called AFTER n8n stores the data in NocoDB.
 *
 * Expected payload (single location or array):
 * {
 *   "latitude": 48.1351,
 *   "longitude": 11.5820,
 *   "timestamp": "2024-01-15T10:30:00Z",
 *   "user_id": 0,
 *   "username": "10",
 *   "marker_label": "Joachim Pixel",
 *   "battery": 85,
 *   "speed": 2.5,
 *   ...
 * }
 *
 * Security: Add API key validation in production!
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both single location and array of locations
    const locations = Array.isArray(body) ? body : [body];

    if (locations.length === 0) {
      return NextResponse.json(
        { error: 'No location data provided' },
        { status: 400 }
      );
    }

    // Validate required fields
    for (const loc of locations) {
      if (!loc.latitude || !loc.longitude || !loc.timestamp) {
        return NextResponse.json(
          { error: 'Missing required fields: latitude, longitude, timestamp' },
          { status: 400 }
        );
      }
    }

    // Insert into SQLite
    let insertedCount = 0;
    if (locations.length === 1) {
      locationDb.create(locations[0] as Location);
      insertedCount = 1;
    } else {
      insertedCount = locationDb.createMany(locations as Location[]);
    }

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      message: `Successfully stored ${insertedCount} location(s)`
    });

  } catch (error) {
    console.error('Location ingest error:', error);
    return NextResponse.json(
      {
        error: 'Failed to store location data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/locations/ingest/stats
 *
 * Get database statistics (for debugging)
 */
export async function GET() {
  try {
    const stats = locationDb.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
