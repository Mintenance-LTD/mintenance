import { LocalDatabase } from '../LocalDatabase';
import { AuthService } from '../AuthService';
import { JobService } from '../JobService';
import { MessagingService } from '../MessagingService';
import { logger } from '../../utils/logger';
import type { Job, Message } from '@mintenance/types';
import type { SyncOptions } from './types';

/**
 * Download phase of the bidirectional sync. Pulls remote changes into
 * the local SQLite cache for users, jobs, and messages. Extracted
 * from SyncManager.ts on 2026-05-09.
 *
 * Each downloader is null-safe on the no-current-user path so the
 * orchestrator can call them in sequence without pre-checking auth.
 */

/**
 * Refresh the current user in the local cache. For contractors this
 * is the placeholder for a future "discover other users" flow.
 */
export async function downloadUsers(_config: SyncOptions): Promise<void> {
  const currentUser = await AuthService.getCurrentUser();
  if (!currentUser) return;

  logger.debug('Downloading users');

  if (currentUser.role === 'contractor') {
    await LocalDatabase.saveUser(currentUser, false);
  }
}

/**
 * Pull jobs into the local cache. Contractors get available jobs (open
 * marketplace), homeowners get jobs they posted.
 */
export async function downloadJobs(_config: SyncOptions): Promise<void> {
  const currentUser = await AuthService.getCurrentUser();
  if (!currentUser) return;

  logger.debug('Downloading jobs');

  try {
    let remoteJobs: Job[] = [];
    if (currentUser.role === 'contractor') {
      remoteJobs = await JobService.getAvailableJobs();
    } else {
      remoteJobs = await JobService.getJobsByHomeowner(currentUser.id);
    }

    for (const job of remoteJobs) {
      await LocalDatabase.saveJob(job, false);
    }
    logger.debug('Downloaded jobs', { count: remoteJobs.length });
  } catch (error) {
    logger.error('Failed to download jobs:', error);
    throw error;
  }
}

/**
 * Pull messages for the user's active jobs. Strips computed fields
 * (`senderName`, `senderRole`) before persisting so the SQLite row
 * matches the schema exactly.
 */
export async function downloadMessages(config: SyncOptions): Promise<void> {
  const currentUser = await AuthService.getCurrentUser();
  if (!currentUser) return;

  logger.debug('Downloading messages');

  try {
    const jobs = await LocalDatabase.getJobsByStatus(
      'assigned',
      currentUser.id
    );

    for (const job of jobs) {
      try {
        const messages = await MessagingService.getJobMessages(
          job.id,
          config.batchSize
        );

        for (const message of messages) {
          const typedMessage = message as Message & {
            senderName?: string;
            senderRole?: string;
          };
          const {
            senderName: _n,
            senderRole: _r,
            ...messageData
          } = typedMessage;
          await LocalDatabase.saveMessage(messageData as Message, false);
        }
      } catch (error) {
        logger.warn('Failed to download messages for job', {
          jobId: job.id,
          error,
        });
      }
    }

    logger.debug('Downloaded messages for jobs', { jobCount: jobs.length });
  } catch (error) {
    logger.error('Failed to download messages:', error);
    throw error;
  }
}
