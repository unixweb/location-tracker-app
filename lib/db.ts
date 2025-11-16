// Database helper for SQLite operations
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const locationsDbPath = path.join(process.cwd(), 'data', 'locations.sqlite');

export function getDb() {
  const db = new Database(dbPath);
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  return db;
}

export function getLocationsDb() {
  const db = new Database(locationsDbPath);
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  return db;
}

// Device operations
export interface Device {
  id: string;
  name: string;
  color: string;
  ownerId: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  icon: string | null;
}

export const deviceDb = {
  findAll: (): Device[] => {
    const db = getDb();
    const devices = db.prepare('SELECT * FROM Device WHERE isActive = 1').all() as Device[];
    db.close();
    return devices;
  },

  findById: (id: string): Device | null => {
    const db = getDb();
    const device = db.prepare('SELECT * FROM Device WHERE id = ?').get(id) as Device | undefined;
    db.close();
    return device || null;
  },

  create: (device: { id: string; name: string; color: string; ownerId: string | null; description?: string; icon?: string }): Device => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO Device (id, name, color, ownerId, isActive, description, icon, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 1, ?, ?, datetime('now'), datetime('now'))
    `);

    stmt.run(
      device.id,
      device.name,
      device.color,
      device.ownerId,
      device.description || null,
      device.icon || null
    );

    const created = db.prepare('SELECT * FROM Device WHERE id = ?').get(device.id) as Device;
    db.close();
    return created;
  },

  update: (id: string, data: { name?: string; color?: string; description?: string; icon?: string }): Device | null => {
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      values.push(data.icon);
    }

    if (updates.length === 0) {
      db.close();
      return deviceDb.findById(id);
    }

    updates.push('updatedAt = datetime(\'now\')');
    values.push(id);

    const sql = `UPDATE Device SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);

    const updated = db.prepare('SELECT * FROM Device WHERE id = ?').get(id) as Device | undefined;
    db.close();
    return updated || null;
  },

  delete: (id: string): boolean => {
    const db = getDb();
    const result = db.prepare('UPDATE Device SET isActive = 0, updatedAt = datetime(\'now\') WHERE id = ?').run(id);
    db.close();
    return result.changes > 0;
  },
};

// User operations
export interface User {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export const userDb = {
  findAll: (): User[] => {
    const db = getDb();
    const users = db.prepare('SELECT * FROM User').all() as User[];
    db.close();
    return users;
  },

  findById: (id: string): User | null => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM User WHERE id = ?').get(id) as User | undefined;
    db.close();
    return user || null;
  },

