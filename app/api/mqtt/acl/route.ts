// API Route für MQTT ACL Management
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mqttAclRuleDb } from '@/lib/mqtt-db';
import { deviceDb } from '@/lib/db';

/**
 * GET /api/mqtt/acl?device_id=xxx
 * Hole ACL Regeln für ein Device
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const device_id = searchParams.get('device_id');

    if (!device_id) {
      return NextResponse.json(
        { error: 'device_id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if device belongs to user
    const userId = (session.user as any).id;
    const device = deviceDb.findById(device_id);

    if (!device || device.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Device not found or access denied' },
        { status: 404 }
      );
    }

    const rules = mqttAclRuleDb.findByDeviceId(device_id);
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Failed to fetch ACL rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ACL rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mqtt/acl
 * Erstelle neue ACL Regel
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { device_id, topic_pattern, permission } = body;

    // Validierung
    if (!device_id || !topic_pattern || !permission) {
      return NextResponse.json(
        { error: 'device_id, topic_pattern, and permission are required' },
        { status: 400 }
      );
    }

    if (!['read', 'write', 'readwrite'].includes(permission)) {
      return NextResponse.json(
        { error: 'permission must be one of: read, write, readwrite' },
        { status: 400 }
      );
    }

    // Check if device belongs to user
    const userId = (session.user as any).id;
    const device = deviceDb.findById(device_id);

    if (!device || device.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Device not found or access denied' },
        { status: 404 }
      );
    }

    const rule = mqttAclRuleDb.create({
      device_id,
      topic_pattern,
      permission
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Failed to create ACL rule:', error);
    return NextResponse.json(
      { error: 'Failed to create ACL rule' },
      { status: 500 }
    );
  }
}
