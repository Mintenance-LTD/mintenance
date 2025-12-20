import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface SeriousBuyerIndicators {
  phoneVerified: boolean;
  emailVerified: boolean;
  hasPreviousJobs: boolean;
  budgetHigh: boolean;
  detailedDescription: boolean;
  photosProvided: boolean;
}

/**
 * Service for calculating serious buyer score
 */
export class SeriousBuyerService {
  private static readonly SCORE_WEIGHTS = {
    phoneVerified: 20,
    emailVerified: 10,
    hasPreviousJobs: 30,
    budgetHigh: 20,
    detailedDescription: 10,
    photosProvided: 10,
  };

  /**
   * Calculate serious buyer score for a job
   */
  static async calculateScore(jobId: string, homeownerId: string, jobData: {
    description?: string | null;
    budget?: number | null;
    photoUrls?: string[] | null;
  }): Promise<number> {
    try {
      // Get homeowner data
      const { data: homeowner, error: homeownerError } = await serverSupabase
        .from('users')
        .select('phone_verified, email_verified')
        .eq('id', homeownerId)
        .single();

      if (homeownerError || !homeowner) {
        logger.error('Failed to fetch homeowner for serious buyer score', {
          service: 'SeriousBuyerService',
          jobId,
          homeownerId,
          error: homeownerError?.message,
        });
        return 0;
      }

      // Check if homeowner has previous completed jobs
      const { count: previousJobsCount } = await serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('homeowner_id', homeownerId)
        .eq('status', 'completed')
        .neq('id', jobId); // Exclude current job

      const indicators: SeriousBuyerIndicators = {
        phoneVerified: homeowner.phone_verified || false,
        emailVerified: homeowner.email_verified || false,
        hasPreviousJobs: (previousJobsCount || 0) > 0,
        budgetHigh: (jobData.budget || 0) > 1000,
        detailedDescription: (jobData.description || '').length > 100,
        photosProvided: (jobData.photoUrls || []).length > 0,
      };

      // Calculate score
      let score = 0;
      if (indicators.phoneVerified) score += this.SCORE_WEIGHTS.phoneVerified;
      if (indicators.emailVerified) score += this.SCORE_WEIGHTS.emailVerified;
      if (indicators.hasPreviousJobs) score += this.SCORE_WEIGHTS.hasPreviousJobs;
      if (indicators.budgetHigh) score += this.SCORE_WEIGHTS.budgetHigh;
      if (indicators.detailedDescription) score += this.SCORE_WEIGHTS.detailedDescription;
      if (indicators.photosProvided) score += this.SCORE_WEIGHTS.photosProvided;

      // Ensure score is between 0 and 100
      return Math.min(100, Math.max(0, score));
    } catch (error) {
      logger.error('Error calculating serious buyer score', error, {
        service: 'SeriousBuyerService',
        jobId,
        homeownerId,
      });
      return 0;
    }
  }

  /**
   * Update serious buyer score for a job
   */
  static async updateScore(jobId: string, homeownerId: string, jobData: {
    description?: string | null;
    budget?: number | null;
    photoUrls?: string[] | null;
  }): Promise<number> {
    try {
      const score = await this.calculateScore(jobId, homeownerId, jobData);

      // Update job with score
      const { error } = await serverSupabase
        .from('jobs')
        .update({ serious_buyer_score: score })
        .eq('id', jobId);

      if (error) {
        logger.error('Failed to update serious buyer score', {
          service: 'SeriousBuyerService',
          jobId,
          error: error.message,
        });
      }

      return score;
    } catch (error) {
      logger.error('Error updating serious buyer score', error, {
        service: 'SeriousBuyerService',
        jobId,
      });
      return 0;
    }
  }

  /**
   * Get serious buyer score breakdown
   */
  static async getScoreBreakdown(jobId: string): Promise<{
    score: number;
    indicators: SeriousBuyerIndicators;
    breakdown: Array<{ indicator: string; points: number; achieved: boolean }>;
  } | null> {
    try {
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, homeowner_id, description, budget, serious_buyer_score')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        return null;
      }

      // Get homeowner data
      const { data: homeowner } = await serverSupabase
        .from('users')
        .select('phone_verified, email_verified')
        .eq('id', job.homeowner_id)
        .single();

      if (!homeowner) {
        return null;
      }

      // Check previous jobs
      const { count: previousJobsCount } = await serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('homeowner_id', job.homeowner_id)
        .eq('status', 'completed')
        .neq('id', jobId);

      const indicators: SeriousBuyerIndicators = {
        phoneVerified: homeowner.phone_verified || false,
        emailVerified: homeowner.email_verified || false,
        hasPreviousJobs: (previousJobsCount || 0) > 0,
        budgetHigh: (job.budget || 0) > 1000,
        detailedDescription: (job.description || '').length > 100,
        photosProvided: false, // Would need to check photoUrls from another source
      };

      const breakdown = [
        {
          indicator: 'Phone Verified',
          points: this.SCORE_WEIGHTS.phoneVerified,
          achieved: indicators.phoneVerified,
        },
        {
          indicator: 'Email Verified',
          points: this.SCORE_WEIGHTS.emailVerified,
          achieved: indicators.emailVerified,
        },
        {
          indicator: 'Has Previous Jobs',
          points: this.SCORE_WEIGHTS.hasPreviousJobs,
          achieved: indicators.hasPreviousJobs,
        },
        {
          indicator: 'Budget > £1,000',
          points: this.SCORE_WEIGHTS.budgetHigh,
          achieved: indicators.budgetHigh,
        },
        {
          indicator: 'Detailed Description',
          points: this.SCORE_WEIGHTS.detailedDescription,
          achieved: indicators.detailedDescription,
        },
        {
          indicator: 'Photos Provided',
          points: this.SCORE_WEIGHTS.photosProvided,
          achieved: indicators.photosProvided,
        },
      ];

      return {
        score: job.serious_buyer_score || 0,
        indicators,
        breakdown,
      };
    } catch (error) {
      logger.error('Error getting serious buyer score breakdown', error, {
        service: 'SeriousBuyerService',
        jobId,
      });
      return null;
    }
  }
}

