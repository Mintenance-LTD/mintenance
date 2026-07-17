import { logger } from '@mintenance/shared';
import { ContractorDataService } from './matching/ContractorDataService';
import { EngagementStatsService } from './matching/EngagementStatsService';
import { ScoringService } from './matching/ScoringService';
import { MatchAnalysisService } from './matching/MatchAnalysisService';
import { InsightsService } from './matching/InsightsService';
import { PreferencesService } from './matching/PreferencesService';
import { LearningMatchingService } from './agents/LearningMatchingService';
import { FeeCalculationService } from './payment/FeeCalculationService';
import type {
  MatchingCriteria,
  ContractorMatch,
  MatchingPreferences,
  MatchingInsights,
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
      const contractors =
        await ContractorDataService.getAvailableContractors(criteria);

      // Resolve each contractor's subscription tier in parallel for the
      // featured-listing ranking boost (Sprint 3, 2026-05-22). Pro = +5,
      // Business = +10 to overallScore via ScoringService. Fail-safe to
      // 'basic' on lookup error (no boost) so a flaky tier query never
      // accidentally elevates the wrong contractor.
      const tierByContractorId = new Map(
        await Promise.all(
          contractors.map(async (c) => {
            try {
              const tier = await FeeCalculationService.resolveContractorTier(
                c.id
              );
              return [c.id, tier] as const;
            } catch {
              return [c.id, 'basic' as const] as const;
            }
          })
        )
      );

      // Batch engagement stats (fairness + real responsiveness terms,
      // Phase 3 2026-07-17). One query for the whole candidate set;
      // failure degrades to neutral scores inside ScoringService.
      const statsByContractorId = await EngagementStatsService.fetchStats(
        contractors.map((c) => c.id)
      );

      // Score each contractor
      const matches: ContractorMatch[] = [];

      for (const contractor of contractors) {
        const matchScore = await ScoringService.calculateMatchScore(
          contractor,
          criteria,
          tierByContractorId.get(contractor.id),
          statsByContractorId.get(contractor.id)
        );

        // Apply learning-based adjustments if homeowner ID is available
        // Note: criteria.jobId would need to be passed to get homeownerId
        // For now, we'll skip learning adjustments in this context
        // matchScore = await LearningMatchingService.adjustMatchScore(
        //   contractor.id,
        //   homeownerId,
        //   matchScore
        // );

        if (matchScore.overallScore >= 30) {
          // Minimum threshold
          const match: ContractorMatch = {
            contractor,
            matchScore: matchScore.overallScore,
            matchBreakdown: matchScore,
            estimatedRate: await ScoringService.estimateRate(
              contractor,
              criteria
            ),
            availability: await ContractorDataService.assessAvailability(
              contractor.id,
              criteria.timeframe
            ),
            distance: await ContractorDataService.calculateDistance(
              contractor.businessAddress || '',
              criteria.location
            ),
            confidenceLevel: ScoringService.getConfidenceLevel(
              matchScore.overallScore
            ),
            reasons: MatchAnalysisService.generateMatchReasons(
              matchScore,
              contractor
            ),
            concerns: MatchAnalysisService.generateConcerns(
              matchScore,
              contractor,
              criteria
            ),
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
  static async getMatchingInsights(
    criteria: MatchingCriteria
  ): Promise<MatchingInsights> {
    return InsightsService.getMatchingInsights(criteria);
  }

  /**
   * Update matching preferences for a user
   */
  static async updateMatchingPreferences(
    preferences: MatchingPreferences
  ): Promise<void> {
    return PreferencesService.updateMatchingPreferences(preferences);
  }

  /**
   * Get user's matching preferences
   */
  static async getMatchingPreferences(
    userId: string
  ): Promise<MatchingPreferences | null> {
    return PreferencesService.getMatchingPreferences(userId);
  }
}
