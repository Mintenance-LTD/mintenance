import { LocalDatabase } from '../LocalDatabase';
import { JobService } from '../JobService';
import { MessagingService } from '../MessagingService';
import { logger } from '../../utils/logger';
import type { Job } from '@mintenance/types';
import type {
  DatabaseOfflineActionRow,
  JobActionData,
  MessageActionData,
} from './types';

/**
 * Offline-action queue processor extracted from SyncManager.ts on
 * 2026-05-09. Consumes the rows queued by mutations issued while the
 * device was offline and replays them against the live API.
 *
 * Note: jobs CREATE / UPDATE go through JobService here, but the
 * canonical job mutation queue lives in OfflineManager. This is the
 * legacy path — kept until OfflineManager fully takes over.
 */

export async function processOfflineActions(): Promise<void> {
  const actions = await LocalDatabase.getOfflineActions();
  if (actions.length === 0) return;

  logger.debug('Processing offline actions', { count: actions.length });

  for (const action of actions) {
    const actionRow = action as DatabaseOfflineActionRow;

    // 2026-05-27 whole-app review Critical #9: a malformed `data`
    // column (e.g. corrupted on write, schema-drift, partial write)
    // would throw inside the try/catch below and the row would stay
    // in the queue forever — every sync cycle would retry the
    // unparseable row, blocking other actions queued behind it.
    // Parse separately so a poison-pill can be dead-lettered
    // immediately instead of waiting for max_retries.
    let data: unknown;
    try {
      data = JSON.parse(actionRow.data);
    } catch (parseError) {
      logger.error(
        'Offline action JSON corrupt — dead-lettering immediately',
        parseError as unknown,
        { id: actionRow.id, entity: actionRow.entity, type: actionRow.type }
      );
      await LocalDatabase.removeOfflineAction(actionRow.id);
      continue;
    }

    try {
      switch (actionRow.entity) {
        case 'job':
          await processJobAction(actionRow.type, data);
          break;
        case 'message':
          await processMessageAction(actionRow.type, data);
          break;
        default:
          logger.warn('Unknown action entity:', actionRow.entity);
      }

      await LocalDatabase.removeOfflineAction(actionRow.id);
      logger.debug('Processed offline action:', actionRow.id);
    } catch (error) {
      // 2026-05-27 whole-app review Critical #9: track retry_count and
      // dead-letter once max_retries is exceeded so a persistently-
      // failing action (referenced row deleted, server schema changed,
      // etc.) doesn't block the queue forever. Previously every
      // failure simply left the row in place, retrying indefinitely.
      const retryStatus = await LocalDatabase.bumpOfflineActionRetry(
        actionRow.id
      );
      const exhausted =
        retryStatus !== null &&
        retryStatus.retryCount >= retryStatus.maxRetries;

      logger.error('Failed to process offline action', error as unknown, {
        id: actionRow.id,
        entity: actionRow.entity,
        type: actionRow.type,
        retryCount: retryStatus?.retryCount,
        maxRetries: retryStatus?.maxRetries,
        deadLettered: exhausted,
      });

      if (exhausted) {
        await LocalDatabase.removeOfflineAction(actionRow.id);
      }
      // Otherwise: keep action in queue for retry on the next sync cycle.
    }
  }
}

async function processJobAction(type: string, data: unknown): Promise<void> {
  const jobData = data as JobActionData;

  switch (type) {
    case 'CREATE':
      await JobService.createJob(
        data as Parameters<typeof JobService.createJob>[0]
      );
      break;
    case 'UPDATE':
      if (!jobData.jobId || !jobData.status) {
        throw new Error('Missing required fields for job update');
      }
      await JobService.updateJobStatus(
        jobData.jobId,
        jobData.status as Job['status'],
        jobData.contractorId
      );
      break;
    default:
      throw new Error(`Unknown job action: ${type}`);
  }
}

async function processMessageAction(
  type: string,
  data: unknown
): Promise<void> {
  const messageData = data as MessageActionData;

  switch (type) {
    case 'CREATE':
      await MessagingService.sendMessage(
        messageData.jobId,
        messageData.receiverId,
        messageData.messageText,
        messageData.senderId,
        messageData.messageType as 'text' | 'image' | 'file',
        messageData.attachmentUrl
      );
      break;
    default:
      throw new Error(`Unknown message action: ${type}`);
  }
}
