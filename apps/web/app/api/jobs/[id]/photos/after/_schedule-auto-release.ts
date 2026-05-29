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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function scheduleAutoReleaseForCompletion(
  jobId: string,
  contractorId: string
): Promise<void> {
  try {
    const { data: escrowRow } = await serverSupabase
      .from('escrow_transactions')
      .select('id, auto_release_date')
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

    // Already scheduled (e.g. the homeowner-approval path beat us). Nothing
    // to do — never overwrite an existing release date.
    if (escrowRow.auto_release_date) return;

    // Primary: trust-score / risk-adjusted release date via the agent.
    // 2026-05-29: this was previously fire-and-forget (`.catch()` only,
    // not awaited). Live data showed a `held` escrow on a `completed` job
    // with auto_release_date = NULL, which the cron's
    // `.lte('auto_release_date', now)` filter silently excludes — funds
    // parked indefinitely. We now await it so we can verify it landed.
    try {
      const { EscrowReleaseAgent } =
        await import('@/lib/services/agents/EscrowReleaseAgent');
      await EscrowReleaseAgent.calculateAutoReleaseDate(
        escrowRow.id,
        jobId,
        contractorId
      );
    } catch (scheduleErr) {
      logger.error(
        'Failed to schedule auto-release after photo completion',
        scheduleErr,
        { service: 'jobs', jobId, escrowId: escrowRow.id }
      );
    }

    // Fallback safety net: guarantee auto_release_date is populated even if
    // the agent threw or returned null, so the auto-release cron can ever
    // match this row. Default homeowner-protection window = 7 days. The
    // `.is('auto_release_date', null)` guard makes this a no-op if the
    // agent already stamped a (possibly smarter) date.
    const { data: after } = await serverSupabase
      .from('escrow_transactions')
      .select('auto_release_date')
      .eq('id', escrowRow.id)
      .single();
    if (!after?.auto_release_date) {
      const fallbackDate = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
      const { error: stampErr } = await serverSupabase
        .from('escrow_transactions')
        .update({
          auto_release_date: fallbackDate,
          auto_release_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowRow.id)
        .is('auto_release_date', null);
      if (stampErr) {
        logger.error('Failed to stamp fallback auto_release_date', stampErr, {
          service: 'jobs',
          jobId,
          escrowId: escrowRow.id,
        });
      } else {
        logger.warn('Stamped fallback 7-day auto_release_date', {
          service: 'jobs',
          jobId,
          escrowId: escrowRow.id,
          autoReleaseDate: fallbackDate,
        });
      }
    }
  } catch (err) {
    logger.error('scheduleAutoReleaseForCompletion failed', err, {
      service: 'jobs',
      jobId,
    });
  }
}
