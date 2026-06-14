import { withCronHandler } from '@/lib/cron-handler';
import { VideoAssessmentFusion } from '@/lib/services/building-surveyor/VideoAssessmentFusion';

/**
 * Cron backstop for SAM2 video assessment fusion.
 *
 * The status-poll path (GET /api/assessments/:id/status) fuses completed
 * jobs in near real-time while a client is watching. This cron catches the
 * tail: jobs whose client stopped polling (app backgrounded/closed) before
 * SAM2 finished. Idempotent — fuseAssessmentVideo CAS-guards each row.
 */
export const GET = withCronHandler('video-assessment-processor', async () => {
  return await VideoAssessmentFusion.runBatch();
});
