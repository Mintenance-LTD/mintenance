import { withCronHandler } from '@/lib/cron-handler';
import { WinBackService } from '@/lib/services/retention/WinBackService';

/**
 * Cron endpoint: re-engage homeowners and contractors who have been
 * inactive for 30+ days. Runs daily at 10:00 UTC.
 * Per-user cooldown of 30 days prevents repeated emails.
 */
export const GET = withCronHandler('win-back-campaign', async () => {
  return await WinBackService.sendWinBackCampaign();
});
