import { NextResponse } from 'next/server';

/**
 * GET /api/system/status
 *
 * Returns system status information
 */
export async function GET() {
  try {
    const uptimeSeconds = process.uptime();

    // Calculate days, hours, minutes, seconds
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    return NextResponse.json({
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        days,
        hours,
        minutes,
        seconds,
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      nodejs: process.version,
      platform: process.platform,
    });
  } catch (error) {
    console.error('System status error:', error);
    return NextResponse.json(
      { error: 'Failed to get system status' },
      { status: 500 }
    );
  }
}
