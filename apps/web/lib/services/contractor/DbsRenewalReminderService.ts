import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { logger } from '@mintenance/shared';

const REMINDER_THRESHOLDS = [90, 30, 7] as const;

interface ReminderResult {
  checksScanned: number;
  remindersSent: number;
  errors: number;
}

/**
 * DBS check renewal reminders.
 *
 * UK DBS certificates have no statutory expiry — but most platforms
 * (and many homeowner-facing categories like care, child-services,
 * tutoring) treat a check older than 3 years as stale. The
 * `contractor_dbs_checks` table records a 3-year `expiry_date` at
 * the time the check clears. This service fires
 * NotificationService.createNotification at 90 / 30 / 7 days before
 * that date so the contractor can re-run a check before their boost
 * lapses + before homeowners filtering by "DBS valid" stop seeing
 * them in search.
 *
 * `last_reminder_days` is updated per record so re-runs of the cron
 * don't spam the contractor with the same threshold twice.
 *
 * Mirrors `ContractorCredentialReminderService` (this branch,
 * insurance + licences) and `ComplianceReminderService` (homeowner-side,
 * gas safety / EICR / EPC).
 *
 * Backed by migration 20260520000007 which adds `last_reminder_days`
 * + `last_reminder_sent_at` columns. The legacy `expiry_reminder_sent`
 * boolean column is unchanged — it powers a separate single-shot
 * reminder path used by `DBSCheckService.markExpiryReminderSent` and
 * is not maintained by this service.
 */
export class DbsRenewalReminderService {
  static async processReminders(): Promise<ReminderResult> {
    const result: ReminderResult = {
      checksScanned: 0,
      remindersSent: 0,
      errors: 0,
    };

    for (const days of REMINDER_THRESHOLDS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dateStr = targetDate.toISOString().split('T')[0];

      try {
        const { data: checks, error } = await serverSupabase
          .from('contractor_dbs_checks')
          .select(
            'id, contractor_id, dbs_type, expiry_date, last_reminder_days'
          )
          .eq('status', 'clear')
          .eq('expiry_date', dateStr)
          .neq('last_reminder_days', days);

        if (error) {
          logger.error('Failed to query DBS checks for reminder', {
            service: 'dbs-renewal-reminders',
            days,
            error: error.message,
          });
          result.errors++;
          continue;
        }

        if (!checks || checks.length === 0) continue;
        result.checksScanned += checks.length;

        for (const check of checks) {
          try {
            const urgencyWord = days <= 7 ? 'URGENT: ' : '';
            const dbsLabel =
              check.dbs_type === 'enhanced'
                ? 'Enhanced DBS'
                : check.dbs_type === 'standard'
                  ? 'Standard DBS'
                  : 'Basic DBS';

            const title = `${urgencyWord}${dbsLabel} expiring in ${days} days`;
            const message = `Your ${dbsLabel} check expires in ${days} days. Renew now to keep your profile boost active and stay visible to homeowners filtering on verified background checks.`;

            await NotificationService.createNotification({
              userId: check.contractor_id,
              type: 'contractor_dbs_expiry',
              title,
              message,
              actionUrl: '/contractor/verification',
              metadata: {
                dbs_check_id: check.id,
                dbs_type: check.dbs_type,
                days_until_expiry: days,
                expiry_date: check.expiry_date,
              },
            });

            await serverSupabase
              .from('contractor_dbs_checks')
              .update({
                last_reminder_days: days,
                last_reminder_sent_at: new Date().toISOString(),
              })
              .eq('id', check.id);

            result.remindersSent++;
          } catch (err) {
            logger.error('Failed to send DBS reminder', {
              service: 'dbs-renewal-reminders',
              checkId: check.id,
              error: err instanceof Error ? err.message : String(err),
            });
            result.errors++;
          }
        }
      } catch (err) {
        logger.error('Error processing DBS reminder threshold', {
          service: 'dbs-renewal-reminders',
          days,
          error: err instanceof Error ? err.message : String(err),
        });
        result.errors++;
      }
    }

    return result;
  }
}
