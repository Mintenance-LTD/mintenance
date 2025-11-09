import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const NEW_CONTRACTOR_HOLD_DAYS = 14;
const TRUSTED_CONTRACTOR_HOLD_DAYS = 3;
const MIN_SUCCESSFUL_JOBS_FOR_TRUSTED = 5;
const MIN_TRUST_SCORE_FOR_TRUSTED = 0.7;

/**
 * Service for calculating contractor trust scores and determining hold periods
 */
export class TrustScoreService {
  /**
   * Calculate trust score for a contractor
   */
  static async calculateTrustScore(contractorId: string): Promise<number> {
    try {
      // Get contractor data
      const { data: contractor, error: contractorError } = await serverSupabase
        .from('users')
        .select('id, created_at')
        .eq('id', contractorId)
        .eq('role', 'contractor')
        .single();

      if (contractorError || !contractor) {
        logger.warn('Contractor not found, using default trust score', {
          service: 'TrustScoreService',
          contractorId,
        });
        return 0.5; // Default trust score
      }

      // Get job statistics
      const { data: jobs } = await serverSupabase
        .from('jobs')
        .select('id, status, budget')
        .eq('contractor_id', contractorId);

      const totalJobs = jobs?.length || 0;
      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
      const successfulJobs = completedJobs; // For now, completed = successful

      // Get dispute count
      const { data: disputes } = await serverSupabase
        .from('disputes')
        .select('id')
        .eq('contractor_id', contractorId)
        .in('status', ['open', 'resolved']);

      const disputeCount = disputes?.length || 0;

      // Get average rating
      const { data: reviews } = await serverSupabase
        .from('reviews')
        .select('rating')
        .eq('contractor_id', contractorId);

      const ratings = reviews?.map(r => r.rating).filter(Boolean) as number[] || [];
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : null;

      // Calculate days on platform
      const createdAt = new Date(contractor.created_at);
      const now = new Date();
      const onPlatformDays = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate trust score components
      // 1. Job completion rate (0-0.4 weight)
      const completionRate = totalJobs > 0 ? completedJobs / totalJobs : 0;
      const completionScore = completionRate * 0.4;

      // 2. Dispute rate penalty (0-0.3 weight)
      const disputeRate = totalJobs > 0 ? disputeCount / totalJobs : 0;
      const disputePenalty = Math.min(disputeRate * 0.3, 0.3); // Max 0.3 penalty
      const disputeScore = 0.3 - disputePenalty;

      // 3. Rating score (0-0.2 weight)
      const ratingScore = averageRating
        ? (averageRating / 5) * 0.2 // Normalize to 0-1, then weight
        : 0.1; // Default if no ratings

      // 4. Platform tenure (0-0.1 weight)
      const tenureScore = Math.min(onPlatformDays / 365, 1) * 0.1; // Max 1 year = full score

      // Total trust score
      const trustScore = Math.max(0, Math.min(1, completionScore + disputeScore + ratingScore + tenureScore));

      // Update or insert trust score
      await this.updateTrustScore(contractorId, {
        trustScore,
        successfulJobsCount: successfulJobs,
        disputeCount,
        averageRating: averageRating || null,
        onPlatformDays,
      });

      return trustScore;
    } catch (error) {
      logger.error('Error calculating trust score', error, {
        service: 'TrustScoreService',
        contractorId,
      });
      return 0.5; // Default trust score on error
    }
  }

  /**
   * Update trust score in database
   */
  static async updateTrustScore(
    contractorId: string,
    data: {
      trustScore: number;
      successfulJobsCount: number;
      disputeCount: number;
      averageRating: number | null;
      onPlatformDays: number;
    }
  ): Promise<void> {
    try {
      await serverSupabase
        .from('contractor_trust_scores')
        .upsert({
          contractor_id: contractorId,
          trust_score: data.trustScore,
          successful_jobs_count: data.successfulJobsCount,
          dispute_count: data.disputeCount,
          average_rating: data.averageRating,
          on_platform_days: data.onPlatformDays,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'contractor_id',
        });
    } catch (error) {
      logger.error('Error updating trust score', error, {
        service: 'TrustScoreService',
        contractorId,
      });
    }
  }

