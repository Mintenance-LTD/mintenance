import { withCronHandler } from '@/lib/cron-handler';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';

/**
 * Cron endpoint for sending payment setup reminders.
 * Should be called daily.
 */
export const GET = withCronHandler('payment-setup-reminders', async () => {
  return await PaymentSetupNotificationService.sendBatchNotifications();
});
