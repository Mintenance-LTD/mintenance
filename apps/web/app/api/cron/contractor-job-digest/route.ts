import { withCronHandler } from '@/lib/cron-handler';
import { JobDigestService } from '@/lib/services/retention/JobDigestService';

/**
 * Cron endpoint: send weekly job digest emails to contractors showing
 * new jobs that match their skills from the past 7 days.
 * Runs every Monday at 08:00 UTC.
 */
export const GET = withCronHandler('contractor-job-digest', async () => {
  return await JobDigestService.sendWeeklyDigests();
});
