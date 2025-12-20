import type { ContractorProfile } from '@mintenance/types';
import type { MatchingCriteria, MatchingScore } from './types';

export class ScoringService {
  /**
   * Calculate comprehensive match score for a contractor
   */
  static async calculateMatchScore(
    contractor: ContractorProfile,
    criteria: MatchingCriteria
  ): Promise<MatchingScore> {
    // Skill matching (30% weight)
    const contractorSkills = contractor.skills.map(s => s.skillName.toLowerCase());
    const requiredSkillMatches = criteria.requiredSkills.filter(skill =>
      contractorSkills.some(cs => cs.includes(skill.toLowerCase()))
    ).length;
    const skillMatch = (requiredSkillMatches / criteria.requiredSkills.length) * 100;

    // Location score (20% weight)
    const locationScore = contractor.serviceRadius ?
      Math.max(0, 100 - (contractor.distance || 0) * 2) : 50;

    // Budget alignment (15% weight)
    const contractorRate = contractor.hourlyRate || 75;
    const budgetMidpoint = (criteria.budget.min + criteria.budget.max) / 2;
    const budgetAlignment = Math.max(0, 100 - Math.abs(contractorRate - budgetMidpoint) / budgetMidpoint * 100);

    // Availability match (10% weight)
    const availabilityScore = this.scoreAvailability(contractor.availability || 'this_week', criteria.timeframe);

    // Rating score (15% weight)
    const averageRating = contractor.reviews.length > 0 ?
      contractor.reviews.reduce((sum, r) => sum + r.rating, 0) / contractor.reviews.length : 3.5;
    const ratingScore = (averageRating / 5) * 100;

    // Experience score (5% weight)
    const experienceScore = Math.min(100, (contractor.yearsExperience || 1) * 10);

    // Responsiveness (3% weight) - Mock score based on reviews
    const responsiveness = contractor.reviews.length > 5 ? 85 : 70;

    // Price competitiveness (2% weight)
    const marketRate = 75; // Mock market average
    const priceCompetitiveness = Math.max(0, 100 - Math.abs(contractorRate - marketRate) / marketRate * 100);

    // Calculate weighted overall score
    const overallScore = (
      skillMatch * 0.30 +
      locationScore * 0.20 +
      budgetAlignment * 0.15 +
      ratingScore * 0.15 +
      availabilityScore * 0.10 +
      experienceScore * 0.05 +
      responsiveness * 0.03 +
      priceCompetitiveness * 0.02
    );

    return {
      skillMatch: Math.round(skillMatch),
      locationScore: Math.round(locationScore),
      budgetAlignment: Math.round(budgetAlignment),
      availabilityMatch: Math.round(availabilityScore),
      ratingScore: Math.round(ratingScore),
      experienceScore: Math.round(experienceScore),
      responsiveness: Math.round(responsiveness),
      priceCompetitiveness: Math.round(priceCompetitiveness),
      overallScore: Math.round(overallScore)
    };
  }

  /**
   * Score availability match between contractor and job timeframe
   */
  private static scoreAvailability(
    contractorAvailability: 'immediate' | 'this_week' | 'this_month' | 'busy',
    requestedTimeframe: string
  ): number {
    const availabilityScores: Record<string, Record<string, number>> = {
      immediate: { immediate: 100, this_week: 90, this_month: 70, flexible: 100 },
      this_week: { immediate: 80, this_week: 100, this_month: 90, flexible: 100 },
      this_month: { immediate: 60, this_week: 80, this_month: 100, flexible: 100 },
      busy: { immediate: 20, this_week: 30, this_month: 50, flexible: 60 }
    };

    return availabilityScores[contractorAvailability]?.[requestedTimeframe] || 50;
  }

  /**
   * Estimate contractor rate based on job criteria
   */
  static async estimateRate(contractor: ContractorProfile, criteria: MatchingCriteria): Promise<number> {
    const baseRate = contractor.hourlyRate || 75;

    // Adjust for complexity
    const complexityMultiplier = criteria.projectComplexity === 'complex' ? 1.3 :
                                criteria.projectComplexity === 'medium' ? 1.1 : 1.0;

    // Adjust for urgency
    const urgencyMultiplier = criteria.urgency === 'emergency' ? 1.5 :
                             criteria.urgency === 'urgent' ? 1.2 : 1.0;

    return Math.round(baseRate * complexityMultiplier * urgencyMultiplier);
  }

  /**
   * Get confidence level based on match score
   */
  static getConfidenceLevel(matchScore: number): 'high' | 'medium' | 'low' {
    if (matchScore >= 80) return 'high';
    if (matchScore >= 60) return 'medium';
    return 'low';
  }
}
