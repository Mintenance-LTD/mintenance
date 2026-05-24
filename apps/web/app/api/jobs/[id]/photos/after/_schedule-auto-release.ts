/**
 * 2026-05-24 audit-33 P1: extracted from /api/jobs/[id]/photos/after
 * so the route stays under the 500-line cap. /api/jobs/[id]/complete
 * already schedules the 7-day auto-release via
 * EscrowReleaseAgent.calculateAutoReleaseDate when a contractor uses
 * the manual completion path; mobile contractors complete via after-
 * photo upload (the canonical mobile path per JobPhotoUploadScreen)
 * and that path never set auto_release_date. Result: photo-driven
 * completions without homeowner approval had no fallback release —
 * the cron only fires on rows with auto_release_date set, so funds
 * parked indefinitely. This helper closes that gap; it's fire-and-
 * forget so a scheduling failure never blocks the photo upload.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export async function scheduleAutoReleaseForCompletion(
  jobId: string,
  contractorId: string
): Promise<void> {
  try {
    const { EscrowReleaseAgent } =
      await import('@/lib/services/agents/EscrowReleaseAgent');
    const { data: escrowRow } = await serverSupabase
      .from('escrow_transactions')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'held')
      .limit(1)
      .single();
    if (!escrowRow) {
      logger.warn(
        'No held escrow found when scheduling auto-release post-photo',
        { service: 'jobs', jobId }
      );
      return;
    }
    EscrowReleaseAgent.calculateAutoReleaseDate(
      escrowRow.id,
      jobId,
      contractorId
    ).catch((scheduleErr) => {
      logger.error(
        'Failed to schedule auto-release after photo completion',
        scheduleErr,
        { service: 'jobs', jobId, escrowId: escrowRow.id }
      );
    });
  } catch (agentErr) {
    logger.error('EscrowReleaseAgent import/init failed', agentErr, {
      service: 'jobs',
      jobId,
    });
  }
}
