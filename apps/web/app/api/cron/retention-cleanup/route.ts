import { withCronHandler } from '@/lib/cron-handler';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ServiceUnavailableError } from '@/lib/errors/api-error';
import { cleanupPropertyDocumentFiles } from '@/lib/properties/cleanup-document-files';
import { z } from 'zod';

const retentionResult = z
  .object({
    processed: z.number().int().nonnegative(),
    profiles_deferred_for_review: z.number().int().nonnegative(),
  })
  .passthrough();

/**
 * Cron endpoint for data retention cleanup (Issue 29)
 * Runs the database retention_cleanup function which handles:
 * - Old email history purge (>180 days)
 * - Expired password reset tokens
 * - Old login attempts (>90 days)
 * - Redacts successful webhook payloads (>7 days), preserving deduplication IDs
 * - Clears deleted profile contact fields (>90 days), deferring active/legal holds
 * Should be called daily.
 */
export const GET = withCronHandler('retention-cleanup', async () => {
  const { data, error: rpcError } = await serverSupabase.rpc(
    'run_retention_cleanup'
  );

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

  const parsed = retentionResult.safeParse(data);
  if (!parsed.success)
    throw new ServiceUnavailableError('Retention cleanup result');
  const result = parsed.data;
  const removedFiles = await cleanupPropertyDocumentFiles();
  if (result.profiles_deferred_for_review > 0) {
    logger.warn('Deleted profiles require retention review', {
      service: 'retention-cleanup',
      count: result.profiles_deferred_for_review,
    });
  }
  return {
    method: 'rpc',
    results: result,
    processed: result.processed + removedFiles,
    removedFiles,
  };
});
