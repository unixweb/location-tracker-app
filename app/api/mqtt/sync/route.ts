// API Route für Mosquitto Configuration Sync
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncMosquittoConfig, getMosquittoSyncStatus } from '@/lib/mosquitto-sync';

/**
 * GET /api/mqtt/sync
 * Hole den aktuellen Sync Status
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = getMosquittoSyncStatus();
    return NextResponse.json(status || { pending_changes: 0, last_sync_status: 'unknown' });
  } catch (error) {
    console.error('Failed to fetch sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mqtt/sync
 * Trigger Mosquitto Configuration Sync
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncMosquittoConfig();
    return NextResponse.json(result, {
      status: result.success ? 200 : 500
    });
  } catch (error) {
    console.error('Failed to sync Mosquitto config:', error);
    return NextResponse.json(
      { error: 'Failed to sync Mosquitto configuration' },
      { status: 500 }
    );
  }
}
