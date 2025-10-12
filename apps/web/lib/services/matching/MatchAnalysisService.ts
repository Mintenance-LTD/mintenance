import type { ContractorProfile } from '@mintenance/types';
import type { MatchingCriteria, MatchingScore, ContractorMatch } from './types';
import { ScoringService } from './ScoringService';

export class MatchAnalysisService {
  /**
   * Generate reasons why a contractor is a good match
   */
  static generateMatchReasons(score: MatchingScore, contractor: ContractorProfile): string[] {
    const reasons: string[] = [];

    if (score.skillMatch >= 80) {
      reasons.push('Excellent skill match for your project requirements');
    }
    if (score.ratingScore >= 85) {
      reasons.push('Highly rated with outstanding customer reviews');
    }
    if (score.locationScore >= 80) {
      reasons.push('Located conveniently in your service area');
    }
    if (score.budgetAlignment >= 75) {
      reasons.push('Pricing aligns well with your budget range');
    }
    if (score.experienceScore >= 80) {
      reasons.push('Extensive experience in similar projects');
    }
    if (contractor.reviews.length >= 10) {
      reasons.push('Proven track record with many completed projects');
    }

    return reasons.slice(0, 3); // Return top 3 reasons
  }

  /**
   * Generate concerns about a contractor match
   */
  static generateConcerns(
    score: MatchingScore,
    contractor: ContractorProfile,
    criteria: MatchingCriteria
  ): string[] {
    const concerns: string[] = [];

    if (score.skillMatch < 60) {
      concerns.push('Limited experience with some required skills');
    }
    if (score.locationScore < 50) {
      concerns.push('May be outside preferred service radius');
    }
    if (score.budgetAlignment < 60) {
      concerns.push('Pricing may exceed your budget range');
    }
    if (contractor.reviews.length < 3) {
      concerns.push('Limited customer reviews available');
    }
    if (score.availabilityMatch < 60) {
      concerns.push('May not match your preferred timeline');
    }
    if (criteria.urgency === 'emergency' && score.responsiveness < 70) {
      concerns.push('Response speed may be too slow for urgent requests');
    }
    if (criteria.projectComplexity === 'complex' && score.experienceScore < 70) {
      concerns.push('Experience may be limited for complex projects');
    }

    return concerns.slice(0, 2);
  }

  /**
   * Rank matches based on preferences and scores
   */
  static rankMatches(
    matches: ContractorMatch[],
    preferences?: Partial<import('./types').MatchingPreferences>
  ): ContractorMatch[] {
    return matches
      .filter(match => {
        if (preferences?.blacklistedContractors?.includes(match.contractor.id)) {
          return false;
        }
        if (preferences?.minRating && match.matchBreakdown.ratingScore < preferences.minRating * 20) {
          return false;
        }
        if (preferences?.maxDistance && match.distance > preferences.maxDistance) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Prioritize favorites
        if (preferences?.favoriteContractors?.includes(a.contractor.id)) return -1;
        if (preferences?.favoriteContractors?.includes(b.contractor.id)) return 1;

        // Apply preference weights
        let scoreA = a.matchScore;
        let scoreB = b.matchScore;

        if (preferences?.prioritizeLocal) {
          scoreA += a.matchBreakdown.locationScore * 0.1;
          scoreB += b.matchBreakdown.locationScore * 0.1;
        }
        if (preferences?.prioritizeBudget) {
          scoreA += a.matchBreakdown.budgetAlignment * 0.1;
          scoreB += b.matchBreakdown.budgetAlignment * 0.1;
        }
        if (preferences?.prioritizeRating) {
          scoreA += a.matchBreakdown.ratingScore * 0.1;
          scoreB += b.matchBreakdown.ratingScore * 0.1;
        }

        return scoreB - scoreA;
      })
      .slice(0, preferences?.maxMatches || 10);
  }

  /**
   * Recommend budget adjustments based on market rates
   */
  static recommendBudgetAdjustment(
    currentBudget: { min: number; max: number },
    marketRates: number[]
  ): { suggested: number; reason: string } | undefined {
    if (marketRates.length === 0) return undefined;

    const averageRate = marketRates.reduce((sum, rate) => sum + rate, 0) / marketRates.length;
    const budgetMidpoint = (currentBudget.min + currentBudget.max) / 2;

    if (averageRate > budgetMidpoint * 1.2) {
      return {
        suggested: Math.round(averageRate * 1.1),
        reason: 'Market rates are higher than your budget range'
      };
    }

    return undefined;
  }
}
