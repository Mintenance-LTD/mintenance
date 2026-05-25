/**
 * Notification Processor Service
 *
 * Handles the batch processing cycle for queued notifications and
 * engagement-based timing optimisation.
 *
 * Extracted from the notification-processor cron route to keep the
 * route file as a thin wrapper around withCronHandler.
 *
 * ── Direct-insert exception (documented 2026-05-01) ───────────────────
 * This file is one of TWO call sites allowed to write directly to
 * `public.notifications` (the other is NotificationService itself).
 * Reason: this service drains `notification_queue` rows that were
 * already passed through the prefs/quiet-hours/timing model when they
 * were enqueued by NotificationService.scheduleForLater. Re-running
 * `NotificationService.createNotification` here would just re-enqueue
 * them, producing an infinite loop.
 *
 * The CI grep gate at scripts/check-notification-inserts.js explicitly
 * allowlists this file. Do NOT add `.from('notifications').insert(`
 * to other code paths — call NotificationService.createNotification
 * instead.
 *
 * ── Queue surface ─────────────────────────────────────────────────────
 * notification_queue rows arrive in two flavours:
 *   - status='pending'      enqueued by NotificationService.scheduleForLater
 *                           (engagement timing or quiet-hours deferral).
 *                           Needs in-app insert + push fan-out.
 *   - status='failed_push'  enqueued by NotificationPushDispatcher when
 *                           an Expo push attempt failed but tokens existed.
 *                           Already has a notifications row (id stitched
 *                           into metadata.original_notification_id) — only
 *                           the push needs to be retried.
 *
 * Both flavours are bounded by `retry_count < MAX_RETRY_COUNT`. After
 * that the row is moved to `status='failed'` and stops being picked up.
 * Backoff between retries doubles the wait window, capped at 1 hour.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationAgent } from '@/lib/services/agents/NotificationAgent';
import { sendPushToDevice } from './NotificationPushDispatcher';
import {
  loadPreferences,
  isTypeDisabled,
} from './NotificationPreferenceResolver';

// ── Types ────────────────────────────────────────────────────────────

interface ProcessingResults {
  queuedProcessed: number;
  queuedErrors: number;
  learningProcessed: number;
  learningErrors: number;
}

interface QueuedNotificationRow {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  status: 'pending' | 'failed_push' | string;
  retry_count: number | null;
  scheduled_for: string;
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

/**
 * Maximum number of retries before a queue row is marked terminally
 * failed. Six attempts with the backoff schedule below is ~32 minutes
 * of total wall-clock — long enough to ride out a brief Expo outage
 * but short enough that we don't keep a permanently-broken token in
 * the queue forever.
 */
const MAX_RETRY_COUNT = 6;

/**
 * Compute the next scheduled_for timestamp from the current retry
 * count using exponential backoff (1m, 2m, 4m, 8m, 16m, 32m). Capped
 * at 1 hour to bound worst-case lag for transient Expo failures.
 */
