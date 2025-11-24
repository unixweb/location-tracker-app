// Startup-Script für Server-Side Services
// Wird beim Start der Next.js App ausgeführt

import { initMQTTSubscriber } from './mqtt-subscriber';

let initialized = false;

/**
 * Initialisiere alle Server-Side Services
 */
export function initializeServices() {
  // Verhindere mehrfache Initialisierung
  if (initialized) {
    console.log('Services already initialized');
    return;
  }

  console.log('Initializing server-side services...');

  try {
    // Starte MQTT Subscriber nur wenn MQTT_BROKER_URL konfiguriert ist
    if (process.env.MQTT_BROKER_URL) {
      console.log('Starting MQTT subscriber...');
      initMQTTSubscriber();
      console.log('✓ MQTT subscriber started');
    } else {
      console.log('⚠ MQTT_BROKER_URL not configured, skipping MQTT subscriber');
    }

    initialized = true;
    console.log('✓ All services initialized');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    // Werfe keinen Fehler - App sollte trotzdem starten können
  }
}
