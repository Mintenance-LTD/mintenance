/**
 * MARKET RATE CALCULATOR
 * Specialized module for calculating market-based pricing adjustments
 * 
 * Extracted from AIPricingEngine.ts for better modularity
 * Handles location-based pricing, seasonal factors, and demand analysis
 */

import { logger } from '../../utils/logger';

export interface MarketContext {
  averagePrice: number;
  priceRange: [number, number];
  demandLevel: 'low' | 'medium' | 'high';
  seasonalFactor: number;
  locationMultiplier: number;
  contractorAvailability: number; // 0-1
}

export interface MarketPricingInput {
  category: string;
  location: string;
  urgency?: 'low' | 'medium' | 'high';
}

export interface MarketAnalysisResult {
  context: MarketContext;
  adjustmentFactor: number;
  regionalInsights: string[];
}

export class MarketRateCalculator {
  private locationMultipliers: Map<string, number> = new Map([
    ['central_london', 1.8],
    ['inner_london', 1.5],
    ['outer_london', 1.2],
    ['manchester', 0.9],
    ['birmingham', 0.85],
    ['leeds', 0.8],
    ['glasgow', 0.75],
    ['liverpool', 0.8],
    ['bristol', 0.9],
    ['edinburgh', 0.85],
    ['default', 0.7]
  ]);

  private baseRates: Map<string, number> = new Map([
    ['plumbing', 45],
    ['electrical', 50],
    ['heating', 48],
    ['roofing', 40],
    ['painting', 25],
    ['tiling', 35],
    ['carpentry', 42],
    ['flooring', 38],
    ['gardening', 20],
    ['cleaning', 18],
    ['handyman', 30],
    ['kitchen', 55],
    ['bathroom', 50],
    ['general', 35]
  ]);

  private seasonalFactors: Map<number, number> = new Map([
    [0, 0.9],  // January
    [1, 0.85], // February
    [2, 1.0],  // March
    [3, 1.1],  // April
    [4, 1.2],  // May
    [5, 1.15], // June
    [6, 1.05], // July
    [7, 1.0],  // August
    [8, 1.1],  // September
    [9, 1.15], // October
    [10, 1.05], // November
    [11, 0.95]  // December
  ]);

  /**
   * Analyze market conditions for a job
   */
  public async analyzeMarketConditions(input: MarketPricingInput): Promise<MarketAnalysisResult> {
    try {
      logger.info('Analyzing market conditions', {
        category: input.category,
        location: input.location
      });

      const context = await this.getMarketContext(input);
      const adjustmentFactor = this.calculateMarketAdjustmentFactor(context, input);
      const regionalInsights = this.generateRegionalInsights(context, input);

      return {
        context,
        adjustmentFactor,
        regionalInsights
      };

    } catch (error) {
      logger.error('Market analysis failed', error);
      
      // Return safe defaults
      return {
        context: this.getDefaultMarketContext(),
        adjustmentFactor: 1.0,
        regionalInsights: ['Using default market conditions due to analysis error']
      };
    }
  }

  /**
   * Get comprehensive market context for a job
   */
  private async getMarketContext(input: MarketPricingInput): Promise<MarketContext> {
    // In a real implementation, this would query historical pricing data,
    // current contractor availability, and real-time demand metrics
    
    const baseRate = this.baseRates.get(input.category) || 35;
    const locationKey = this.getLocationKey(input.location);
    const locationMultiplier = this.locationMultipliers.get(locationKey) || 1.0;
    const seasonalFactor = this.seasonalFactors.get(new Date().getMonth()) || 1.0;

    // Simulate realistic market conditions
    const averagePrice = baseRate * locationMultiplier;
    const priceVariation = averagePrice * 0.3; // 30% variation range

    const context: MarketContext = {
      averagePrice,
      priceRange: [
        Math.round(averagePrice - priceVariation),
        Math.round(averagePrice + priceVariation)
      ],
      demandLevel: this.getDemandLevel(input.category),
      seasonalFactor,
      locationMultiplier,
      contractorAvailability: this.calculateContractorAvailability(input.category, locationKey)
    };

    logger.debug('Market context calculated', {
      baseRate,
      locationKey,
      locationMultiplier,
      seasonalFactor,
      context
    });

    return context;
  }

