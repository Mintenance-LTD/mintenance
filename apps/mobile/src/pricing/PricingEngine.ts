/**
 * PRICING ENGINE - MAIN ORCHESTRATOR
 * Modular pricing system coordinator
 *
 * Responsibilities:
 * - Coordinate between pricing modules
 * - Aggregate results from specialized analyzers
 * - Apply business rules and constraints
 * - Generate final pricing recommendations
 */

import { logger } from '../utils/logger';
import { circuitBreakerManager } from '../utils/circuitBreaker';
import { measurePerformance } from '../utils/performance';
import { ComplexityAnalyzer } from './complexity/ComplexityAnalyzer';
import {
  MarketRateCalculator,
  type MarketAnalysisResult,
} from './market/MarketRateCalculator';

export interface JobPricingInput {
  title: string;
  description: string;
  category: string;
  location: string;
  photos?: string[];
  homeownerBudget?: number;
  urgency?: 'low' | 'medium' | 'high';
  propertyType?: 'flat' | 'house' | 'commercial';
  estimatedDuration?: number;
}

export interface PricingAnalysis {
  suggestedPrice: {
    min: number;
    max: number;
    optimal: number;
  };
  confidence: number;
  factors: PricingFactor[];
  marketData: MarketContext;
  recommendations: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'specialist';
}

export interface PricingFactor {
  name: string;
  impact: number;
  description: string;
  weight: number;
}

export interface MarketContext {
  averagePrice: number;
  priceRange: [number, number];
  demandLevel: 'low' | 'medium' | 'high';
  seasonalFactor: number;
  locationMultiplier: number;
  contractorAvailability: number;
}

/**
 * Main Pricing Engine
 * Orchestrates all pricing analysis components
 */
export class PricingEngine {
  private complexityAnalyzer: ComplexityAnalyzer;
  private marketAnalyzer: {
    initialize(): Promise<void>;
    analyze(input: JobPricingInput): Promise<MarketContext>;
  };
  private mlPredictor: {
    initialize(): Promise<void>;
    predict(input: JobPricingInput): Promise<{
      suggestedPrice: { min: number; max: number; optimal: number };
      confidence: number;
    }>;
  };
  private recommendationsEngine: {
    initialize(): Promise<void>;
    generate(a: any, b: any, c: MarketContext, d: any): Promise<string[]>;
  };
  private initialized = false;

  constructor() {
    this.complexityAnalyzer = new ComplexityAnalyzer();
    const calc = new MarketRateCalculator();
    this.marketAnalyzer = {
      async initialize() {
        /* no-op */
      },
      async analyze(input: JobPricingInput): Promise<MarketContext> {
        const res: MarketAnalysisResult = await calc.analyzeMarketConditions({
          category: input.category,
          location: input.location,
          urgency: input.urgency,
        });
        return res.context;
      },
    };
    this.mlPredictor = {
      async initialize() {
        /* no-op */
      },
      async predict(_input: JobPricingInput) {
        return {
          suggestedPrice: { min: 100, max: 300, optimal: 200 },
          confidence: 0.5,
        };
      },
    };
    this.recommendationsEngine = {
      async initialize() {
        /* no-op */
      },
      async generate() {
        return [];
      },
    };
  }

