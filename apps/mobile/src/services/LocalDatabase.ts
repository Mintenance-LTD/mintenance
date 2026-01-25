import * as SQLite from 'expo-sqlite';
import type { User, Job, Message, Bid } from '@mintenance/types';
import { logger } from '../utils/logger';

export interface LocalDatabaseConfig {
  name: string;
  version: number;
}

export interface SyncMetadata {
  table: string;
  lastSyncTimestamp: number;
  recordCount: number;
  isDirty: boolean;
}

// Database row interfaces (SQLite schema with snake_case)
interface DatabaseUserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  phone: string | null;
  profile_image_url: string | null;
  bio: string | null;
  rating: number | null;
  total_jobs_completed: number | null;
  is_available: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  is_dirty: number;
}

interface DatabaseJobRow {
  id: string;
  title: string;
  description: string;
  location: string;
  homeowner_id: string;
  contractor_id: string | null;
  status: string;
  budget: number;
  category: string | null;
  subcategory: string | null;
  priority: string | null;
  photos: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  is_dirty: number;
}

interface DatabaseMessageRow {
  id: string;
  job_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: string;
  attachment_url: string | null;
  read: number;
  created_at: string;
  synced_at: string | null;
  is_dirty: number;
  // Joined fields from users table
  first_name?: string | null;
  last_name?: string | null;
  role?: string;
}

interface DatabaseSyncMetadataRow {
  table_name: string;
  last_sync_timestamp: number;
  record_count: number;
  is_dirty: number;
}

interface DatabaseStorageInfoRow {
  total?: number;
  dirty?: number;
  actions?: number;
}

interface DatabaseOfflineActionRow {
  id: string;
  type: string;
  entity: string;
  data: string;
  retry_count: number;
  max_retries: number;
  query_key: string | null;
  created_at: number;
  synced_at: number | null;
}

class LocalDatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'mintenance_local.db';
  private readonly DB_VERSION = 1;
  private isInitialized = false;

  /**
   * Initialize the local database
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
      await this.createTables();
      await this.runMigrations();
      this.isInitialized = true;
      logger.info('Local database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize local database:', error);
      throw error;
    }
  }

  /**
   * Create all necessary tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT NOT NULL,
        phone TEXT,
        profile_image_url TEXT,
        bio TEXT,
        rating REAL DEFAULT 0,
        total_jobs_completed INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT TRUE,
        latitude REAL,
        longitude REAL,
        address TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        is_dirty BOOLEAN DEFAULT FALSE
      )`,

      // Jobs table
      `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        homeowner_id TEXT NOT NULL,
        contractor_id TEXT,
        status TEXT NOT NULL DEFAULT 'posted',
        budget REAL NOT NULL,
        category TEXT,
        subcategory TEXT,
        priority TEXT DEFAULT 'medium',
        photos TEXT, -- JSON array as string
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        is_dirty BOOLEAN DEFAULT FALSE
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        message_text TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        attachment_url TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        is_dirty BOOLEAN DEFAULT FALSE
      )`,

      // Bids table
      `CREATE TABLE IF NOT EXISTS bids (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        contractor_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT,
        synced_at TEXT,
        is_dirty BOOLEAN DEFAULT FALSE
      )`,

      // Sync metadata table
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        table_name TEXT PRIMARY KEY,
        last_sync_timestamp INTEGER NOT NULL DEFAULT 0,
        record_count INTEGER DEFAULT 0,
        is_dirty BOOLEAN DEFAULT FALSE
      )`,

      // Offline actions queue
      `CREATE TABLE IF NOT EXISTS offline_actions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        entity TEXT NOT NULL,
        data TEXT NOT NULL, -- JSON data
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        query_key TEXT, -- JSON array as string
        created_at INTEGER NOT NULL,
        synced_at INTEGER
      )`,
    ];

    for (const tableSQL of tables) {
      await this.db.execAsync(tableSQL);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_homeowner ON jobs(homeowner_id)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_contractor ON jobs(contractor_id)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)',
      'CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)',
      'CREATE INDEX IF NOT EXISTS idx_bids_job ON bids(job_id)',
      'CREATE INDEX IF NOT EXISTS idx_bids_contractor ON bids(contractor_id)',
      'CREATE INDEX IF NOT EXISTS idx_dirty_users ON users(is_dirty) WHERE is_dirty = TRUE',
      'CREATE INDEX IF NOT EXISTS idx_dirty_jobs ON jobs(is_dirty) WHERE is_dirty = TRUE',
      'CREATE INDEX IF NOT EXISTS idx_dirty_messages ON messages(is_dirty) WHERE is_dirty = TRUE',
    ];

    for (const indexSQL of indexes) {
      await this.db.execAsync(indexSQL);
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    // Placeholder for future migrations
    logger.info('Database migrations completed');
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async saveUser(user: User, markDirty: boolean = false): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO users
      (id, email, first_name, last_name, role, phone, profile_image_url, bio, rating,
       total_jobs_completed, is_available, latitude, longitude, address, created_at,
       updated_at, synced_at, is_dirty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      user.id,
      user.email,
      user.first_name,
      user.last_name,
      user.role,
      user.phone || null,
      user.profile_image_url || null,
      user.bio || null,
      user.rating || 0,
      user.jobs_count || 0,
      1, // is_available - not in User type, default to true
      null, // latitude - not in User type
      null, // longitude - not in User type
      user.location || null, // address field uses location from User type
      user.created_at,
      user.updated_at,
      markDirty ? null : new Date().toISOString(),
      markDirty ? 1 : 0,
    ];

    await this.db.runAsync(query, values);
    logger.debug('User saved to local database', {
      userId: user.id,
      markDirty,
    });
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM users WHERE id = ?';
    const result = await this.db.getFirstAsync<DatabaseUserRow>(query, [userId]);

    return result ? this.mapRowToUser(result) : null;
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const rows = await this.db.getAllAsync<DatabaseUserRow>(query);

    return rows.map((row) => this.mapRowToUser(row));
  }

  private mapRowToUser(row: DatabaseUserRow): User {
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      role: row.role as 'homeowner' | 'contractor' | 'admin',
      phone: row.phone ?? undefined,
      profile_image_url: row.profile_image_url ?? undefined,
      bio: row.bio ?? undefined,
      rating: row.rating ?? undefined,
      jobs_count: row.total_jobs_completed ?? undefined,
      location: row.address ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Computed fields for backward compatibility
      firstName: row.first_name ?? undefined,
      lastName: row.last_name ?? undefined,
      createdAt: row.created_at,
    };
  }

  // ============================================================================
  // JOB OPERATIONS
  // ============================================================================

  async saveJob(job: Job, markDirty: boolean = false): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO jobs 
      (id, title, description, location, homeowner_id, contractor_id, status, budget, 
       category, subcategory, priority, photos, created_at, updated_at, synced_at, is_dirty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      job.id,
      job.title,
      job.description,
      job.location,
      job.homeowner_id,
      job.contractor_id || null,
      job.status,
      job.budget,
      job.category || null,
      job.subcategory || null,
      job.priority || 'medium',
      job.photos ? JSON.stringify(job.photos) : null,
      job.created_at,
      job.updated_at,
      markDirty ? null : new Date().toISOString(),
      markDirty ? 1 : 0,
    ];

    await this.db.runAsync(query, values);
    logger.debug('Job saved to local database', { jobId: job.id, markDirty });
  }

  async getJob(jobId: string): Promise<Job | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM jobs WHERE id = ?';
    const result = await this.db.getFirstAsync<DatabaseJobRow>(query, [jobId]);

    return result ? this.mapRowToJob(result) : null;
  }

  async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query =
      'SELECT * FROM jobs WHERE homeowner_id = ? ORDER BY created_at DESC';
    const rows = await this.db.getAllAsync<DatabaseJobRow>(query, [homeownerId]);

    return rows.map((row) => this.mapRowToJob(row));
  }

  async getJobsByStatus(status: string, userId?: string): Promise<Job[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM jobs WHERE status = ?';
    const params = [status];

    if (userId) {
      query += ' AND (homeowner_id = ? OR contractor_id = ?)';
      params.push(userId, userId);
    }

    query += ' ORDER BY created_at DESC';
    const rows = await this.db.getAllAsync<DatabaseJobRow>(query, params);

    return rows.map((row) => this.mapRowToJob(row));
  }

  private mapRowToJob(row: DatabaseJobRow): Job {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      homeowner_id: row.homeowner_id,
      contractor_id: row.contractor_id ?? undefined,
      status: row.status as 'posted' | 'assigned' | 'in_progress' | 'completed',
      budget: row.budget,
      category: row.category ?? undefined,
      subcategory: row.subcategory ?? undefined,
      priority: row.priority as 'low' | 'medium' | 'high' | undefined,
      photos: row.photos ? JSON.parse(row.photos) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Computed fields for backward compatibility
      homeownerId: row.homeowner_id,
      contractorId: row.contractor_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // MESSAGE OPERATIONS
  // ============================================================================

  async saveMessage(
    message: Omit<Message, 'senderName' | 'senderRole'>,
    markDirty: boolean = false
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO messages 
      (id, job_id, sender_id, receiver_id, message_text, message_type, attachment_url, 
       read, created_at, synced_at, is_dirty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      message.id,
      message.jobId ?? null,
      message.senderId,
      message.receiverId,
      message.messageText ?? null,
      message.messageType ?? null,
      message.attachmentUrl ?? null,
      message.read ? 1 : 0,
      message.createdAt,
      markDirty ? null : new Date().toISOString(),
      markDirty ? 1 : 0,
    ];

    await this.db.runAsync(query, values);
    logger.debug('Message saved to local database', {
      messageId: message.id,
      markDirty,
    });
  }

  async getMessagesByJob(
    jobId: string,
    limit: number = 50
  ): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT m.*, u.first_name, u.last_name, u.role
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.job_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `;

    const rows = await this.db.getAllAsync<DatabaseMessageRow>(query, [jobId, limit]);
    return rows.map((row) => this.mapRowToMessage(row)).reverse(); // Chronological order
  }

  private mapRowToMessage(row: DatabaseMessageRow): Message {
    return {
      id: row.id,
      jobId: row.job_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      messageText: row.message_text,
      messageType: row.message_type as 'text' | 'image' | 'file' | 'video_call_invitation' | 'video_call_started' | 'video_call_ended' | 'video_call_missed' | 'contract_submitted' | undefined,
      attachmentUrl: row.attachment_url ?? undefined,
      read: Boolean(row.read),
      createdAt: row.created_at,
      senderName:
        row.first_name && row.last_name
          ? `${row.first_name} ${row.last_name}`.trim()
          : 'Unknown User',
      senderRole: row.role,
    };
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  async getDirtyRecords(table: string): Promise<Array<DatabaseUserRow | DatabaseJobRow | DatabaseMessageRow>> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `SELECT * FROM ${table} WHERE is_dirty = TRUE ORDER BY updated_at DESC`;
    return await this.db.getAllAsync<DatabaseUserRow | DatabaseJobRow | DatabaseMessageRow>(query);
  }

  async markRecordSynced(table: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `UPDATE ${table} SET is_dirty = FALSE, synced_at = ? WHERE id = ?`;
    await this.db.runAsync(query, [new Date().toISOString(), id]);
  }

  async getSyncMetadata(tableName: string): Promise<SyncMetadata | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM sync_metadata WHERE table_name = ?';
    const result = await this.db.getFirstAsync<DatabaseSyncMetadataRow>(query, [tableName]);

    if (!result) return null;

    return {
      table: result.table_name,
      lastSyncTimestamp: result.last_sync_timestamp,
      recordCount: result.record_count,
      isDirty: Boolean(result.is_dirty),
    };
  }

  async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO sync_metadata 
      (table_name, last_sync_timestamp, record_count, is_dirty)
      VALUES (?, ?, ?, ?)
    `;

    await this.db.runAsync(query, [
      metadata.table,
      metadata.lastSyncTimestamp,
      metadata.recordCount,
      metadata.isDirty ? 1 : 0,
    ]);
  }

  // ============================================================================
  // OFFLINE ACTIONS QUEUE
  // ============================================================================

  async queueOfflineAction(action: {
    id: string;
    type: string;
    entity: string;
    data: unknown;
    maxRetries: number;
    queryKey?: string[];
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO offline_actions 
      (id, type, entity, data, retry_count, max_retries, query_key, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `;

    await this.db.runAsync(query, [
      action.id,
      action.type,
      action.entity,
      JSON.stringify(action.data),
      action.maxRetries,
      action.queryKey ? JSON.stringify(action.queryKey) : null,
      Date.now(),
    ]);
  }

  async getOfflineActions(): Promise<DatabaseOfflineActionRow[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query =
      'SELECT * FROM offline_actions WHERE synced_at IS NULL ORDER BY created_at ASC';
    return await this.db.getAllAsync<DatabaseOfflineActionRow>(query);
  }

  async removeOfflineAction(actionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'DELETE FROM offline_actions WHERE id = ?';
    await this.db.runAsync(query, [actionId]);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      'users',
      'jobs',
      'messages',
      'bids',
      'sync_metadata',
      'offline_actions',
    ];

    for (const table of tables) {
      await this.db.runAsync(`DELETE FROM ${table}`);
    }

    logger.info('All local data cleared');
  }

  async getStorageInfo(): Promise<{
    totalRecords: number;
    dirtyRecords: number;
    pendingActions: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const totalQuery = `
      SELECT
        (SELECT COUNT(*) FROM users) +
        (SELECT COUNT(*) FROM jobs) +
        (SELECT COUNT(*) FROM messages) +
        (SELECT COUNT(*) FROM bids) as total
    `;

    const dirtyQuery = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_dirty = TRUE) +
        (SELECT COUNT(*) FROM jobs WHERE is_dirty = TRUE) +
        (SELECT COUNT(*) FROM messages WHERE is_dirty = TRUE) +
        (SELECT COUNT(*) FROM bids WHERE is_dirty = TRUE) as dirty
    `;

    const actionsQuery =
      'SELECT COUNT(*) as actions FROM offline_actions WHERE synced_at IS NULL';

    const [totalResult, dirtyResult, actionsResult] = await Promise.all([
      this.db.getFirstAsync<DatabaseStorageInfoRow>(totalQuery),
      this.db.getFirstAsync<DatabaseStorageInfoRow>(dirtyQuery),
      this.db.getFirstAsync<DatabaseStorageInfoRow>(actionsQuery),
    ]);

    return {
      totalRecords: totalResult?.total || 0,
      dirtyRecords: dirtyResult?.dirty || 0,
      pendingActions: actionsResult?.actions || 0,
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      logger.info('Local database connection closed');
    }
  }
}

export const LocalDatabase = new LocalDatabaseService();
