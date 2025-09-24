/**
 * Pricing ML Service
 *
 * Handles job pricing predictions, market rate analysis, and cost optimization.
 * Part of the domain-separated ML engine architecture.
 *
 * @filesize Target: <500 lines
 * @compliance Architecture principles - Domain separation, single responsibility
 */

import { mlCoreService } from '../core/MLCoreService';
import { circuitBreakerManager } from '../../../utils/circuitBreaker';

export interface PricingPredictionResult {
  estimatedPrice: number;
  priceRange: {
    minimum: number;
    maximum: number;
  };
  factors: {
    laborCost: number;
    materialCost: number;
    complexityMultiplier: number;
    locationAdjustment: number;
    urgencyPremium: number;
  };
  confidence: number;
  marketComparison: {
    percentile: number;
    competitiveRange: [number, number];
  };
}

export interface MarketRateAnalysis {
  averageRate: number;
  marketTrend: 'rising' | 'stable' | 'declining';
  seasonalAdjustment: number;
  competitorAnalysis: {
    lowEnd: number;
    midRange: number;
    highEnd: number;
  };
  demandIndicator: 'low' | 'medium' | 'high';
}

export interface CostOptimizationSuggestion {
  potentialSavings: number;
  recommendations: string[];
  alternativeMaterials: Array<{
    material: string;
    costDifference: number;
    qualityImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  }>;
  timingRecommendations: string[];
}

interface PricingInput {
  jobCategory: string;
  description: string;
  skillsRequired: string[];
  location: {
    lat: number;
    lng: number;
    region?: string;
  };
  urgency: 'low' | 'medium' | 'high';
  estimatedDuration: number; // hours
  materialComplexity: number; // 0-1 scale
  customerBudget?: number;
}

/**
 * Pricing ML Service
 *
 * Provides intelligent pricing predictions using machine learning models,
 * market analysis, and cost optimization algorithms.
 */
export class PricingMLService {
  private static instance: PricingMLService;

  /**
   * Get singleton instance
   */
  public static getInstance(): PricingMLService {
    if (!PricingMLService.instance) {
      PricingMLService.instance = new PricingMLService();
    }
    return PricingMLService.instance;
  }

  /**
   * Predict job pricing using ML models
   */
  public async predictJobPricing(input: PricingInput): Promise<PricingPredictionResult> {
    await mlCoreService.initialize();

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('pricing_prediction');

    return circuitBreaker.execute(async () => {
      // Prepare input features for ML model
      const features = await this._extractPricingFeatures(input);
      const inputData = [features];

      // Execute ML prediction
      const result = await mlCoreService.executePrediction(
        'pricing',
        inputData,
        (results: number[]) => this._processPricingResults(results, input)
      );

      return result;
    });
  }

  /**
   * Analyze market rates for specific job category and location
   */
  public async analyzeMarketRates(
    category: string,
    location: { lat: number; lng: number; region?: string }
  ): Promise<MarketRateAnalysis> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('market_rate_analysis');

