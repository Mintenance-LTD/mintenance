import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export type PayoutTier = 'elite' | 'trusted' | 'standard';

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
        .from('users')
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
        .from('escrow_payments')
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
   * Update contractor payout tier
   */
  static async updateTier(contractorId: string): Promise<PayoutTier> {
    try {
      const tier = await this.calculateTier(contractorId);
      const payoutHours = TIER_CRITERIA[tier].payoutHours;

      const { error } = await serverSupabase
        .from('users')
        .update({
          payout_tier: tier,
          payout_speed_hours: payoutHours,
        })
        .eq('id', contractorId);

      if (error) {
        logger.error('Failed to update payout tier', {
          service: 'PayoutTierService',
          contractorId,
          error: error.message,
        });
        return 'standard';
      }

      logger.info('Payout tier updated', {
        service: 'PayoutTierService',
        contractorId,
        tier,
        payoutHours,
      });

      return tier;
    } catch (error) {
      logger.error('Error updating payout tier', error, {
        service: 'PayoutTierService',
        contractorId,
      });
      return 'standard';
    }
  }

  /**
   * Get payout speed for a contractor
   */
  static async getPayoutSpeed(contractorId: string): Promise<number> {
    try {
      const { data: contractor } = await serverSupabase
        .from('users')
        .select('payout_speed_hours, payout_tier')
        .eq('id', contractorId)
        .single();

      if (contractor?.payout_speed_hours) {
        return contractor.payout_speed_hours;
      }

      // Calculate if not set
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

