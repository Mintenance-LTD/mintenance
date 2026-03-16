import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Cron endpoint for expiring stale bids.
 * Marks pending bids as 'expired' when their expires_at timestamp has passed.
 * Also notifies contractors whose bids expired.
 *
 * Recommended schedule: every hour
 */
export const GET = withCronHandler('expire-bids', async () => {
  const now = new Date().toISOString();

  // Find and expire all pending bids past their expiry date
  const { data: expiredBids, error } = await serverSupabase
    .from('bids')
    .update({
      status: 'expired',
      updated_at: now,
    })
    .eq('status', 'pending')
    .lt('expires_at', now)
    .not('expires_at', 'is', null)
    .select('id, contractor_id, job_id');

  if (error) {
    logger.error('Failed to expire bids', error, { service: 'cron' });
    throw error;
  }

  const expiredCount = expiredBids?.length ?? 0;

  // Notify contractors about expired bids
  if (expiredBids && expiredBids.length > 0) {
    try {
      const { NotificationService } = await import('@/lib/services/notifications/NotificationService');
      for (const bid of expiredBids) {
        await NotificationService.createNotification({
          userId: bid.contractor_id,
          title: 'Bid Expired',
          message: 'Your bid has expired. You can submit a new bid if the job is still available.',
          type: 'bid_expired',
          actionUrl: `/contractor/jobs/${bid.job_id}`,
        });
      }
    } catch (notifyError) {
      logger.error('Failed to notify contractors of expired bids', notifyError, { service: 'cron' });
    }
  }

  logger.info('Bid expiry cron completed', {
    service: 'cron',
    expiredCount,
  });

  return { expired: expiredCount };
});
