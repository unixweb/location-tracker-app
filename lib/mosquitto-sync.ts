// Mosquitto configuration synchronization service
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { mqttCredentialDb, mqttAclRuleDb, mqttSyncStatusDb } from './mqtt-db';

const execPromise = promisify(exec);

// Konfiguration aus Environment Variablen
const PASSWORD_FILE = process.env.MOSQUITTO_PASSWORD_FILE || '/mosquitto/config/password.txt';
const ACL_FILE = process.env.MOSQUITTO_ACL_FILE || '/mosquitto/config/acl.txt';
const MOSQUITTO_CONTAINER = process.env.MOSQUITTO_CONTAINER_NAME || 'mosquitto';
const ADMIN_USERNAME = process.env.MOSQUITTO_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.MOSQUITTO_ADMIN_PASSWORD || 'admin';

/**
 * Hash ein Passwort im Mosquitto-kompatiblen Format (PBKDF2-SHA512)
 * Format: $7$<iterations>$<base64_salt>$<base64_hash>
 *
 * Mosquitto verwendet PBKDF2 mit SHA-512, 101 Iterationen (Standard),
 * 12-Byte Salt und 64-Byte Hash
 */
async function hashPassword(password: string): Promise<string> {
  try {
    // Mosquitto Standard-Parameter
    const iterations = 101;
    const saltLength = 12;
    const hashLength = 64;

    // Generiere zufälligen Salt
    const salt = crypto.randomBytes(saltLength);

    // PBKDF2 mit SHA-512
    const hash = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, hashLength, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });

    // Base64-Kodierung (Standard Base64, nicht URL-safe)
    const saltBase64 = salt.toString('base64');
    const hashBase64 = hash.toString('base64');

    // Mosquitto Format: $7$iterations$salt$hash
    // $7$ = PBKDF2-SHA512 Identifier
    const mosquittoHash = `$7$${iterations}$${saltBase64}$${hashBase64}`;

    return mosquittoHash;
  } catch (error) {
    console.error('Failed to hash password:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Generiere Mosquitto Password File Entry
 */
async function generatePasswordEntry(username: string, password: string): Promise<string> {
  const hash = await hashPassword(password);
  return `${username}:${hash}`;
}

/**
 * Generiere die Mosquitto Password Datei
 */
async function generatePasswordFile(): Promise<string> {
  let content = '';

  // Füge Admin User hinzu
  const adminEntry = await generatePasswordEntry(ADMIN_USERNAME, ADMIN_PASSWORD);
  content += `# Admin user\n${adminEntry}\n\n`;

  // Füge Device Credentials hinzu
  const credentials = mqttCredentialDb.findAllActive();
  if (credentials.length > 0) {
    content += '# Provisioned devices\n';
    for (const cred of credentials) {
      content += `${cred.mqtt_username}:${cred.mqtt_password_hash}\n`;
    }
  }

  return content;
}

/**
 * Generiere die Mosquitto ACL Datei
 */
function generateACLFile(): string {
  let content = '';

  // Füge Admin ACL hinzu
  content += `# Admin user - full access\n`;
  content += `user ${ADMIN_USERNAME}\n`;
  content += `topic readwrite #\n\n`;

  // Füge Device ACLs hinzu
  const rules = mqttAclRuleDb.findAll();

  if (rules.length > 0) {
    content += '# Device permissions\n';

    // Gruppiere Regeln nach device_id
    const rulesByDevice = rules.reduce((acc, rule) => {
      if (!acc[rule.device_id]) {
        acc[rule.device_id] = [];
      }
      acc[rule.device_id].push(rule);
      return acc;
    }, {} as Record<string, typeof rules>);

    // Schreibe ACL Regeln pro Device
    for (const [deviceId, deviceRules] of Object.entries(rulesByDevice)) {
      const credential = mqttCredentialDb.findByDeviceId(deviceId);
      if (!credential) continue;

      content += `# Device: ${deviceId}\n`;
      content += `user ${credential.mqtt_username}\n`;

      for (const rule of deviceRules) {
        content += `topic ${rule.permission} ${rule.topic_pattern}\n`;
      }

      content += '\n';
    }
  }

  return content;
}

/**
 * Schreibe Password File
 */
async function writePasswordFile(content: string): Promise<void> {
  const configDir = path.dirname(PASSWORD_FILE);

  // Stelle sicher dass das Config-Verzeichnis existiert
  await fs.mkdir(configDir, { recursive: true });

  // Schreibe Datei mit sicheren Permissions (nur owner kann lesen/schreiben)
  await fs.writeFile(PASSWORD_FILE, content, { mode: 0o600 });

  console.log(`✓ Password file written: ${PASSWORD_FILE}`);
}

/**
 * Schreibe ACL File
 */
async function writeACLFile(content: string): Promise<void> {
  const configDir = path.dirname(ACL_FILE);

  // Stelle sicher dass das Config-Verzeichnis existiert
  await fs.mkdir(configDir, { recursive: true });

  // Schreibe Datei mit sicheren Permissions
  await fs.writeFile(ACL_FILE, content, { mode: 0o600 });

  console.log(`✓ ACL file written: ${ACL_FILE}`);
}

/**
 * Reload Mosquitto Konfiguration
 * Sendet SIGHUP an Mosquitto Container
 */
async function reloadMosquitto(): Promise<boolean> {
  try {
    // Sende SIGHUP an mosquitto container um config zu reloaden
    await execPromise(`docker exec ${MOSQUITTO_CONTAINER} kill -HUP 1`);
    console.log('✓ Mosquitto configuration reloaded');
    return true;
  } catch (error) {
    console.log('⚠ Could not reload Mosquitto automatically (requires docker socket permissions)');
    console.log('→ Changes saved to config files - restart Mosquitto to apply: docker-compose restart mosquitto');
    // Werfe keinen Fehler - Config-Dateien sind aktualisiert, werden beim nächsten Restart geladen
    return false;
  }
}

/**
 * Sync alle MQTT Konfigurationen nach Mosquitto
 */
export async function syncMosquittoConfig(): Promise<{
  success: boolean;
  message: string;
  reloaded: boolean;
}> {
  try {
    console.log('Starting Mosquitto sync...');

    // Generiere Password File
    const passwordContent = await generatePasswordFile();
    await writePasswordFile(passwordContent);

    // Generiere ACL File
    const aclContent = generateACLFile();
    await writeACLFile(aclContent);

    // Versuche Mosquitto zu reloaden
    const reloaded = await reloadMosquitto();

    // Markiere als synced
    mqttSyncStatusDb.markSynced();

    return {
      success: true,
      message: reloaded
        ? 'Mosquitto configuration synced and reloaded successfully'
        : 'Mosquitto configuration synced. Restart Mosquitto to apply changes.',
      reloaded
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to sync Mosquitto config:', error);

    // Markiere Sync als fehlgeschlagen
    mqttSyncStatusDb.markSyncFailed(errorMessage);

    return {
      success: false,
      message: `Failed to sync Mosquitto configuration: ${errorMessage}`,
      reloaded: false
    };
  }
}

/**
 * Hole Mosquitto Sync Status
 */
export function getMosquittoSyncStatus() {
  return mqttSyncStatusDb.get();
}

/**
 * Hash ein Passwort für MQTT Credentials
 * Exportiere dies damit es in API Routes verwendet werden kann
 */
export { hashPassword };
