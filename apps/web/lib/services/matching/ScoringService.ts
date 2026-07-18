import type { ContractorProfile } from '@mintenance/types';
import type { ContractorSubscriptionTier } from '@/lib/feature-access-types';
import type {
  ContractorEngagementStats,
  MatchingCriteria,
  MatchingScore,
} from './types';

/**
 * Weight table (must sum to 1.00 before the flat tier boosts):
 *
 *   skillMatch           0.30
 *   locationScore        0.20
 *   ratingScore          0.15
 *   budgetAlignment      0.10  (was 0.15 — homeowner budgets stopped
 *                               being collected 2026-05-22, so the
 *                               signal is mostly neutral; freed weight
 *                               funds the fairness term)
 *   availabilityMatch    0.10
 *   experienceScore      0.05
 *   fairness             0.05  (FAIRNESS_WEIGHT — see below)
 *   responsiveness       0.03
 *   priceCompetitiveness 0.02
 *   ------------------------- = 1.00
 *   + homeownerTierBoost   (+5 flat, landlord/agency)
 *   + contractorTierBoost  (+5 Pro / +10 Business — featured placement)
 */
const SKILL_WEIGHT = 0.3;
const LOCATION_WEIGHT = 0.2;
const RATING_WEIGHT = 0.15;
const BUDGET_WEIGHT = 0.1;
const AVAILABILITY_WEIGHT = 0.1;
const EXPERIENCE_WEIGHT = 0.05;
/**
 * Uber-style work-distribution term (2026-07-17 Phase 3): boost
 * contractors with fewer recent wins and longer idle time so new/quiet
 * contractors surface instead of the same winners compounding. Derived
 * from `bids` history via EngagementStatsService.
 */
const FAIRNESS_WEIGHT = 0.05;
const RESPONSIVENESS_WEIGHT = 0.03;
const PRICE_WEIGHT = 0.02;

/** Each recent win costs this much of the 0-100 wins component. */
const FAIRNESS_WIN_PENALTY = 25;
/** Idle days to reach the full 0-100 idle component. */
const FAIRNESS_FULL_IDLE_DAYS = 30;
/** Fairness when no engagement stats are available — strictly neutral. */
const FAIRNESS_NEUTRAL = 50;
/** Responsiveness when the contractor has no bid history yet. */
const RESPONSIVENESS_NEUTRAL = 65;

/**
 * Featured-listing weights by contractor tier (Sprint 3, 2026-05-22).
 * Sits on top of the weighted scoring sum so Pro/Business contractors get
 * a visible ranking boost — the concrete delivery of the "Featured in search"
 * + "Top placement" benefits advertised on the pricing page. Magnitude is
 * intentionally smaller than skill/location weights so a great Basic
 * contractor still beats a poor Pro one on a strict skill match.
 */
const CONTRACTOR_TIER_FEATURED_BOOST: Record<
  ContractorSubscriptionTier,
  number
> = {
  free: 0,
  basic: 0,
  professional: 5,
  enterprise: 10,
};

