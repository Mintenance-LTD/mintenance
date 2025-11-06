import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { MatchingScore } from '../matching/types';

/**
 * Service for learning-based matching improvements
 * Learns from homeowner selection history to improve match scores
 */
export class LearningMatchingService {
  /**
   * Adjust match scores based on learned homeowner preferences
   */
  static async adjustMatchScore(
    contractorId: string,
    homeownerId: string,
    baseScore: MatchingScore
  ): Promise<MatchingScore> {
    try {
      // Get homeowner's past selected contractors through completed jobs

      // Get homeowner's past selected contractors
      const { data: pastJobs } = await serverSupabase
        .from('jobs')
        .select('contractor_id, category, budget')
        .eq('homeowner_id', homeownerId)
        .eq('status', 'completed')
        .not('contractor_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(10);

      // Calculate preference adjustments
      let adjustmentFactor = 1.0;

      // Boost if contractor was previously selected by this homeowner
      if (pastJobs?.some((job) => job.contractor_id === contractorId)) {
        adjustmentFactor += 0.15; // 15% boost for repeat contractors
      }

      // Boost if similar contractors were selected
      if (pastJobs && pastJobs.length > 0) {
        // This would analyze contractor similarities (skills, rating, etc.)
        // For now, we'll use a simple boost
        adjustmentFactor += 0.1;
      }

      // Apply adjustments to scores
      const adjustedScore: MatchingScore = {
        ...baseScore,
        overallScore: Math.min(100, baseScore.overallScore * adjustmentFactor),
      };

      return adjustedScore;
    } catch (error) {
      logger.error('Error adjusting match score', error, {
        service: 'LearningMatchingService',
      });
      return baseScore; // Return original score on error
    }
  }

  /**
   * Learn from homeowner's bid acceptance
   */
  static async learnFromAcceptance(
    jobId: string,
    homeownerId: string,
    contractorId: string,
    bidAmount: number
  ): Promise<void> {
    try {
      // Store learning data for future matching improvements
      // This would update user_behavior_profiles table
      const { data: existingProfile } = await serverSupabase
        .from('user_behavior_profiles')
        .select('*')
        .eq('user_id', homeownerId)
        .single();

      if (existingProfile) {
        // Update profile with new acceptance data
        await serverSupabase
          .from('user_behavior_profiles')
          .update({
            data_points_count: (existingProfile.data_points_count || 0) + 1,
            last_updated: new Date().toISOString(),
          })
          .eq('user_id', homeownerId);
      } else {
        // Create new profile
        await serverSupabase.from('user_behavior_profiles').insert({
          user_id: homeownerId,
          user_type: 'homeowner',
          data_points_count: 1,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error learning from acceptance', error, {
        service: 'LearningMatchingService',
      });
    }
  }
}

