import { withCronHandler } from '@/lib/cron-handler';
import { EscrowAutoReleaseService } from '@/lib/services/escrow/EscrowAutoReleaseService';

/**
 * Cron endpoint for processing automatic escrow releases.
 * Evaluates eligible escrows, calculates fees, and transfers funds
 * to contractor Stripe Connect accounts.
 *
 * Schedule: daily at 00:00 UTC (see `vercel.json` -> crons). Daily
 * cadence is fine — auto-release windows are measured in days
 * (3-14d hold depending on tier), so worst-case latency is one
 * day after the `auto_release_date` becomes due. If we ever need
 * tighter SLAs (e.g. hourly), bump the schedule to `0 * * * *` and
 * keep this handler unchanged.
 */
export const GET = withCronHandler('escrow-auto-release', async () => {
  return await EscrowAutoReleaseService.processAutoReleases();
});