export class ScoringService {
  /**
   * Calculate comprehensive match score for a contractor.
   * `contractorTier` is the contractor's effective subscription tier
   * (resolved via FeeCalculationService.resolveContractorTier). When
   * provided, Pro adds +5 / Business adds +10 to overallScore — this is
   * the search-featuring lever for the new tiered pricing model.
   */
  static async calculateMatchScore(
    contractor: ContractorProfile,
    criteria: MatchingCriteria,
    contractorTier?: ContractorSubscriptionTier,
    stats?: ContractorEngagementStats
  ): Promise<MatchingScore> {
    // Skill matching (30% weight)
    const contractorSkills = contractor.skills.map((s) =>
      s.skillName.toLowerCase()
    );
    const requiredSkillMatches = criteria.requiredSkills.filter((skill) =>
      contractorSkills.some((cs) => cs.includes(skill.toLowerCase()))
    ).length;
    const skillMatch =
      (requiredSkillMatches / criteria.requiredSkills.length) * 100;

    // Location score (20% weight)
    const locationScore = contractor.serviceRadius
      ? Math.max(0, 100 - (contractor.distance || 0) * 2)
      : 50;

    // Budget alignment (10% weight — see weight table)
    const contractorRate = contractor.hourlyRate || 75;
    const budgetMidpoint = (criteria.budget.min + criteria.budget.max) / 2;
    const budgetAlignment = Math.max(
      0,
      100 - (Math.abs(contractorRate - budgetMidpoint) / budgetMidpoint) * 100
    );

    // Availability match (10% weight)
    const availabilityScore = this.scoreAvailability(
      contractor.availability || 'this_week',
      criteria.timeframe
    );

    // Rating score (15% weight)
    const averageRating =
      contractor.reviews.length > 0
        ? contractor.reviews.reduce((sum, r) => sum + r.rating, 0) /
          contractor.reviews.length
        : 3.5;
    const ratingScore = (averageRating / 5) * 100;

    // Experience score (5% weight)
    const experienceScore = Math.min(
      100,
      (contractor.yearsExperience || 1) * 10
    );

    // Responsiveness — real bid-response metric (Phase 3, 2026-07-17):
    // mean hours between a job posting and this contractor's bid,
    // banded to 0-100. Replaces the old review-count mock. Contractors
    // with no bid history score neutral.
    const responsiveness = this.scoreResponsiveness(
      stats?.avgBidResponseHours ?? null
    );

    // Fairness — see FAIRNESS_WEIGHT docblock.
    const fairness = this.scoreFairness(stats);

    // Price competitiveness (2% weight)
    const marketRate = 75; // Mock market average
    const priceCompetitiveness = Math.max(
      0,
      100 - (Math.abs(contractorRate - marketRate) / marketRate) * 100
    );

    // Priority tier boost for landlord/agency homeowners (+5 overall).
    // Their pricing tier promises "Priority contractor matching".
    const homeownerTierBoost =
      criteria.homeownerTier === 'landlord' ||
      criteria.homeownerTier === 'agency'
        ? 5
        : 0;

    // Contractor tier boost — Pro/Business contractors are "featured"
    // in search results (Sprint 3, 2026-05-22). +5 Pro / +10 Business.
    const contractorTierBoost = contractorTier
      ? (CONTRACTOR_TIER_FEATURED_BOOST[contractorTier] ?? 0)
      : 0;

    // Calculate weighted overall score (weights documented above)
    const overallScore = Math.min(
      100,
      skillMatch * SKILL_WEIGHT +
        locationScore * LOCATION_WEIGHT +
        budgetAlignment * BUDGET_WEIGHT +
        ratingScore * RATING_WEIGHT +
        availabilityScore * AVAILABILITY_WEIGHT +
        experienceScore * EXPERIENCE_WEIGHT +
        responsiveness * RESPONSIVENESS_WEIGHT +
        priceCompetitiveness * PRICE_WEIGHT +
        fairness * FAIRNESS_WEIGHT +
        homeownerTierBoost +
        contractorTierBoost
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
      fairness: Math.round(fairness),
      overallScore: Math.round(overallScore),
    };
  }

  /**
   * Band mean bid-response hours to 0-100. Null (no bid history) is
   * neutral so new contractors are neither boosted nor buried.
   */
  private static scoreResponsiveness(avgHours: number | null): number {
    if (avgHours === null) return RESPONSIVENESS_NEUTRAL;
    if (avgHours <= 1) return 100;
    if (avgHours <= 4) return 90;
    if (avgHours <= 12) return 80;
    if (avgHours <= 24) return 65;
    if (avgHours <= 48) return 45;
    return 30;
  }

  /**
   * Fairness (work distribution): mean of
   *  - wins component: 100 minus FAIRNESS_WIN_PENALTY per accepted bid
   *    in the recency window (floor 0), and
   *  - idle component: linear 0→100 over FAIRNESS_FULL_IDLE_DAYS since
   *    the last accepted bid (never-won = 100).
   * No stats at all → FAIRNESS_NEUTRAL.
   */
  private static scoreFairness(stats?: ContractorEngagementStats): number {
    if (!stats) return FAIRNESS_NEUTRAL;
    const winsComponent = Math.max(
      0,
      100 - stats.recentWins * FAIRNESS_WIN_PENALTY
    );
    const idleComponent =
      stats.daysSinceLastWin === null
        ? 100
        : Math.min(
            100,
            (stats.daysSinceLastWin * 100) / FAIRNESS_FULL_IDLE_DAYS
          );
    return (winsComponent + idleComponent) / 2;
  }

  /**
   * Score availability match between contractor and job timeframe
   */
  private static scoreAvailability(
    contractorAvailability: 'immediate' | 'this_week' | 'this_month' | 'busy',
    requestedTimeframe: string
  ): number {
    const availabilityScores: Record<string, Record<string, number>> = {
      immediate: {
        immediate: 100,
        this_week: 90,
        this_month: 70,
        flexible: 100,
      },
      this_week: {
        immediate: 80,
        this_week: 100,
        this_month: 90,
        flexible: 100,
      },
      this_month: {
        immediate: 60,
        this_week: 80,
        this_month: 100,
        flexible: 100,
      },
      busy: { immediate: 20, this_week: 30, this_month: 50, flexible: 60 },
    };

    return (
      availabilityScores[contractorAvailability]?.[requestedTimeframe] || 50
    );
  }

  /**
   * Estimate contractor rate based on job criteria
   */
  static async estimateRate(
    contractor: ContractorProfile,
    criteria: MatchingCriteria
  ): Promise<number> {
    const baseRate = contractor.hourlyRate || 75;

    // Adjust for complexity
    const complexityMultiplier =
      criteria.projectComplexity === 'complex'
        ? 1.3
        : criteria.projectComplexity === 'medium'
          ? 1.1
          : 1.0;

    // Adjust for urgency
    const urgencyMultiplier =
      criteria.urgency === 'emergency'
        ? 1.5
        : criteria.urgency === 'urgent'
          ? 1.2
          : 1.0;

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
