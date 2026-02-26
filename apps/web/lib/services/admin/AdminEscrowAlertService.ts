/**
 * Admin Escrow Alert Service
 *
 * Extracted from cron/admin-escrow-alerts route handler.
 * Sends notifications to admin users when escrows are pending review.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AdminEscrowHoldService } from './AdminEscrowHoldService';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

interface AlertResults {
  processed: number;
  alertsSent: number;
  errors: number;
}

export class AdminEscrowAlertService {
  /**
   * Send alerts to all admins about escrows pending review.
   * Returns counts of processed admins, alerts sent, and errors.
   */
  static async sendPendingReviewAlerts(): Promise<AlertResults> {
    const results: AlertResults = { processed: 0, alertsSent: 0, errors: 0 };

    // 1. Get escrows pending admin review
    const pendingReviews = await AdminEscrowHoldService.getPendingAdminReviews(50);

    if (pendingReviews.length === 0) {
      logger.info('No escrows pending admin review', {
        service: 'AdminEscrowAlertService',
      });
      return results;
    }

    // 2. Get admin users
    const { data: admins, error: adminError } = await serverSupabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin')
      .is('deleted_at', null);

    if (adminError || !admins || admins.length === 0) {
      logger.warn('No admin users found for escrow alerts', {
        service: 'AdminEscrowAlertService',
      });
      throw new Error('No admins found to receive escrow alerts');
    }

    // 3. Send alerts to each admin
    for (const admin of admins) {
      try {
        results.processed++;

        await NotificationService.createNotification({
          userId: admin.id,
          title: `Escrow Reviews Pending (${pendingReviews.length})`,
          message: `You have ${pendingReviews.length} escrow(s) pending admin review. Please review them in the admin dashboard.`,
          type: 'admin_alert',
          actionUrl: '/admin/escrow/reviews',
          metadata: {
            pendingCount: pendingReviews.length,
            escrowIds: pendingReviews.map((r) => r.escrowId),
          },
        });

        results.alertsSent++;
      } catch (error) {
        logger.error('Error sending admin escrow alert', error, {
          service: 'AdminEscrowAlertService',
          adminId: admin.id,
        });
        results.errors++;
      }
    }

    return results;
  }
}
