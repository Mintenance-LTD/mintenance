import { logger } from '@mintenance/shared';
import { ContractorDataService } from './matching/ContractorDataService';
import { ScoringService } from './matching/ScoringService';
import { MatchAnalysisService } from './matching/MatchAnalysisService';
import { InsightsService } from './matching/InsightsService';
import { PreferencesService } from './matching/PreferencesService';
import { LearningMatchingService } from './agents/LearningMatchingService';
import type {
  MatchingCriteria,
  ContractorMatch,
  MatchingPreferences,
  MatchingInsights
} from './matching/types';

export class AIMatchingService {
  /**
   * Find the best contractor matches for a job using AI-powered algorithms
   */
  static async findMatches(
    criteria: MatchingCriteria,
    preferences?: Partial<MatchingPreferences>
  ): Promise<ContractorMatch[]> {
    try {
      // Get available contractors
      const contractors = await ContractorDataService.getAvailableContractors(criteria);

      // Score each contractor
      const matches: ContractorMatch[] = [];

      for (const contractor of contractors) {
        let matchScore = await ScoringService.calculateMatchScore(contractor, criteria);

        // Apply learning-based adjustments if homeowner ID is available
        // Note: criteria.jobId would need to be passed to get homeownerId
        // For now, we'll skip learning adjustments in this context
        // matchScore = await LearningMatchingService.adjustMatchScore(
        //   contractor.id,
        //   homeownerId,
        //   matchScore
        // );

        if (matchScore.overallScore >= 30) { // Minimum threshold
          const match: ContractorMatch = {
            contractor,
            matchScore: matchScore.overallScore,
            matchBreakdown: matchScore,
            estimatedRate: await ScoringService.estimateRate(contractor, criteria),
            availability: await ContractorDataService.assessAvailability(contractor.id, criteria.timeframe),
            distance: await ContractorDataService.calculateDistance(
              contractor.businessAddress || '',
              criteria.location
            ),
            confidenceLevel: ScoringService.getConfidenceLevel(matchScore.overallScore),
            reasons: MatchAnalysisService.generateMatchReasons(matchScore, contractor),
            concerns: MatchAnalysisService.generateConcerns(matchScore, contractor, criteria)
          };

          matches.push(match);
        }
      }

      // Sort by match score and apply preferences
      return MatchAnalysisService.rankMatches(matches, preferences);

    } catch (error) {
      logger.error('AI matching failed', error);
      throw new Error('Failed to find contractor matches');
    }
  }

  /**
   * Get matching insights and market analysis
   */
  static async getMatchingInsights(criteria: MatchingCriteria): Promise<MatchingInsights> {
    return InsightsService.getMatchingInsights(criteria);
  }

  /**
   * Update matching preferences for a user
   */
  static async updateMatchingPreferences(preferences: MatchingPreferences): Promise<void> {
    return PreferencesService.updateMatchingPreferences(preferences);
  }

  /**
   * Get user's matching preferences
   */
  static async getMatchingPreferences(userId: string): Promise<MatchingPreferences | null> {
    return PreferencesService.getMatchingPreferences(userId);
  }

}