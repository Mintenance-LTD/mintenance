import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { logger } from '@mintenance/shared';

const REMINDER_THRESHOLDS = [90, 30, 7] as const;

interface ReminderResult {
  insuranceChecked: number;
  insuranceSent: number;
  licensesChecked: number;
  licensesSent: number;
  errors: number;
}

/**
 * Contractor credential expiry reminders.
 *
 * Fires NotificationService.createNotification at 90 / 30 / 7 days
 * before an insurance policy or trade licence expires. Tracks
 * `last_reminder_days` per record so re-runs of the cron don't
 * spam the contractor.
 *
 * Mirrors `ComplianceReminderService` (homeowner-side, for gas
 * safety / EICR / EPC etc.) which has been in production since
 * 2026-02. This is the contractor-side equivalent for their
 * business credentials.
 *
 * Backed by `contractor_insurance` + `contractor_licenses` tables
 * (migration 20260220000005) with `last_reminder_days` columns
 * added in 20260520000005.
 */
export class ContractorCredentialReminderService {
  static async processReminders(): Promise<ReminderResult> {
    const result: ReminderResult = {
      insuranceChecked: 0,
      insuranceSent: 0,
      licensesChecked: 0,
      licensesSent: 0,
      errors: 0,
    };

    for (const days of REMINDER_THRESHOLDS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dateStr = targetDate.toISOString().split('T')[0];

      // ── Insurance ─────────────────────────────────────────────
      try {
        const { data: insurances, error } = await serverSupabase
          .from('contractor_insurance')
          .select(
            'id, contractor_id, type, provider, expiry_date, last_reminder_days'
          )
          .eq('expiry_date', dateStr)
          .neq('last_reminder_days', days);

        if (error) {
          logger.error('Failed to query contractor insurance', {
            service: 'contractor-credential-reminders',
            days,
            error: error.message,
          });
          result.errors++;
        } else if (insurances && insurances.length > 0) {
          result.insuranceChecked += insurances.length;
          for (const ins of insurances) {
            try {
              const urgencyWord = days <= 7 ? 'URGENT: ' : '';
              const title = `${urgencyWord}${ins.type} insurance expiring in ${days} days`;
              const message = `Your ${ins.type} policy with ${ins.provider} expires in ${days} days. Renew before the expiry date to keep your contractor account active.`;

              await NotificationService.createNotification({
                userId: ins.contractor_id,
                type: 'contractor_insurance_expiry',
                title,
                message,
                actionUrl: '/contractor/insurance',
                metadata: {
                  insurance_id: ins.id,
                  insurance_type: ins.type,
                  provider: ins.provider,
                  days_until_expiry: days,
                },
              });

              await serverSupabase
                .from('contractor_insurance')
                .update({
                  last_reminder_days: days,
                  last_reminder_sent_at: new Date().toISOString(),
                })
                .eq('id', ins.id);

              result.insuranceSent++;
            } catch (err) {
              logger.error('Failed to send insurance reminder', {
                service: 'contractor-credential-reminders',
                insuranceId: ins.id,
                error: err instanceof Error ? err.message : String(err),
              });
              result.errors++;
            }
          }
        }
      } catch (err) {
        logger.error('Error processing insurance reminder threshold', {
          service: 'contractor-credential-reminders',
          days,
          error: err instanceof Error ? err.message : String(err),
        });
        result.errors++;
      }

      // ── Licences ──────────────────────────────────────────────
      try {
        const { data: licenses, error } = await serverSupabase
          .from('contractor_licenses')
          .select(
            'id, contractor_id, name, issuer, expiry_date, last_reminder_days'
          )
          .eq('expiry_date', dateStr)
          .neq('last_reminder_days', days);

        if (error) {
          logger.error('Failed to query contractor licenses', {
            service: 'contractor-credential-reminders',
            days,
            error: error.message,
          });
          result.errors++;
        } else if (licenses && licenses.length > 0) {
          result.licensesChecked += licenses.length;
          for (const lic of licenses) {
            try {
              const urgencyWord = days <= 7 ? 'URGENT: ' : '';
              const title = `${urgencyWord}${lic.name} expiring in ${days} days`;
              const message = `Your ${lic.name}${lic.issuer ? ` from ${lic.issuer}` : ''} expires in ${days} days. Renew now to keep your trade credentials current.`;

              await NotificationService.createNotification({
                userId: lic.contractor_id,
                type: 'contractor_license_expiry',
                title,
                message,
                actionUrl: '/contractor/insurance',
                metadata: {
                  license_id: lic.id,
                  license_name: lic.name,
                  issuer: lic.issuer,
                  days_until_expiry: days,
                },
              });

              await serverSupabase
                .from('contractor_licenses')
                .update({
                  last_reminder_days: days,
                  last_reminder_sent_at: new Date().toISOString(),
                })
                .eq('id', lic.id);

              result.licensesSent++;
            } catch (err) {
              logger.error('Failed to send licence reminder', {
                service: 'contractor-credential-reminders',
                licenseId: lic.id,
                error: err instanceof Error ? err.message : String(err),
              });
              result.errors++;
            }
          }
        }
      } catch (err) {
        logger.error('Error processing licence reminder threshold', {
          service: 'contractor-credential-reminders',
          days,
          error: err instanceof Error ? err.message : String(err),
        });
        result.errors++;
      }
    }

    return result;
  }
}
