import * as SQLite from 'expo-sqlite';
import { logger } from '../utils/logger';
import { User, Job, Message, Bid } from '../types';

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
      )`
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
      user.profileImageUrl || null,
      user.bio || null,
      user.rating || 0,
      user.totalJobsCompleted || 0,
      user.isAvailable ? 1 : 0,
      user.latitude || null,
      user.longitude || null,
      user.address || null,
      user.created_at,
      user.updated_at,
      markDirty ? null : new Date().toISOString(),
      markDirty ? 1 : 0
    ];

    await this.db.runAsync(query, values);
    logger.debug('User saved to local database', { userId: user.id, markDirty });
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM users WHERE id = ?';
    const result = await this.db.getFirstAsync(query, [userId]);
    
    return result ? this.mapRowToUser(result as any) : null;
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const rows = await this.db.getAllAsync(query);
    
    return rows.map(this.mapRowToUser);
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      role: row.role,
      phone: row.phone,
      profileImageUrl: row.profile_image_url,
      bio: row.bio,
      rating: row.rating,
      totalJobsCompleted: row.total_jobs_completed,
      isAvailable: Boolean(row.is_available),
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Computed fields for backward compatibility
      firstName: row.first_name,
      lastName: row.last_name,
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
      markDirty ? 1 : 0
    ];

    await this.db.runAsync(query, values);
    logger.debug('Job saved to local database', { jobId: job.id, markDirty });
  }

  async getJob(jobId: string): Promise<Job | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM jobs WHERE id = ?';
    const result = await this.db.getFirstAsync(query, [jobId]);
    
    return result ? this.mapRowToJob(result as any) : null;
  }

  async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM jobs WHERE homeowner_id = ? ORDER BY created_at DESC';
    const rows = await this.db.getAllAsync(query, [homeownerId]);
    
    return rows.map(this.mapRowToJob);
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
    const rows = await this.db.getAllAsync(query, params);
    
    return rows.map(this.mapRowToJob);
  }

  private mapRowToJob(row: any): Job {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      homeowner_id: row.homeowner_id,
      contractor_id: row.contractor_id,
      status: row.status,
      budget: row.budget,
      category: row.category,
      subcategory: row.subcategory,
      priority: row.priority,
      photos: row.photos ? JSON.parse(row.photos) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Computed fields for backward compatibility
      homeownerId: row.homeowner_id,
      contractorId: row.contractor_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // MESSAGE OPERATIONS
  // ============================================================================

  async saveMessage(message: Omit<Message, 'senderName' | 'senderRole'>, markDirty: boolean = false): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO messages 
      (id, job_id, sender_id, receiver_id, message_text, message_type, attachment_url, 
       read, created_at, synced_at, is_dirty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      message.id,
      message.jobId,
      message.senderId,
      message.receiverId,
      message.messageText,
      message.messageType,
      message.attachmentUrl || null,
      message.read ? 1 : 0,
      message.createdAt,
      markDirty ? null : new Date().toISOString(),
      markDirty ? 1 : 0
    ];

    await this.db.runAsync(query, values);
    logger.debug('Message saved to local database', { messageId: message.id, markDirty });
  }

  async getMessagesByJob(jobId: string, limit: number = 50): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT m.*, u.first_name, u.last_name, u.role 
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.job_id = ? 
      ORDER BY m.created_at DESC 
      LIMIT ?
    `;
    
    const rows = await this.db.getAllAsync(query, [jobId, limit]);
    return rows.map(this.mapRowToMessage).reverse(); // Chronological order
  }

  private mapRowToMessage(row: any): Message {
    return {
      id: row.id,
      jobId: row.job_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      messageText: row.message_text,
      messageType: row.message_type,
      attachmentUrl: row.attachment_url,
      read: Boolean(row.read),
      createdAt: row.created_at,
      senderName: row.first_name && row.last_name ? 
        `${row.first_name} ${row.last_name}`.trim() : 'Unknown User',
      senderRole: row.role,
    };
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  async getDirtyRecords(table: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `SELECT * FROM ${table} WHERE is_dirty = TRUE ORDER BY updated_at DESC`;
    return await this.db.getAllAsync(query);
  }

  async markRecordSynced(table: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `UPDATE ${table} SET is_dirty = FALSE, synced_at = ? WHERE id = ?`;
    await this.db.runAsync(query, [new Date().toISOString(), id]);
  }

  async getSyncMetadata(tableName: string): Promise<SyncMetadata | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM sync_metadata WHERE table_name = ?';
    const result = await this.db.getFirstAsync(query, [tableName]);
    
    if (!result) return null;

    return {
      table: (result as any).table_name,
      lastSyncTimestamp: (result as any).last_sync_timestamp,
      recordCount: (result as any).record_count,
      isDirty: Boolean((result as any).is_dirty),
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
      metadata.isDirty ? 1 : 0
    ]);
  }

  // ============================================================================
  // OFFLINE ACTIONS QUEUE
  // ============================================================================

  async queueOfflineAction(action: {
    id: string;
    type: string;
    entity: string;
    data: any;
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
      Date.now()
    ]);
  }

  async getOfflineActions(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM offline_actions WHERE synced_at IS NULL ORDER BY created_at ASC';
    return await this.db.getAllAsync(query);
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

    const tables = ['users', 'jobs', 'messages', 'bids', 'sync_metadata', 'offline_actions'];
    
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
    
    const actionsQuery = 'SELECT COUNT(*) as actions FROM offline_actions WHERE synced_at IS NULL';

    const [totalResult, dirtyResult, actionsResult] = await Promise.all([
      this.db.getFirstAsync(totalQuery),
      this.db.getFirstAsync(dirtyQuery),
      this.db.getFirstAsync(actionsQuery)
    ]);

    return {
      totalRecords: (totalResult as any)?.total || 0,
      dirtyRecords: (dirtyResult as any)?.dirty || 0,
      pendingActions: (actionsResult as any)?.actions || 0,
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