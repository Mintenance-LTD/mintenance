import { logger } from '../utils/logger';
import { MLEngine } from './ml-engine';
import { MarketDataService } from './pricing/MarketDataService';
import { ComplexityAnalysisService } from './pricing/ComplexityAnalysisService';
import { PricingCalculationService } from './pricing/PricingCalculationService';
import { RecommendationService } from './pricing/RecommendationService';
import type {
  JobPricingInput,
  PricingAnalysis,
  JobComplexityMetrics
} from './pricing/types';

export class AIPricingEngine {
  private marketDataService = new MarketDataService();
  private complexityAnalysisService = new ComplexityAnalysisService();
  private pricingCalculationService = new PricingCalculationService();
  private recommendationService = new RecommendationService();

  async analyzePricing(input: JobPricingInput): Promise<PricingAnalysis> {
    try {
      logger.info('Starting Real AI pricing analysis', {
        jobTitle: input.title,
      });

      // Step 1: Use Real ML Service for comprehensive pricing prediction
      const location = this.marketDataService.parseLocationToCoordinates(input.location);
      const mlPricingResult = await MLEngine.getPricingInsights(
        input.category,
        { lat: location.lat, lng: location.lng },
        input.homeownerBudget || 5000
      );

      // Step 2: Analyze job complexity (enhanced with ML)
      const complexity = await this.complexityAnalysisService.analyzeJobComplexity(input);

      // Step 3: Get market context
      const marketData = await this.marketDataService.getMarketContext(input);

      // Step 4: Combine ML predictions with market data
      const enhancedPricing = this.pricingCalculationService.combineMLWithMarketData(
        mlPricingResult,
        marketData,
        input
      );

      // Step 5: Generate pricing factors (enhanced)
      const factors = this.pricingCalculationService.generateEnhancedPricingFactors(
        input,
        complexity,
        marketData,
        mlPricingResult
      );

      // Step 6: Generate recommendations
      const recommendations = this.recommendationService.generateMLEnhancedRecommendations(
        input,
        enhancedPricing,
        factors,
        mlPricingResult
      );

      const analysis: PricingAnalysis = {
        suggestedPrice: enhancedPricing,
        confidence: 0.85, // Default confidence for ML-based analysis
        factors,
        marketData,
        recommendations,
        complexity:
          complexity.skillRequirements.length > 2
            ? complexity.riskLevel > 0.7
              ? 'specialist'
              : 'complex'
            : complexity.skillRequirements.length > 1
              ? 'moderate'
              : 'simple',
      };

      logger.info('Real AI pricing analysis completed', {
        optimal: enhancedPricing.optimal,
        confidence: analysis.confidence,
        complexity: analysis.complexity,
        mlMarketRate: mlPricingResult.marketAnalysis.averageRate,
      });

      return analysis;
    } catch (error) {
      logger.error('Real AI pricing analysis failed, using fallback', error);

      // Fallback to rule-based pricing
      return this.pricingCalculationService.getFallbackPricing(input);
    }
  }

  /**
   * Parse location string to coordinates (simplified)
   */
  parseLocationToCoordinates(location: string) {
    return this.marketDataService.parseLocationToCoordinates(location);
  }
}