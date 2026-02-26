import { withCronHandler } from '@/lib/cron-handler';
import { LowActivityNudgeService } from '@/lib/services/contractor/LowActivityNudgeService';

/**
 * Cron endpoint: nudge contractors who haven't placed a bid in 14+ days.
 * Runs daily at 09:00 UTC. Includes a 7-day per-contractor cooldown.
 */
export const GET = withCronHandler('low-activity-contractor-nudge', async () => {
  return await LowActivityNudgeService.sendBatchNudges();
});
