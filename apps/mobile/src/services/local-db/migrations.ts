import type * as SQLite from 'expo-sqlite';
import { logger } from '../../utils/logger';

/**
 * AUDIT_PUNCH_LIST P2 #46 (B3-P2-2) — proper migration framework
 * for the on-device SQLite database.
 *
 * Replaces the previous ad-hoc `PRAGMA table_info` checks in
 * `LocalDatabaseService.runMigrations`. Each migration declares a
 * `version` (monotonically increasing integer) + a `name` for
 * humans + an `up` function. The framework:
 *
 *   1. Reads the current applied version from `schema_version`
 *   2. Applies every migration with `version > current` in order
 *   3. Updates `schema_version` after each successful migration
 *   4. Each migration runs in its own try/catch so a failure rolls
 *      back its own work (best-effort) without poisoning later runs
 *
 * To add a new migration: append `{ version: N+1, name, up }` to
 * the `MIGRATIONS` array below. Never reorder, never delete, never
 * change the version of an applied migration — those are the only
 * three things that break the framework.
 */

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

interface SchemaVersionRow {
  version: number;
}

/**
 * The canonical migration list. ORDER MATTERS — never reorder,
 * never delete, append only.
 *
 * Migration 1 + 2 absorb the old `runMigrations` ad-hoc checks
 * (PRAGMA-driven `messages` and `jobs` column-nullability fixes).
 * They use `PRAGMA table_info` so they're idempotent on databases
 * already in the post-fix shape.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'messages_columns_nullable',
    up: async (db) => {
      const tableInfo = await db.getAllAsync<{
        name: string;
        notnull: number;
      }>('PRAGMA table_info(messages)');
      const receiverIdCol = tableInfo.find((col) => col.name === 'receiver_id');
      if (receiverIdCol?.notnull !== 1) {
        // Already nullable — no work to do (could be a fresh install).
        return;
      }

      try {
        await db.execAsync('ALTER TABLE messages RENAME TO messages_backup');
        await db.execAsync(
          `CREATE TABLE messages (id TEXT PRIMARY KEY, job_id TEXT, sender_id TEXT NOT NULL, receiver_id TEXT, message_text TEXT, message_type TEXT DEFAULT 'text', attachment_url TEXT, read BOOLEAN DEFAULT FALSE, created_at TEXT NOT NULL, synced_at TEXT, is_dirty BOOLEAN DEFAULT FALSE)`
        );
        await db.execAsync(
          'INSERT OR IGNORE INTO messages SELECT * FROM messages_backup'
        );
        await db.execAsync('DROP TABLE IF EXISTS messages_backup');
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id)'
        );
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)'
        );
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)'
        );
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_dirty_messages ON messages(is_dirty) WHERE is_dirty = TRUE'
        );
      } catch (error) {
        await db
          .execAsync('DROP TABLE IF EXISTS messages_backup')
          .catch((cleanupError) => {
            logger.warn(
              'Migration v1 rollback: failed to drop messages_backup',
              { cleanupError }
            );
          });
        throw error;
      }
    },
  },
  {
    version: 2,
    name: 'jobs_columns_nullable',
    up: async (db) => {
      const jobsInfo = await db.getAllAsync<{
        name: string;
        notnull: number;
      }>('PRAGMA table_info(jobs)');
      const homeownerCol = jobsInfo.find((col) => col.name === 'homeowner_id');
      if (homeownerCol?.notnull !== 1) {
        return; // Already nullable
      }

      try {
        await db.execAsync('ALTER TABLE jobs RENAME TO jobs_backup');
        await db.execAsync(
          `CREATE TABLE jobs (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, location TEXT, homeowner_id TEXT, contractor_id TEXT, status TEXT NOT NULL DEFAULT 'posted', budget REAL, category TEXT, subcategory TEXT, priority TEXT DEFAULT 'medium', photos TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, synced_at TEXT, is_dirty BOOLEAN DEFAULT FALSE)`
        );
        await db.execAsync(
          'INSERT OR IGNORE INTO jobs SELECT * FROM jobs_backup'
        );
        await db.execAsync('DROP TABLE IF EXISTS jobs_backup');
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_jobs_homeowner ON jobs(homeowner_id)'
        );
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)'
        );
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_dirty_jobs ON jobs(is_dirty) WHERE is_dirty = TRUE'
        );
      } catch (error) {
        await db
          .execAsync('DROP TABLE IF EXISTS jobs_backup')
          .catch((cleanupError) => {
            logger.warn('Migration v2 rollback: failed to drop jobs_backup', {
              cleanupError,
            });
          });
        throw error;
      }
    },
  },
];

/**
 * Apply any pending migrations to bring the local DB up to date.
 *
 * Reads `schema_version`, applies every migration with
 * `version > current` in order, and bumps `schema_version` after
 * each one. Stops on first failure (later migrations may depend
 * on earlier ones).
 *
 * Safe to call multiple times — already-applied migrations are
 * skipped via the version check.
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Bootstrap the version-tracking table on first run.
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL DEFAULT 0)`
  );
  await db.execAsync(
    `INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0)`
  );

  const row = await db.getFirstAsync<SchemaVersionRow>(
    'SELECT version FROM schema_version WHERE id = 1'
  );
  const currentVersion = row?.version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version
  );

  if (pending.length === 0) {
    logger.info('LocalDatabase migrations: up to date', {
      version: currentVersion,
    });
    return;
  }

  logger.info('LocalDatabase migrations: applying pending', {
    from: currentVersion,
    count: pending.length,
    versions: pending.map((m) => m.version),
  });

  for (const migration of pending) {
    try {
      await migration.up(db);
      await db.runAsync('UPDATE schema_version SET version = ? WHERE id = 1', [
        migration.version,
      ]);
      logger.info('LocalDatabase migration applied', {
        version: migration.version,
        name: migration.name,
      });
    } catch (error) {
      logger.error('LocalDatabase migration failed', {
        version: migration.version,
        name: migration.name,
        error,
      });
      throw error;
    }
  }
}
