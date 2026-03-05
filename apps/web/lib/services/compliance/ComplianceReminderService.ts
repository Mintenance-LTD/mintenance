import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { logger } from '@mintenance/shared';

const REMINDER_THRESHOLDS = [90, 30, 7] as const;

const CERT_LABELS: Record<string, string> = {
  gas_safety: 'Gas Safety (CP12)',
  eicr: 'EICR',
  epc: 'EPC',
  smoke_alarm: 'Smoke Alarms',
  co_detector: 'CO Detector',
};

interface ReminderResult {
  checked: number;
  sent: number;
  errors: number;
}

export class ComplianceReminderService {
  /**
   * Process all compliance certificates and send reminders at 90, 30, 7 day thresholds.
   * Tracks last reminder sent to avoid duplicates.
   */
  static async processReminders(): Promise<ReminderResult> {
    const result: ReminderResult = { checked: 0, sent: 0, errors: 0 };

    for (const days of REMINDER_THRESHOLDS) {
      try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const dateStr = targetDate.toISOString().split('T')[0];

        // Find certs expiring on this exact date that haven't had this reminder
        const { data: certs, error } = await serverSupabase
          .from('compliance_certificates')
          .select(`
            id, cert_type, expiry_date, property_id,
            last_reminder_days,
            properties!inner(id, owner_id, property_name)
          `)
          .eq('expiry_date', dateStr)
          .neq('last_reminder_days', days);

        if (error) {
          logger.error('Failed to query compliance certificates', {
            service: 'compliance-reminders',
            days,
            error: error.message,
          });
          result.errors++;
          continue;
        }

        if (!certs || certs.length === 0) continue;
        result.checked += certs.length;

        for (const cert of certs) {
          try {
            const property = cert.properties as unknown as { id: string; owner_id: string; property_name: string };
            const certLabel = CERT_LABELS[cert.cert_type] || cert.cert_type.replace(/_/g, ' ');

            const urgencyWord = days <= 7 ? 'URGENT: ' : days <= 30 ? '' : '';
            const title = `${urgencyWord}${certLabel} expiring in ${days} days`;
            const message = `Your ${certLabel} certificate for ${property.property_name} expires in ${days} days. Book a renewal to stay compliant.`;

            await NotificationService.createNotification({
              userId: property.owner_id,
              type: 'compliance_expiry_reminder',
              title,
              message,
              actionUrl: `/properties/compliance`,
              metadata: {
                cert_id: cert.id,
                cert_type: cert.cert_type,
                property_id: property.id,
                days_until_expiry: days,
              },
            });

            // Track that we sent this reminder
            await serverSupabase
              .from('compliance_certificates')
              .update({
                last_reminder_days: days,
                last_reminder_sent_at: new Date().toISOString(),
              })
              .eq('id', cert.id);

            result.sent++;
          } catch (err) {
            logger.error('Failed to send compliance reminder', {
              service: 'compliance-reminders',
              certId: cert.id,
              error: err instanceof Error ? err.message : String(err),
            });
            result.errors++;
          }
        }
      } catch (err) {
        logger.error('Error processing reminder threshold', {
          service: 'compliance-reminders',
          days,
          error: err instanceof Error ? err.message : String(err),
        });
        result.errors++;
      }
    }

    return result;
  }
}
