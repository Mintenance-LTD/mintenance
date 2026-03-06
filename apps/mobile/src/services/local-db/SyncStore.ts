import { logger } from '../../utils/logger';
import type { SyncMetadata, DatabaseSyncMetadataRow, DatabaseUserRow, DatabaseJobRow, DatabaseMessageRow, DatabaseOfflineActionRow } from './types';

export async function getDirtyRecords(
  db: import('expo-sqlite').SQLiteDatabase,
  table: string
): Promise<(DatabaseUserRow | DatabaseJobRow | DatabaseMessageRow)[]> {
  const query = `SELECT * FROM ${table} WHERE is_dirty = TRUE ORDER BY updated_at DESC`;
  return await db.getAllAsync<DatabaseUserRow | DatabaseJobRow | DatabaseMessageRow>(query);
}

export async function markRecordSynced(
  db: import('expo-sqlite').SQLiteDatabase,
  table: string,
  id: string
): Promise<void> {
  await db.runAsync(`UPDATE ${table} SET is_dirty = FALSE, synced_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
}

export async function getSyncMetadata(
  db: import('expo-sqlite').SQLiteDatabase,
  tableName: string
): Promise<SyncMetadata | null> {
  const result = await db.getFirstAsync<DatabaseSyncMetadataRow>('SELECT * FROM sync_metadata WHERE table_name = ?', [tableName]);
  if (!result) return null;
  return { table: result.table_name, lastSyncTimestamp: result.last_sync_timestamp, recordCount: result.record_count, isDirty: Boolean(result.is_dirty) };
}

export async function updateSyncMetadata(
  db: import('expo-sqlite').SQLiteDatabase,
  metadata: SyncMetadata
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_metadata (table_name, last_sync_timestamp, record_count, is_dirty) VALUES (?, ?, ?, ?)',
    [metadata.table, metadata.lastSyncTimestamp, metadata.recordCount, metadata.isDirty ? 1 : 0]
  );
}

export async function queueOfflineAction(
  db: import('expo-sqlite').SQLiteDatabase,
  action: { id: string; type: string; entity: string; data: unknown; maxRetries: number; queryKey?: string[] }
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO offline_actions (id, type, entity, data, retry_count, max_retries, query_key, created_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)',
    [action.id, action.type, action.entity, JSON.stringify(action.data), action.maxRetries, action.queryKey ? JSON.stringify(action.queryKey) : null, Date.now()]
  );
}

export async function getOfflineActions(db: import('expo-sqlite').SQLiteDatabase): Promise<DatabaseOfflineActionRow[]> {
  return await db.getAllAsync<DatabaseOfflineActionRow>('SELECT * FROM offline_actions WHERE synced_at IS NULL ORDER BY created_at ASC');
}

export async function removeOfflineAction(db: import('expo-sqlite').SQLiteDatabase, actionId: string): Promise<void> {
  await db.runAsync('DELETE FROM offline_actions WHERE id = ?', [actionId]);
}

export async function clearAllData(db: import('expo-sqlite').SQLiteDatabase): Promise<void> {
  for (const table of ['users', 'jobs', 'messages', 'bids', 'sync_metadata', 'offline_actions']) {
    await db.runAsync(`DELETE FROM ${table}`);
  }
  logger.info('All local data cleared');
}

export async function getStorageInfo(db: import('expo-sqlite').SQLiteDatabase): Promise<{ totalRecords: number; dirtyRecords: number; pendingActions: number }> {
  const [totalResult, dirtyResult, actionsResult] = await Promise.all([
    db.getFirstAsync<{ total?: number }>('SELECT (SELECT COUNT(*) FROM users) + (SELECT COUNT(*) FROM jobs) + (SELECT COUNT(*) FROM messages) + (SELECT COUNT(*) FROM bids) as total'),
    db.getFirstAsync<{ dirty?: number }>('SELECT (SELECT COUNT(*) FROM users WHERE is_dirty = TRUE) + (SELECT COUNT(*) FROM jobs WHERE is_dirty = TRUE) + (SELECT COUNT(*) FROM messages WHERE is_dirty = TRUE) + (SELECT COUNT(*) FROM bids WHERE is_dirty = TRUE) as dirty'),
    db.getFirstAsync<{ actions?: number }>('SELECT COUNT(*) as actions FROM offline_actions WHERE synced_at IS NULL'),
  ]);
  return { totalRecords: totalResult?.total || 0, dirtyRecords: dirtyResult?.dirty || 0, pendingActions: actionsResult?.actions || 0 };
}
