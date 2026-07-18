export interface MatchingCriteria {
  jobId: string;
  location: {
    latitude: number;
    longitude: number;
    maxDistance: number; // in miles
  };
  budget: {
    min: number;
    max: number;
  };
  urgency: 'emergency' | 'urgent' | 'normal' | 'flexible';
  requiredSkills: string[];
  preferredSkills?: string[];
  projectComplexity: 'simple' | 'medium' | 'complex';
  timeframe: 'immediate' | 'this_week' | 'this_month' | 'flexible';
  homeownerTier?: 'free' | 'landlord' | 'agency';
}

export interface ContractorMatch {
  contractor: import('@mintenance/types').ContractorProfile;
  matchScore: number;
  matchBreakdown: MatchingScore;
  estimatedRate: number;
  availability: 'immediate' | 'this_week' | 'this_month' | 'busy';
  distance: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasons: string[];
  concerns: string[];
}

export interface MatchingScore {
  skillMatch: number; // 0-100
  locationScore: number; // 0-100
  budgetAlignment: number; // 0-100
  availabilityMatch: number; // 0-100
  ratingScore: number; // 0-100
  experienceScore: number; // 0-100
  responsiveness: number; // 0-100
  priceCompetitiveness: number; // 0-100
  fairness: number; // 0-100 — Uber-style work-distribution term
  overallScore: number; // 0-100
}

/**
 * Per-contractor engagement stats derived from `bids` (+ joined job
 * created_at). Feed the fairness + responsiveness terms in
 * ScoringService — see EngagementStatsService.
 */
export interface ContractorEngagementStats {
  /** Accepted bids in the recency window (default 30 days). */
  recentWins: number;
  /** Days since the most recent accepted bid; null = never won. */
  daysSinceLastWin: number | null;
  /** Mean hours between job posting and this contractor's bid; null = no bids. */
  avgBidResponseHours: number | null;
}

export interface MatchingPreferences {
  userId: string;
  maxMatches: number;
  prioritizeLocal: boolean;
  prioritizeBudget: boolean;
  prioritizeRating: boolean;
  prioritizeSpeed: boolean;
  minRating: number;
  maxDistance: number;
  preferredPriceRange: 'budget' | 'mid-range' | 'premium' | 'any';
  blacklistedContractors: string[];
  favoriteContractors: string[];
}

export interface MatchingInsights {
  totalCandidates: number;
  averageMatchScore: number;
  topSkillGaps: string[];
  recommendedBudgetAdjustment?: {
    suggested: number;
    reason: string;
  };
  marketAvailability: 'high' | 'medium' | 'low';
  competitiveAnalysis: {
    averageRate: number;
    rateRange: { min: number; max: number };
    topContractors: number;
  };
}
