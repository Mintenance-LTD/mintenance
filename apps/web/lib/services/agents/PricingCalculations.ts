/**
 * PricingCalculations
 *
 * Pure stateless calculation functions and shared type definitions
 * for the PricingAgent. No database access, no side effects.
 */

// ============================================================================
// Interfaces
// ============================================================================

export interface PricingFactors {
  complexityFactor?: number;
  locationFactor?: number;
  contractorTierFactor?: number;
  marketDemandFactor?: number;
  sampleSize?: number;
  method?: string;
  budget?: number;
  category?: string;
  // Material cost integration
  estimatedMaterialCost?: number;
  estimatedLaborCost?: number;
  materialCostFactor?: number;
}

export interface PricingRecommendation {
  id?: string;
  recommendedMinPrice: number;
  recommendedMaxPrice: number;
  recommendedOptimalPrice: number;
  marketAvgPrice: number;
  marketMedianPrice: number;
  marketRangeMin: number;
  marketRangeMax: number;
  competitivenessScore: number; // 0-100
  competitivenessLevel: 'too_low' | 'competitive' | 'premium' | 'too_high';
  confidenceScore: number; // 0-1
  reasoning: string;
  factors: PricingFactors;
  // Cost breakdown
  costBreakdown?: {
    materials: number;
    labor: number;
    overhead: number;
    profit: number;
    total: number;
  };
}

export interface MarketAnalysis {
  avgAcceptedPrice: number;
  medianAcceptedPrice: number;
  minAcceptedPrice: number;
  maxAcceptedPrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  totalBids: number;
  acceptedBids: number;
  acceptanceRate: number;
  sampleSize: number;
}

export interface BidWithAmount {
  amount: number;
}

export interface BidWithJob {
  amount: number;
  jobs: {
    category?: string;
    location?: string;
    budget?: number;
  };
}

export interface ContractorPricingPattern {
  contractor_id: string;
  avg_bid_amount: number;
  total_bids_count: number;
  accepted_bids_count: number;
  acceptance_rate: number;
  pricing_style: string;
  category_patterns: Record<string, CategoryPattern>;
  patterns_learned_from_bids: number;
  last_analyzed_at: string;
}

export interface CategoryPattern {
  totalBids: number;
  acceptedBids: number;
  avgPrice: number;
}

// ============================================================================
// Pure Calculation Functions
// ============================================================================

/**
 * Extract region from location string.
 */
export function extractRegion(location: string): string {
  if (!location) return 'unknown';
  const parts = location.split(',').map((p) => p.trim());
  return parts[parts.length - 1] || 'unknown'; // Usually city/country is last
}

/**
 * Calculate market statistics from an array of prices.
 */
export function calculateMarketStatistics(amounts: number[]): MarketAnalysis {
  const sorted = [...amounts].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Calculate quartiles for price range
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const priceRangeMin = sorted[q1Index];
  const priceRangeMax = sorted[q3Index];

  return {
    avgAcceptedPrice: Math.round(avg * 100) / 100,
    medianAcceptedPrice: Math.round(median * 100) / 100,
    minAcceptedPrice: min,
    maxAcceptedPrice: max,
    priceRangeMin,
    priceRangeMax,
    totalBids: sorted.length,
    acceptedBids: sorted.length,
    acceptanceRate: 1.0, // Only accepted bids in this analysis
    sampleSize: sorted.length,
  };
}

/**
 * Calculate competitiveness score for a proposed price vs market.
 */
export function calculateCompetitivenessScore(
  proposedPrice: number,
  marketAnalysis: MarketAnalysis,
  recommendedOptimal: number
): { score: number; level: 'too_low' | 'competitive' | 'premium' | 'too_high' } {
  // Calculate deviation from optimal
  const deviation = (proposedPrice - recommendedOptimal) / recommendedOptimal;

  let score: number;
  let level: 'too_low' | 'competitive' | 'premium' | 'too_high';

  if (deviation < -0.3) {
    // More than 30% below optimal
    score = Math.max(0, 30 + Math.round(deviation * 100));
    level = 'too_low';
  } else if (deviation < 0.1) {
    // Within 10% of optimal
    score = 70 + Math.round((0.1 - Math.abs(deviation)) * 100);
    level = 'competitive';
  } else if (deviation < 0.3) {
    // 10-30% above optimal (premium)
    score = 60 + Math.round((0.3 - deviation) * 50);
    level = 'premium';
  } else {
    // More than 30% above optimal
    score = Math.min(100, 50 - Math.round((deviation - 0.3) * 100));
    level = 'too_high';
  }

  // Normalize to 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, level };
}

