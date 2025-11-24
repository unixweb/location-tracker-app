import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { emailService } from '@/lib/email-service';
import { deviceDb, userDb } from '@/lib/db';

// POST /api/mqtt/send-credentials - Send MQTT credentials via email
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can send credentials
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { deviceId, mqttUsername, mqttPassword } = body;

    if (!deviceId || !mqttUsername || !mqttPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: deviceId, mqttUsername, mqttPassword' },
        { status: 400 }
      );
    }

    // Get device info
    const device = deviceDb.findById(deviceId);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Get device owner
    if (!device.ownerId) {
      return NextResponse.json(
        { error: 'Device has no owner assigned' },
        { status: 400 }
      );
    }

    const owner = userDb.findById(device.ownerId);
    if (!owner) {
      return NextResponse.json(
        { error: 'Device owner not found' },
        { status: 404 }
      );
    }

    if (!owner.email) {
      return NextResponse.json(
        { error: 'Device owner has no email address' },
        { status: 400 }
      );
    }

    // Parse broker URL from environment or use default
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const brokerHost = brokerUrl.replace(/^mqtt:\/\//, '').replace(/:\d+$/, '');
    const brokerPortMatch = brokerUrl.match(/:(\d+)$/);
    const brokerPort = brokerPortMatch ? brokerPortMatch[1] : '1883';

    // Send email
    await emailService.sendMqttCredentialsEmail({
      email: owner.email,
      deviceName: device.name,
      deviceId: device.id,
      mqttUsername,
      mqttPassword,
      brokerUrl,
      brokerHost,
      brokerPort,
    });

    console.log(`[MQTT] Credentials sent via email to ${owner.email} for device ${device.name}`);

    return NextResponse.json({
      success: true,
      message: `Credentials sent to ${owner.email}`,
    });
  } catch (error) {
    console.error('Error sending MQTT credentials email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
