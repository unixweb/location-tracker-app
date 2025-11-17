/**
 * Database operations for password reset tokens
 */
import { getDb } from './db';
import { randomUUID } from 'crypto';

export interface PasswordResetToken {
  token: string;
  user_id: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export const passwordResetDb = {
  /**
   * Create a new password reset token
   * Returns token string
   */
  create: (userId: string, expiresInHours: number = 1): string => {
    const db = getDb();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(token, userId, expiresAt);

    db.close();
    return token;
  },

  /**
   * Get token by token string
   */
  findByToken: (token: string): PasswordResetToken | null => {
    const db = getDb();
    const result = db
      .prepare('SELECT * FROM password_reset_tokens WHERE token = ?')
      .get(token) as PasswordResetToken | undefined;
    db.close();
    return result || null;
  },

  /**
   * Validate token (exists, not used, not expired)
   */
  isValid: (token: string): boolean => {
    const resetToken = passwordResetDb.findByToken(token);
    if (!resetToken) return false;
    if (resetToken.used) return false;

    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    if (now > expiresAt) return false;

    return true;
  },

  /**
   * Mark token as used
   */
  markUsed: (token: string): boolean => {
    const db = getDb();
    const result = db
      .prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?')
      .run(token);
    db.close();
    return result.changes > 0;
  },

  /**
   * Delete expired tokens (cleanup)
   */
  deleteExpired: (): number => {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')")
      .run();
    db.close();
    return result.changes;
  },

  /**
   * Delete all tokens for a user
   */
  deleteByUserId: (userId: string): number => {
    const db = getDb();
    const result = db
      .prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')
      .run(userId);
    db.close();
    return result.changes;
  },
};
