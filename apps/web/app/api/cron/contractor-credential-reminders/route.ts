import { withCronHandler } from '@/lib/cron-handler';
import { ContractorCredentialReminderService } from '@/lib/services/contractor/ContractorCredentialReminderService';

/**
 * GET /api/cron/contractor-credential-reminders
 *
 * Daily cron that scans `contractor_insurance` + `contractor_licenses`
 * for policies/licences expiring in 90 / 30 / 7 days and fires a
 * NotificationService.createNotification to the contractor. Tracks
 * `last_reminder_days` per record so re-runs don't duplicate.
 *
 * Mirrors the existing `compliance-expiry-reminders` cron
 * (homeowner-side, gas safety / EICR / EPC). See
 * `ContractorCredentialReminderService` for the implementation.
 *
 * Scheduled via vercel.json — add this entry to enable nightly runs:
 *   { "path": "/api/cron/contractor-credential-reminders",
 *     "schedule": "0 7 * * *" }   // 07:00 UTC daily
 */
export const GET = withCronHandler(
  'contractor-credential-reminders',
  async () => {
    return await ContractorCredentialReminderService.processReminders();
  }
);
