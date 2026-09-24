import { withCronHandler } from '@/lib/cron-handler';
import { NotificationProcessorService } from '@/lib/services/notifications/NotificationProcessorService';
import { ServiceUnavailableError } from '@/lib/errors/api-error';

/**
 * Cron endpoint for processing notification delivery and retries.
 * Should be called every 5 minutes.
 */
export const maxDuration = 60;
export const GET = withCronHandler('notification-processor', async () => {
  const result =
    await NotificationProcessorService.processQueuedNotifications();
  if (result.queuedErrors > 0) {
    throw new ServiceUnavailableError(
      'Notification processing needs recovery.'
    );
  }
  return result;
});
