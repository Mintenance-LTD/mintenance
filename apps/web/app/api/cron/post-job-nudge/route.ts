import { withCronHandler } from '@/lib/cron-handler';
import { PostJobNudgeService } from '@/lib/services/retention/PostJobNudgeService';

/**
 * +90-day post-job nudge — daily at 08:00 UTC. For every job completed
 * ~90 days ago (89-91 day window, idempotent per job via
 * type='post_job_nudge' in notifications), email the homeowner the
 * before/after pair and a few next-job ideas.
 *
 * R5 #7 of docs/RETENTION_ROADMAP_2026.md.
 */
export const GET = withCronHandler('post-job-nudge', async () => {
  return await PostJobNudgeService.sendDailyBatch();
});
