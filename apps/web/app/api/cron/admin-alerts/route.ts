import { withCronHandler } from '@/lib/cron-handler';
import { AdminAlertService } from '@/lib/services/admin/AdminAlertService';

/**
 * Cron endpoint for generating smart admin alerts.
 * Checks for conditions needing admin attention:
 * - Overdue escrows (held > 14 days)
 * - Unverified contractors (registered > 7 days)
 * - High-value payments (> GBP 5,000)
 * - Stale jobs (assigned > 30 days, no progress)
 * - Failed payments (> 3 failures per user in 24h)
 *
 * Recommended schedule: every 6 hours
 */
export const GET = withCronHandler('admin-alerts', async () => {
  const result = await AdminAlertService.generateAlerts();
  return {
    created: result.created,
    skipped: result.skipped,
    alertTypes: result.alerts.map((a) => a.type),
  };
});
