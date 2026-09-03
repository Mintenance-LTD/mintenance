import { withCronHandler } from '@/lib/cron-handler';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ServiceUnavailableError } from '@/lib/errors/api-error';

/**
 * Cron endpoint for data retention cleanup (Issue 29)
 * Runs the database retention_cleanup function which handles:
 * - Old email history purge (>180 days)
 * - Expired password reset tokens
 * - Old login attempts (>90 days)
 * - Old webhook events (>7 days)
 * - Soft-deleted profile anonymisation (>90 days)
 * Should be called daily.
 */
export const GET = withCronHandler('retention-cleanup', async () => {
  const { error: rpcError } = await serverSupabase.rpc('run_retention_cleanup');

  if (rpcError) {
    // This job covers several retention categories. Partial ad-hoc cleanup
    // must not be reported as success because the scheduler would then stop
    // retrying and privacy data could remain indefinitely.
    logger.error('RPC run_retention_cleanup failed', rpcError, {
      service: 'retention-cleanup',
      error: rpcError.message,
    });
    throw new ServiceUnavailableError('Retention cleanup');
  }

  return { method: 'rpc', processed: 1 };
});
