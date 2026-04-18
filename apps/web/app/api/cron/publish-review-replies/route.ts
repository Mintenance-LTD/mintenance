import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * publish-review-replies — R7 #19 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Runs hourly. For every review where
 *   - response_at IS NOT NULL
 *   - response_published_at IS NULL
 *   - response_blocked_by_admin IS FALSE
 *   - response_at <= now() - 48h
 * we set response_published_at = now(). The public reviews endpoint
 * only exposes `response` when `response_published_at IS NOT NULL`, so
 * this is the moment the reply becomes visible.
 *
 * An admin can short-circuit this by setting response_blocked_by_admin
 * true; they can also publish early by setting response_published_at
 * themselves.
 */
export const GET = withCronHandler('publish-review-replies', async () => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await serverSupabase
    .from('reviews')
    .update({ response_published_at: new Date().toISOString() })
    .not('response_at', 'is', null)
    .is('response_published_at', null)
    .eq('response_blocked_by_admin', false)
    .lte('response_at', cutoff)
    .select('id');

  if (error) {
    throw error;
  }

  return {
    evaluated: data?.length ?? 0,
    published: data?.length ?? 0,
  };
});
