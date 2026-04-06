import { withCronHandler } from '@/lib/cron-handler';
import { processEligiblePayouts } from '@/lib/stripe/connect/payouts';

/**
 * Cron endpoint for processing weekly contractor payouts.
 * Transfers accumulated earnings (above threshold) from the platform balance
 * to each contractor's Stripe Connect Express account.
 *
 * Schedule: weekly, Friday morning (configure in vercel.json or cron provider).
 * Example cron spec: "0 9 * * 5" (09:00 UTC Friday)
 */
export const GET = withCronHandler('contractor-payouts', async () => {
  return await processEligiblePayouts();
});
