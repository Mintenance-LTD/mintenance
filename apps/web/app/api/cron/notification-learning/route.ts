import { withCronHandler } from '@/lib/cron-handler';
import { NotificationProcessorService } from '@/lib/services/notifications/NotificationProcessorService';
import { ServiceUnavailableError } from '@/lib/errors/api-error';

// Keep engagement analysis daily, independently of frequent delivery retries.
export const maxDuration = 60;
export const GET = withCronHandler('notification-learning', async () => {
  const result = await NotificationProcessorService.processEngagementLearning();
  if (result.learningErrors > 0) {
    throw new ServiceUnavailableError(
      'Notification timing analysis needs recovery.'
    );
  }
  return result;
});
