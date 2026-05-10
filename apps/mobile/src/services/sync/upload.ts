import { LocalDatabase } from '../LocalDatabase';
import { AuthService } from '../AuthService';
import { MessagingService } from '../MessagingService';
import { logger } from '../../utils/logger';
import type { User } from '@mintenance/types';
import type {
  DatabaseMessageRow,
  DatabaseUserRow,
  SyncOptions,
  SYNC_DEFAULTS,
} from './types';
import { SYNC_DEFAULTS as DEFAULTS } from './types';

/**
 * Upload phase of the bidirectional sync. Pushes locally-dirty rows
 * back to the server. Extracted from SyncManager.ts on 2026-05-09.
 *
 * Job uploads are intentionally not handled here — they live in
 * OfflineManager (the canonical mutation queue). Logging the skip
 * keeps the call-site of `uploadDirtyRecords('jobs', ...)` valid
 * without re-introducing duplicate upload paths.
 */

export async function uploadDirtyRecords(
  table: string,
  config: SyncOptions
): Promise<void> {
  const dirtyRecords = await LocalDatabase.getDirtyRecords(table);
  if (dirtyRecords.length === 0) return;

  logger.debug(`Uploading dirty ${table}`, { count: dirtyRecords.length });

  for (const record of dirtyRecords.slice(
    0,
    config.batchSize || DEFAULTS.BATCH_SIZE
  )) {
    try {
      await uploadRecord(table, record);
      const recordWithId = record as { id: string };
      await LocalDatabase.markRecordSynced(table, recordWithId.id);
    } catch (error) {
      logger.error(`Failed to upload ${table} record`, error as unknown, {
        id: (record as { id: string }).id,
      });
      // Don't mark as synced — the next sync cycle retries.
    }
  }
}

async function uploadRecord(table: string, record: unknown): Promise<void> {
  switch (table) {
    case 'users': {
      const userRow = record as DatabaseUserRow;
      await AuthService.updateUserProfile(userRow.id, record as Partial<User>);
      break;
    }
    case 'jobs':
      logger.warn(
        'SyncManager: Job uploads delegated to OfflineManager — skipping'
      );
      return;
    case 'messages': {
      const messageRow = record as DatabaseMessageRow;
      await MessagingService.sendMessage(
        messageRow.job_id,
        messageRow.receiver_id,
        messageRow.message_text,
        messageRow.sender_id,
        messageRow.message_type as 'text' | 'image' | 'file',
        messageRow.attachment_url || undefined
      );
      break;
    }
    default:
      throw new Error(`Unknown table: ${table}`);
  }
}
