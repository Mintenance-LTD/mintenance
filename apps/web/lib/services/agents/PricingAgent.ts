import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import type { AgentResult } from './types';
import {
  extractRegion,
  calculateMarketStatistics,
  calculateCompetitivenessScore,
  calculateConfidence,
  generateReasoning,
  generateBudgetBasedRecommendation,
} from './PricingCalculations';
import type {
  PricingRecommendation,
  MarketAnalysis,
  BidWithAmount,
  ContractorPricingPattern,
} from './PricingCalculations';
import {
  learnFromBidOutcome as _learnFromBidOutcome,
  getContractorPricingPattern as _getContractorPricingPattern,
} from './PricingLearningService';

/**
 * Agent for intelligent pricing recommendations.
 * Enhanced with Nested Learning multi-frequency memory system.
 *
 * Implements:
 * - Multi-frequency pricing memory (market/category/long-term patterns)
 * - Dynamic pricing updates with continuum memory
 * - Pricing pattern compression M: K → V
 */
export class PricingAgent {
  private static readonly AGENT_NAME = 'pricing';

  /**
   * Generate pricing recommendation for a job.
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
        return generateBudgetBasedRecommendation(job.budget || 0, job.category || '');
      }

      // Calculate material costs from JobAnalysisService
      const materialCosts = await this.calculateMaterialCosts(jobId, job.description || '');

      // Calculate factors
      const complexityFactor = await this.calculateComplexityFactor(
        jobId,
        job.description || '',
        materialCosts.estimatedMaterialCost
      );
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
        const score = calculateCompetitivenessScore(proposedPrice, marketAnalysis, recommendedOptimalPrice);
        competitivenessScore = score.score;
        competitivenessLevel = score.level;
      }

      // Calculate confidence
      const confidenceScore = calculateConfidence(marketAnalysis, job.category || '');

      // Generate reasoning
      const reasoning = generateReasoning(
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
          estimatedMaterialCost: materialCosts.estimatedMaterialCost,
          estimatedLaborCost: materialCosts.estimatedLaborCost,
          materialCostFactor: materialCosts.materialCostFactor,
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

      // Calculate cost breakdown
      const costBreakdown = materialCosts.estimatedMaterialCost > 0
        ? {
            materials: materialCosts.estimatedMaterialCost,
            labor: materialCosts.estimatedLaborCost,
            overhead: Math.round(recommendedOptimalPrice * 0.15),
            profit: Math.round(
              recommendedOptimalPrice -
                materialCosts.estimatedMaterialCost -
                materialCosts.estimatedLaborCost -
                recommendedOptimalPrice * 0.15
            ),
            total: recommendedOptimalPrice,
          }
        : undefined;

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
        costBreakdown,
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
   * Analyze market pricing for a category and location.
   */
  private static async analyzeMarket(
    category: string,
    location: string
  ): Promise<MarketAnalysis | null> {
    try {
      // Get accepted bids for similar jobs
      const { data: acceptedBids, error: acceptedError } = await serverSupabase
        .from('bids')
        .select(`amount, jobs!inner (id, category, location, budget)`)
        .eq('status', 'accepted')
        .eq('jobs.category', category)
        .order('created_at', { ascending: false })
        .limit(100);

      if (acceptedError || !acceptedBids || acceptedBids.length < 3) {
        // Not enough data - try without location filter
        const { data: categoryBids } = await serverSupabase
          .from('bids')
          .select(`amount, jobs!inner (id, category)`)
          .eq('status', 'accepted')
          .eq('jobs.category', category)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!categoryBids || categoryBids.length < 3) {
          return null;
        }

        return calculateMarketStatistics(categoryBids.map((b: BidWithAmount) => b.amount));
      }

      const amounts = acceptedBids.map((b: BidWithAmount) => b.amount).filter((a: number) => a && a > 0);

      if (amounts.length < 3) {
        return null;
      }

      return calculateMarketStatistics(amounts);
    } catch (error) {
      logger.error('Error querying market from database', error, {
        service: 'PricingAgent',
        category,
        location,
      });
      return null;
    }
  }

  /**
   * Calculate estimated material costs for a job from JobAnalysisService data.
   */
  private static async calculateMaterialCosts(jobId: string, jobDescription: string): Promise<{
    estimatedMaterialCost: number;
    estimatedLaborCost: number;
    materialCostFactor: number;
  }> {
    try {
      const { JobAnalysisService } = await import('../JobAnalysisService');
      const analysis = await JobAnalysisService.analyzeJobDescription('', jobDescription);

      const estimatedMaterialCost = analysis.estimatedMaterialCost || 0;
      const totalBudget = analysis.suggestedBudget.recommended;
      const estimatedLaborCost = estimatedMaterialCost > 0
        ? totalBudget - estimatedMaterialCost - (totalBudget * 0.15)
        : totalBudget * 0.5;

      let materialCostFactor = 1.0;
      if (estimatedMaterialCost > 2000) {
        materialCostFactor = 1.3;
      } else if (estimatedMaterialCost > 1000) {
        materialCostFactor = 1.2;
      } else if (estimatedMaterialCost > 500) {
        materialCostFactor = 1.1;
      }

      return {
        estimatedMaterialCost,
        estimatedLaborCost: Math.max(0, estimatedLaborCost),
        materialCostFactor,
      };
    } catch (error) {
      logger.error('Failed to calculate material costs', {
        service: 'PricingAgent',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { estimatedMaterialCost: 0, estimatedLaborCost: 0, materialCostFactor: 1.0 };
    }
  }

  /**
   * Calculate job complexity factor based on description and material cost.
   */
  private static async calculateComplexityFactor(
    _jobId: string,
    description: string,
    materialCost?: number
  ): Promise<number> {
    const descriptionLength = description.length;
    const wordCount = description.split(/\s+/).length;

    const complexKeywords = [
      'complex', 'multiple', 'extensive', 'renovation', 'remodel',
      'installation', 'system', 'electrical', 'plumbing',
    ];
    const keywordCount = complexKeywords.filter((kw) =>
      description.toLowerCase().includes(kw)
    ).length;

    let factor = 1.0;

    if (wordCount > 100 || descriptionLength > 500) {
      factor += 0.2;
    }

    if (keywordCount >= 3) {
      factor += 0.3;
    } else if (keywordCount >= 1) {
      factor += 0.1;
    }

    if (materialCost) {
      if (materialCost > 2000) {
        factor += 0.3;
      } else if (materialCost > 1000) {
        factor += 0.2;
      } else if (materialCost > 500) {
        factor += 0.1;
      }

      if (materialCost > 5000) {
        factor = Math.min(factor, 1.3);
      }
    }

    return Math.min(1.5, Math.max(0.8, factor));
  }

  /**
   * Calculate location factor using LocationPricingService.
   */
  private static async calculateLocationFactor(location: string): Promise<number> {
    try {
      const { LocationPricingService } = await import('../location/LocationPricingService');
      const locationFactor = await LocationPricingService.getLocationFactor(location);

      if (locationFactor < 0.8 || locationFactor > 1.5) {
        logger.warn('Location factor out of expected range, using default', {
          service: 'PricingAgent',
          location,
          factor: locationFactor,
        });
        return 1.0;
      }

      return locationFactor;
    } catch (error) {
      logger.error('Error calculating location factor, using default', error, {
        service: 'PricingAgent',
        location,
      });
      return 1.0;
    }
  }

  /**
   * Calculate contractor tier factor using PayoutTierService.
   */
  private static async calculateContractorTierFactor(contractorId: string): Promise<number> {
    try {
      const { PayoutTierService } = await import('@/lib/services/payment/PayoutTierService');
      const tier = await PayoutTierService.calculateTier(contractorId);
      const tierFactors: Record<string, number> = { elite: 1.2, trusted: 1.1, standard: 1.0 };
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
   * Calculate market demand factor based on recent job/bid ratio.
   */
  private static async calculateMarketDemandFactor(category: string, _location: string): Promise<number> {
    try {
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

      const demandRatio = (recentJobs || 0) / Math.max(1, acceptedBids || 1);

      if (demandRatio > 2) return 1.15;
      if (demandRatio > 1.5) return 1.08;
      if (demandRatio < 0.5) return 0.92;
      return 1.0;
    } catch (error) {
      logger.error('Error calculating market demand factor', error, {
        service: 'PricingAgent',
        category,
      });
      return 1.0;
    }
  }

  // ============================================================================
  // Learning API (delegated to PricingLearningService)
  // ============================================================================

  /** @see PricingLearningService.learnFromBidOutcome */
  static async learnFromBidOutcome(bidId: string, wasAccepted: boolean): Promise<AgentResult> {
    return _learnFromBidOutcome(bidId, wasAccepted);
  }

  /** @see PricingLearningService.getContractorPricingPattern */
  static async getContractorPricingPattern(contractorId: string): Promise<ContractorPricingPattern | null> {
    return _getContractorPricingPattern(contractorId);
  }
}
