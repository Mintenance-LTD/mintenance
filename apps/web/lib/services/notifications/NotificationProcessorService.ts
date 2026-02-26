/**
 * Notification Processor Service
 *
 * Handles the batch processing cycle for queued notifications and
 * engagement-based timing optimisation.
 *
 * Extracted from the notification-processor cron route to keep the
 * route file as a thin wrapper around withCronHandler.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationAgent } from '@/lib/services/agents/NotificationAgent';

// ── Types ────────────────────────────────────────────────────────────

interface ProcessingResults {
  queuedProcessed: number;
  queuedErrors: number;
  learningProcessed: number;
  learningErrors: number;
}

// ── Constants ────────────────────────────────────────────────────────

/** Maximum queued notifications to process per run. */
const QUEUE_BATCH_SIZE = 50;

/** Maximum users to run engagement learning for per run. */
const LEARNING_USER_LIMIT = 20;

/** Number of days of engagement data to consider. */
const ENGAGEMENT_LOOKBACK_DAYS = 30;

/** Maximum engagement rows to fetch for user-id extraction. */
const ENGAGEMENT_FETCH_LIMIT = 100;

// ── Service ──────────────────────────────────────────────────────────

export class NotificationProcessorService {
  /**
   * Process queued notifications that are ready to send.
   */
  static async processQueuedNotifications(): Promise<
    Pick<ProcessingResults, 'queuedProcessed' | 'queuedErrors'>
  > {
    const counts = { queuedProcessed: 0, queuedErrors: 0 };

    try {
      const now = new Date();
      const { data: readyNotifications, error: queueError } =
        await serverSupabase
          .from('notification_queue')
          .select('*')
          .eq('status', 'pending')
          .lte('scheduled_for', now.toISOString())
          .limit(QUEUE_BATCH_SIZE);

      if (queueError) {
        logger.error('Error fetching queued notifications', {
          service: 'notification-processor',
          error: queueError.message,
        });
        counts.queuedErrors++;
        return counts;
      }

      if (!readyNotifications || readyNotifications.length === 0) {
        return counts;
      }

      for (const queuedNotif of readyNotifications) {
        try {
          const { data: notification, error: createError } =
            await serverSupabase
              .from('notifications')
              .insert({
                user_id: queuedNotif.user_id,
                type: queuedNotif.notification_type,
                title: queuedNotif.title,
                message: queuedNotif.message,
                action_url: queuedNotif.action_url,
                read: false,
                created_at: new Date().toISOString(),
              })
              .select('id')
              .single();

          if (createError) {
            logger.error('Error creating notification from queue', {
              service: 'notification-processor',
              error: createError.message,
              queueId: queuedNotif.id,
            });

            await serverSupabase
              .from('notification_queue')
              .update({
                status: 'failed',
                error_message: createError.message,
                retry_count: queuedNotif.retry_count + 1,
                last_retry_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', queuedNotif.id);

            counts.queuedErrors++;
            continue;
          }

          await serverSupabase
            .from('notification_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', queuedNotif.id);

          counts.queuedProcessed++;

          logger.info('Notification sent from queue', {
            service: 'notification-processor',
            queueId: queuedNotif.id,
            notificationId: notification.id,
            userId: queuedNotif.user_id,
          });
        } catch (error) {
          logger.error('Error processing queued notification', error, {
            service: 'notification-processor',
            queueId: queuedNotif.id,
          });
          counts.queuedErrors++;
        }
      }
    } catch (error) {
      logger.error('Error in queued notification processing', error, {
        service: 'notification-processor',
      });
      counts.queuedErrors++;
    }

    return counts;
  }

  /**
   * Process engagement learning for recent users.
   */
  static async processEngagementLearning(): Promise<
    Pick<ProcessingResults, 'learningProcessed' | 'learningErrors'>
  > {
    const counts = { learningProcessed: 0, learningErrors: 0 };

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - ENGAGEMENT_LOOKBACK_DAYS);

      const { data: usersToAnalyze } = await serverSupabase
        .from('notification_engagement')
        .select('user_id')
        .gte('sent_at', thirtyDaysAgo.toISOString())
        .limit(ENGAGEMENT_FETCH_LIMIT)
        .order('sent_at', { ascending: false });

      if (!usersToAnalyze || usersToAnalyze.length === 0) {
        return counts;
      }

      const uniqueUserIds = [...new Set(usersToAnalyze.map((e) => e.user_id))];

      for (const userId of uniqueUserIds.slice(0, LEARNING_USER_LIMIT)) {
        try {
          await NotificationAgent.learnOptimalTiming(userId);
          counts.learningProcessed++;
        } catch (error) {
          logger.error('Error learning optimal timing for user', error, {
            service: 'notification-processor',
            userId,
          });
          counts.learningErrors++;
        }
      }
    } catch (error) {
      logger.error('Error in engagement learning', error, {
        service: 'notification-processor',
      });
      counts.learningErrors++;
    }

    return counts;
  }

  /**
   * Run the full processing cycle: queue processing + engagement learning.
   */
  static async runProcessingCycle(): Promise<ProcessingResults> {
    const queueResults = await this.processQueuedNotifications();
    const learningResults = await this.processEngagementLearning();

    return {
      ...queueResults,
      ...learningResults,
    };
  }
}
