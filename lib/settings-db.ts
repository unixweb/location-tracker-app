/**
 * Database operations for app settings
 */
import { getDb } from './db';
import { SMTPConfig } from './types/smtp';
import { encrypt, decrypt } from './crypto-utils';

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export const settingsDb = {
  /**
   * Get a setting by key
   */
  get: (key: string): Setting | null => {
    const db = getDb();
    const setting = db
      .prepare('SELECT * FROM settings WHERE key = ?')
      .get(key) as Setting | undefined;
    db.close();
    return setting || null;
  },

  /**
   * Set a setting value
   */
  set: (key: string, value: string): void => {
    const db = getDb();
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = datetime('now')`
    ).run(key, value);
    db.close();
  },

  /**
   * Delete a setting
   */
  delete: (key: string): boolean => {
    const db = getDb();
    const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    db.close();
    return result.changes > 0;
  },

  /**
   * Get SMTP config from database (password decrypted)
   */
  getSMTPConfig: (): SMTPConfig | null => {
    const setting = settingsDb.get('smtp_config');
    if (!setting) return null;

    try {
      const config = JSON.parse(setting.value) as SMTPConfig;

      // Decrypt password if present
      if (config.auth?.pass) {
        try {
          config.auth.pass = decrypt(config.auth.pass);
        } catch (decryptError) {
          console.error('[SettingsDB] Failed to decrypt password:', decryptError);
          throw decryptError;
        }
      }

      return config;
    } catch (error) {
      console.error('[SettingsDB] Failed to parse SMTP config:', error);
      return null;
    }
  },

  /**
   * Save SMTP config to database (password encrypted)
   */
  setSMTPConfig: (config: SMTPConfig): void => {
    // Encrypt password before saving
    let encryptedPass: string;
    try {
      encryptedPass = encrypt(config.auth.pass);
    } catch (encryptError) {
      console.error('[SettingsDB] Failed to encrypt password:', encryptError);
      throw encryptError;
    }

    const configToSave = {
      ...config,
      auth: {
        ...config.auth,
        pass: encryptedPass,
      },
    };

    settingsDb.set('smtp_config', JSON.stringify(configToSave));
  },
};
