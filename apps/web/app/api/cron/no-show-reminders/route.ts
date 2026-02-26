import { withCronHandler } from '@/lib/cron-handler';
import { NoShowReminderCronService } from '@/lib/services/notifications/NoShowReminderCronService';

/**
 * Cron endpoint for no-show detection, pre-start reminders,
 * predictive risk analysis, and weather-based rescheduling.
 * Should be called every hour.
 */
export const GET = withCronHandler('no-show-reminders', async () => {
  return await NoShowReminderCronService.runScheduledChecks();
});
