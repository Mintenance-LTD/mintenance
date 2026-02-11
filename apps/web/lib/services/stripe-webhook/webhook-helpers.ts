import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

export type SendNotificationFn = (
  userId: string,
  title: string,
  message: string,
  type: string
) => Promise<void>;

/** Validate that a string is a valid UUID v4. Used for metadata validation. */
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Safely send an in-app notification. Fails silently if notifications table is missing. */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string
): Promise<void> {
  try {
    await serverSupabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        read: false,
        created_at: new Date().toISOString(),
      });
  } catch (notifError) {
    logger.error('Failed to send notification', notifError, {
      service: 'stripe-webhook',
      userId,
      type,
    });
  }
}