  findByUsername: (username: string): User | null => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM User WHERE username = ?').get(username) as User | undefined;
    db.close();
    return user || null;
  },

  create: (user: { id: string; username: string; email: string | null; passwordHash: string; role: string }): User => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO User (id, username, email, passwordHash, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    stmt.run(
      user.id,
      user.username,
      user.email,
      user.passwordHash,
      user.role
    );

    const created = db.prepare('SELECT * FROM User WHERE id = ?').get(user.id) as User;
    db.close();
    return created;
  },

  update: (id: string, data: { username?: string; email?: string | null; passwordHash?: string; role?: string }): User | null => {
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.username !== undefined) {
      updates.push('username = ?');
      values.push(data.username);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.passwordHash !== undefined) {
      updates.push('passwordHash = ?');
      values.push(data.passwordHash);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }

    if (updates.length === 0) {
      db.close();
      return userDb.findById(id);
    }

    updates.push('updatedAt = datetime(\'now\')');
    values.push(id);

    const sql = `UPDATE User SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);

    const updated = db.prepare('SELECT * FROM User WHERE id = ?').get(id) as User | undefined;
    db.close();
    return updated || null;
  },

  delete: (id: string): boolean => {
    const db = getDb();
    const result = db.prepare('DELETE FROM User WHERE id = ?').run(id);
    db.close();
    return result.changes > 0;
  },
};

// Location operations (separate database for tracking data)
export interface Location {
  id?: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  marker_label: string | null;
  display_time: string | null;
  chat_id: number;
  battery: number | null;
  speed: number | null;
  created_at?: string;
}

export interface LocationFilters {
  username?: string;
  user_id?: number;
  timeRangeHours?: number;
  limit?: number;
  offset?: number;
}

export const locationDb = {
  /**
   * Insert a new location record (ignores duplicates)
   */
  create: (location: Location): Location | null => {
    const db = getLocationsDb();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO Location (
        latitude, longitude, timestamp, user_id,
        first_name, last_name, username, marker_label,
        display_time, chat_id, battery, speed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      location.latitude,
      location.longitude,
      location.timestamp,
      location.user_id || 0,
      location.first_name || null,
      location.last_name || null,
      location.username || null,
      location.marker_label || null,
      location.display_time || null,
      location.chat_id || 0,
      location.battery || null,
      location.speed || null
    );

    // If changes is 0, it was a duplicate and ignored
    if (result.changes === 0) {
      db.close();
      return null;
    }

    const created = db.prepare('SELECT * FROM Location WHERE id = ?').get(result.lastInsertRowid) as Location;
    db.close();
    return created;
  },

  /**
   * Bulk insert multiple locations (ignores duplicates, returns count of actually inserted)
   */
  createMany: (locations: Location[]): number => {
    if (locations.length === 0) return 0;

    const db = getLocationsDb();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO Location (
        latitude, longitude, timestamp, user_id,
        first_name, last_name, username, marker_label,
        display_time, chat_id, battery, speed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let insertedCount = 0;
    const insertMany = db.transaction((locations: Location[]) => {
      for (const loc of locations) {
        const result = stmt.run(
          loc.latitude,
          loc.longitude,
          loc.timestamp,
          loc.user_id || 0,
          loc.first_name || null,
          loc.last_name || null,
          loc.username || null,
          loc.marker_label || null,
          loc.display_time || null,
          loc.chat_id || 0,
          loc.battery || null,
          loc.speed || null
        );
        insertedCount += result.changes;
      }
    });

    insertMany(locations);
    db.close();
    return insertedCount;
  },

  /**
   * Find locations with filters
   */
  findMany: (filters: LocationFilters = {}): Location[] => {
    const db = getLocationsDb();
    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by user_id (typically 0 for MQTT devices)
    if (filters.user_id !== undefined) {
      conditions.push('user_id = ?');
      params.push(filters.user_id);
    }

    // Filter by username (device tracker ID)
    if (filters.username) {
      conditions.push('username = ?');
      params.push(filters.username);
    }

    // Filter by time range
    if (filters.timeRangeHours) {
      conditions.push("timestamp >= datetime('now', '-' || ? || ' hours')");
      params.push(filters.timeRangeHours);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const limit = filters.limit || 1000;
    const offset = filters.offset || 0;

    const sql = `
      SELECT * FROM Location
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const locations = db.prepare(sql).all(...params) as Location[];
    db.close();
    return locations;
  },

  /**
   * Get count of locations matching filters
   */
  count: (filters: LocationFilters = {}): number => {
    const db = getLocationsDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.user_id !== undefined) {
      conditions.push('user_id = ?');
      params.push(filters.user_id);
    }

    if (filters.username) {
      conditions.push('username = ?');
      params.push(filters.username);
    }

    if (filters.timeRangeHours) {
      conditions.push("timestamp >= datetime('now', '-' || ? || ' hours')");
      params.push(filters.timeRangeHours);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `SELECT COUNT(*) as count FROM Location ${whereClause}`;

    const result = db.prepare(sql).get(...params) as { count: number };
    db.close();
    return result.count;
  },

  /**
   * Delete locations older than specified hours
   * Returns number of deleted records
   */
  deleteOlderThan: (hours: number): number => {
    const db = getLocationsDb();
    const result = db.prepare(`
      DELETE FROM Location
      WHERE timestamp < datetime('now', '-' || ? || ' hours')
    `).run(hours);
    db.close();
    return result.changes;
  },

  /**
   * Get database stats
   */
  getStats: (): { total: number; oldest: string | null; newest: string | null; sizeKB: number } => {
    const db = getLocationsDb();

    const countResult = db.prepare('SELECT COUNT(*) as total FROM Location').get() as { total: number };
    const timeResult = db.prepare('SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM Location').get() as { oldest: string | null; newest: string | null };
    const sizeResult = db.prepare("SELECT page_count * page_size / 1024 as sizeKB FROM pragma_page_count(), pragma_page_size()").get() as { sizeKB: number };

    db.close();

    return {
      total: countResult.total,
      oldest: timeResult.oldest,
      newest: timeResult.newest,
      sizeKB: Math.round(sizeResult.sizeKB)
    };
  },
};
