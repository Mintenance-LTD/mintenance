import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

export type SendNotificationFn = (
  userId: string,
  title: string,
  message: string,
  type: string,
  actionUrl?: string,
  /**
   * 2026-05-25 audit-45 P2: extra metadata merged in alongside the
   * fixed `{ source: 'stripe-webhook' }` marker. Mobile's
   * notificationRoutingTable reads from metadata (not actionUrl), so
   * webhook handlers that want deep-linking must thread their jobId /
   * paymentId / tipId through this field — otherwise mobile taps fall
   * through to the inbox.
   */
  extraMetadata?: Record<string, unknown>
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
 *
 * 2026-05-25 audit-45 P2: now accepts and merges `extraMetadata` so
 * handlers can attach jobId / paymentId / tipId to the notification
 * payload. Mobile routing keys off `metadata.jobId` (not actionUrl),
 * so without this every webhook-sourced notification taps to the
 * inbox even when the handler knew the target job. The fixed
 * `source: 'stripe-webhook'` marker is preserved for observability.
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  actionUrl?: string,
  extraMetadata?: Record<string, unknown>
): Promise<void> {
  try {
    await NotificationService.createNotification({
      userId,
      type,
      title,
      message,
      actionUrl,
      metadata: { source: 'stripe-webhook', ...(extraMetadata ?? {}) },
    });
  } catch (notifError) {
    logger.error('Failed to send notification', notifError, {
      service: 'stripe-webhook',
      userId,
      type,
    });
  }
}
