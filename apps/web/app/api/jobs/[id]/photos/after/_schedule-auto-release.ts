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
      .select('id, auto_release_date, auto_approval_date, homeowner_approval')
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

    // Start the 7-day homeowner-review clock and propagate the after-photo
    // verification results onto the escrow row. Without this the auto-release
    // cron selects the row (auto_release_date elapsed) but evaluate.ts then
    // rejects it: checkAutoApprovalEligibility needs auto_approval_date, and
    // gate 3 needs photo_verification_status='verified' + geolocation_verified —
    // all live on escrow_transactions and were never written on the photo path,
    // so funds stalled past the 7-day window. Guarded to the first completion of
    // a not-yet-approved row: never overwrite an existing clock, and skip if the
    // homeowner already approved (their human review supersedes these gates).
    if (!escrowRow.auto_approval_date && !escrowRow.homeowner_approval) {
      await stampApprovalClockAndVerification(jobId, escrowRow.id);
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

/**
 * Derive the after-photo verification signals from job_photos_metadata (which
 * the upload route already wrote) and stamp them plus the 7-day auto-approval
 * clock onto the escrow row. Kept self-contained here rather than threaded from
 * the route so the (already 500+ line) upload route needs no change.
 *
 * The route only ever inserts after-photos that PASSED the quality gate (it
 * `continue`s on failure), and it throws if none remain — so any 'after' row
 * existing means quality passed. geolocation_verified is stamped per photo
 * (true within 100m, null when no location was captured); we require at least
 * one geo-proven photo, otherwise the row stays on manual-approval-only, which
 * is the safe default for the automated release gate.
 */
async function stampApprovalClockAndVerification(
  jobId: string,
  escrowId: string
): Promise<void> {
  const { data: afterPhotos } = await serverSupabase
    .from('job_photos_metadata')
    .select('verified, geolocation_verified')
    .eq('job_id', jobId)
    .eq('photo_type', 'after');

  const photoQualityPassed =
    !!afterPhotos && afterPhotos.some((p) => p.verified !== false);
  const geolocationVerified =
    !!afterPhotos && afterPhotos.some((p) => p.geolocation_verified === true);

  const autoApprovalDate = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
  const { error: verifyStampErr } = await serverSupabase
    .from('escrow_transactions')
    .update({
      auto_approval_date: autoApprovalDate,
      photo_verification_status: photoQualityPassed ? 'verified' : 'failed',
      photo_quality_passed: photoQualityPassed,
      geolocation_verified: geolocationVerified,
      timestamp_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId)
    .is('auto_approval_date', null);
  if (verifyStampErr) {
    logger.error(
      'Failed to stamp auto_approval_date / photo verification on escrow',
      verifyStampErr,
      { service: 'jobs', jobId, escrowId }
    );
  }
}
