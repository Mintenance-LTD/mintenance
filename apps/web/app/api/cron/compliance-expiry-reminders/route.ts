import { withCronHandler } from '@/lib/cron-handler';
import { ComplianceReminderService } from '@/lib/services/compliance/ComplianceReminderService';

export const GET = withCronHandler('compliance-expiry-reminders', async () => {
  return await ComplianceReminderService.processReminders();
});
