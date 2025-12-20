import type { MatchingCriteria, MatchingInsights } from './types';
import { ContractorDataService } from './ContractorDataService';
import { ScoringService } from './ScoringService';
import { MatchAnalysisService } from './MatchAnalysisService';
import { logger } from '@/lib/logger';

export class InsightsService {
  /**
   * Get matching insights and market analysis
   */
  static async getMatchingInsights(criteria: MatchingCriteria): Promise<MatchingInsights> {
    try {
      const contractors = await ContractorDataService.getAvailableContractors(criteria);

      const matchScores = await Promise.all(
        contractors.map(c => ScoringService.calculateMatchScore(c, criteria))
      );

      const rates = await Promise.all(
        contractors.map(c => ScoringService.estimateRate(c, criteria))
      );

      const averageMatchScore = matchScores.reduce((sum, score) => sum + score.overallScore, 0) / matchScores.length;
      const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

      // Identify skill gaps
      const requiredSkills = new Set(criteria.requiredSkills);
      const skillGaps: string[] = [];

      for (const skill of requiredSkills) {
        const contractorsWithSkill = contractors.filter(c =>
          c.skills.some(s => s.skillName.toLowerCase().includes(skill.toLowerCase()))
        ).length;

        if (contractorsWithSkill < contractors.length * 0.3) { // Less than 30% have this skill
          skillGaps.push(skill);
        }
      }

      // Market availability assessment
      const highQualityContractors = contractors.filter(c => c.reviews.length > 0 &&
        c.reviews.reduce((sum, r) => sum + r.rating, 0) / c.reviews.length >= 4.5
      ).length;

      const marketAvailability: 'high' | 'medium' | 'low' =
        highQualityContractors > 10 ? 'high' :
        highQualityContractors > 5 ? 'medium' : 'low';

      return {
        totalCandidates: contractors.length,
        averageMatchScore: isNaN(averageMatchScore) ? 0 : averageMatchScore,
        topSkillGaps: skillGaps.slice(0, 3),
        recommendedBudgetAdjustment: MatchAnalysisService.recommendBudgetAdjustment(criteria.budget, rates),
        marketAvailability,
        competitiveAnalysis: {
          averageRate: isNaN(averageRate) ? 0 : averageRate,
          rateRange: {
            min: Math.min(...rates.filter(r => r > 0)),
            max: Math.max(...rates)
          },
          topContractors: highQualityContractors
        }
      };
    } catch (error) {
      logger.error('Failed to get matching insights', error);
      throw new Error('Failed to analyze matching data');
    }
  }
}
