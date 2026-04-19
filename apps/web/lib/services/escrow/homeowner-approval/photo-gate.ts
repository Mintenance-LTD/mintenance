/**
 * LFC-P0-1: Homeowner-approval after-photo gate.
 *
 * Homeowners must not be able to approve escrow release before the
 * contractor has uploaded at least one verified after-photo. Previously
 * only /api/jobs/[id]/confirm-completion enforced this; the underlying
 * HomeownerApprovalService.approveCompletion() did not, so any route
 * that called it directly (admin path, bulk scripts, test helpers) could
 * bypass the invariant and break dispute resolution.
 *
 * The auto-release cron path checks photo quality separately (score
 * >= 0.7 in checkAutoApprovalEligibility) and so is allowed to skip
 * this gate via `{ internal: true }`.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';

export interface PhotoGateResult {
  /** Verified after-photo URLs available for this job */
  photoUrls: string[];
  /** True when at least one verified after-photo exists */
  hasVerifiedAfterPhotos: boolean;
}

/**
 * Fetch after-photos for a job and report whether the approval gate passes.
 * Rows with verified=false are excluded; rows with verified=null are
 * treated as verified (legacy data predates the column being populated).
 */
export async function fetchAfterPhotoGate(
  jobId: string
): Promise<PhotoGateResult> {
  const { data: photos } = await serverSupabase
    .from('job_photos_metadata')
    .select('photo_url, verified')
    .eq('job_id', jobId)
    .eq('photo_type', 'after');

  const verified = (photos ?? []).filter(
    (p: { photo_url: string; verified?: boolean | null }) =>
      p.verified !== false
  );

  return {
    photoUrls: verified.map((p) => p.photo_url),
    hasVerifiedAfterPhotos: verified.length > 0,
  };
}
