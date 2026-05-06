import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

export type SendNotificationFn = (
  userId: string,
  title: string,
  message: string,
  type: string
) => Promise<void>;

/** Validate that a string is a valid UUID v4. Used for metadata validation. */
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Safely send an in-app notification.
 *
 * 2026-05-01 audit follow-up: now routes through NotificationService so
 * Stripe-sourced notifications also fire push, honour user preferences,
 * and respect quiet hours — same as every other notification source.
 * The previous `serverSupabase.from('notifications').insert(...)` was
 * silently dropping push entirely on every webhook.
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string
): Promise<void> {
  try {
    await NotificationService.createNotification({
      userId,
      type,
      title,
      message,
      metadata: { source: 'stripe-webhook' },
    });
  } catch (notifError) {
    logger.error('Failed to send notification', notifError, {
      service: 'stripe-webhook',
      userId,
      type,
    });
  }
}
