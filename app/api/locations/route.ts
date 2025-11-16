import { NextRequest, NextResponse } from "next/server";
import type { LocationResponse } from "@/types/location";
import { locationDb, Location } from "@/lib/db";

const N8N_API_URL = "https://n8n.unixweb.home64.de/webhook/location";

/**
 * GET /api/locations
 *
 * Hybrid approach:
 * 1. Fetch fresh data from n8n webhook
 * 2. Store new locations in local SQLite cache
 * 3. Return filtered data from SQLite (enables 24h+ history)
 *
 * Query parameters:
 * - username: Filter by device tracker ID
 * - timeRangeHours: Filter by time range (e.g., 1, 3, 6, 12, 24)
 * - limit: Maximum number of records (default: 1000)
 * - sync: Set to 'false' to skip n8n fetch and read only from cache
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username') || undefined;
    const timeRangeHours = searchParams.get('timeRangeHours')
      ? parseInt(searchParams.get('timeRangeHours')!, 10)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 1000;
    const sync = searchParams.get('sync') !== 'false'; // Default: true

    // Step 1: Optionally fetch and sync from n8n
    if (sync) {
      try {
        const response = await fetch(N8N_API_URL, {
          cache: "no-store",
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });

        if (response.ok) {
          const data: LocationResponse = await response.json();

          // Store new locations in SQLite
          if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            // Get latest timestamp from our DB
            const stats = locationDb.getStats();
            const lastLocalTimestamp = stats.newest || '1970-01-01T00:00:00Z';

            // Filter for only newer locations
            const newLocations = data.history.filter(loc =>
              loc.timestamp > lastLocalTimestamp
            );

            if (newLocations.length > 0) {
              const inserted = locationDb.createMany(newLocations as Location[]);
              console.log(`[Location Sync] Inserted ${inserted} new locations from n8n`);
            }
          }
        }
      } catch (syncError) {
        // n8n not reachable - that's ok, we'll use cached data
        console.warn('[Location Sync] n8n webhook not reachable, using cache only:',
          syncError instanceof Error ? syncError.message : 'Unknown error');
      }
    }

    // Step 2: Read from local SQLite with filters
    const locations = locationDb.findMany({
      user_id: 0, // Always filter for MQTT devices
      username,
      timeRangeHours,
      limit,
    });

    // Step 3: Return data in n8n-compatible format
    const response: LocationResponse = {
      success: true,
      current: locations.length > 0 ? locations[0] : null,
      history: locations,
      total_points: locations.length,
      last_updated: locations.length > 0 ? locations[0].timestamp : new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch locations",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
