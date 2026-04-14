/**
 * 7-day auto-approval eligibility check for escrow release.
 *
 * LFC-P0-1 (audit 2026-04-13): the original gate only checked if the 7-day
 * `auto_approval_date` had passed and photos were verified. That meant funds
 * could auto-release even if the homeowner never acted. The CLAUDE.md spec
 * says "requires homeowner approval" with the 7-day window as a *safety net*.
 *
 * Now gated on ALL of:
 *   - escrow is not already approved
 *   - escrow.auto_release_enabled is true
 *   - auto_approval_date has elapsed (7-day safety-net timer)
 *   - photos are 'verified' with score ≥ 0.7
 *   - NO active disputes on the underlying job
 *   - job still exists and is 'completed'
 *
 * The explicit homeowner approval path goes through
 * `HomeownerApprovalService.approveCompletion()` directly and does NOT go
 * through this function.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const SERVICE = 'HomeownerApprovalService';

export async function checkAutoApprovalEligibility(
  escrowId: string
): Promise<boolean> {
  try {
    const { data: escrow, error } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id,
        job_id,
        homeowner_approval,
        auto_approval_date,
        auto_release_enabled,
        photo_verification_status,
        photo_verification_score
      `
      )
      .eq('id', escrowId)
      .single();

    if (error || !escrow) return false;
    if (escrow.homeowner_approval) return false;
    if (!escrow.auto_release_enabled) return false;

    const autoApprovalDate = escrow.auto_approval_date
      ? new Date(escrow.auto_approval_date)
      : null;
    if (!autoApprovalDate || autoApprovalDate > new Date()) return false;

    if (escrow.photo_verification_status !== 'verified') return false;
    if ((escrow.photo_verification_score || 0) < 0.7) return false;

    const { data: activeDisputes, error: disputeError } = await serverSupabase
      .from('disputes')
      .select('id')
      .eq('job_id', escrow.job_id)
      .in('status', ['open', 'under_review', 'pending'])
      .limit(1);

    if (disputeError) {
      logger.error(
        'Error checking disputes during auto-approval eligibility',
        disputeError,
        { service: SERVICE, escrowId }
      );
      return false;
    }

    if (activeDisputes && activeDisputes.length > 0) {
      logger.info('Auto-approval blocked by active dispute', {
        service: SERVICE,
        escrowId,
        jobId: escrow.job_id,
      });
      return false;
    }

    const { data: job } = await serverSupabase
      .from('jobs')
      .select('id, status')
      .eq('id', escrow.job_id)
      .single();

    if (!job || job.status !== 'completed') return false;

    return true;
  } catch (error) {
    logger.error('Error checking auto-approval eligibility', error, {
      service: SERVICE,
      escrowId,
    });
    return false;
  }
}
