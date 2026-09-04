import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';

/**
 * Cron endpoint for data archival (Issue 58)
 * Moves completed/cancelled jobs older than 12 months to archive schema.
 * Should be called monthly.
 */
export const GET = withCronHandler(
  'data-archival',
  async () => {
    const monthsThreshold = 12;
    const batchSize = 500;

    const { data, error } = await serverSupabase.rpc('archive_old_records', {
      months_threshold: monthsThreshold,
      batch_size: batchSize,
    });

    if (error) {
      logger.error('Data archival RPC failed', error, {
        service: 'data-archival',
        monthsThreshold,
        batchSize,
      });
      throw new InternalServerError('Data archival could not be completed');
    }

    return { result: data, processed: 1 };
  },
  { maxRequests: 2, windowMs: 3600000 } // 2 per hour (monthly job, generous limit)
);
