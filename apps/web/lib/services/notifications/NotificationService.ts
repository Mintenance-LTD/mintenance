import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationAgent } from '../agents/NotificationAgent';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service for creating notifications with intelligent routing
 * Uses NotificationAgent to determine optimal send time
 */
export class NotificationService {
  /**
   * Send a push notification to a user's device via Expo Push API.
   * Looks up push tokens from user_push_tokens table.
   *
   * Sprint 7 (5.6): returns a structured result and enqueues failures
   * into notification_queue with status='failed_push' so the existing
   * /api/cron/notification-processor cron can retry. Previously all
   * failures were silently logged and dropped, which meant a transient
   * Expo outage lost user-visible notifications permanently.
   */
  private static async sendPushToDevice(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    notificationType?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ sent: boolean; reason?: string }> {
    let failureReason: string | null = null;

    try {
      const { data: tokens } = await serverSupabase
        .from('user_push_tokens')
        .select('push_token')
        .eq('user_id', params.userId);

      if (!tokens || tokens.length === 0) {
        return { sent: false, reason: 'no_push_tokens' };
      }

      const messages = tokens.map((t: { push_token: string }) => ({
        to: t.push_token,
        title: params.title,
        body: params.body,
        sound: 'default',
        data: params.data || {},
        channelId: 'default',
      }));

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        failureReason = `expo_http_${response.status}`;
        logger.warn('Expo push API returned non-OK status', {
          service: 'NotificationService',
          status: response.status,
          userId: params.userId,
        });
      } else {
        return { sent: true };
      }
    } catch (error) {
      failureReason = error instanceof Error ? error.message : String(error);
      logger.warn('Failed to send push notification', {
        service: 'NotificationService',
        userId: params.userId,
        error: failureReason,
      });
    }

    // Sprint 7 (5.6): enqueue for retry. Only retry when we had tokens but
    // the send failed — "no_push_tokens" is a terminal state (user never
    // registered a device), not something a retry can fix.
    if (failureReason && params.notificationType) {
      try {
        await serverSupabase.from('notification_queue').insert({
          user_id: params.userId,
          notification_type: params.notificationType,
          priority: this.getPriorityFromType(params.notificationType),
          title: params.title,
          message: params.body,
          action_url: params.actionUrl ?? null,
          metadata: params.metadata ?? {},
          scheduled_for: new Date().toISOString(),
          status: 'failed_push',
          retry_count: 0,
          last_retry_at: null,
          error_message: failureReason,
        });
        logger.info('Failed push enqueued for retry', {
          service: 'NotificationService',
          userId: params.userId,
          failureReason,
        });
      } catch (enqueueError) {
        logger.error(
          'Failed to enqueue failed-push for retry — notification permanently lost',
          enqueueError,
          {
            service: 'NotificationService',
            userId: params.userId,
            originalFailure: failureReason,
          }
        );
      }
    }

    return { sent: false, reason: failureReason ?? 'unknown' };
  }

  /**
   * Create a notification (intelligent routing)
   * This should be used instead of direct database inserts
   */
  static async createNotification(
    params: CreateNotificationParams
  ): Promise<string | null> {
    try {
      // Check if notification should be sent immediately or queued
      const sendDecision = await NotificationAgent.shouldSendImmediately(
        params.userId,
        params.type,
        { userId: params.userId }
      );

      if (sendDecision.immediate) {
        // notifications schema: action_url is a top-level column; metadata is JSONB.
        // Send immediately
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
          logger.error('Error creating notification', {
            service: 'NotificationService',
            error: error.message,
            userId: params.userId,
          });
          return null;
        }

        // Send push notification to user's device (fire-and-forget).
        // The call now passes through notificationType + action_url + metadata
        // so sendPushToDevice can enqueue a retry with enough context if the
        // Expo push fails (Sprint 7 / 5.6).
        void this.sendPushToDevice({
          userId: params.userId,
          title: params.title,
          body: params.message,
          data: {
            notificationId: data.id,
            type: params.type,
            actionUrl: params.actionUrl,
          },
          notificationType: params.type,
          actionUrl: params.actionUrl,
          metadata: params.metadata,
        });

        return data.id;
      } else {
        // Queue for later
        const priority = this.getPriorityFromType(params.type);
        const scheduledFor = sendDecision.scheduledFor || new Date();

        const queueId = await NotificationAgent.queueNotification({
          userId: params.userId,
          notificationType: params.type,
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl,
          metadata: params.metadata,
          scheduledFor,
          priority,
        });

        logger.info('Notification queued', {
          service: 'NotificationService',
          userId: params.userId,
          type: params.type,
          scheduledFor: scheduledFor.toISOString(),
          reason: sendDecision.reason,
        });

        return queueId;
      }
    } catch (error) {
      logger.error('Error in createNotification', error, {
        service: 'NotificationService',
        userId: params.userId,
      });
      return null;
    }
  }

  /**
   * Track notification engagement (opened, clicked, dismissed)
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
      // Get notification type
      const { data: notification } = await serverSupabase
        .from('notifications')
        .select('type')
        .eq('id', notificationId)
        .single();

      if (!notification) {
        return;
      }

      // Track engagement via NotificationAgent
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

  /**
   * Get priority from notification type
   */
  private static getPriorityFromType(
    type: string
  ): 'urgent' | 'high' | 'medium' | 'low' {
    return NotificationAgent.getNotificationPriority(type);
  }
}
