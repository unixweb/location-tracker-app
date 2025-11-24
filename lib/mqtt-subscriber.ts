// MQTT Subscriber Service für OwnTracks Location Updates
import mqtt from 'mqtt';
import { locationDb, Location } from './db';

// OwnTracks Message Format
interface OwnTracksMessage {
  _type: 'location' | 'transition' | 'waypoint' | 'lwt';
  tid?: string;  // Tracker ID
  lat: number;
  lon: number;
  tst: number;   // Timestamp (Unix epoch)
  batt?: number; // Battery level (0-100)
  vel?: number;  // Velocity/Speed in km/h
  acc?: number;  // Accuracy
  alt?: number;  // Altitude
  cog?: number;  // Course over ground
  t?: string;    // Trigger (p=ping, c=region, b=beacon, u=manual, t=timer, v=monitoring)
}

class MQTTSubscriber {
  private client: mqtt.MqttClient | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnecting = false;

  constructor(
    private brokerUrl: string,
    private username?: string,
    private password?: string
  ) {}

  /**
   * Verbinde zum MQTT Broker und subscribiere Topics
   */
  connect(): void {
    if (this.isConnecting || this.client?.connected) {
      console.log('Already connecting or connected to MQTT broker');
      return;
    }

    this.isConnecting = true;
    console.log(`Connecting to MQTT broker: ${this.brokerUrl}`);

    const options: mqtt.IClientOptions = {
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    };

    if (this.username && this.password) {
      options.username = this.username;
      options.password = this.password;
    }

    this.client = mqtt.connect(this.brokerUrl, options);

    this.client.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('✓ Connected to MQTT broker');

      // Subscribiere owntracks Topic (alle Devices) mit QoS 1
      this.client?.subscribe('owntracks/+/+', { qos: 1 }, (err) => {
        if (err) {
          console.error('Failed to subscribe to owntracks topic:', err);
        } else {
          console.log('✓ Subscribed to owntracks/+/+ with QoS 1');
        }
      });
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on('error', (error) => {
      console.error('MQTT client error:', error);
      this.isConnecting = false;
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      console.log(`Reconnecting to MQTT broker (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnect attempts reached, giving up');
        this.client?.end();
      }
    });

    this.client.on('close', () => {
      console.log('MQTT connection closed');
      this.isConnecting = false;
    });

    this.client.on('offline', () => {
      console.log('MQTT client offline');
    });
  }

  /**
   * Verarbeite eingehende MQTT Nachricht
   */
  private handleMessage(topic: string, message: Buffer): void {
    try {
      // Parse Topic: owntracks/user/device
      const parts = topic.split('/');
      if (parts.length !== 3 || parts[0] !== 'owntracks') {
        console.log(`Ignoring non-owntracks topic: ${topic}`);
        return;
      }

      const [, user, device] = parts;

      // Parse Message Payload
      const payload = JSON.parse(message.toString()) as OwnTracksMessage;

      // Nur location messages verarbeiten
      if (payload._type !== 'location') {
        console.log(`Ignoring non-location message type: ${payload._type}`);
        return;
      }

      // Konvertiere zu Location Format
      const location: Location = {
        latitude: payload.lat,
        longitude: payload.lon,
        timestamp: new Date(payload.tst * 1000).toISOString(),
        user_id: 0, // MQTT Devices haben user_id 0
        username: device, // Device ID als username
        first_name: null,
        last_name: null,
        marker_label: payload.tid || device,
        display_time: null,
        chat_id: 0,
        battery: payload.batt ?? null,
        speed: payload.vel ?? null,
      };

      // Speichere in Datenbank
      const saved = locationDb.create(location);

      if (saved) {
        console.log(`✓ Location saved: ${device} at (${payload.lat}, ${payload.lon})`);
      } else {
        console.log(`⚠ Duplicate location ignored: ${device}`);
      }
    } catch (error) {
      console.error('Failed to process MQTT message:', error);
      console.error('Topic:', topic);
      console.error('Message:', message.toString());
    }
  }

  /**
   * Disconnect vom MQTT Broker
   */
  disconnect(): void {
    if (this.client) {
      console.log('Disconnecting from MQTT broker');
      this.client.end();
      this.client = null;
    }
  }

  /**
   * Check ob verbunden
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  /**
   * Hole Client Status Info
   */
  getStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    brokerUrl: string;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      brokerUrl: this.brokerUrl,
    };
  }
}

// Singleton Instance
let mqttSubscriber: MQTTSubscriber | null = null;

/**
 * Initialisiere und starte MQTT Subscriber
 */
export function initMQTTSubscriber(): MQTTSubscriber {
  if (mqttSubscriber) {
    return mqttSubscriber;
  }

  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;

  mqttSubscriber = new MQTTSubscriber(brokerUrl, username, password);
  mqttSubscriber.connect();

  return mqttSubscriber;
}

/**
 * Hole existierende MQTT Subscriber Instance
 */
export function getMQTTSubscriber(): MQTTSubscriber | null {
  return mqttSubscriber;
}

/**
 * Stoppe MQTT Subscriber
 */
export function stopMQTTSubscriber(): void {
  if (mqttSubscriber) {
    mqttSubscriber.disconnect();
    mqttSubscriber = null;
  }
}
