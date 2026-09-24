/**
 * NotificationPushDispatcher — owns the Expo Push call + failed-push
 * retry enqueue. Extracted from NotificationService in R2 so the
 * facade can stay under the 500-line limit and so preferences + push
 * delivery stay in separate modules.
 *
 * Failure model (same behaviour as Sprint 7 / 5.6):
 *  - no_push_tokens: terminal, user never registered a device
 *  - expo_http_* / network: enqueue to notification_queue with
 *    status='failed_push' for the /api/cron/notification-processor
 *    retry loop
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationAgent } from '../agents/NotificationAgent';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushDispatchParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  notificationType?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  /**
   * Optional id of the `notifications` row that will be flagged
   * push_sent after Expo accepts all outstanding devices. Omitted
   * for out-of-band push (e.g. bulk broadcasts that skip the
   * in-app row entirely).
   */
  notificationId?: string;
  /** Server-owned retry state; never forwarded to the device. */
  acceptedDeviceIds?: string[];
}

export interface PushDispatchResult {
  sent: boolean;
  reason?: string;
  acceptedDeviceIds?: string[];
}

/**
 * Count unread notifications for a user. Used to populate the iOS/Android
 * app icon badge in the Expo push payload — without `badge`, the OS
 * delivers the banner but never updates the launcher counter when the app
 * is backgrounded or killed (2026-04-30 audit P0-10).
 *
 * Failure here is non-fatal: we'll send the push without a badge rather
 * than block delivery on a count query.
 */
