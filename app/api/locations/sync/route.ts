import { NextResponse } from 'next/server';
import { locationDb, Location } from '@/lib/db';
import type { LocationResponse } from "@/types/location";

const N8N_API_URL = "https://n8n.unixweb.home64.de/webhook/location";

/**
 * POST /api/locations/sync
 *
 * Manually sync location data from n8n webhook to local SQLite cache.
 * This fetches all available data from n8n and stores only new records.
 *
 * Useful for:
 * - Initial database population
 * - Recovery after downtime
 * - Manual refresh
 */
export async function POST() {
  try {
    // Get stats before sync
    const statsBefore = locationDb.getStats();

    // Fetch from n8n webhook
    const response = await fetch(N8N_API_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000), // 10 second timeout for manual sync
    });

    if (!response.ok) {
      throw new Error(`n8n webhook returned ${response.status}`);
    }

    const data: LocationResponse = await response.json();

    let insertedCount = 0;

    // Store new locations in SQLite
    if (data.history && Array.isArray(data.history) && data.history.length > 0) {
      // Get latest timestamp from our DB
      const lastLocalTimestamp = statsBefore.newest || '1970-01-01T00:00:00Z';

      // Filter for only newer locations
      const newLocations = data.history.filter(loc =>
        loc.timestamp > lastLocalTimestamp
      );

      if (newLocations.length > 0) {
        insertedCount = locationDb.createMany(newLocations as Location[]);
        console.log(`[Manual Sync] Inserted ${insertedCount} new locations from n8n`);
      }
    }

    // Get stats after sync
    const statsAfter = locationDb.getStats();

    return NextResponse.json({
      success: true,
      synced: insertedCount,
      n8nTotal: data.total_points || data.history.length,
      before: {
        total: statsBefore.total,
        newest: statsBefore.newest,
      },
      after: {
        total: statsAfter.total,
        newest: statsAfter.newest,
      },
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
