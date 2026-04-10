/**
 * Auto-release rule matching and risk-adjusted hold period calculation.
 * Rules are loaded from escrow_auto_release_rules, matched by contractor tier,
 * job value, and category; priority-ordered.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { AutoReleaseRule } from './types';

/**
 * Get the first applicable auto-release rule for this job.
 * Returns the highest-priority match, or the lowest-priority rule as default.
 */
export async function getApplicableRule(
  contractorTier: string,
  jobValue: number,
  jobCategory: string
): Promise<AutoReleaseRule | null> {
  try {
    const { data: rules, error } = await serverSupabase
      .from('escrow_auto_release_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !rules || rules.length === 0) {
      return null;
    }

    for (const rule of rules) {
      if (rule.contractor_tier && rule.contractor_tier !== contractorTier) {
        continue;
      }
      if (rule.job_value_min && jobValue < rule.job_value_min) {
        continue;
      }
      if (rule.job_value_max && jobValue > rule.job_value_max) {
        continue;
      }
      if (rule.job_category && rule.job_category !== jobCategory) {
        continue;
      }

      return {
        id: rule.id,
        contractorTier: rule.contractor_tier || undefined,
        jobValueMin: rule.job_value_min || undefined,
        jobValueMax: rule.job_value_max || undefined,
        jobCategory: rule.job_category || undefined,
        holdPeriodDays: rule.hold_period_days,
        requirePhotoVerification: rule.require_photo_verification,
        requireReview: rule.require_review,
        minPhotoScore: rule.min_photo_score,
        riskMultiplier: rule.risk_multiplier,
        disputeHistoryPenaltyDays: rule.dispute_history_penalty_days,
        priority: rule.priority,
      };
    }

    // Default: lowest-priority rule
    const defaultRule = rules[rules.length - 1];
    return {
      id: defaultRule.id,
      holdPeriodDays: defaultRule.hold_period_days,
      requirePhotoVerification: defaultRule.require_photo_verification,
      requireReview: defaultRule.require_review,
      minPhotoScore: defaultRule.min_photo_score,
      riskMultiplier: defaultRule.risk_multiplier,
      disputeHistoryPenaltyDays: defaultRule.dispute_history_penalty_days,
      priority: defaultRule.priority,
    };
  } catch (error) {
    logger.error('Error getting applicable auto-release rule', error, {
      service: 'EscrowReleaseAgent',
    });
    return null;
  }
}

/**
 * Assess job risk level based on predictions + contractor dispute history.
 * Returns a multiplier to apply to the base hold period.
 */
async function assessJobRisk(
  jobId: string,
  contractorId: string
): Promise<{ multiplier: number }> {
  try {
    const { data: risks } = await serverSupabase
      .from('risk_predictions')
      .select('risk_type, severity, probability')
      .eq('job_id', jobId)
      .in('severity', ['high', 'critical']);

    if (risks && risks.length > 0) {
      return { multiplier: 1.5 };
    }

    const { count: disputeCount } = await serverSupabase
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('payee_id', contractorId)
      .eq('status', 'disputed');

    if ((disputeCount || 0) > 2) {
      return { multiplier: 1.3 };
    }

    return { multiplier: 1.0 };
  } catch (error) {
    logger.error('Error assessing job risk', error, {
      service: 'EscrowReleaseAgent',
      jobId,
    });
    return { multiplier: 1.0 };
  }
}

/**
 * Return the number of extra hold days to add based on contractor dispute history.
 * Capped at 7 days.
 */
async function getDisputeHistoryPenalty(contractorId: string): Promise<number> {
  try {
    const { count: disputeCount } = await serverSupabase
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('payee_id', contractorId)
      .eq('status', 'disputed');

    return Math.min(7, disputeCount || 0);
  } catch (error) {
    logger.error('Error getting dispute history penalty', error, {
      service: 'EscrowReleaseAgent',
      contractorId,
    });
    return 0;
  }
}

/**
 * Calculate auto-release date based on contractor trust score + risk assessment.
 * Combines:
 *   - Trust-based hold period (from TrustScoreService, 14d new -> 3d trusted)
 *   - Rule-based hold period (from escrow_auto_release_rules)
 *   - Risk multiplier (from assessJobRisk)
 *   - Dispute history penalty (from getDisputeHistoryPenalty)
 */
export async function calculateAutoReleaseDate(
  escrowId: string,
  jobId: string,
  contractorId: string
): Promise<Date | null> {
  try {
    const { TrustScoreService } =
      await import('@/lib/services/contractor/TrustScoreService');

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, category, budget, status, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return null;
    }

    const trustHoldPeriodDays =
      await TrustScoreService.getHoldPeriodDays(contractorId);

    const { PayoutTierService } =
      await import('@/lib/services/payment/PayoutTierService');
    let contractorTier = 'standard';
    try {
      const tier = await PayoutTierService.calculateTier(contractorId);
      contractorTier = tier || 'standard';
    } catch {
      logger.warn('Failed to get contractor tier, defaulting to standard', {
        service: 'EscrowReleaseAgent',
        contractorId,
      });
    }

    const escrowTierMap: Record<string, string> = {
      elite: 'platinum',
      trusted: 'gold',
      standard: 'bronze',
    };
    const escrowTier = escrowTierMap[contractorTier] || 'bronze';

    const rule = await getApplicableRule(
      escrowTier,
      job.budget || 0,
      job.category || ''
    );

    let holdPeriodDays = trustHoldPeriodDays;
    if (rule) {
      holdPeriodDays = Math.max(holdPeriodDays, rule.holdPeriodDays);
    }

    const riskLevel = await assessJobRisk(jobId, contractorId);
    holdPeriodDays = Math.ceil(
      holdPeriodDays * (rule?.riskMultiplier || 1.0) * riskLevel.multiplier
    );

    const disputePenalty = await getDisputeHistoryPenalty(contractorId);
    holdPeriodDays += disputePenalty;

    const jobCompletedAt = job.status === 'completed' ? new Date() : null;
    const baseDate = jobCompletedAt || new Date();
    const releaseDate = new Date(baseDate);
    releaseDate.setDate(releaseDate.getDate() + holdPeriodDays);

    const trustScore = await TrustScoreService.getTrustScore(contractorId);
    await serverSupabase
      .from('escrow_transactions')
      .update({
        auto_release_date: releaseDate.toISOString(),
        auto_release_enabled: true,
        trust_score: trustScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowId);

    return releaseDate;
  } catch (error) {
    logger.error('Error calculating auto-release date', error, {
      service: 'EscrowReleaseAgent',
      escrowId,
      jobId,
    });
    return null;
  }
}
