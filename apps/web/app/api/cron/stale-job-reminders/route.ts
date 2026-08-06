import { withCronHandler } from '@/lib/cron-handler';
import { StaleJobService } from '@/lib/services/retention/StaleJobService';

/**
 * Stale-job reminders + auto-archive — daily.
 *
 * Walks two stall types on a notice(14d) → reminder(30d) → auto-archive(60d)
 * ladder: jobs left "posted" with no contractor picked, and jobs "assigned"
 * but never funded past the payment step. See StaleJobService.
 */
export const GET = withCronHandler('stale-job-reminders', async () => {
  return await StaleJobService.processStaleJobs();
});
