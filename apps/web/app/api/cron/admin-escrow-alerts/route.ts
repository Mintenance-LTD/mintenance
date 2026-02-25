import { withCronHandler } from '@/lib/cron-handler';
import { AdminEscrowAlertService } from '@/lib/services/admin/AdminEscrowAlertService';

/**
 * Cron endpoint for sending admin alerts for escrows pending review.
 * Should be called daily.
 */
export const GET = withCronHandler('admin-escrow-alerts', async () => {
  return await AdminEscrowAlertService.sendPendingReviewAlerts();
});
