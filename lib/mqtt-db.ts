// MQTT credentials and ACL database operations
import { getDb } from './db';

export interface MqttCredential {
  id: number;
  device_id: string;
  mqtt_username: string;
  mqtt_password_hash: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface MqttAclRule {
  id: number;
  device_id: string;
  topic_pattern: string;
  permission: 'read' | 'write' | 'readwrite';
  created_at: string;
}

export interface MqttSyncStatus {
  id: number;
  pending_changes: number;
  last_sync_at: string | null;
  last_sync_status: string;
  created_at: string;
  updated_at: string;
}

export const mqttCredentialDb = {
  /**
   * Finde alle MQTT Credentials
   */
  findAll: (): MqttCredential[] => {
    const db = getDb();
    const credentials = db.prepare('SELECT * FROM mqtt_credentials').all() as MqttCredential[];
    db.close();
    return credentials;
  },

  /**
   * Finde MQTT Credential für ein Device
   */
  findByDeviceId: (deviceId: string): MqttCredential | null => {
    const db = getDb();
    const credential = db.prepare('SELECT * FROM mqtt_credentials WHERE device_id = ?')
      .get(deviceId) as MqttCredential | undefined;
    db.close();
    return credential || null;
  },

  /**
   * Finde MQTT Credential nach Username
   */
  findByUsername: (username: string): MqttCredential | null => {
    const db = getDb();
    const credential = db.prepare('SELECT * FROM mqtt_credentials WHERE mqtt_username = ?')
      .get(username) as MqttCredential | undefined;
    db.close();
    return credential || null;
  },

  /**
   * Erstelle neue MQTT Credentials für ein Device
   */
  create: (data: {
    device_id: string;
    mqtt_username: string;
    mqtt_password_hash: string;
    enabled?: number;
  }): MqttCredential => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO mqtt_credentials (device_id, mqtt_username, mqtt_password_hash, enabled)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.device_id,
      data.mqtt_username,
      data.mqtt_password_hash,
      data.enabled ?? 1
    );

    const created = db.prepare('SELECT * FROM mqtt_credentials WHERE id = ?')
      .get(result.lastInsertRowid) as MqttCredential;

    // Mark pending changes
    mqttSyncStatusDb.markPendingChanges();

    db.close();
    return created;
  },

  /**
   * Aktualisiere MQTT Credentials
   */
  update: (deviceId: string, data: {
    mqtt_password_hash?: string;
    enabled?: number;
  }): MqttCredential | null => {
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.mqtt_password_hash !== undefined) {
      updates.push('mqtt_password_hash = ?');
      values.push(data.mqtt_password_hash);
    }
    if (data.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(data.enabled);
    }

    if (updates.length === 0) {
      db.close();
      return mqttCredentialDb.findByDeviceId(deviceId);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(deviceId);

    const sql = `UPDATE mqtt_credentials SET ${updates.join(', ')} WHERE device_id = ?`;
    db.prepare(sql).run(...values);

    const updated = db.prepare('SELECT * FROM mqtt_credentials WHERE device_id = ?')
      .get(deviceId) as MqttCredential | undefined;

    // Mark pending changes
    mqttSyncStatusDb.markPendingChanges();

    db.close();
    return updated || null;
  },

  /**
   * Lösche MQTT Credentials für ein Device
   */
  delete: (deviceId: string): boolean => {
    const db = getDb();
    const result = db.prepare('DELETE FROM mqtt_credentials WHERE device_id = ?').run(deviceId);

    // Mark pending changes
    mqttSyncStatusDb.markPendingChanges();

    db.close();
    return result.changes > 0;
  },

  /**
   * Finde alle aktiven MQTT Credentials (für Mosquitto Sync)
   */
  findAllActive: (): MqttCredential[] => {
    const db = getDb();
    const credentials = db.prepare('SELECT * FROM mqtt_credentials WHERE enabled = 1')
      .all() as MqttCredential[];
    db.close();
    return credentials;
  },
};

