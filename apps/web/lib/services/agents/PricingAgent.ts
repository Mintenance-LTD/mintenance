import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import type { AgentResult, AgentContext } from './types';

interface PricingRecommendation {
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
  factors: Record<string, any>;
}

interface MarketAnalysis {
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

/**
 * Agent for intelligent pricing recommendations
 * - Market-based pricing analysis
 * - Dynamic quote suggestions
 * - Price competitiveness scoring
 * - Contractor pricing pattern learning
 */
export class PricingAgent {
  /**
   * Generate pricing recommendation for a job
   */
  static async generateRecommendation(
    jobId: string,
    contractorId?: string,
    proposedPrice?: number
  ): Promise<PricingRecommendation | null> {
    try {
      // Get job details
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, title, description, category, budget, location, homeowner_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        logger.error('Failed to fetch job for pricing recommendation', {
          service: 'PricingAgent',
          jobId,
          error: jobError?.message,
        });
        return null;
      }

      // Get market analysis
      const marketAnalysis = await this.analyzeMarket(job.category || '', job.location || '');

      if (!marketAnalysis || marketAnalysis.sampleSize < 3) {
        // Not enough data - use budget-based fallback
        return this.generateBudgetBasedRecommendation(job.budget || 0, job.category || '');
      }

      // Calculate factors
      const complexityFactor = await this.calculateComplexityFactor(jobId, job.description || '');
      const locationFactor = await this.calculateLocationFactor(job.location || '');
      const contractorTierFactor = contractorId
        ? await this.calculateContractorTierFactor(contractorId)
        : 1.0;
      const marketDemandFactor = await this.calculateMarketDemandFactor(job.category || '', job.location || '');

      // Calculate recommended prices
      const basePrice = marketAnalysis.medianAcceptedPrice;
      const recommendedOptimalPrice = Math.round(
        basePrice * complexityFactor * locationFactor * contractorTierFactor * marketDemandFactor
      );
      const priceRange = marketAnalysis.maxAcceptedPrice - marketAnalysis.minAcceptedPrice;
      const recommendedMinPrice = Math.max(0, Math.round(recommendedOptimalPrice - priceRange * 0.2));
      const recommendedMaxPrice = Math.round(recommendedOptimalPrice + priceRange * 0.2);

      // Calculate competitiveness if proposed price provided
      let competitivenessScore = 0;
      let competitivenessLevel: 'too_low' | 'competitive' | 'premium' | 'too_high' = 'competitive';

      if (proposedPrice !== undefined) {
        const score = this.calculateCompetitivenessScore(
          proposedPrice,
          marketAnalysis,
          recommendedOptimalPrice
        );
        competitivenessScore = score.score;
        competitivenessLevel = score.level;
      }

      // Calculate confidence
      const confidenceScore = this.calculateConfidence(marketAnalysis, job.category || '');

      // Generate reasoning
      const reasoning = this.generateReasoning(
        marketAnalysis,
        recommendedOptimalPrice,
        competitivenessLevel,
        complexityFactor,
        locationFactor,
        contractorTierFactor
      );

      // Store recommendation
      const recommendationData = {
        job_id: jobId,
        contractor_id: contractorId || null,
        recommended_min_price: recommendedMinPrice,
        recommended_max_price: recommendedMaxPrice,
        recommended_optimal_price: recommendedOptimalPrice,
        market_avg_price: marketAnalysis.avgAcceptedPrice,
        market_median_price: marketAnalysis.medianAcceptedPrice,
        market_range_min: marketAnalysis.priceRangeMin,
        market_range_max: marketAnalysis.priceRangeMax,
        competitiveness_score: competitivenessScore || null,
        competitiveness_level: competitivenessLevel,
        job_complexity_factor: complexityFactor,
        location_factor: locationFactor,
        contractor_tier_factor: contractorTierFactor,
        market_demand_factor: marketDemandFactor,
        confidence_score: confidenceScore,
        reasoning,
        factors: {
          complexityFactor,
          locationFactor,
          contractorTierFactor,
          marketDemandFactor,
          sampleSize: marketAnalysis.sampleSize,
        },
      };

      const { data: recommendation, error: insertError } = await serverSupabase
        .from('pricing_recommendations')
        .insert(recommendationData)
        .select('id')
        .single();

      if (insertError) {
        logger.error('Failed to store pricing recommendation', {
          service: 'PricingAgent',
          jobId,
          error: insertError.message,
        });
      }

      // Add recommendation ID to return value
      const result: PricingRecommendation = {
        recommendedMinPrice,
        recommendedMaxPrice,
        recommendedOptimalPrice,
        marketAvgPrice: marketAnalysis.avgAcceptedPrice,
        marketMedianPrice: marketAnalysis.medianAcceptedPrice,
        marketRangeMin: marketAnalysis.priceRangeMin,
        marketRangeMax: marketAnalysis.priceRangeMax,
        competitivenessScore,
        competitivenessLevel,
        confidenceScore,
        reasoning,
        factors: recommendationData.factors,
      };

      if (recommendation?.id) {
        result.id = recommendation.id;
      }

      // Log decision
      await AgentLogger.logDecision({
        agentName: 'pricing',
        decisionType: 'pricing_recommendation',
        actionTaken: 'generated_recommendation',
        confidence: Math.round(confidenceScore * 100),
        reasoning,
        jobId,
        userId: contractorId,
        metadata: {
          recommendedOptimalPrice,
          marketAnalysis,
          competitivenessScore,
          competitivenessLevel,
        },
      });

      return result;
    } catch (error) {
      logger.error('Error generating pricing recommendation', error, {
        service: 'PricingAgent',
        jobId,
      });
      return null;
    }
  }