  /**
   * Get hold period in days based on contractor trust score
   */
  static async getHoldPeriodDays(contractorId: string): Promise<number> {
    try {
      // Get or calculate trust score
      const { data: trustScoreData } = await serverSupabase
        .from('contractor_trust_scores')
        .select('trust_score, successful_jobs_count')
        .eq('contractor_id', contractorId)
        .single();

      let trustScore = trustScoreData?.trust_score;
      const successfulJobs = trustScoreData?.successful_jobs_count || 0;

      // If no trust score exists, calculate it
      if (!trustScore) {
        trustScore = await this.calculateTrustScore(contractorId);
      }

      // Determine hold period
      // New contractors (< 5 successful jobs OR trust score < 0.7): 14 days
      // Trusted contractors (>= 5 successful jobs AND trust score >= 0.7): 3 days
      if (
        successfulJobs >= MIN_SUCCESSFUL_JOBS_FOR_TRUSTED &&
        trustScore >= MIN_TRUST_SCORE_FOR_TRUSTED
      ) {
        return TRUSTED_CONTRACTOR_HOLD_DAYS;
      }

      return NEW_CONTRACTOR_HOLD_DAYS;
    } catch (error) {
      logger.error('Error getting hold period', error, {
        service: 'TrustScoreService',
        contractorId,
      });
      return NEW_CONTRACTOR_HOLD_DAYS; // Default to new contractor hold period
    }
  }

  /**
   * Get graduated release date based on contractor trust score
   */
  static async getGraduatedReleaseDate(
    escrowId: string,
    baseDate: Date
  ): Promise<Date> {
    try {
      // Get contractor ID from escrow
      const { data: escrow } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          jobs!inner (
            id,
            contractor_id
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (!escrow) {
        return baseDate; // Return base date if escrow not found
      }

      const job = (escrow as any).jobs;
      const contractorId = job.contractor_id;

      // Get hold period
      const holdPeriodDays = await this.getHoldPeriodDays(contractorId);

      // Calculate release date
      const releaseDate = new Date(baseDate);
      releaseDate.setDate(releaseDate.getDate() + holdPeriodDays);

      return releaseDate;
    } catch (error) {
      logger.error('Error getting graduated release date', error, {
        service: 'TrustScoreService',
        escrowId,
      });
      // Default to new contractor hold period
      const releaseDate = new Date(baseDate);
      releaseDate.setDate(releaseDate.getDate() + NEW_CONTRACTOR_HOLD_DAYS);
      return releaseDate;
    }
  }

  /**
   * Recalculate trust score for a contractor (useful after job completion or dispute)
   */
  static async recalculateTrustScore(contractorId: string): Promise<number> {
    return await this.calculateTrustScore(contractorId);
  }

  /**
   * Get trust score from database (without recalculation)
   */
  static async getTrustScore(contractorId: string): Promise<number | null> {
    try {
      const { data } = await serverSupabase
        .from('contractor_trust_scores')
        .select('trust_score')
        .eq('contractor_id', contractorId)
        .single();

      return data?.trust_score || null;
    } catch (error) {
      logger.error('Error getting trust score', error, {
        service: 'TrustScoreService',
        contractorId,
      });
      return null;
    }
  }

  /**
   * Check if contractor is trusted (for faster releases)
   */
  static async isTrustedContractor(contractorId: string): Promise<boolean> {
    try {
      const { data } = await serverSupabase
        .from('contractor_trust_scores')
        .select('trust_score, successful_jobs_count')
        .eq('contractor_id', contractorId)
        .single();

      if (!data) {
        return false;
      }

      return (
        data.successful_jobs_count >= MIN_SUCCESSFUL_JOBS_FOR_TRUSTED &&
        data.trust_score >= MIN_TRUST_SCORE_FOR_TRUSTED
      );
    } catch (error) {
      logger.error('Error checking if contractor is trusted', error, {
        service: 'TrustScoreService',
        contractorId,
      });
      return false;
    }
  }
}

