import { withCronHandler } from '@/lib/cron-handler';
import { HomeownerApprovalReminderService } from '@/lib/services/escrow/HomeownerApprovalReminderService';

/**
 * Cron endpoint for sending reminders to homeowners with pending job approvals.
 * Should be called daily.
 */
export const GET = withCronHandler('homeowner-approval-reminders', async () => {
  return await HomeownerApprovalReminderService.processPendingApprovalReminders();
});