function nextRetryAt(retryCount: number): Date {
  const delayMinutes = Math.min(60, 2 ** retryCount);
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

// ── Service ──────────────────────────────────────────────────────────

export class NotificationProcessorService {
  /**
   * Process queued notifications that are ready to send. Handles both
   * `pending` (deferred sends) and `failed_push` (push retries).
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
          .in('status', ['pending', 'failed_push'])
          .lte('scheduled_for', now.toISOString())
          .lt('retry_count', MAX_RETRY_COUNT)
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

      for (const raw of readyNotifications) {
        const queuedNotif = raw as QueuedNotificationRow;
        try {
          if (queuedNotif.status === 'failed_push') {
            await NotificationProcessorService.retryFailedPush(queuedNotif);
          } else {
            await NotificationProcessorService.sendPendingNotification(
              queuedNotif
            );
          }
          counts.queuedProcessed++;
        } catch (error) {
          logger.error('Error processing queued notification', error, {
            service: 'notification-processor',
            queueId: queuedNotif.id,
            status: queuedNotif.status,
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
   * Process a `pending` queue row: insert the notifications row and
   * fire push. Push failures get re-enqueued by the dispatcher itself.
   *
   * 2026-05-25 audit-42 P1/P2: re-checks user preferences at delivery
   * time. The queue may hold rows for ~7h (quiet-hours wrap-around);
   * if the user mutes the type / disables a channel meanwhile, we
   * honour the latest pref instead of overriding it. Also honours the
   * `_in_app_only` metadata flag stashed by scheduleForLater so
   * retention digests don't double-notify after the email lands.
   */
  private static async sendPendingNotification(
    queuedNotif: QueuedNotificationRow
  ): Promise<void> {
    const prefs = await loadPreferences(queuedNotif.user_id);

    // Hard mute: user disabled the type. 'cancelled' status (not
    // 'failed') so the retry counter doesn't move — user-driven, not
    // a delivery failure.
    if (isTypeDisabled(prefs, queuedNotif.notification_type)) {
      await serverSupabase
        .from('notification_queue')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          error_message: 'type_disabled_by_user',
        })
        .eq('id', queuedNotif.id);
      logger.info('Queued notification cancelled — type muted by user', {
        service: 'notification-processor',
        queueId: queuedNotif.id,
        userId: queuedNotif.user_id,
        type: queuedNotif.notification_type,
      });
      return;
    }

    const metadata = queuedNotif.metadata ?? {};
    const inAppOnly = metadata['_in_app_only'] === true;

    // Strip the internal _in_app_only flag before persisting onto the
    // notifications row + deep-link push payload — it's a routing
    // hint for this service, not user-visible metadata.
    const cleanMetadata: Record<string, unknown> = { ...metadata };
    delete cleanMetadata._in_app_only;
    const hasMetadata = Object.keys(cleanMetadata).length > 0;

    let notificationId: string | null = null;

    if (prefs.in_app_enabled) {
      const { data: notification, error: createError } = await serverSupabase
        .from('notifications')
        .insert({
          user_id: queuedNotif.user_id,
          type: queuedNotif.notification_type,
          title: queuedNotif.title,
          message: queuedNotif.message,
          action_url: queuedNotif.action_url,
          // 2026-05-01 audit follow-up (review pass 4): carry the routing
          // payload (jobId, quoteId, …) onto the materialised notification
          // row. Previously this was silently dropped, so any deferred
          // notification landed without enough context for deep-linking.
          ...(hasMetadata ? { metadata: cleanMetadata } : {}),
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

        await NotificationProcessorService.bumpRetryOrFail(
          queuedNotif,
          createError.message
        );
        throw new Error(createError.message);
      }

      notificationId = notification.id;
    } else {
      logger.info('Queued notification: skipping in-app (user disabled)', {
        service: 'notification-processor',
        queueId: queuedNotif.id,
        userId: queuedNotif.user_id,
      });
    }

    // Mark the queue row sent BEFORE firing push: push is
    // fire-and-forget here (failures get re-enqueued by the
    // dispatcher itself), so we shouldn't block the queue update on
    // the network round-trip to Expo.
    await serverSupabase
      .from('notification_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queuedNotif.id);

    // Push parity with fireImmediately (added 2026-05-01); gated on
    // freshly-loaded push_enabled + the _in_app_only flag (audit-42).
    if (prefs.push_enabled && !inAppOnly) {
      void sendPushToDevice({
        userId: queuedNotif.user_id,
        title: queuedNotif.title,
        body: queuedNotif.message,
        // audit-54 P1: spread metadata so mobile router has IDs.
        data: {
          ...(hasMetadata ? cleanMetadata : {}),
          notificationId: notificationId ?? undefined,
          type: queuedNotif.notification_type,
          actionUrl: queuedNotif.action_url ?? undefined,
        },
        notificationType: queuedNotif.notification_type,
        actionUrl: queuedNotif.action_url ?? undefined,
        metadata: hasMetadata ? cleanMetadata : undefined,
        notificationId: notificationId ?? undefined,
      });
    } else {
      logger.info('Queued notification: skipping push', {
        service: 'notification-processor',
        queueId: queuedNotif.id,
        userId: queuedNotif.user_id,
        reason: inAppOnly ? 'in_app_only_flag' : 'push_disabled_by_user',
      });
    }

    logger.info('Notification sent from queue', {
      service: 'notification-processor',
      queueId: queuedNotif.id,
      notificationId,
      userId: queuedNotif.user_id,
    });
  }

  /**
   * Retry a `failed_push` queue row by re-attempting the push only.
   * The notifications row already exists — its id is stitched into
   * metadata.original_notification_id by the dispatcher when the
   * failed_push row is created.
   *
   * Outcomes:
   *   - push succeeds → mark queue row 'sent', dispatcher will already
   *     have flipped push_sent on the notifications row.
   *   - push fails again with retry budget left → bump retry_count +
   *     reschedule for an exponential-backoff window.
   *   - push fails and retry budget exhausted → mark 'failed'.
   *
   * We deliberately call sendPushToDevice WITHOUT a notificationType
   * so the dispatcher's own re-enqueue branch doesn't fire (we already
   * own the queue row and are tracking retries here).
   */
  private static async retryFailedPush(
    queuedNotif: QueuedNotificationRow
  ): Promise<void> {
    const metadata = queuedNotif.metadata ?? {};
    const originalId =
      typeof metadata['original_notification_id'] === 'string'
        ? (metadata['original_notification_id'] as string)
        : undefined;

    // Forward routing payload to the push payload as well; strip the
    // diagnostic fields we use internally.
    const pushData: Record<string, unknown> = { ...metadata };
    delete pushData.original_notification_id;
    if (queuedNotif.action_url) {
      pushData.actionUrl = queuedNotif.action_url;
    }
    if (queuedNotif.notification_type) {
      pushData.type = queuedNotif.notification_type;
    }
    if (originalId) {
      pushData.notificationId = originalId;
    }

    const result = await sendPushToDevice({
      userId: queuedNotif.user_id,
      title: queuedNotif.title,
      body: queuedNotif.message,
      data: pushData,
      // notificationType deliberately omitted — see method docstring.
      actionUrl: queuedNotif.action_url ?? undefined,
      metadata: queuedNotif.metadata ?? undefined,
      notificationId: originalId,
    });

    if (result.sent) {
      await serverSupabase
        .from('notification_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', queuedNotif.id);

      logger.info('Failed-push retry succeeded', {
        service: 'notification-processor',
        queueId: queuedNotif.id,
        notificationId: originalId,
        userId: queuedNotif.user_id,
      });
      return;
    }

    await NotificationProcessorService.bumpRetryOrFail(
      queuedNotif,
      result.reason ?? 'unknown_push_failure'
    );
  }

  /**
   * Increment retry_count + reschedule (or mark terminally failed if
   * the budget is exhausted). Shared between the pending and
   * failed_push paths so retry semantics stay identical.
   */
  private static async bumpRetryOrFail(
    queuedNotif: QueuedNotificationRow,
    reason: string
  ): Promise<void> {
    const nextCount = (queuedNotif.retry_count ?? 0) + 1;
    const terminal = nextCount >= MAX_RETRY_COUNT;

    if (terminal) {
      await serverSupabase
        .from('notification_queue')
        .update({
          status: 'failed',
          error_message: reason,
          retry_count: nextCount,
          last_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', queuedNotif.id);
      logger.warn('Queued notification exhausted retries', {
        service: 'notification-processor',
        queueId: queuedNotif.id,
        userId: queuedNotif.user_id,
        reason,
      });
      return;
    }

    const next = nextRetryAt(nextCount);
    await serverSupabase
      .from('notification_queue')
      .update({
        // Preserve the original status so the next pass routes it
        // through the same branch (pending vs failed_push).
        error_message: reason,
        retry_count: nextCount,
        last_retry_at: new Date().toISOString(),
        scheduled_for: next.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queuedNotif.id);

    logger.info('Queued notification rescheduled for retry', {
      service: 'notification-processor',
      queueId: queuedNotif.id,
      userId: queuedNotif.user_id,
      retryCount: nextCount,
      nextAt: next.toISOString(),
      reason,
    });
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
    return { ...queueResults, ...learningResults };
  }
}
