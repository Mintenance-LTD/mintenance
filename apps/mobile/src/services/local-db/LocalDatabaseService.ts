import * as SQLite from 'expo-sqlite';
import { logger } from '../../utils/logger';
import type { User, Job, Message } from '@mintenance/types';
import { getDatabaseOpenOptions } from './encryption';
import { runMigrations as runVersionedMigrations } from './migrations';
import { saveUser, getUser, getAllUsers } from './UserStore';
import {
  saveJob,
  getJob,
  getJobsByHomeowner,
  getJobsByStatus,
} from './JobStore';
import { saveMessage, getMessagesByJob } from './MessageStore';
import {
  getDirtyRecords,
  markRecordSynced,
  getSyncMetadata,
  updateSyncMetadata,
  queueOfflineAction,
  getOfflineActions,
  removeOfflineAction,
  bumpOfflineActionRetry,
  clearAllData,
  getStorageInfo,
} from './SyncStore';
import type {
  SyncMetadata,
  DatabaseUserRow,
  DatabaseJobRow,
  DatabaseMessageRow,
  DatabaseOfflineActionRow,
} from './types';

class LocalDatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'mintenance_local.db';
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const openOptions = await getDatabaseOpenOptions();
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME, openOptions);
      await this.createTables();
      await this.runMigrations();
      this.isInitialized = true;
      logger.info('Local database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize local database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, first_name TEXT, last_name TEXT, role TEXT NOT NULL, phone TEXT, profile_image_url TEXT, bio TEXT, rating REAL DEFAULT 0, total_jobs_completed INTEGER DEFAULT 0, is_available BOOLEAN DEFAULT TRUE, latitude REAL, longitude REAL, address TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, synced_at TEXT, is_dirty BOOLEAN DEFAULT FALSE)`,
      `CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, location TEXT, homeowner_id TEXT, contractor_id TEXT, status TEXT NOT NULL DEFAULT 'posted', budget REAL, category TEXT, subcategory TEXT, priority TEXT DEFAULT 'medium', photos TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, synced_at TEXT, is_dirty BOOLEAN DEFAULT FALSE)`,
      `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, job_id TEXT, sender_id TEXT NOT NULL, receiver_id TEXT, message_text TEXT, message_type TEXT DEFAULT 'text', attachment_url TEXT, read BOOLEAN DEFAULT FALSE, created_at TEXT NOT NULL, synced_at TEXT, is_dirty BOOLEAN DEFAULT FALSE)`,
      `CREATE TABLE IF NOT EXISTS bids (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, contractor_id TEXT NOT NULL, amount REAL NOT NULL, description TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT, synced_at TEXT, is_dirty BOOLEAN DEFAULT FALSE)`,
      `CREATE TABLE IF NOT EXISTS sync_metadata (table_name TEXT PRIMARY KEY, last_sync_timestamp INTEGER NOT NULL DEFAULT 0, record_count INTEGER DEFAULT 0, is_dirty BOOLEAN DEFAULT FALSE)`,
      `CREATE TABLE IF NOT EXISTS offline_actions (id TEXT PRIMARY KEY, type TEXT NOT NULL, entity TEXT NOT NULL, data TEXT NOT NULL, retry_count INTEGER DEFAULT 0, max_retries INTEGER DEFAULT 3, query_key TEXT, created_at INTEGER NOT NULL, synced_at INTEGER)`,
    ];
    for (const tableSQL of tables) await this.db.execAsync(tableSQL);
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
    for (const indexSQL of indexes) await this.db.execAsync(indexSQL);
  }

  /**
   * AUDIT_PUNCH_LIST P2 #46 (B3-P2-2) — refactored 2026-05-09 to use
   * the proper versioned migration framework in `./migrations.ts`.
   * The two ad-hoc PRAGMA-driven checks that lived here previously
   * are now formal migrations 1 and 2 in `MIGRATIONS`. Future
   * schema changes append a new entry instead of stuffing another
   * `PRAGMA`-and-`ALTER` block into this file.
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await runVersionedMigrations(this.db);
  }

  private requireDb(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  // User operations
  async saveUser(user: User, markDirty = false): Promise<void> {
    return saveUser(this.requireDb(), user, markDirty);
  }
  async getUser(userId: string): Promise<User | null> {
    return getUser(this.requireDb(), userId);
  }
  async getAllUsers(): Promise<User[]> {
    return getAllUsers(this.requireDb());
  }

  // Job operations
  async saveJob(job: Job, markDirty = false): Promise<void> {
    return saveJob(this.requireDb(), job, markDirty);
  }
  async getJob(jobId: string): Promise<Job | null> {
    return getJob(this.requireDb(), jobId);
  }
  async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    return getJobsByHomeowner(this.requireDb(), homeownerId);
  }
  async getJobsByStatus(status: string, userId?: string): Promise<Job[]> {
    return getJobsByStatus(this.requireDb(), status, userId);
  }

  // Message operations
  async saveMessage(
    message: Omit<Message, 'senderName' | 'senderRole'>,
    markDirty = false
  ): Promise<void> {
    return saveMessage(this.requireDb(), message, markDirty);
  }
  async getMessagesByJob(jobId: string, limit = 50): Promise<Message[]> {
    return getMessagesByJob(this.requireDb(), jobId, limit);
  }

  // Sync operations
  async getDirtyRecords(
    table: string
  ): Promise<(DatabaseUserRow | DatabaseJobRow | DatabaseMessageRow)[]> {
    return getDirtyRecords(this.requireDb(), table);
  }
  async markRecordSynced(table: string, id: string): Promise<void> {
    return markRecordSynced(this.requireDb(), table, id);
  }
  async getSyncMetadata(tableName: string): Promise<SyncMetadata | null> {
    return getSyncMetadata(this.requireDb(), tableName);
  }
  async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    return updateSyncMetadata(this.requireDb(), metadata);
  }
  async queueOfflineAction(action: {
    id: string;
    type: string;
    entity: string;
    data: unknown;
    maxRetries: number;
    queryKey?: string[];
  }): Promise<void> {
    return queueOfflineAction(this.requireDb(), action);
  }
  async getOfflineActions(): Promise<DatabaseOfflineActionRow[]> {
    return getOfflineActions(this.requireDb());
  }
  async removeOfflineAction(actionId: string): Promise<void> {
    return removeOfflineAction(this.requireDb(), actionId);
  }
  async bumpOfflineActionRetry(
    actionId: string
  ): Promise<{ retryCount: number; maxRetries: number } | null> {
    return bumpOfflineActionRetry(this.requireDb(), actionId);
  }
  async clearAllData(): Promise<void> {
    return clearAllData(this.requireDb());
  }
  async getStorageInfo(): Promise<{
    totalRecords: number;
    dirtyRecords: number;
    pendingActions: number;
  }> {
    return getStorageInfo(this.requireDb());
  }

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
