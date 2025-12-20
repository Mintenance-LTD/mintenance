import { MLEngine } from '../ml-engine';
import type { JobPricingInput, PricingFactor, MarketContext, JobComplexityMetrics } from './types';

export class PricingCalculationService {
  /**
   * Combine ML predictions with market data for enhanced accuracy
   */
  combineMLWithMarketData(
    mlResult: any,
    marketData: MarketContext,
    input: JobPricingInput
  ) {
    // Extract pricing from ML market analysis
    const mlPrice = mlResult.marketAnalysis.averageRate || marketData.averagePrice;
    const marketAverage = marketData.averagePrice;

    // Weight ML prediction (70%) with market average (30%)
    const optimal = Math.round(mlPrice * 0.7 + marketAverage * 0.3);

    return {
      min: Math.round(optimal * 0.8),
      max: Math.round(optimal * 1.3),
      optimal,
    };
  }

  /**
   * Generate enhanced pricing factors using ML insights
   */
  generateEnhancedPricingFactors(
    input: JobPricingInput,
    complexity: JobComplexityMetrics,
    marketData: MarketContext,
    mlResult: any
  ): PricingFactor[] {
    const factors: PricingFactor[] = [
      {
        name: 'Market Analysis (ML)',
        impact: (mlResult.marketAnalysis.averageRate - marketData.averagePrice) / marketData.averagePrice,
        description: `ML market analysis: £${mlResult.marketAnalysis.averageRate}`,
        weight: 0.3,
      },
      {
        name: 'Budget Assessment',
        impact: mlResult.budgetAssessment ? (mlResult.budgetAssessment.adjustment - 1) * 0.5 : 0,
        description: mlResult.budgetAssessment ? mlResult.budgetAssessment.explanation : 'No budget assessment available',
        weight: 0.2,
      },
      {
        name: 'Skill Requirements',
        impact: (complexity.skillRequirements.length - 2) * 0.1,
        description: `${complexity.skillRequirements.length} specialized skills required`,
        weight: 0.15,
      },
      {
        name: 'Risk Assessment',
        impact: complexity.riskLevel * 0.3,
        description: `Risk level: ${(complexity.riskLevel * 100).toFixed(0)}%`,
        weight: 0.15,
      },
      {
        name: 'Time Complexity',
        impact: (complexity.timeEstimate - 4) / 20, // Normalize around 4 hours
        description: `Estimated ${complexity.timeEstimate} hours`,
        weight: 0.1,
      },
      {
        name: 'Material Complexity',
        impact: (complexity.materialComplexity - 0.5) * 0.4,
        description: `Material complexity: ${(complexity.materialComplexity * 100).toFixed(0)}%`,
        weight: 0.1,
      },
    ];

    return factors;
  }

  /**
   * Get fallback pricing when ML fails
   */
  getFallbackPricing(input: JobPricingInput): any {
    // Base pricing logic for fallback
    const baseRates: Record<string, number> = {
      plumbing: 45,
      electrical: 50,
      painting: 25,
      carpentry: 40,
      cleaning: 20,
      gardening: 30,
      handyman: 35,
      roofing: 55,
      heating: 60,
      flooring: 38,
    };

    const baseRate = baseRates[input.category] || 40;
    const timeEstimate = this.estimateTimeRequirement(input);
    const optimal = Math.round(baseRate * timeEstimate);

    return {
      suggestedPrice: {
        min: Math.round(optimal * 0.8),
        max: Math.round(optimal * 1.3),
        optimal,
      },
      confidence: 0.6, // Lower confidence for fallback
      factors: this.getFallbackFactors(input),
      marketData: this.getFallbackMarketData(input),
      recommendations: this.getFallbackRecommendations(input),
      complexity: this.getFallbackComplexity(input),
    };
  }

  /**
   * Estimate time requirement for fallback pricing
   */
  private estimateTimeRequirement(input: JobPricingInput): number {
    if (input.estimatedDuration) {
      return input.estimatedDuration;
    }

    const baseTimeMap: Record<string, number> = {
      cleaning: 2,
      painting: 8,
      plumbing: 4,
      electrical: 3,
      carpentry: 6,
      gardening: 4,
      handyman: 3,
      roofing: 12,
      heating: 6,
      flooring: 10,
    };

    return baseTimeMap[input.category] || 4;
  }

  /**
   * Get fallback pricing factors
   */
  private getFallbackFactors(input: JobPricingInput): PricingFactor[] {
    return [
      {
        name: 'Base Rate',
        impact: 0.5,
        description: `Standard ${input.category} hourly rate`,
        weight: 0.4,
      },
      {
        name: 'Time Estimate',
        impact: 0.3,
        description: `Estimated ${this.estimateTimeRequirement(input)} hours`,
        weight: 0.3,
      },
      {
        name: 'Category Complexity',
        impact: 0.2,
        description: `${input.category} job complexity`,
        weight: 0.3,
      },
    ];
  }

  /**
   * Get fallback market data
   */
  private getFallbackMarketData(input: JobPricingInput): MarketContext {
    const baseRate = this.getBaseRate(input.category);
    return {
      averagePrice: baseRate,
      priceRange: [Math.round(baseRate * 0.7), Math.round(baseRate * 1.5)],
      demandLevel: 'medium',
      seasonalFactor: 1.0,
      locationMultiplier: 1.0,
      contractorAvailability: 0.8,
    };
  }

  /**
   * Get fallback recommendations
   */
  private getFallbackRecommendations(input: JobPricingInput): string[] {
    return [
      'Consider getting multiple quotes for better pricing accuracy',
      'Provide more detailed job description for improved estimates',
      'Check local market rates for similar jobs',
    ];
  }

  /**
   * Get fallback complexity assessment
   */
  private getFallbackComplexity(input: JobPricingInput): 'simple' | 'moderate' | 'complex' | 'specialist' {
    const complexCategories = ['electrical', 'heating', 'roofing'];
    const specialistCategories = ['structural', 'gas'];
    
    if (specialistCategories.some(cat => input.category.includes(cat))) {
      return 'specialist';
    }
    if (complexCategories.includes(input.category)) {
      return 'complex';
    }
    if (input.description.length > 100) {
      return 'moderate';
    }
    return 'simple';
  }

  /**
   * Get base rate for category
   */
  private getBaseRate(category: string): number {
    const baseRates: Record<string, number> = {
      plumbing: 45,
      electrical: 50,
      painting: 25,
      carpentry: 40,
      cleaning: 20,
      gardening: 30,
      handyman: 35,
      roofing: 55,
      heating: 60,
      flooring: 38,
    };
    
    return baseRates[category] || 40;
  }
}