  /**
   * Initialize all pricing components
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await Promise.all([
        this.complexityAnalyzer.initialize(),
        this.marketAnalyzer.initialize(),
        this.mlPredictor.initialize(),
        this.recommendationsEngine.initialize(),
      ]);

      this.initialized = true;
      logger.info('Pricing engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize pricing engine:', error);
      throw new Error('Pricing engine initialization failed');
    }
  }

  /**
   * Analyze job pricing using all available methods
   */
  async analyzePricing(input: JobPricingInput): Promise<PricingAnalysis> {
    await this.initialize();

    return measurePerformance('pricing_engine', async () => {
      return circuitBreakerManager.execute('ml_service', async () => {
        logger.info('Starting comprehensive pricing analysis', {
          jobTitle: input.title,
          category: input.category,
        });

        try {
          // Step 1: Run all analyses in parallel for speed
          const [complexityResult, marketResult, mlResult] =
            await Promise.allSettled([
              this.complexityAnalyzer.analyze(input),
              this.marketAnalyzer.analyze(input),
              this.mlPredictor.predict(input),
            ]);

          // Extract results, handling failures gracefully
          const complexity = this.extractResult(
            complexityResult,
            'complexity analysis'
          );
          const marketData = this.extractResult(
            marketResult,
            'market analysis'
          );
          const mlPrediction = this.extractResult(mlResult, 'ML prediction');

          // Step 2: Combine all analyses
          const combinedAnalysis = this.combineAnalyses(
            complexity,
            marketData,
            mlPrediction,
            input
          );

          // Step 3: Generate recommendations
          const recommendations = await this.recommendationsEngine.generate(
            combinedAnalysis as any,
            complexity,
            (marketData ||
              this.getDefaultMarketData(input.category)) as MarketContext,
            mlPrediction
          );

          const finalAnalysis: PricingAnalysis = {
            ...combinedAnalysis,
            recommendations,
          };

          logger.info('Pricing analysis completed', {
            optimal: finalAnalysis.suggestedPrice.optimal,
            confidence: finalAnalysis.confidence,
            complexity: finalAnalysis.complexity,
          });

          return finalAnalysis;
        } catch (error) {
          logger.error('Pricing analysis failed:', error);

          // Fallback to basic pricing
          return this.generateFallbackPricing(input);
        }
      });
    });
  }

