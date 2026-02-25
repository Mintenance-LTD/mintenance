import { withCronHandler } from '@/lib/cron-handler';
import { NotificationProcessorService } from '@/lib/services/notifications/NotificationProcessorService';

/**
 * Cron endpoint for processing notification queue + engagement learning.
 * Should be called every 5 minutes.
 */
export const GET = withCronHandler('notification-processor', async () => {
  return await NotificationProcessorService.runProcessingCycle();
});
