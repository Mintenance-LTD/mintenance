import { logger } from '../utils/logger';

// Types previously in ./pricing/types - inlined since pricing/ was removed
export interface JobPricingInput {
  title: string;
  description: string;
  category: string;
  location: string;
  urgency?: 'low' | 'medium' | 'high';
  homeownerBudget?: number;
}

export interface PricingFactor {
  name: string;
  impact: number;
  description: string;
}

export interface MarketData {
  averagePrice: number;
  demandLevel: 'low' | 'medium' | 'high';
  competitorCount: number;
}

export interface SuggestedPrice {
  min: number;
  max: number;
  optimal: number;
}

export interface PricingAnalysis {
  suggestedPrice: SuggestedPrice;
  confidence: number;
  factors: PricingFactor[];
  marketData: MarketData;
  recommendations: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'specialist';
}

// Base rates per category (GBP)
const BASE_RATES: Record<string, number> = {
  plumbing: 180,
  electrical: 200,
  painting: 150,
  carpentry: 160,
  cleaning: 80,
  gardening: 120,
  handyman: 140,
  roofing: 220,
  heating: 240,
  flooring: 200,
  'general-maintenance': 140,
  locksmith: 160,
  pest_control: 120,
  tiling: 180,
  plastering: 170,
  guttering: 130,
  fencing: 190,
  drainage: 210,
  insulation: 200,
  windows: 250,
};

const URGENCY_MULTIPLIER: Record<string, number> = {
  low: 0.9,
  medium: 1.0,
  high: 1.3,
};

export class AIPricingEngine {
  async analyzePricing(input: JobPricingInput): Promise<PricingAnalysis> {
    try {
      logger.info('Starting pricing analysis', { jobTitle: input.title });

      const baseRate = BASE_RATES[input.category] || 140;
      const urgencyMult = URGENCY_MULTIPLIER[input.urgency || 'medium'] || 1.0;

      // Estimate complexity from description length and keywords
      const complexity = this.estimateComplexity(input);

      const complexityMult =
        complexity === 'specialist' ? 1.5 :
        complexity === 'complex' ? 1.3 :
        complexity === 'moderate' ? 1.1 : 1.0;

      const optimal = Math.round(baseRate * urgencyMult * complexityMult);
      const min = Math.round(optimal * 0.75);
      const max = Math.round(optimal * 1.35);

      const factors = this.generateFactors(input, urgencyMult, complexityMult);
      const marketData = this.estimateMarketData(input, baseRate);
      const recommendations = this.generateRecommendations(input, optimal);

      const analysis: PricingAnalysis = {
        suggestedPrice: { min, max, optimal },
        confidence: 0.7,
        factors,
        marketData,
        recommendations,
        complexity,
      };

      logger.info('Pricing analysis completed', {
        optimal,
        confidence: analysis.confidence,
        complexity,
      });

      return analysis;
    } catch (error) {
      logger.error('Pricing analysis failed, using fallback', error);
      return this.getFallbackPricing(input);
    }
  }

  private estimateComplexity(input: JobPricingInput): PricingAnalysis['complexity'] {
    const desc = (input.description + ' ' + input.title).toLowerCase();
    const specialistKeywords = ['rewire', 'boiler', 'structural', 'asbestos', 'gas', 'extension', 'loft conversion'];
    const complexKeywords = ['renovation', 'bathroom', 'kitchen', 'refurbish', 'replace', 'install'];
    const moderateKeywords = ['repair', 'fix', 'leak', 'broken', 'update', 'upgrade'];

    if (specialistKeywords.some(k => desc.includes(k))) return 'specialist';
    if (complexKeywords.some(k => desc.includes(k))) return 'complex';
    if (moderateKeywords.some(k => desc.includes(k))) return 'moderate';
    return 'simple';
  }

  private generateFactors(
    input: JobPricingInput,
    urgencyMult: number,
    complexityMult: number
  ): PricingFactor[] {
    const factors: PricingFactor[] = [];

    if (urgencyMult > 1.0) {
      factors.push({
        name: 'High Urgency',
        impact: (urgencyMult - 1) * 100,
        description: 'Urgent jobs attract premium rates due to schedule disruption',
      });
    } else if (urgencyMult < 1.0) {
      factors.push({
        name: 'Flexible Timeline',
        impact: (urgencyMult - 1) * 100,
        description: 'Non-urgent jobs may receive competitive bids from available contractors',
      });
    }

    if (complexityMult > 1.0) {
      factors.push({
        name: 'Job Complexity',
        impact: (complexityMult - 1) * 100,
        description: 'Complex work requires specialist skills and more time',
      });
    }

    factors.push({
      name: 'Category Rate',
      impact: 0,
      description: `Based on average ${input.category} rates in your area`,
    });

    return factors;
  }

  private estimateMarketData(input: JobPricingInput, baseRate: number): MarketData {
    return {
      averagePrice: baseRate,
      demandLevel: input.urgency === 'high' ? 'high' : input.urgency === 'low' ? 'low' : 'medium',
      competitorCount: Math.floor(Math.random() * 10) + 5,
    };
  }

  private generateRecommendations(input: JobPricingInput, optimal: number): string[] {
    const recommendations: string[] = [];

    recommendations.push('Include detailed photos to attract better bids');

    if (input.homeownerBudget && input.homeownerBudget < optimal * 0.8) {
      recommendations.push('Your budget is below the market average - consider increasing for quality work');
    }

    if (input.urgency === 'high') {
      recommendations.push('Urgent jobs benefit from a slightly higher budget to attract immediate availability');
    }

    recommendations.push('Request quotes from multiple contractors to compare');

    return recommendations;
  }

  private getFallbackPricing(input: JobPricingInput): PricingAnalysis {
    const baseRate = BASE_RATES[input.category] || 140;
    return {
      suggestedPrice: {
        min: Math.round(baseRate * 0.75),
        max: Math.round(baseRate * 1.35),
        optimal: baseRate,
      },
      confidence: 0.5,
      factors: [{ name: 'Category Base Rate', impact: 0, description: 'Estimated from category averages' }],
      marketData: { averagePrice: baseRate, demandLevel: 'medium', competitorCount: 8 },
      recommendations: ['Add more details for a more accurate estimate'],
      complexity: 'moderate',
    };
  }
}

// Singleton instance
export const aiPricingEngine = new AIPricingEngine();

export default AIPricingEngine;
