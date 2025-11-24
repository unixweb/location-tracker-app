// API Route für einzelne MQTT Credentials
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mqttCredentialDb, mqttAclRuleDb } from '@/lib/mqtt-db';
import { hashPassword } from '@/lib/mosquitto-sync';
import { randomBytes } from 'crypto';

/**
 * GET /api/mqtt/credentials/[device_id]
 * Hole MQTT Credentials für ein Device
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ device_id: string }> }
) {
  const { device_id } = await params;
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credential = mqttCredentialDb.findByDeviceId(device_id);

    if (!credential) {
      return NextResponse.json(
        { error: 'Credentials not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(credential);
  } catch (error) {
    console.error('Failed to fetch MQTT credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mqtt/credentials/[device_id]
 * Aktualisiere MQTT Credentials
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ device_id: string }> }
) {
  const { device_id } = await params;
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { regenerate_password, enabled } = body;

    const credential = mqttCredentialDb.findByDeviceId(device_id);
    if (!credential) {
      return NextResponse.json(
        { error: 'Credentials not found' },
        { status: 404 }
      );
    }

    let newPassword: string | undefined;
    let updateData: any = {};

    // Regeneriere Passwort wenn angefordert
    if (regenerate_password) {
      newPassword = randomBytes(16).toString('base64');
      const password_hash = await hashPassword(newPassword);
      updateData.mqtt_password_hash = password_hash;
    }

    // Update enabled Status
    if (enabled !== undefined) {
      updateData.enabled = enabled ? 1 : 0;
    }

    // Update Credentials
    const updated = mqttCredentialDb.update(device_id, updateData);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...updated,
      // Sende neues Passwort nur wenn regeneriert
      ...(newPassword && { mqtt_password: newPassword })
    });
  } catch (error) {
    console.error('Failed to update MQTT credentials:', error);
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mqtt/credentials/[device_id]
 * Lösche MQTT Credentials für ein Device
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ device_id: string }> }
) {
  const { device_id } = await params;
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lösche zuerst alle ACL Regeln
    mqttAclRuleDb.deleteByDeviceId(device_id);

    // Dann lösche Credentials
    const deleted = mqttCredentialDb.delete(device_id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Credentials not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete MQTT credentials:', error);
    return NextResponse.json(
      { error: 'Failed to delete credentials' },
      { status: 500 }
    );
  }
}