export const mqttAclRuleDb = {
  /**
   * Finde alle ACL Regeln für ein Device
   */
  findByDeviceId: (deviceId: string): MqttAclRule[] => {
    const db = getDb();
    const rules = db.prepare('SELECT * FROM mqtt_acl_rules WHERE device_id = ?')
      .all(deviceId) as MqttAclRule[];
    db.close();
    return rules;
  },

  /**
   * Erstelle eine neue ACL Regel
   */
  create: (data: {
    device_id: string;
    topic_pattern: string;
    permission: 'read' | 'write' | 'readwrite';
  }): MqttAclRule => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO mqtt_acl_rules (device_id, topic_pattern, permission)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      data.device_id,
      data.topic_pattern,
      data.permission
    );

    const created = db.prepare('SELECT * FROM mqtt_acl_rules WHERE id = ?')
      .get(result.lastInsertRowid) as MqttAclRule;

    // Mark pending changes
    mqttSyncStatusDb.markPendingChanges();

    db.close();
    return created;
  },

  /**
   * Erstelle Default ACL Regel für ein Device (owntracks/owntrack/[device-id]/#)
   */
  createDefaultRule: (deviceId: string): MqttAclRule => {
    return mqttAclRuleDb.create({
      device_id: deviceId,
      topic_pattern: `owntracks/owntrack/${deviceId}/#`,
      permission: 'readwrite'
    });
  },

  /**
   * Aktualisiere eine ACL Regel
   */
  update: (id: number, data: {
    topic_pattern?: string;
    permission?: 'read' | 'write' | 'readwrite';
  }): MqttAclRule | null => {
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.topic_pattern !== undefined) {
      updates.push('topic_pattern = ?');
      values.push(data.topic_pattern);
    }
    if (data.permission !== undefined) {
      updates.push('permission = ?');
      values.push(data.permission);
    }

    if (updates.length === 0) {
      db.close();
      const existing = db.prepare('SELECT * FROM mqtt_acl_rules WHERE id = ?')
        .get(id) as MqttAclRule | undefined;
      return existing || null;
    }

    values.push(id);

    const sql = `UPDATE mqtt_acl_rules SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);

    const updated = db.prepare('SELECT * FROM mqtt_acl_rules WHERE id = ?')
      .get(id) as MqttAclRule | undefined;

    // Mark pending changes
    mqttSyncStatusDb.markPendingChanges();

    db.close();
    return updated || null;
  },

  /**
   * Lösche eine ACL Regel
   */
  delete: (id: number): boolean => {
    const db = getDb();
    const result = db.prepare('DELETE FROM mqtt_acl_rules WHERE id = ?').run(id);

    // Mark pending changes
    mqttSyncStatusDb.markPendingChanges();

    db.close();
    return result.changes > 0;
  },

  /**
   * Lösche alle ACL Regeln für ein Device
   */
  deleteByDeviceId: (deviceId: string): number => {
    const db = getDb();
    const result = db.prepare('DELETE FROM mqtt_acl_rules WHERE device_id = ?').run(deviceId);

    // Mark pending changes
    if (result.changes > 0) {
      mqttSyncStatusDb.markPendingChanges();
    }

    db.close();
    return result.changes;
  },

  /**
   * Finde alle ACL Regeln (für Mosquitto Sync)
   */
  findAll: (): MqttAclRule[] => {
    const db = getDb();
    const rules = db.prepare(`
      SELECT acl.* FROM mqtt_acl_rules acl
      INNER JOIN mqtt_credentials cred ON acl.device_id = cred.device_id
      WHERE cred.enabled = 1
    `).all() as MqttAclRule[];
    db.close();
    return rules;
  },
};

export const mqttSyncStatusDb = {
  /**
   * Hole den aktuellen Sync Status
   */
  get: (): MqttSyncStatus | null => {
    const db = getDb();
    const status = db.prepare('SELECT * FROM mqtt_sync_status WHERE id = 1')
      .get() as MqttSyncStatus | undefined;
    db.close();
    return status || null;
  },

  /**
   * Markiere dass es ausstehende Änderungen gibt
   */
  markPendingChanges: (): void => {
    const db = getDb();
    db.prepare(`
      UPDATE mqtt_sync_status
      SET pending_changes = pending_changes + 1,
          updated_at = datetime('now')
      WHERE id = 1
    `).run();
    db.close();
  },

  /**
   * Markiere erfolgreichen Sync
   */
  markSynced: (): void => {
    const db = getDb();
    db.prepare(`
      UPDATE mqtt_sync_status
      SET pending_changes = 0,
          last_sync_at = datetime('now'),
          last_sync_status = 'success',
          updated_at = datetime('now')
      WHERE id = 1
    `).run();
    db.close();
  },

  /**
   * Markiere fehlgeschlagenen Sync
   */
  markSyncFailed: (error: string): void => {
    const db = getDb();
    db.prepare(`
      UPDATE mqtt_sync_status
      SET last_sync_at = datetime('now'),
          last_sync_status = ?,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(`error: ${error}`);
    db.close();
  },
};