/**
 * Calculate confidence score in recommendation based on sample size and acceptance rate.
 */
export function calculateConfidence(marketAnalysis: MarketAnalysis, _category: string): number {
  let confidence = 0.5; // Base confidence

  // More samples = higher confidence
  if (marketAnalysis.sampleSize >= 50) {
    confidence = 0.9;
  } else if (marketAnalysis.sampleSize >= 20) {
    confidence = 0.75;
  } else if (marketAnalysis.sampleSize >= 10) {
    confidence = 0.65;
  } else if (marketAnalysis.sampleSize >= 5) {
    confidence = 0.55;
  }

  // Higher acceptance rate = higher confidence
  if (marketAnalysis.acceptanceRate > 0.7) {
    confidence += 0.1;
  } else if (marketAnalysis.acceptanceRate < 0.3) {
    confidence -= 0.1;
  }

  return Math.max(0.3, Math.min(1.0, confidence));
}

/**
 * Generate human-readable reasoning text for a pricing recommendation.
 */
export function generateReasoning(
  marketAnalysis: MarketAnalysis,
  recommendedPrice: number,
  competitivenessLevel: string,
  complexityFactor: number,
  locationFactor: number,
  contractorTierFactor: number
): string {
  const factors: string[] = [];

  if (complexityFactor > 1.1) {
    factors.push('above-average complexity');
  }
  if (contractorTierFactor > 1.05) {
    factors.push('contractor tier premium');
  }
  if (locationFactor !== 1.0) {
    const locationAdjustment = ((locationFactor - 1) * 100).toFixed(0);
    const direction = locationFactor > 1.0 ? 'higher' : 'lower';
    factors.push(`${Math.abs(Number(locationAdjustment))}% ${direction} for location`);
  }

  let reasoning = `Based on ${marketAnalysis.sampleSize} similar accepted bids, `;
  reasoning += `the market median is £${marketAnalysis.medianAcceptedPrice.toFixed(2)}. `;
  reasoning += `Recommended optimal price: £${recommendedPrice.toFixed(2)}`;

  if (factors.length > 0) {
    reasoning += ` (adjusted for: ${factors.join(', ')}). `;
  }

  if (competitivenessLevel === 'too_low') {
    reasoning += 'Warning: Your proposed price is significantly below market rate.';
  } else if (competitivenessLevel === 'competitive') {
    reasoning += 'Your price is competitive within the market range.';
  } else if (competitivenessLevel === 'premium') {
    reasoning += 'Your price is at a premium - ensure quality/service justifies the difference.';
  } else if (competitivenessLevel === 'too_high') {
    reasoning += 'Warning: Your proposed price is significantly above market rate and may reduce acceptance chances.';
  }

  return reasoning;
}

/**
 * Generate a fallback recommendation when market data is insufficient.
 * Uses 70-90% of budget as the recommendation range.
 */
export function generateBudgetBasedRecommendation(
  budget: number,
  category: string
): PricingRecommendation {
  const recommendedOptimalPrice = Math.round(budget * 0.8);
  const recommendedMinPrice = Math.round(budget * 0.7);
  const recommendedMaxPrice = Math.round(budget * 0.9);

  return {
    recommendedMinPrice,
    recommendedMaxPrice,
    recommendedOptimalPrice,
    marketAvgPrice: budget * 0.8,
    marketMedianPrice: budget * 0.8,
    marketRangeMin: budget * 0.7,
    marketRangeMax: budget * 0.9,
    competitivenessScore: 50,
    competitivenessLevel: 'competitive',
    confidenceScore: 0.3, // Low confidence without market data
    reasoning: `Market data insufficient. Recommendation based on job budget (£${budget.toFixed(2)}). Suggested range: £${recommendedMinPrice}-£${recommendedMaxPrice}.`,
    factors: {
      method: 'budget_based',
      budget,
      category,
    },
  };
}
