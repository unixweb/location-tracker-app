// API Route für einzelne ACL Regel
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mqttAclRuleDb } from '@/lib/mqtt-db';
import { deviceDb } from '@/lib/db';

/**
 * PATCH /api/mqtt/acl/[id]
 * Aktualisiere eine ACL Regel
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ACL rule ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { topic_pattern, permission } = body;

    // Validation
    if (permission && !['read', 'write', 'readwrite'].includes(permission)) {
      return NextResponse.json(
        { error: 'Permission must be read, write, or readwrite' },
        { status: 400 }
      );
    }

    // Get current ACL rule to check device ownership
    const userId = (session.user as any).id;
    const currentRule = mqttAclRuleDb.findByDeviceId(''); // We need to get by ID first
    const aclRules = mqttAclRuleDb.findAll();
    const rule = aclRules.find(r => r.id === id);

    if (!rule) {
      return NextResponse.json(
        { error: 'ACL rule not found' },
        { status: 404 }
      );
    }

    // Check if device belongs to user
    const device = deviceDb.findById(rule.device_id);
    if (!device || device.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const updated = mqttAclRuleDb.update(id, {
      topic_pattern,
      permission
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update ACL rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update ACL rule:', error);
    return NextResponse.json(
      { error: 'Failed to update ACL rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mqtt/acl/[id]
 * Lösche eine ACL Regel
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ACL rule ID' },
        { status: 400 }
      );
    }

    // Get current ACL rule to check device ownership
    const userId = (session.user as any).id;
    const aclRules = mqttAclRuleDb.findAll();
    const rule = aclRules.find(r => r.id === id);

    if (!rule) {
      return NextResponse.json(
        { error: 'ACL rule not found' },
        { status: 404 }
      );
    }

    // Check if device belongs to user
    const device = deviceDb.findById(rule.device_id);
    if (!device || device.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const deleted = mqttAclRuleDb.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete ACL rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete ACL rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete ACL rule' },
      { status: 500 }
    );
  }
}