async function getUnreadCountForUser(userId: string): Promise<number | null> {
  try {
    const { count, error } = await serverSupabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.warn('Failed to fetch unread count for badge (non-fatal)', {
        service: 'NotificationPushDispatcher',
        userId,
        error: error.message,
      });
      return null;
    }
    return typeof count === 'number' ? count : null;
  } catch (err) {
    logger.warn('getUnreadCountForUser threw (non-fatal)', {
      service: 'NotificationPushDispatcher',
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function markNotificationPushSent(notificationId: string): Promise<void> {
  // Expo ticket acceptance is not proof of delivery to the device.
  try {
    const { error } = await serverSupabase
      .from('notifications')
      .update({
        push_sent: true,
      })
      .eq('id', notificationId);
    if (error) {
      logger.warn('Failed to mark notification push_sent=true (non-fatal)', {
        service: 'NotificationPushDispatcher',
        notificationId,
        error: error.message,
      });
    }
  } catch (err) {
    // Best-effort observability — never fail the push path on this.
    logger.warn('markNotificationPushSent threw', {
      service: 'NotificationPushDispatcher',
      notificationId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function sendPushToDevice(
  params: PushDispatchParams
): Promise<PushDispatchResult> {
  let failureReason: string | null = null;
  const acceptedDeviceIds = new Set(params.acceptedDeviceIds ?? []);
  const deadline = Date.now() + 20_000;

  try {
    const { data: registeredTokens, error: tokenError } = await serverSupabase
      .from('user_push_tokens')
      .select('id, push_token')
      .eq('user_id', params.userId);

    if (tokenError) throw new Error('push_token_lookup_failed');
    const tokens = (registeredTokens ?? []).filter(
      (token: { id: string }) => !acceptedDeviceIds.has(token.id)
    );

    if (tokens.length === 0) {
      if (acceptedDeviceIds.size && params.notificationId) {
        await markNotificationPushSent(params.notificationId);
      }
      return acceptedDeviceIds.size
        ? { sent: true, acceptedDeviceIds: [...acceptedDeviceIds] }
        : { sent: false, reason: 'no_push_tokens' };
    }

    // 2026-04-30 audit P0-10: include the user's current unread count so
    // the OS launcher badge updates even when the app is killed.
    const unreadCount = await getUnreadCountForUser(params.userId);

    for (let offset = 0; offset < tokens.length; offset += 100) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        failureReason = 'push_time_budget_exhausted';
        break;
      }
      const batch = tokens.slice(offset, offset + 100);
      const messages = batch.map((t: { push_token: string }) => ({
        to: t.push_token,
        title: params.title,
        body: params.body,
        sound: 'default',
        data: params.data || {},
        channelId: 'default',
        ...(typeof unreadCount === 'number' ? { badge: unreadCount } : {}),
      }));

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(Math.min(10_000, remainingMs)),
      });

      if (!response.ok) {
        failureReason = `expo_http_${response.status}`;
        logger.warn('Expo push API returned non-OK status', {
          service: 'NotificationPushDispatcher',
          status: response.status,
          userId: params.userId,
        });
      } else {
        const result = await response.json();
        // HTTP 200 can contain rejected tickets. Validate one ticket per device.
        const tickets = Array.isArray(result?.data) ? result.data : [];
        if (tickets.length !== batch.length) {
          failureReason = 'expo_invalid_ticket_response';
        } else {
          for (let index = 0; index < batch.length; index++) {
            const ticket = tickets[index];
            if (
              ticket?.status === 'ok' &&
              typeof ticket.id === 'string' &&
              ticket.id
            ) {
              acceptedDeviceIds.add(batch[index].id);
            } else {
              // Never log provider messages: they can contain the device token.
              failureReason = 'expo_ticket_rejected';
              if (ticket?.details?.error === 'DeviceNotRegistered') {
                const { error } = await serverSupabase
                  .from('user_push_tokens')
                  .delete()
                  .eq('user_id', params.userId)
                  .eq('id', batch[index].id)
                  .eq('push_token', batch[index].push_token);
                if (error) failureReason = 'push_token_removal_failed';
              }
            }
          }
        }
      }
    }
    if (!failureReason) {
      if (params.notificationId)
        await markNotificationPushSent(params.notificationId);
      return { sent: true, acceptedDeviceIds: [...acceptedDeviceIds] };
    }
  } catch {
    failureReason = 'push_dispatch_failed';
    logger.warn('Failed to send push notification', {
      service: 'NotificationPushDispatcher',
      userId: params.userId,
      error: failureReason,
    });
  }

  // Only retry when we had tokens but the send failed.
  // "no_push_tokens" is a terminal state (user never registered).
  if (failureReason && params.notificationType) {
    try {
      // 2026-05-01 audit follow-up (review pass 4): thread the original
      // notifications-row id through metadata so the retry path can flip
      // push_sent on the existing row instead of creating a duplicate.
      // Falls back to whatever metadata the caller already supplied.
      const queueMetadata: Record<string, unknown> = {
        ...(params.metadata ?? {}),
        push_accepted_device_ids: [...acceptedDeviceIds],
      };
      if (params.notificationId) {
        queueMetadata.original_notification_id = params.notificationId;
      }

      const { error: queueError } = await serverSupabase
        .from('notification_queue')
        .insert({
          user_id: params.userId,
          notification_type: params.notificationType,
          priority: NotificationAgent.getNotificationPriority(
            params.notificationType
          ),
          title: params.title,
          message: params.body,
          action_url: params.actionUrl ?? null,
          metadata: queueMetadata,
          scheduled_for: new Date().toISOString(),
          status: 'failed_push',
          retry_count: 0,
          last_retry_at: null,
          error_message: failureReason,
        });
      if (queueError) throw new Error('push_retry_enqueue_failed');
      logger.info('Failed push enqueued for retry', {
        service: 'NotificationPushDispatcher',
        userId: params.userId,
        failureReason,
        notificationId: params.notificationId,
      });
    } catch (enqueueError) {
      logger.error(
        'Failed to enqueue failed-push for retry — notification permanently lost',
        enqueueError,
        {
          service: 'NotificationPushDispatcher',
          userId: params.userId,
          originalFailure: failureReason,
        }
      );
    }
  }

  return {
    sent: false,
    reason: failureReason ?? 'unknown',
    acceptedDeviceIds: [...acceptedDeviceIds],
  };
}
