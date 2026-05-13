import { withCronHandler } from '@/lib/cron-handler';
import { EscrowAutoReleaseService } from '@/lib/services/escrow/EscrowAutoReleaseService';

/**
 * Cron endpoint for processing automatic escrow releases.
 * Evaluates eligible escrows, calculates fees, and transfers funds
 * to contractor Stripe Connect accounts.
 *
 * Schedule: hourly at :00 (see `vercel.json` -> crons). Bumped from
 * daily 2026-05-13 once `/api/jobs/[id]/confirm-completion` started
 * setting `auto_release_date = now()` on homeowner approval — the
 * cron is now the actual processor for the homeowner-approved path,
 * not just the 7-day-timeout safety net, so the worst-case
 * approve-to-transfer latency drops from ~24h to ~1h. The 7-day
 * timeout path is unaffected; only the picker frequency changes.
 *
 * Batch size is 50 escrows per run (ESCROW_BATCH_LIMIT in the
 * service); running hourly comfortably absorbs typical volume
 * without straining Stripe rate limits.
 */
export const GET = withCronHandler('escrow-auto-release', async () => {
  return await EscrowAutoReleaseService.processAutoReleases();
});
