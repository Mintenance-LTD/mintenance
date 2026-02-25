import { withCronHandler } from '@/lib/cron-handler';
import { EscrowAutoReleaseService } from '@/lib/services/escrow/EscrowAutoReleaseService';

/**
 * Cron endpoint for processing automatic escrow releases.
 * Evaluates eligible escrows, calculates fees, and transfers funds
 * to contractor Stripe Connect accounts. Should be called every hour.
 */
export const GET = withCronHandler('escrow-auto-release', async () => {
  return await EscrowAutoReleaseService.processAutoReleases();
});
