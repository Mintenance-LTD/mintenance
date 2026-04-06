/**
 * Auto-release evaluation orchestrator.
 * Applies all gating conditions before approving an escrow release.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from '../AgentLogger';
import { PredictiveAgent } from '../PredictiveAgent';
import type { AgentResult } from '../types';
import type { EscrowJobInfo, RiskPrediction } from './types';
import {
  calculateAutoReleaseDate,
  getApplicableRule,
} from './auto-release-rules';

interface MetadataWithRisks {
  risks?: RiskPrediction[];
}

/**
 * Evaluate whether an escrow can be auto-released.
 *
 * Release requires ALL of:
 *   1. Admin approval (unless status is 'none' or 'admin_approved')
 *   2. Homeowner approval OR auto-approval eligibility (7d + AI verified)
 *   3. Photo verification passed (quality, geolocation, timestamp, before/after)
 *   4. Cooling-off period elapsed (48h after homeowner approval)
 *   5. No active disputes
 *   6. Trust-based hold period elapsed
 *   7. No high dispute-risk predictions
 */
export async function evaluateAutoRelease(
  escrowId: string,
): Promise<AgentResult | null> {
  try {
    const { TrustScoreService } = await import(
      '@/lib/services/contractor/TrustScoreService'
    );
    const { HomeownerApprovalService } = await import(
      '@/lib/services/escrow/HomeownerApprovalService'
    );

    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
          id,
          job_id,
          payer_id,
          payee_id,
          amount,
          status,
          auto_release_enabled,
          auto_release_date,
          photo_verification_status,
          photo_verification_score,
          risk_hold_extended,
          admin_hold_status,
          homeowner_approval,
          homeowner_approval_at,
          cooling_off_ends_at,
          auto_approval_date,
          photo_quality_passed,
          geolocation_verified,
          timestamp_verified,
          before_after_comparison_score,
          trust_score,
          jobs (
            id,
            status,
            contractor_id,
            homeowner_id
          )
        `,
      )
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow || escrow.status !== 'held') {
      return null;
    }
    if (!escrow.auto_release_enabled) {
      return null;
    }

    const jobsResult = escrow.jobs;
    const job = (Array.isArray(jobsResult) ? jobsResult[0] : jobsResult) as
      | EscrowJobInfo
      | undefined;
    if (!job || job.status !== 'completed') {
      return null;
    }

    // 1. Admin approval gate
    if (
      escrow.admin_hold_status === 'admin_hold' ||
      escrow.admin_hold_status === 'pending_review'
    ) {
      return null;
    }
    if (
      escrow.admin_hold_status !== 'admin_approved' &&
      escrow.admin_hold_status !== 'none'
    ) {
      return null;
    }

    // 2. Homeowner approval or auto-approval
    if (!escrow.homeowner_approval) {
      const autoApprovalEligible =
        await HomeownerApprovalService.checkAutoApprovalEligibility(escrowId);
      if (!autoApprovalEligible) {
        return null;
      }
      await HomeownerApprovalService.processAutoApproval(escrowId);
      const { data: updatedEscrow } = await serverSupabase
        .from('escrow_transactions')
        .select('homeowner_approval, cooling_off_ends_at')
        .eq('id', escrowId)
        .single();
      if (!updatedEscrow?.homeowner_approval) {
        return null;
      }
      escrow.homeowner_approval = updatedEscrow.homeowner_approval;
      escrow.cooling_off_ends_at = updatedEscrow.cooling_off_ends_at;
    }

    // 3. Photo verification
    if (escrow.photo_verification_status !== 'verified') return null;
    if (!escrow.photo_quality_passed) return null;
    if (!escrow.geolocation_verified) return null;
    if (!escrow.timestamp_verified) return null;
    if (
      escrow.before_after_comparison_score !== null &&
      escrow.before_after_comparison_score < 0.6
    ) {
      return null;
    }

    // 4. Cooling-off period
    if (escrow.cooling_off_ends_at) {
      const coolingOffEnds = new Date(escrow.cooling_off_ends_at);
      if (coolingOffEnds > new Date()) {
        return null;
      }
    }

    // 5. Active disputes
    const { count: disputeCount } = await serverSupabase
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', job.id)
      .in('status', ['open', 'pending']);
    if ((disputeCount || 0) > 0) {
      return null;
    }

    // 6. Trust-based hold period
    const homeownerApprovalDate = escrow.homeowner_approval_at
      ? new Date(escrow.homeowner_approval_at)
      : new Date();
    const trustBasedReleaseDate =
      await TrustScoreService.getGraduatedReleaseDate(
        escrowId,
        homeownerApprovalDate,
      );
    if (trustBasedReleaseDate > new Date()) {
      return null;
    }

    // Legacy auto_release_date check
    if (!escrow.auto_release_date) {
      const releaseDate = await calculateAutoReleaseDate(
        escrowId,
        job.id,
        job.contractor_id,
      );
      if (!releaseDate) return null;
      const { data: updatedEscrow } = await serverSupabase
        .from('escrow_transactions')
        .select('auto_release_date')
        .eq('id', escrowId)
        .single();
      if (
        !updatedEscrow ||
        new Date(updatedEscrow.auto_release_date) > new Date()
      ) {
        return null;
      }
    } else {
      if (new Date(escrow.auto_release_date) > new Date()) {
        return null;
      }
    }

    // Tier-specific rule check for photo score threshold
    const { PayoutTierService } = await import(
      '@/lib/services/payment/PayoutTierService'
    );
    let contractorTier = 'standard';
    try {
      const tier = await PayoutTierService.calculateTier(job.contractor_id);
      contractorTier = tier || 'standard';
    } catch {
      // Default to standard
    }
    const escrowTierMap: Record<string, string> = {
      elite: 'platinum',
      trusted: 'gold',
      standard: 'bronze',
    };
    const escrowTier = escrowTierMap[contractorTier] || 'bronze';

    const rule = await getApplicableRule(escrowTier, escrow.amount || 0, '');
    if (rule?.requirePhotoVerification) {
      if (
        escrow.photo_verification_status !== 'verified' ||
        (escrow.photo_verification_score || 0) < (rule.minPhotoScore || 0.7)
      ) {
        return null;
      }
    }

    // 7. Escrow-status-level dispute check
    const { count: disputeCount2 } = await serverSupabase
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', job.id)
      .eq('status', 'disputed');
    if ((disputeCount2 || 0) > 0) {
      return null;
    }

    // 8. Predicted dispute risk — extend hold if high
    const riskAssessmentResults = await PredictiveAgent.analyzeJob(job.id, {
      jobId: job.id,
      userId: job.homeowner_id,
      contractorId: job.contractor_id,
    });
    const riskAssessmentWithRisks = riskAssessmentResults.find(
      (result) =>
        result.metadata &&
        typeof result.metadata === 'object' &&
        (result.metadata as MetadataWithRisks).risks,
    );
    if (
      riskAssessmentWithRisks?.metadata &&
      typeof riskAssessmentWithRisks.metadata === 'object'
    ) {
      const risks = (riskAssessmentWithRisks.metadata as MetadataWithRisks)
        .risks;
      if (Array.isArray(risks)) {
        const highRiskDisputes = risks.filter(
          (r: RiskPrediction) =>
            r.risk_type === 'dispute' && r.severity === 'high',
        );
        if (highRiskDisputes.length > 0) {
          const extendedDate = new Date();
          extendedDate.setDate(extendedDate.getDate() + 7);
          await serverSupabase
            .from('escrow_transactions')
            .update({
              auto_release_date: extendedDate.toISOString(),
              risk_hold_extended: true,
              risk_hold_reason: 'High dispute risk predicted',
              updated_at: new Date().toISOString(),
            })
            .eq('id', escrowId);
          return {
            success: true,
            message: 'Auto-release delayed due to predicted dispute risk',
            metadata: { extendedDate: extendedDate.toISOString() },
          };
        }
      }
    }

    // All gates passed — approve
    await AgentLogger.logDecision({
      agentName: 'escrow-release',
      decisionType: 'auto_release_approved',
      actionTaken: 'approved_auto_release',
      confidence: 95,
      reasoning: `Auto-release approved: All conditions met - admin approved, homeowner approved, photo verified (quality/geolocation/timestamp/before-after), cooling-off passed, no disputes, trust-based hold period passed`,
      jobId: job.id,
      userId: job.homeowner_id,
      metadata: {
        escrowId,
        autoReleaseDate: escrow.auto_release_date,
        adminHoldStatus: escrow.admin_hold_status,
        homeownerApproval: escrow.homeowner_approval,
        photoVerificationStatus: escrow.photo_verification_status,
        trustScore: escrow.trust_score,
      },
    });

    return {
      success: true,
      message: 'Auto-release approved',
      metadata: {
        escrowId,
        autoReleaseDate: escrow.auto_release_date,
        photoVerificationScore: escrow.photo_verification_score,
      },
    };
  } catch (error) {
    logger.error('Error evaluating auto-release', error, {
      service: 'EscrowReleaseAgent',
      escrowId,
    });
    return null;
  }
}
