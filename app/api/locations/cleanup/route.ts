import { NextRequest, NextResponse } from 'next/server';
import { locationDb } from '@/lib/db';

/**
 * POST /api/locations/cleanup
 *
 * Delete old location records and optimize database
 *
 * Body:
 * {
 *   "retentionHours": 168  // 7 days default
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const retentionHours = body.retentionHours || 168; // Default: 7 days

    // Validate retention period
    if (retentionHours <= 0 || retentionHours > 8760) { // Max 1 year
      return NextResponse.json(
        { error: 'Invalid retention period. Must be between 1 and 8760 hours (1 year)' },
        { status: 400 }
      );
    }

    // Get stats before cleanup
    const statsBefore = locationDb.getStats();

    // Delete old records
    const deletedCount = locationDb.deleteOlderThan(retentionHours);

    // Get stats after cleanup
    const statsAfter = locationDb.getStats();

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      retentionHours,
      retentionDays: Math.round(retentionHours / 24),
      before: {
        total: statsBefore.total,
        sizeKB: statsBefore.sizeKB,
        oldest: statsBefore.oldest,
        newest: statsBefore.newest,
      },
      after: {
        total: statsAfter.total,
        sizeKB: statsAfter.sizeKB,
        oldest: statsAfter.oldest,
        newest: statsAfter.newest,
      },
      freedKB: statsBefore.sizeKB - statsAfter.sizeKB,
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
