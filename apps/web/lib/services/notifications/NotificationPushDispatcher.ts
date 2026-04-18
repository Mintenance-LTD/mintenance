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
}

export interface PushDispatchResult {
  sent: boolean;
  reason?: string;
}

export async function sendPushToDevice(
  params: PushDispatchParams
): Promise<PushDispatchResult> {
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
        service: 'NotificationPushDispatcher',
        status: response.status,
        userId: params.userId,
      });
    } else {
      return { sent: true };
    }
  } catch (error) {
    failureReason = error instanceof Error ? error.message : String(error);
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
      await serverSupabase.from('notification_queue').insert({
        user_id: params.userId,
        notification_type: params.notificationType,
        priority: NotificationAgent.getNotificationPriority(
          params.notificationType
        ),
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
        service: 'NotificationPushDispatcher',
        userId: params.userId,
        failureReason,
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

  return { sent: false, reason: failureReason ?? 'unknown' };
}
