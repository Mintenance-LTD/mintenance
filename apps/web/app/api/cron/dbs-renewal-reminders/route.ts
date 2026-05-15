import { withCronHandler } from '@/lib/cron-handler';
import { DbsRenewalReminderService } from '@/lib/services/contractor/DbsRenewalReminderService';

/**
 * GET /api/cron/dbs-renewal-reminders
 *
 * Daily cron that scans `contractor_dbs_checks` for clear checks
 * expiring in 90 / 30 / 7 days and fires a NotificationService
 * .createNotification to the contractor. Tracks `last_reminder_days`
 * per record so re-runs don't duplicate.
 *
 * Mirrors:
 *   - `/api/cron/contractor-credential-reminders` (insurance + licences)
 *   - `/api/cron/compliance-expiry-reminders` (homeowner-side gas/EICR/EPC)
 *
 * Scheduled via vercel.json — fires at 07:45 UTC daily, 15 min after
 * the credential cron so they don't compete for the same Postgres
 * connection pool slot.
 */
export const GET = withCronHandler('dbs-renewal-reminders', async () => {
  return await DbsRenewalReminderService.processReminders();
});