  /**
   * Analyze market pricing for a category and location
   */
  private static async analyzeMarket(
    category: string,
    location: string
  ): Promise<MarketAnalysis | null> {
    try {
      // Extract region from location (simplified - could use geocoding)
      const region = this.extractRegion(location);

      // Get accepted bids for similar jobs
      const { data: acceptedBids, error: acceptedError } = await serverSupabase
        .from('bids')
        .select(
          `
          amount,
          jobs!inner (
            id,
            category,
            location,
            budget
          )
        `
        )
        .eq('status', 'accepted')
        .eq('jobs.category', category)
        .order('created_at', { ascending: false })
        .limit(100);

      if (acceptedError || !acceptedBids || acceptedBids.length < 3) {
        // Not enough data - try without location filter
        const { data: categoryBids } = await serverSupabase
          .from('bids')
          .select(
            `
            amount,
            jobs!inner (
              id,
              category
            )
          `
          )
          .eq('status', 'accepted')
          .eq('jobs.category', category)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!categoryBids || categoryBids.length < 3) {
          return null;
        }

        return this.calculateMarketStatistics(categoryBids.map((b: any) => b.amount));
      }

      const amounts = acceptedBids.map((b: any) => b.amount).filter((a: number) => a && a > 0);

      if (amounts.length < 3) {
        return null;
      }

      return this.calculateMarketStatistics(amounts);
    } catch (error) {
      logger.error('Error analyzing market', error, {
        service: 'PricingAgent',
        category,
        location,
      });
      return null;
    }
  }

  /**
   * Calculate market statistics from price array
   */
  private static calculateMarketStatistics(amounts: number[]): MarketAnalysis {
    const sorted = [...amounts].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;

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
   * Calculate job complexity factor
   */
  private static async calculateComplexityFactor(jobId: string, description: string): Promise<number> {
    // Simple heuristic - can be enhanced with ML
    const descriptionLength = description.length;
    const wordCount = description.split(/\s+/).length;

    // Complex indicators
    const complexKeywords = [
      'complex',
      'multiple',
      'extensive',
      'renovation',
      'remodel',
      'installation',
      'system',
      'electrical',
      'plumbing',
    ];
    const keywordCount = complexKeywords.filter((keyword) =>
      description.toLowerCase().includes(keyword)
    ).length;

    // Base factor
    let factor = 1.0;

    // Adjust based on description complexity
    if (wordCount > 100 || descriptionLength > 500) {
      factor += 0.2;
    }

    // Adjust based on keywords
    if (keywordCount >= 3) {
      factor += 0.3;
    } else if (keywordCount >= 1) {
      factor += 0.1;
    }

    return Math.min(1.5, Math.max(0.8, factor)); // Cap between 0.8 and 1.5
  }

  /**
   * Calculate location factor (cost of living, demand)
   */
  private static async calculateLocationFactor(location: string): Promise<number> {
    // Simplified - can be enhanced with real location data
    // For now, return 1.0 (no adjustment)
    // In production, this would use geocoding and cost-of-living data
    return 1.0;
  }

  /**
   * Calculate contractor tier factor
   */
  private static async calculateContractorTierFactor(contractorId: string): Promise<number> {
    try {
      const { PayoutTierService } = await import('@/lib/services/payment/PayoutTierService');
      const tier = await PayoutTierService.calculateTier(contractorId);

      // Higher tiers can charge more
      const tierFactors: Record<string, number> = {
        elite: 1.2,
        trusted: 1.1,
        standard: 1.0,
      };

      return tierFactors[tier] || 1.0;
    } catch (error) {
      logger.error('Error calculating contractor tier factor', error, {
        service: 'PricingAgent',
        contractorId,
      });
      return 1.0;
    }
  }

  /**
   * Calculate market demand factor
   */
  private static async calculateMarketDemandFactor(category: string, location: string): Promise<number> {
    try {
      // Get recent job postings vs accepted bids ratio
      const { count: recentJobs } = await serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('category', category)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'posted');

      const { count: acceptedBids } = await serverSupabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // High demand = more jobs than accepted bids
      const demandRatio = (recentJobs || 0) / Math.max(1, acceptedBids || 1);

      if (demandRatio > 2) {
        return 1.15; // High demand - can charge more
      } else if (demandRatio > 1.5) {
        return 1.08; // Moderate demand
      } else if (demandRatio < 0.5) {
        return 0.92; // Low demand - need to be competitive
      }

      return 1.0; // Balanced
    } catch (error) {
      logger.error('Error calculating market demand factor', error, {
        service: 'PricingAgent',
        category,
      });
      return 1.0;
    }
  }

  /**
   * Calculate competitiveness score for a proposed price
   */
  private static calculateCompetitivenessScore(
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
   * Calculate confidence in recommendation
   */
  private static calculateConfidence(marketAnalysis: MarketAnalysis, category: string): number {
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
   * Generate reasoning text for recommendation
   */
  private static generateReasoning(
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
      factors.push('location adjustments');
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
   * Generate budget-based recommendation when market data is insufficient
   */
  private static generateBudgetBasedRecommendation(
    budget: number,
    category: string
  ): PricingRecommendation {
    // Use 70-90% of budget as recommendation range
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

  /**
   * Extract region from location string
   */
  private static extractRegion(location: string): string {
    // Simplified extraction - could use geocoding API
    // For now, return first part of location or "unknown"
    if (!location) return 'unknown';
    const parts = location.split(',').map((p) => p.trim());
    return parts[parts.length - 1] || 'unknown'; // Usually city/country is last
  }

  /**
   * Learn from bid acceptance/rejection
   */
  static async learnFromBidOutcome(
    bidId: string,
    wasAccepted: boolean
  ): Promise<AgentResult> {
    try {
      // Get bid details
      const { data: bid, error: bidError } = await serverSupabase
        .from('bids')
        .select('id, amount, contractor_id, job_id, pricing_recommendation_id, jobs!inner(category, location, budget)')
        .eq('id', bidId)
        .single();

      if (bidError || !bid) {
        return { success: false, error: 'Bid not found' };
      }

      const job = (bid as any).jobs;

      // Update pricing recommendation with outcome
      if (bid.pricing_recommendation_id) {
        await serverSupabase
          .from('pricing_recommendations')
          .update({
            final_bid_amount: bid.amount,
            bid_was_accepted: wasAccepted,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bid.pricing_recommendation_id);
      }

      // Update contractor pricing patterns
      await this.updateContractorPricingPattern(bid.contractor_id, bid.amount, wasAccepted, job.category || '');

      // Update market analytics
      if (wasAccepted) {
        await this.updateMarketAnalytics(job.category || '', job.location || '', bid.amount, job.budget || 0);
      }

      await AgentLogger.logDecision({
        agentName: 'pricing',
        decisionType: 'learn_from_bid',
        actionTaken: 'updated_patterns',
        confidence: 95,
        reasoning: `Learned from bid outcome: ${wasAccepted ? 'accepted' : 'rejected'} at £${bid.amount}`,
        jobId: bid.job_id,
        userId: bid.contractor_id,
        metadata: { bidId, wasAccepted, bidAmount: bid.amount },
      });

      return { success: true, message: 'Learning data updated' };
    } catch (error) {
      logger.error('Error learning from bid outcome', error, {
        service: 'PricingAgent',
        bidId,
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update contractor pricing patterns
   */
  private static async updateContractorPricingPattern(
    contractorId: string,
    bidAmount: number,
    wasAccepted: boolean,
    category: string
  ): Promise<void> {
    try {
      // Get or create contractor pattern
      const { data: pattern, error: fetchError } = await serverSupabase
        .from('contractor_pricing_patterns')
        .select('*')
        .eq('contractor_id', contractorId)
        .single();

      const totalBids = (pattern?.total_bids_count || 0) + 1;
      const acceptedBids = (pattern?.accepted_bids_count || 0) + (wasAccepted ? 1 : 0);
      const acceptanceRate = (acceptedBids / totalBids) * 100;

      // Calculate average bid amount
      const existingAvg = pattern?.avg_bid_amount || 0;
      const existingCount = pattern?.total_bids_count || 0;
      const newAvg = existingCount > 0
        ? (existingAvg * existingCount + bidAmount) / totalBids
        : bidAmount;

      // Determine pricing style
      let pricingStyle = 'variable';
      if (acceptanceRate >= 70 && existingAvg) {
        const deviation = Math.abs(bidAmount - existingAvg) / existingAvg;
        if (deviation < 0.1) {
          pricingStyle = 'competitive';
        } else if (bidAmount < existingAvg * 0.9) {
          pricingStyle = 'budget';
        } else if (bidAmount > existingAvg * 1.1) {
          pricingStyle = 'premium';
        }
      }

      // Update category patterns
      const categoryPatterns = pattern?.category_patterns || {};
      if (!categoryPatterns[category]) {
        categoryPatterns[category] = {
          totalBids: 0,
          acceptedBids: 0,
          avgPrice: 0,
        };
      }
      const catPattern = categoryPatterns[category];
      catPattern.totalBids = (catPattern.totalBids || 0) + 1;
      catPattern.acceptedBids = (catPattern.acceptedBids || 0) + (wasAccepted ? 1 : 0);
      catPattern.avgPrice =
        ((catPattern.avgPrice || 0) * (catPattern.totalBids - 1) + bidAmount) / catPattern.totalBids;

      if (pattern) {
        // Update existing pattern
        await serverSupabase
          .from('contractor_pricing_patterns')
          .update({
            avg_bid_amount: newAvg,
            total_bids_count: totalBids,
            accepted_bids_count: acceptedBids,
            acceptance_rate: acceptanceRate,
            pricing_style: pricingStyle,
            category_patterns: categoryPatterns,
            patterns_learned_from_bids: (pattern.patterns_learned_from_bids || 0) + 1,
            last_analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('contractor_id', contractorId);
      } else {
        // Create new pattern
        await serverSupabase.from('contractor_pricing_patterns').insert({
          contractor_id: contractorId,
          avg_bid_amount: newAvg,
          total_bids_count: totalBids,
          accepted_bids_count: acceptedBids,
          acceptance_rate: acceptanceRate,
          pricing_style: pricingStyle,
          category_patterns: categoryPatterns,
          patterns_learned_from_bids: 1,
          last_analyzed_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error updating contractor pricing pattern', error, {
        service: 'PricingAgent',
        contractorId,
      });
    }
  }

  /**
   * Update market analytics
   */
  private static async updateMarketAnalytics(
    category: string,
    location: string,
    acceptedPrice: number,
    budget: number
  ): Promise<void> {
    try {
      // Store pricing data point for future analysis
      await serverSupabase.from('pricing_analytics').insert({
        category,
        location,
        budget,
        accepted_bid_amount: acceptedPrice,
        analyzed_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating market analytics', error, {
        service: 'PricingAgent',
        category,
      });
    }
  }

  /**
   * Get contractor pricing pattern
   */
  static async getContractorPricingPattern(contractorId: string): Promise<any> {
    try {
      const { data: pattern } = await serverSupabase
        .from('contractor_pricing_patterns')
        .select('*')
        .eq('contractor_id', contractorId)
        .single();

      return pattern;
    } catch (error) {
      logger.error('Error fetching contractor pricing pattern', error, {
        service: 'PricingAgent',
        contractorId,
      });
      return null;
    }
  }
}