  /**
   * Calculate overall market adjustment factor
   */
  private calculateMarketAdjustmentFactor(context: MarketContext, input: MarketPricingInput): number {
    let factor = 1.0;

    // Location adjustment
    factor *= context.locationMultiplier;

    // Seasonal adjustment
    factor *= context.seasonalFactor;

    // Demand adjustment
    const demandMultiplier = this.getDemandMultiplier(context.demandLevel);
    factor *= demandMultiplier;

    // Contractor availability adjustment
    const availabilityMultiplier = this.getAvailabilityMultiplier(context.contractorAvailability);
    factor *= availabilityMultiplier;

    // Urgency adjustment
    if (input.urgency === 'high') {
      factor *= 1.25; // 25% premium for urgent jobs
    }

    return Math.round(factor * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate insights about regional market conditions
   */
  private generateRegionalInsights(context: MarketContext, input: MarketPricingInput): string[] {
    const insights: string[] = [];

    // Location insights
    if (context.locationMultiplier > 1.3) {
      insights.push(`${input.location} is a premium market area with rates 30%+ above national average`);
    } else if (context.locationMultiplier < 0.8) {
      insights.push(`${input.location} has competitive rates below the national average`);
    }

    // Demand insights
    if (context.demandLevel === 'high') {
      insights.push(`High demand for ${input.category} services in this area`);
    } else if (context.demandLevel === 'low') {
      insights.push(`Lower competition for ${input.category} services - good opportunity`);
    }

    // Seasonal insights
    const month = new Date().getMonth();
    if (month >= 3 && month <= 5) { // Spring
      insights.push('Spring season typically sees increased demand for home maintenance');
    } else if (month >= 9 && month <= 10) { // Autumn
      insights.push('Autumn preparation work often commands premium pricing');
    } else if (month === 0 || month === 1) { // Winter
      insights.push('Winter months typically see reduced activity and competitive pricing');
    }

    // Availability insights
    if (context.contractorAvailability < 0.4) {
      insights.push('Limited contractor availability may drive prices higher');
    } else if (context.contractorAvailability > 0.8) {
      insights.push('Good contractor availability should keep prices competitive');
    }

    return insights;
  }

  /**
   * Parse location to determine pricing region
   */
  private getLocationKey(location: string): string {
    const locationLower = location.toLowerCase();
    
    // London zones
    if (locationLower.includes('central london') || locationLower.includes('zone 1')) {
      return 'central_london';
    }
    if (locationLower.includes('inner london') || locationLower.includes('zone 2')) {
      return 'inner_london';
    }
    if (locationLower.includes('london')) {
      return 'outer_london';
    }
    
    // Major UK cities
    const cities = [
      'manchester', 'birmingham', 'leeds', 'glasgow', 
      'liverpool', 'bristol', 'edinburgh'
    ];
    const matchedCity = cities.find(city => locationLower.includes(city));
    
    return matchedCity || 'default';
  }

  /**
   * Determine demand level for a service category
   */
  private getDemandLevel(category: string): 'low' | 'medium' | 'high' {
    const highDemandCategories = ['plumbing', 'electrical', 'heating', 'roofing'];
    const lowDemandCategories = ['painting', 'gardening', 'cleaning'];
    
    if (highDemandCategories.includes(category)) return 'high';
    if (lowDemandCategories.includes(category)) return 'low';
    return 'medium';
  }

  /**
   * Get demand-based price multiplier
   */
  private getDemandMultiplier(demandLevel: 'low' | 'medium' | 'high'): number {
    switch (demandLevel) {
      case 'high': return 1.15;  // 15% premium
      case 'low': return 0.9;    // 10% discount
      default: return 1.0;       // No adjustment
    }
  }

  /**
   * Calculate contractor availability in the area
   */
  private calculateContractorAvailability(category: string, locationKey: string): number {
    // Simulate availability based on category and location
    let baseAvailability = 0.7; // 70% base availability

    // High-demand categories have lower availability
    if (['plumbing', 'electrical', 'heating'].includes(category)) {
      baseAvailability -= 0.2;
    }

    // London areas have lower availability due to high demand
    if (locationKey.includes('london')) {
      baseAvailability -= 0.1;
    }

    // Add some realistic variation
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    
    return Math.max(0.2, Math.min(1.0, baseAvailability + variation));
  }

  /**
   * Get availability-based price multiplier
   */
  private getAvailabilityMultiplier(availability: number): number {
    if (availability < 0.4) {
      return 1.2; // 20% premium for low availability
    } else if (availability > 0.8) {
      return 0.95; // 5% discount for high availability
    }
    return 1.0; // No adjustment
  }

  /**
   * Get default market context for error cases
   */
  private getDefaultMarketContext(): MarketContext {
    return {
      averagePrice: 35,
      priceRange: [25, 45],
      demandLevel: 'medium',
      seasonalFactor: 1.0,
      locationMultiplier: 1.0,
      contractorAvailability: 0.7
    };
  }

  /**
   * Apply market adjustments to a base price
   */
  public applyMarketAdjustments(
    basePrice: number, 
    marketContext: MarketContext, 
    input: MarketPricingInput
  ): number {
    let adjustedPrice = basePrice;

    // Apply location multiplier
    adjustedPrice *= marketContext.locationMultiplier;

    // Apply seasonal factor
    adjustedPrice *= marketContext.seasonalFactor;

    // Apply demand adjustment
    adjustedPrice *= this.getDemandMultiplier(marketContext.demandLevel);

    // Apply availability adjustment
    adjustedPrice *= this.getAvailabilityMultiplier(marketContext.contractorAvailability);

    // Apply urgency premium
    if (input.urgency === 'high') {
      adjustedPrice *= 1.25;
    }

    logger.debug('Market adjustments applied', {
      basePrice,
      adjustedPrice,
      locationMultiplier: marketContext.locationMultiplier,
      seasonalFactor: marketContext.seasonalFactor,
      demandLevel: marketContext.demandLevel,
      urgency: input.urgency
    });

    return Math.round(adjustedPrice * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get market rate information for a specific service category and location
   */
  public async getMarketRateInfo(category: string, location: string): Promise<{
    baseRate: number;
    locationMultiplier: number;
    adjustedRate: number;
    marketInsights: string[];
  }> {
    const baseRate = this.baseRates.get(category) || 35;
    const locationKey = this.getLocationKey(location);
    const locationMultiplier = this.locationMultipliers.get(locationKey) || 1.0;
    const adjustedRate = Math.round(baseRate * locationMultiplier * 100) / 100;

    const marketInsights = [
      `Base rate for ${category}: £${baseRate}/hour`,
      `Location adjustment for ${location}: ${locationMultiplier}x`,
      `Adjusted market rate: £${adjustedRate}/hour`
    ];

    return {
      baseRate,
      locationMultiplier,
      adjustedRate,
      marketInsights
    };
  }
}

// Export singleton instance
export const marketRateCalculator = new MarketRateCalculator();