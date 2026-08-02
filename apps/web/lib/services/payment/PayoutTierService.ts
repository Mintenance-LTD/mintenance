import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

type PayoutTier = 'elite' | 'trusted' | 'standard';

interface PayoutTierCriteria {
  minRating: number;
  minJobs: number;
  maxDisputes: number;
  payoutHours: number;
}

const TIER_CRITERIA: Record<PayoutTier, PayoutTierCriteria> = {
  elite: {
    minRating: 4.8,
    minJobs: 50,
    maxDisputes: 0,
    payoutHours: 24,
  },
  trusted: {
    minRating: 4.5,
    minJobs: 20,
    maxDisputes: 2,
    payoutHours: 48,
  },
  standard: {
    minRating: 0,
    minJobs: 0,
    maxDisputes: Infinity,
    payoutHours: 168, // 7 days
  },
};

/**
 * Service for calculating payout tiers based on contractor reliability
 */
export class PayoutTierService {
  /**
   * Calculate payout tier for a contractor
   */
  static async calculateTier(contractorId: string): Promise<PayoutTier> {
    try {
      // Get contractor metrics
      const { data: contractor, error } = await serverSupabase
        .from('profiles')
        .select('rating, total_jobs_completed')
        .eq('id', contractorId)
        .single();

      if (error || !contractor) {
        return 'standard';
      }

      const rating = contractor.rating || 0;
      const jobsCompleted = contractor.total_jobs_completed || 0;

      // Get dispute count
      const { count: disputeCount } = await serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', contractorId)
        .eq('status', 'disputed');

      const disputes = disputeCount || 0;

      // Check tier criteria
      if (
        rating >= TIER_CRITERIA.elite.minRating &&
        jobsCompleted >= TIER_CRITERIA.elite.minJobs &&
        disputes <= TIER_CRITERIA.elite.maxDisputes
      ) {
        return 'elite';
      }

      if (
        rating >= TIER_CRITERIA.trusted.minRating &&
        jobsCompleted >= TIER_CRITERIA.trusted.minJobs &&
        disputes <= TIER_CRITERIA.trusted.maxDisputes
      ) {
        return 'trusted';
      }

      return 'standard';
    } catch (error) {
      logger.error('Error calculating payout tier', error, {
        service: 'PayoutTierService',
        contractorId,
      });
      return 'standard';
    }
  }

  /**
   * Recalculate the contractor's payout tier.
   *
   * 2026-08-02: this used to CACHE the result into
   * profiles.payout_tier/payout_speed_hours — columns that never
   * existed, so the write failed on every call (select-schema audit).
   * The cache is dropped rather than migrated: the tier is fully
   * derived from rating + completed jobs + disputes (two cheap indexed
   * queries in calculateTier), and a cached copy in the MONEY path
   * would go stale the moment a rating or dispute landed, with nothing
   * wired to invalidate it. Derive-on-read is both simpler and the
   * only behavior this service has ever actually had.
   */
  static async updateTier(contractorId: string): Promise<PayoutTier> {
    return this.calculateTier(contractorId);
  }

  /**
   * Get payout speed (hours until funds release) for a contractor.
   * Derived from the live tier — see updateTier for why nothing is
   * cached.
   */
  static async getPayoutSpeed(contractorId: string): Promise<number> {
    try {
      const tier = await this.calculateTier(contractorId);
      return TIER_CRITERIA[tier].payoutHours;
    } catch (error) {
      logger.error('Error getting payout speed', error, {
        service: 'PayoutTierService',
        contractorId,
      });
      return TIER_CRITERIA.standard.payoutHours;
    }
  }
}
