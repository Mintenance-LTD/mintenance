/**
 * NotificationService — single entry point for creating user-visible
 * notifications. ALL outbound notifications (in-app, push) flow through
 * `createNotification()`. Direct `.from('notifications').insert(...)`
 * is forbidden in new code — it silently drops push + bypasses user
 * preferences. See commit 8fed54ed for the two call sites that fix
 * uncovered this rule.
 *
 * R2 of docs/RETENTION_ROADMAP_2026.md: now consults
 * `user_notification_preferences` for per-channel + per-type + quiet
 * hours before firing anything. Defaults are permissive — a user with
 * no preferences row gets every channel on and zero quiet hours
 * (backwards compatible with every pre-R2 account).
 *
 * Architecture:
 *   createNotification()
 *       ↓ loadPreferences()
 *       ↓ isTypeDisabled() — short-circuit if muted
 *       ↓ NotificationAgent.shouldSendImmediately() — timing
 *       ↓ isInQuietHours() — defer if quiet
 *       ↓ in-app insert (if prefs.in_app_enabled)
 *       ↓ sendPushToDevice() (if prefs.push_enabled)  — fire-and-forget
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationAgent } from '../agents/NotificationAgent';
import {
  loadPreferences,
  isTypeDisabled,
  isInQuietHours,
  nextQuietHoursEndUTC,
  type UserNotificationPreferences,
} from './NotificationPreferenceResolver';
import { sendPushToDevice } from './NotificationPushDispatcher';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

async function insertInAppNotification(
  params: CreateNotificationParams
): Promise<string | null> {
  const { data, error } = await serverSupabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      action_url: params.actionUrl ?? null,
      ...(params.metadata && Object.keys(params.metadata).length > 0
        ? { metadata: params.metadata }
        : {}),
      read: false,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    logger.error('Error inserting in-app notification', {
      service: 'NotificationService',
      error: error.message,
      userId: params.userId,
    });
    return null;
  }
  return data.id;
}

export class NotificationService {
  /**
   * Create a notification (intelligent routing + preference-aware).
   * Public API — use this instead of any direct DB insert.
   *
   * Returns the notification id (if inserted now) or the queue id (if
   * deferred). Returns null when the user has muted this notification
   * type or if the insert failed.
   */
  static async createNotification(
    params: CreateNotificationParams
  ): Promise<string | null> {
    try {
      const prefs = await loadPreferences(params.userId);

      // Per-type hard mute — no channel fires, no queue entry.
      if (isTypeDisabled(prefs, params.type)) {
        logger.info('Notification suppressed by user preference', {
          service: 'NotificationService',
          userId: params.userId,
          type: params.type,
        });
        return null;
      }

      const sendDecision = await NotificationAgent.shouldSendImmediately(
        params.userId,
        params.type,
        { userId: params.userId }
      );

      // Quiet-hours override — force to queue if currently quiet.
      let immediate = sendDecision.immediate;
      let scheduledFor = sendDecision.scheduledFor;
      if (immediate) {
        const end = nextQuietHoursEndUTC(prefs);
        if (end) {
          immediate = false;
          scheduledFor = end;
        }
      }

      if (immediate) {
        return this.fireImmediately(params, prefs);
      }

      return this.scheduleForLater(params, scheduledFor, sendDecision.reason);
    } catch (error) {
      logger.error('Error in createNotification', error, {
        service: 'NotificationService',
        userId: params.userId,
      });
      return null;
    }
  }

  /**
   * Insert in-app + fire push now, both subject to individual channel
   * preferences. If both are disabled the call still returns null — no
   * user-visible delivery happened.
   */
  private static async fireImmediately(
    params: CreateNotificationParams,
    prefs: UserNotificationPreferences
  ): Promise<string | null> {
    let notificationId: string | null = null;

    if (prefs.in_app_enabled) {
      notificationId = await insertInAppNotification(params);
    }

    if (prefs.push_enabled) {
      // Fire-and-forget. Failures are logged + enqueued for retry in
      // the push dispatcher. On success, the dispatcher also flips
      // push_sent + delivered_at on the `notifications` row via
      // the notificationId we thread through below (added 2026-04-20
      // for observability of multi-channel delivery).
      void sendPushToDevice({
        userId: params.userId,
        title: params.title,
        body: params.message,
        data: {
          notificationId: notificationId ?? undefined,
          type: params.type,
          actionUrl: params.actionUrl,
        },
        notificationType: params.type,
        actionUrl: params.actionUrl,
        metadata: params.metadata,
        notificationId: notificationId ?? undefined,
      });
    }

    return notificationId;
  }

  /**
   * Queue via the NotificationAgent for deferred delivery (engagement
   * timing or quiet hours).
   */
  private static async scheduleForLater(
    params: CreateNotificationParams,
    scheduledFor: Date | undefined,
    reason: string | undefined
  ): Promise<string | null> {
    const priority = NotificationAgent.getNotificationPriority(params.type);
    const at = scheduledFor || new Date();

    const queueId = await NotificationAgent.queueNotification({
      userId: params.userId,
      notificationType: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
      scheduledFor: at,
      priority,
    });

    logger.info('Notification queued', {
      service: 'NotificationService',
      userId: params.userId,
      type: params.type,
      scheduledFor: at.toISOString(),
      reason,
    });

    return queueId;
  }

  /**
   * Flip `email_sent = true` on a notifications row once an email
   * provider accepted the message. Mirrors the push-side path that
   * NotificationPushDispatcher.markNotificationPushSent handles
   * internally. Also populates `delivered_at` only when it's still
   * null — whichever channel lands first wins that timestamp.
   *
   * Safe to call with a null/undefined id (no-op); saves every
   * call-site from guarding around the "notification insert failed
   * so we have no id" case.
   *
   * Intentionally best-effort: an UPDATE failure logs a warning but
   * never throws. Observability must not break user-visible email
   * delivery paths.
   */
  static async markEmailSent(
    notificationId: string | null | undefined
  ): Promise<void> {
    if (!notificationId) return;
    try {
      const { error } = await serverSupabase
        .from('notifications')
        .update({
          email_sent: true,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .is('delivered_at', null);
      if (error) {
        // Try again without the delivered_at guard so email_sent
        // still flips even if push got there first.
        const { error: flagOnlyError } = await serverSupabase
          .from('notifications')
          .update({ email_sent: true })
          .eq('id', notificationId);
        if (flagOnlyError) {
          logger.warn(
            'Failed to mark notification email_sent=true (non-fatal)',
            {
              service: 'NotificationService',
              notificationId,
              error: flagOnlyError.message,
            }
          );
        }
      }
    } catch (err) {
      logger.warn('markEmailSent threw', {
        service: 'NotificationService',
        notificationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Track notification engagement (opened, clicked, dismissed).
   * Kept here (and not in a dispatcher) because engagement data feeds
   * back into NotificationAgent's timing model.
   */
  static async trackEngagement(
    notificationId: string,
    userId: string,
    engagement: {
      opened?: boolean;
      clicked?: boolean;
      dismissed?: boolean;
    }
  ): Promise<void> {
    try {
      const { data: notification } = await serverSupabase
        .from('notifications')
        .select('type')
        .eq('id', notificationId)
        .single();

      if (!notification) return;

      await NotificationAgent.trackEngagement(
        notificationId,
        userId,
        notification.type,
        engagement
      );
    } catch (error) {
      logger.error('Error tracking notification engagement', error, {
        service: 'NotificationService',
        notificationId,
        userId,
      });
    }
  }
}
