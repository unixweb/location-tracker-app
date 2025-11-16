import { NextResponse } from 'next/server';
import { getLocationsDb } from '@/lib/db';

/**
 * POST /api/locations/optimize
 *
 * Optimize database by running VACUUM and ANALYZE
 * This reclaims unused space and updates query planner statistics
 */
export async function POST() {
  try {
    const db = getLocationsDb();

    // Get size before optimization
    const sizeBefore = db.prepare(
      "SELECT page_count * page_size / 1024 / 1024.0 as sizeMB FROM pragma_page_count(), pragma_page_size()"
    ).get() as { sizeMB: number };

    // Run VACUUM to reclaim space
    db.exec('VACUUM');

    // Run ANALYZE to update query planner statistics
    db.exec('ANALYZE');

    // Get size after optimization
    const sizeAfter = db.prepare(
      "SELECT page_count * page_size / 1024 / 1024.0 as sizeMB FROM pragma_page_count(), pragma_page_size()"
    ).get() as { sizeMB: number };

    db.close();

    const freedMB = sizeBefore.sizeMB - sizeAfter.sizeMB;

    return NextResponse.json({
      success: true,
      before: {
        sizeMB: Math.round(sizeBefore.sizeMB * 100) / 100,
      },
      after: {
        sizeMB: Math.round(sizeAfter.sizeMB * 100) / 100,
      },
      freedMB: Math.round(freedMB * 100) / 100,
    });

  } catch (error) {
    console.error('Optimize error:', error);
    return NextResponse.json(
      {
        error: 'Failed to optimize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
