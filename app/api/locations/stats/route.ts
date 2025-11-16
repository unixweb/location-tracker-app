import { NextResponse } from 'next/server';
import { getLocationsDb } from '@/lib/db';

/**
 * GET /api/locations/stats
 *
 * Get detailed database statistics
 */
export async function GET() {
  try {
    const db = getLocationsDb();

    // Overall stats
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM Location').get() as { count: number };

    // Time range
    const timeRange = db.prepare(
      'SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM Location'
    ).get() as { oldest: string | null; newest: string | null };

    // Database size
    const dbSize = db.prepare(
      "SELECT page_count * page_size / 1024 / 1024.0 as sizeMB FROM pragma_page_count(), pragma_page_size()"
    ).get() as { sizeMB: number };

    // WAL mode check
    const walMode = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };

    // Locations per device
    const perDevice = db.prepare(`
      SELECT username, COUNT(*) as count
      FROM Location
      WHERE user_id = 0
      GROUP BY username
      ORDER BY count DESC
    `).all() as Array<{ username: string; count: number }>;

    // Locations per day (last 7 days)
    const perDay = db.prepare(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM Location
      WHERE timestamp >= datetime('now', '-7 days')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `).all() as Array<{ date: string; count: number }>;

    // Average locations per day
    const avgPerDay = perDay.length > 0
      ? Math.round(perDay.reduce((sum, day) => sum + day.count, 0) / perDay.length)
      : 0;

    db.close();

    return NextResponse.json({
      total: totalCount.count,
      oldest: timeRange.oldest,
      newest: timeRange.newest,
      sizeMB: Math.round(dbSize.sizeMB * 100) / 100,
      walMode: walMode.journal_mode,
      perDevice,
      perDay,
      avgPerDay,
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get database stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