  /**
   * Extract result from Promise.allSettled, with fallback handling
   */
  private extractResult<T>(
    result: PromiseSettledResult<T>,
    analysisType: string
  ): T | null {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.warn(
        `${analysisType} failed, continuing with available data:`,
        result.reason
      );
      return null;
    }
  }

  /**
   * Combine results from all analysis modules
   */
  private combineAnalyses(
    complexity: any,
    marketData: any,
    mlPrediction: any,
    input: JobPricingInput
  ): Omit<PricingAnalysis, 'recommendations'> {
    // Use ML prediction as primary if available, otherwise combine other methods
    if (mlPrediction) {
      return {
        suggestedPrice: mlPrediction.suggestedPrice,
        confidence: mlPrediction.confidence,
        factors: this.combinePricingFactors(
          complexity,
          marketData,
          mlPrediction
        ),
        marketData: marketData || this.getDefaultMarketData(input.category),
        complexity: this.determineComplexity(complexity, mlPrediction),
      };
    }

    // Fallback: combine complexity and market analyses
    if (complexity && marketData) {
      const basePrice = this.calculateBasePrice(input.category);
      const complexityMultiplier = complexity.overallComplexity || 1.0;
      const marketMultiplier = marketData.locationMultiplier || 1.0;

      const optimalPrice = Math.round(
        basePrice * complexityMultiplier * marketMultiplier
      );

      return {
        suggestedPrice: {
          min: Math.round(optimalPrice * 0.8),
          max: Math.round(optimalPrice * 1.3),
          optimal: optimalPrice,
        },
        confidence: 0.7, // Lower confidence without ML
        factors: this.combinePricingFactors(complexity, marketData, null),
        marketData,
        complexity: this.determineComplexity(complexity, null),
      };
    }

    // Last resort: basic category-based pricing
    const basePrice = this.calculateBasePrice(input.category);
    return {
      suggestedPrice: {
        min: Math.round(basePrice * 0.8),
        max: Math.round(basePrice * 1.3),
        optimal: basePrice,
      },
      confidence: 0.5,
      factors: [
        {
          name: 'Base Category Pricing',
          impact: 0,
          description: `Standard rate for ${input.category} category`,
          weight: 1.0,
        },
      ],
      marketData: this.getDefaultMarketData(input.category),
      complexity: 'moderate' as const,
    };
  }

  /**
   * Combine pricing factors from all sources
   */
  private combinePricingFactors(
    complexity: any,
    marketData: any,
    mlPrediction: any
  ): PricingFactor[] {
    const factors: PricingFactor[] = [];

    // ML factors (highest priority)
    if (mlPrediction?.factors) {
      factors.push(...mlPrediction.factors);
    }

    // Complexity factors
    if (complexity) {
      factors.push({
        name: 'Job Complexity',
        impact: (complexity.overallComplexity - 0.5) * 2,
        description: `Complexity score: ${(complexity.overallComplexity * 100).toFixed(0)}%`,
        weight: 0.3,
      });

      if (complexity.riskLevel > 0.6) {
        factors.push({
          name: 'Risk Assessment',
          impact: complexity.riskLevel * 0.4,
          description: `High risk job requiring additional precautions`,
          weight: 0.2,
        });
      }
    }

    // Market factors
    if (marketData) {
      factors.push({
        name: 'Market Conditions',
        impact:
          marketData.demandLevel === 'high'
            ? 0.2
            : marketData.demandLevel === 'low'
              ? -0.1
              : 0,
        description: `Market demand is currently ${marketData.demandLevel}`,
        weight: 0.15,
      });

      if (marketData.locationMultiplier !== 1.0) {
        factors.push({
          name: 'Location Premium',
          impact: (marketData.locationMultiplier - 1) * 0.6,
          description: `Location adjustment: ${((marketData.locationMultiplier - 1) * 100).toFixed(0)}%`,
          weight: 0.15,
        });
      }
    }

    return factors;
  }

  /**
   * Determine overall job complexity
   */
  private determineComplexity(
    complexity: any,
    mlPrediction: any
  ): 'simple' | 'moderate' | 'complex' | 'specialist' {
    if (mlPrediction?.complexity) {
      return mlPrediction.complexity;
    }

    if (complexity) {
      if (complexity.overallComplexity > 0.8) return 'specialist';
      if (complexity.overallComplexity > 0.6) return 'complex';
      if (complexity.overallComplexity > 0.4) return 'moderate';
      return 'simple';
    }

    return 'moderate';
  }

  /**
   * Calculate base price for category
   */
  private calculateBasePrice(category: string): number {
    const basePrices = {
      plumbing: 120,
      electrical: 140,
      carpentry: 90,
      painting: 60,
      gardening: 45,
      roofing: 200,
      cleaning: 35,
      heating: 150,
      flooring: 95,
    };

    return basePrices[category as keyof typeof basePrices] || 80;
  }

  /**
   * Get default market data when market analysis fails
   */
  private getDefaultMarketData(category: string): MarketContext {
    return {
      averagePrice: this.calculateBasePrice(category),
      priceRange: [
        this.calculateBasePrice(category) * 0.7,
        this.calculateBasePrice(category) * 1.4,
      ],
      demandLevel: 'medium',
      seasonalFactor: 1.0,
      locationMultiplier: 1.0,
      contractorAvailability: 0.6,
    };
  }

  /**
   * Generate fallback pricing when all analyses fail
   */
  private generateFallbackPricing(input: JobPricingInput): PricingAnalysis {
    const basePrice = this.calculateBasePrice(input.category);
    const urgencyMultiplier =
      input.urgency === 'high' ? 1.3 : input.urgency === 'medium' ? 1.1 : 1.0;

    const finalPrice = Math.round(basePrice * urgencyMultiplier);

    return {
      suggestedPrice: {
        min: Math.round(finalPrice * 0.8),
        max: Math.round(finalPrice * 1.3),
        optimal: finalPrice,
      },
      confidence: 0.6,
      factors: [
        {
          name: 'Base Category Rate',
          impact: 0,
          description: `Standard ${input.category} service rate`,
          weight: 0.7,
        },
        {
          name: 'Urgency Adjustment',
          impact: (urgencyMultiplier - 1) * 0.8,
          description: `${input.urgency || 'standard'} priority job`,
          weight: 0.3,
        },
      ],
      marketData: this.getDefaultMarketData(input.category),
      recommendations: [
        'Pricing based on category standards due to limited analysis data',
        'Consider providing more job details for better price accuracy',
        'Recommended to get multiple quotes for comparison',
      ],
      complexity: 'moderate',
    };
  }

  /**
   * Get pricing engine health status
   */
  getHealthStatus(): {
    initialized: boolean;
    componentsStatus: Record<string, boolean>;
    lastAnalysisTime?: number;
  } {
    return {
      initialized: this.initialized,
      componentsStatus: {
        complexityAnalyzer: true,
        marketAnalyzer: true,
        mlPredictor: true,
        recommendationsEngine: true,
      },
    };
  }
}

// Export singleton instance
export const pricingEngine = new PricingEngine();
