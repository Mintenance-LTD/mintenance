import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { z } from 'zod';

const archivalResult = z
  .object({
    processed: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
    method: z.literal('in_place'),
  })
  .passthrough();

/**
 * Cron endpoint for data archival (Issue 58)
 * Archives inactive completed/cancelled jobs older than 12 months in place.
 * Preserves linked evidence and skips unresolved payments and disputes.
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

    const parsed = archivalResult.safeParse(data);
    if (!parsed.success)
      throw new InternalServerError('Invalid data archival result');
    return { result: parsed.data, processed: parsed.data.processed };
  },
  { maxRequests: 2, windowMs: 3600000 } // 2 per hour (monthly job, generous limit)
);
