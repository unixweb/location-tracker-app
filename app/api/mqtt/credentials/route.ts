// API Route für MQTT Credentials Management
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mqttCredentialDb, mqttAclRuleDb } from '@/lib/mqtt-db';
import { deviceDb } from '@/lib/db';
import { hashPassword } from '@/lib/mosquitto-sync';
import { randomBytes } from 'crypto';

/**
 * GET /api/mqtt/credentials
 * Liste alle MQTT Credentials
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const credentials = mqttCredentialDb.findAll();

    // Filter credentials to only show user's devices
    const credentialsWithDevices = credentials
      .map(cred => {
        const device = deviceDb.findById(cred.device_id);
        return {
          ...cred,
          device_name: device?.name || 'Unknown Device',
          device_owner: device?.ownerId
        };
      })
      .filter(cred => cred.device_owner === userId);

    return NextResponse.json(credentialsWithDevices);
  } catch (error) {
    console.error('Failed to fetch MQTT credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mqtt/credentials
 * Erstelle neue MQTT Credentials für ein Device
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { device_id, mqtt_username, mqtt_password, auto_generate } = body;

    // Validierung
    if (!device_id) {
      return NextResponse.json(
        { error: 'device_id is required' },
        { status: 400 }
      );
    }

    // Prüfe ob Device existiert
    const device = deviceDb.findById(device_id);
    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Prüfe ob bereits Credentials existieren
    const existing = mqttCredentialDb.findByDeviceId(device_id);
    if (existing) {
      return NextResponse.json(
        { error: 'MQTT credentials already exist for this device' },
        { status: 409 }
      );
    }

    // Generiere oder verwende übergebene Credentials
    let username = mqtt_username;
    let password = mqtt_password;

    if (auto_generate || !username) {
      // Generiere Username: device_[device-id]_[random]
      username = `device_${device_id}_${randomBytes(4).toString('hex')}`;
    }

    if (auto_generate || !password) {
      // Generiere sicheres Passwort
      password = randomBytes(16).toString('base64');
    }

    // Hash Passwort
    const password_hash = await hashPassword(password);

    // Erstelle Credentials
    const credential = mqttCredentialDb.create({
      device_id,
      mqtt_username: username,
      mqtt_password_hash: password_hash,
      enabled: 1
    });

    // Erstelle Default ACL Regel
    mqttAclRuleDb.createDefaultRule(device_id);

    return NextResponse.json({
      ...credential,
      // Sende Plaintext-Passwort nur bei Erstellung zurück
      mqtt_password: password,
      device_name: device.name
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create MQTT credentials:', error);
    return NextResponse.json(
      { error: 'Failed to create credentials' },
      { status: 500 }
    );
  }
}
