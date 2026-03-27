import { withCronHandler } from '@/lib/cron-handler';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Cron: PII data cleanup (P1-13 production readiness)
 * Runs daily at 03:00 UTC.
 *
 * - Deletes login_attempts older than 30 days
 * - Anonymizes IP addresses in security_events older than 7 days
 * - Deletes expired refresh_tokens older than 30 days
 * - Deletes expired password_reset_tokens older than 7 days
 */
export const GET = withCronHandler('pii-cleanup', async () => {
  const results: Record<string, number | string> = {};

  // 1. Delete old login attempts (PII: IP address, user agent)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { count: loginCount, error: loginErr } = await serverSupabase
    .from('login_attempts')
    .delete({ count: 'exact' })
    .lt('created_at', thirtyDaysAgo);

  if (loginErr) {
    logger.warn('Failed to clean login_attempts', {
      service: 'pii-cleanup',
      error: loginErr.message,
    });
  }
  results.login_attempts_deleted = loginCount ?? 0;

  // 2. Anonymize old IP addresses in security events
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { count: anonCount, error: anonErr } = await serverSupabase
    .from('security_events')
    .update({ ip_address: 'anonymized' }, { count: 'exact' })
    .lt('created_at', sevenDaysAgo)
    .neq('ip_address', 'anonymized')
    .not('ip_address', 'is', null);

  if (anonErr) {
    logger.warn('Failed to anonymize security_events IPs', {
      service: 'pii-cleanup',
      error: anonErr.message,
    });
  }
  results.security_events_anonymized = anonCount ?? 0;

  // 3. Delete expired refresh tokens
  const { count: tokenCount, error: tokenErr } = await serverSupabase
    .from('refresh_tokens')
    .delete({ count: 'exact' })
    .lt('expires_at', thirtyDaysAgo);

  if (tokenErr) {
    logger.warn('Failed to clean refresh_tokens', {
      service: 'pii-cleanup',
      error: tokenErr.message,
    });
  }
  results.refresh_tokens_deleted = tokenCount ?? 0;

  // 4. Delete expired password reset tokens
  const { count: resetCount, error: resetErr } = await serverSupabase
    .from('password_reset_tokens')
    .delete({ count: 'exact' })
    .lt('expires_at', sevenDaysAgo);

  if (resetErr) {
    logger.warn('Failed to clean password_reset_tokens', {
      service: 'pii-cleanup',
      error: resetErr.message,
    });
  }
  results.reset_tokens_deleted = resetCount ?? 0;

  logger.info('PII cleanup completed', { service: 'pii-cleanup', results });

  return results;
});
