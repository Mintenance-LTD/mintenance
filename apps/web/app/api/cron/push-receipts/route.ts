import { withCronHandler } from '@/lib/cron-handler';
import { processPushReceipts } from '@/lib/services/notifications/PushReceiptService';
import { logger } from '@mintenance/shared';

export const maxDuration = 60;
export const GET = withCronHandler('push-receipts', async () => {
  const result = await processPushReceipts();
  if (result.failed || result.expired)
    logger.error('Push delivery receipts require attention', undefined, {
      service: 'push-receipts',
      failed: result.failed,
      expired: result.expired,
    });
  return result;
});