    return circuitBreaker.execute(async () => {
      // Get regional pricing data
      const regionalData = await this._getRegionalPricingData(location);
      const categoryRates = await this._getCategoryRates(category);

      // Calculate market analysis
      const averageRate = this._calculateAverageRate(categoryRates, regionalData);
      const marketTrend = this._analyzeMarketTrend(categoryRates);
      const seasonalAdjustment = this._getSeasonalAdjustment(category);
      const competitorAnalysis = this._analyzeCompetitorPricing(categoryRates);
      const demandIndicator = this._analyzeDemandLevel(category, location);

      return {
        averageRate,
        marketTrend,
        seasonalAdjustment,
        competitorAnalysis,
        demandIndicator,
      };
    });
  }

  /**
   * Get cost optimization suggestions
   */
  public async getCostOptimization(
    pricingResult: PricingPredictionResult,
    input: PricingInput
  ): Promise<CostOptimizationSuggestion> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('cost_optimization');

    return circuitBreaker.execute(async () => {
      const recommendations: string[] = [];
      const alternativeMaterials = this._suggestAlternativeMaterials(input);
      const timingRecommendations = this._getTimingRecommendations(input);

      // Calculate potential savings
      const materialSavings = alternativeMaterials.reduce(
        (total, alt) => total + Math.abs(alt.costDifference),
        0
      );
      const timingSavings = this._calculateTimingSavings(input);
      const potentialSavings = materialSavings + timingSavings;

      // Generate recommendations
      if (pricingResult.factors.urgencyPremium > 0.2) {
        recommendations.push('Consider scheduling for non-urgent completion to reduce premium');
      }

      if (pricingResult.factors.materialCost > pricingResult.factors.laborCost * 1.5) {
        recommendations.push('Material costs are high - consider alternative materials');
      }

      if (pricingResult.marketComparison.percentile > 75) {
        recommendations.push('Price is above market average - consider negotiating');
      }

      return {
        potentialSavings,
        recommendations,
        alternativeMaterials,
        timingRecommendations,
      };
    });
  }

  /**
   * Calculate bid competitiveness score
   */
  public async calculateBidCompetitiveness(
    bidAmount: number,
    marketAnalysis: MarketRateAnalysis,
    jobComplexity: number
  ): Promise<{
    score: number; // 0-1, higher is more competitive
    position: 'low' | 'competitive' | 'high' | 'premium';
    winProbability: number;
    recommendations: string[];
  }> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('bid_competitiveness');

    return circuitBreaker.execute(async () => {
      // Calculate position relative to market
      const midPoint = marketAnalysis.competitorAnalysis.midRange;
      const relativePosition = bidAmount / midPoint;

      let position: 'low' | 'competitive' | 'high' | 'premium';
      let score: number;

      if (relativePosition < 0.8) {
        position = 'low';
        score = 0.9; // High competitiveness but potential quality concerns
      } else if (relativePosition < 1.2) {
        position = 'competitive';
        score = 0.8;
      } else if (relativePosition < 1.5) {
        position = 'high';
        score = 0.4;
      } else {
        position = 'premium';
        score = 0.2;
      }

      // Adjust score based on complexity
      if (jobComplexity > 0.7 && position === 'premium') {
        score += 0.3; // Premium pricing more acceptable for complex jobs
      }

      // Calculate win probability
      const winProbability = this._calculateWinProbability(
        relativePosition,
        marketAnalysis.demandIndicator,
        jobComplexity
      );

      // Generate recommendations
      const recommendations = this._generateBidRecommendations(
        position,
        winProbability,
        marketAnalysis
      );

      return {
        score: Math.min(1, Math.max(0, score)),
        position,
        winProbability,
        recommendations,
      };
    });
  }

  /**
   * Extract pricing features from input
   */
  private async _extractPricingFeatures(input: PricingInput): Promise<number[]> {
    const features: number[] = [];

    // Category complexity score
    features.push(this._getCategoryComplexityScore(input.jobCategory));

    // Skills complexity
    features.push(this._calculateSkillsComplexity(input.skillsRequired));

    // Duration factor
    features.push(Math.min(input.estimatedDuration / 40, 1)); // Normalize to 40-hour max

    // Material complexity
    features.push(input.materialComplexity);

    // Urgency factor
    const urgencyMap = { low: 0.1, medium: 0.5, high: 0.9 };
    features.push(urgencyMap[input.urgency]);

    // Location factors (mock regional pricing adjustments)
    const locationFactor = this._getLocationPricingFactor(input.location);
    features.push(locationFactor);

    // Description complexity (text analysis)
    const textComplexity = this._analyzeDescriptionComplexity(input.description);
    features.push(textComplexity);

    // Customer budget indicator (if available)
    const budgetIndicator = input.customerBudget ? Math.min(input.customerBudget / 5000, 2) : 1;
    features.push(budgetIndicator);

    // Seasonal adjustment
    const seasonalFactor = this._getSeasonalPricingFactor(input.jobCategory);
    features.push(seasonalFactor);

    // Market demand indicator
    const demandFactor = this._getDemandFactor(input.jobCategory, input.location);
    features.push(demandFactor);

    // Pad to expected input size (32 features)
    while (features.length < 32) {
      features.push(Math.random() * 0.1); // Small random factors for unused features
    }

    return features.slice(0, 32);
  }

  /**
   * Process ML pricing results
   */
  private _processPricingResults(
    results: number[],
    input: PricingInput
  ): PricingPredictionResult {
    // ML model returns [basePrice, laborRatio, materialRatio]
    const [basePrice, laborRatio, materialRatio] = results;

    const estimatedPrice = (basePrice || 500) * 100; // Scale up from normalized output

    // Calculate price factors
    const laborCost = estimatedPrice * (laborRatio || 0.6);
    const materialCost = estimatedPrice * (materialRatio || 0.4);
    const complexityMultiplier = this._getComplexityMultiplier(input);
    const locationAdjustment = this._getLocationAdjustment(input.location);
    const urgencyPremium = this._getUrgencyPremium(input.urgency);

    // Adjust final price
    const adjustedPrice = estimatedPrice * complexityMultiplier * locationAdjustment * urgencyPremium;

    const factors = {
      laborCost,
      materialCost,
      complexityMultiplier,
      locationAdjustment,
      urgencyPremium,
    };

    // Calculate price range (±20% typically)
    const variance = adjustedPrice * 0.2;
    const priceRange = {
      minimum: Math.max(adjustedPrice - variance, adjustedPrice * 0.7),
      maximum: adjustedPrice + variance,
    };

    // Market comparison
    const marketComparison = this._calculateMarketComparison(adjustedPrice, input);

    return {
      estimatedPrice: Math.round(adjustedPrice),
      priceRange: {
        minimum: Math.round(priceRange.minimum),
        maximum: Math.round(priceRange.maximum),
      },
      factors,
      confidence: 0.75, // Mock confidence score
      marketComparison,
    };
  }

  /**
   * Get category complexity score
   */
  private _getCategoryComplexityScore(category: string): number {
    const complexityMap: Record<string, number> = {
      electrical: 0.9,
      plumbing: 0.8,
      hvac: 0.9,
      roofing: 0.7,
      flooring: 0.5,
      painting: 0.3,
      carpentry: 0.6,
      general: 0.4,
    };

    return complexityMap[category.toLowerCase()] || 0.5;
  }

  /**
   * Calculate skills complexity
   */
  private _calculateSkillsComplexity(skills: string[]): number {
    const specializedSkills = ['electrical', 'plumbing', 'hvac', 'structural'];
    const specializedCount = skills.filter(skill =>
      specializedSkills.some(spec => skill.toLowerCase().includes(spec))
    ).length;

    return Math.min(specializedCount / 3, 1); // Normalize to 0-1
  }

  /**
   * Get location pricing factor
   */
  private _getLocationPricingFactor(location: { lat: number; lng: number; region?: string }): number {
    // Mock regional adjustments - would use real market data
    const regionFactors: Record<string, number> = {
      'san_francisco': 1.5,
      'new_york': 1.4,
      'los_angeles': 1.3,
      'chicago': 1.1,
      'dallas': 1.0,
      'phoenix': 0.9,
      'atlanta': 0.95,
    };

    const region = location.region?.toLowerCase().replace(' ', '_') || 'default';
    return regionFactors[region] || 1.0;
  }

  /**
   * Analyze description complexity
   */
  private _analyzeDescriptionComplexity(description: string): number {
    const complexTerms = ['custom', 'complex', 'detailed', 'precision', 'specialized'];
    const words = description.toLowerCase().split(' ');
    const complexTermCount = complexTerms.filter(term =>
      words.some(word => word.includes(term))
    ).length;

    return Math.min(complexTermCount / 3, 1);
  }

  /**
   * Get seasonal pricing factor
   */
  private _getSeasonalPricingFactor(category: string): number {
    const currentMonth = new Date().getMonth();

    // Mock seasonal adjustments
    if (category.includes('roofing') && (currentMonth >= 3 && currentMonth <= 8)) {
      return 1.2; // Higher demand in spring/summer
    }

    if (category.includes('hvac') && (currentMonth === 5 || currentMonth === 6)) {
      return 1.3; // Pre-summer AC demand
    }

    return 1.0;
  }

  /**
   * Get demand factor for category and location
   */
  private _getDemandFactor(category: string, location: { lat: number; lng: number }): number {
    // Mock demand calculation - would use real market data
    return 0.8 + Math.random() * 0.4; // Random factor between 0.8-1.2
  }

  /**
   * Get complexity multiplier
   */
  private _getComplexityMultiplier(input: PricingInput): number {
    let multiplier = 1.0;

    if (input.materialComplexity > 0.7) multiplier += 0.2;
    if (input.skillsRequired.length > 3) multiplier += 0.15;
    if (input.estimatedDuration > 20) multiplier += 0.1;

    return multiplier;
  }

  /**
   * Get location adjustment
   */
  private _getLocationAdjustment(location: { lat: number; lng: number; region?: string }): number {
    return this._getLocationPricingFactor(location);
  }

  /**
   * Get urgency premium
   */
  private _getUrgencyPremium(urgency: 'low' | 'medium' | 'high'): number {
    const premiumMap = { low: 1.0, medium: 1.15, high: 1.3 };
    return premiumMap[urgency];
  }

  /**
   * Calculate market comparison
   */
  private _calculateMarketComparison(price: number, input: PricingInput): {
    percentile: number;
    competitiveRange: [number, number];
  } {
    // Mock market comparison - would use real market data
    const mockMarketAverage = price * (0.9 + Math.random() * 0.2); // ±10% variation
    const percentile = Math.round(50 + (price - mockMarketAverage) / mockMarketAverage * 50);

    return {
      percentile: Math.max(1, Math.min(99, percentile)),
      competitiveRange: [mockMarketAverage * 0.85, mockMarketAverage * 1.15],
    };
  }

  // Additional helper methods for market analysis...
  private async _getRegionalPricingData(location: any): Promise<any> {
    // Mock implementation - would fetch real regional data
    return { adjustmentFactor: this._getLocationPricingFactor(location) };
  }

  private async _getCategoryRates(category: string): Promise<any[]> {
    // Mock implementation - would fetch real category pricing data
    return [{ rate: 50 + Math.random() * 100 }];
  }

  private _calculateAverageRate(categoryRates: any[], regionalData: any): number {
    return 75 * regionalData.adjustmentFactor; // Mock average
  }

  private _analyzeMarketTrend(categoryRates: any[]): 'rising' | 'stable' | 'declining' {
    const trends = ['rising', 'stable', 'declining'] as const;
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private _getSeasonalAdjustment(category: string): number {
    return this._getSeasonalPricingFactor(category);
  }

  private _analyzeCompetitorPricing(categoryRates: any[]): {
    lowEnd: number;
    midRange: number;
    highEnd: number;
  } {
    const base = 75;
    return {
      lowEnd: base * 0.7,
      midRange: base,
      highEnd: base * 1.4,
    };
  }

  private _analyzeDemandLevel(category: string, location: any): 'low' | 'medium' | 'high' {
    const levels = ['low', 'medium', 'high'] as const;
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private _suggestAlternativeMaterials(input: PricingInput): any[] {
    // Mock implementation
    return [
      {
        material: 'Standard grade materials',
        costDifference: -150,
        qualityImpact: 'minimal' as const,
      },
    ];
  }

  private _getTimingRecommendations(input: PricingInput): string[] {
    return ['Schedule during off-peak season for potential 10-15% savings'];
  }

  private _calculateTimingSavings(input: PricingInput): number {
    return input.urgency === 'high' ? 200 : 0;
  }

  private _calculateWinProbability(
    relativePosition: number,
    demandIndicator: string,
    jobComplexity: number
  ): number {
    let probability = 0.5;

    // Adjust based on price position
    if (relativePosition < 0.9) probability += 0.3;
    else if (relativePosition > 1.3) probability -= 0.3;

    // Adjust based on demand
    if (demandIndicator === 'high') probability += 0.2;
    else if (demandIndicator === 'low') probability -= 0.1;

    // Adjust based on complexity (higher complexity = more focus on quality than price)
    if (jobComplexity > 0.7) probability += 0.1;

    return Math.max(0.1, Math.min(0.9, probability));
  }

  private _generateBidRecommendations(
    position: string,
    winProbability: number,
    marketAnalysis: MarketRateAnalysis
  ): string[] {
    const recommendations: string[] = [];

    if (position === 'high' || position === 'premium') {
      recommendations.push('Consider justifying premium pricing with added value or guarantees');
    }

    if (winProbability < 0.4) {
      recommendations.push('Low win probability - consider reducing price or highlighting unique value');
    }

    if (marketAnalysis.demandIndicator === 'high') {
      recommendations.push('High demand market - premium pricing may be acceptable');
    }

    return recommendations;
  }
}

// Export singleton instance
export const pricingMLService = PricingMLService.getInstance();