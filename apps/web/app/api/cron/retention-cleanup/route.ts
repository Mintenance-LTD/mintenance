import { withCronHandler } from '@/lib/cron-handler';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

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
    // Fallback: run cleanup queries directly if the RPC function doesn't exist
    logger.warn('RPC run_retention_cleanup failed, running cleanup directly', {
      service: 'retention-cleanup',
      error: rpcError.message,
    });

    // Clean expired password reset tokens
    await serverSupabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Clean old login attempts (>90 days)
    await serverSupabase
      .from('login_attempts')
      .delete()
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    return { method: 'fallback', processed: 1 };
  }

  return { method: 'rpc', processed: 1 };
});
