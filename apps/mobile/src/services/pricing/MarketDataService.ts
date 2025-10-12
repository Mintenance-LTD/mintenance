import type { JobPricingInput, MarketContext, LocationCoordinates } from './types';

export class MarketDataService {
  private baseRates: Map<string, number> = new Map([
    // Base hourly rates for different job categories in GBP
    ['plumbing', 45],
    ['electrical', 50],
    ['painting', 25],
    ['carpentry', 40],
    ['cleaning', 20],
    ['gardening', 30],
    ['handyman', 35],
    ['roofing', 55],
    ['heating', 60],
    ['flooring', 38],
  ]);

  private locationMultipliers: Map<string, number> = new Map([
    // London zones and major UK cities
    ['central_london', 1.4],
    ['inner_london', 1.3],
    ['outer_london', 1.2],
    ['manchester', 1.1],
    ['birmingham', 1.0],
    ['leeds', 1.0],
    ['glasgow', 0.95],
    ['liverpool', 0.95],
    ['bristol', 1.05],
    ['edinburgh', 1.1],
    ['default', 1.0],
  ]);

  private seasonalFactors: Map<number, number> = new Map([
    // Month-based seasonal adjustments
    [0, 0.9], // January - post-holiday low demand
    [1, 0.95], // February
    [2, 1.1], // March - spring preparation
    [3, 1.2], // April - peak spring
    [4, 1.15], // May
    [5, 1.0], // June
    [6, 0.95], // July - holiday season
    [7, 0.9], // August - holiday season
    [8, 1.1], // September - back to normal
    [9, 1.15], // October - winter prep
    [10, 1.05], // November
    [11, 0.95], // December - holiday season
  ]);

  /**
   * Get market context for pricing analysis
   */
  async getMarketContext(input: JobPricingInput): Promise<MarketContext> {
    const baseRate = this.baseRates.get(input.category) || 40;
    const locationMultiplier = this.getLocationMultiplier(input.location);
    const seasonalFactor = this.getSeasonalFactor();
    
    const averagePrice = Math.round(baseRate * locationMultiplier * seasonalFactor);
    const priceRange: [number, number] = [
      Math.round(averagePrice * 0.7),
      Math.round(averagePrice * 1.5)
    ];

    return {
      averagePrice,
      priceRange,
      demandLevel: this.getDemandLevel(),
      seasonalFactor,
      locationMultiplier,
      contractorAvailability: this.getContractorAvailability(input.category)
    };
  }

  /**
   * Parse location string to coordinates (simplified)
   */
  parseLocationToCoordinates(location: string): LocationCoordinates {
    // In production, this would use geocoding API
    // For now, return London coordinates as default
    return {
      lat: 51.5074,
      lng: -0.1278,
      postcode: location || 'SW1A 1AA',
    };
  }

  /**
   * Get location multiplier based on location string
   */
  private getLocationMultiplier(location: string): number {
    const locationKey = this.normalizeLocation(location);
    return this.locationMultipliers.get(locationKey) || this.locationMultipliers.get('default')!;
  }

  /**
   * Get seasonal factor for current month
   */
  private getSeasonalFactor(): number {
    const currentMonth = new Date().getMonth();
    return this.seasonalFactors.get(currentMonth) || 1.0;
  }

  /**
   * Get demand level based on season and category
   */
  private getDemandLevel(): 'low' | 'medium' | 'high' {
    const month = new Date().getMonth();
    const seasonalFactor = this.seasonalFactors.get(month) || 1.0;
    
    if (seasonalFactor >= 1.15) return 'high';
    if (seasonalFactor <= 0.95) return 'low';
    return 'medium';
  }

  /**
   * Get contractor availability (mock implementation)
   */
  private getContractorAvailability(category: string): number {
    // Mock availability based on category
    const availabilityMap: Record<string, number> = {
      plumbing: 0.8,
      electrical: 0.7,
      painting: 0.9,
      carpentry: 0.8,
      cleaning: 0.95,
      gardening: 0.85,
      handyman: 0.9,
      roofing: 0.6,
      heating: 0.7,
      flooring: 0.8,
    };
    
    return availabilityMap[category] || 0.8;
  }

  /**
   * Normalize location string for lookup
   */
  private normalizeLocation(location: string): string {
    const normalized = location.toLowerCase().trim();
    
    if (normalized.includes('central london') || normalized.includes('westminster')) {
      return 'central_london';
    }
    if (normalized.includes('inner london') || normalized.includes('camden') || normalized.includes('hackney')) {
      return 'inner_london';
    }
    if (normalized.includes('outer london') || normalized.includes('croydon') || normalized.includes('bromley')) {
      return 'outer_london';
    }
    if (normalized.includes('manchester')) return 'manchester';
    if (normalized.includes('birmingham')) return 'birmingham';
    if (normalized.includes('leeds')) return 'leeds';
    if (normalized.includes('glasgow')) return 'glasgow';
    if (normalized.includes('liverpool')) return 'liverpool';
    if (normalized.includes('bristol')) return 'bristol';
    if (normalized.includes('edinburgh')) return 'edinburgh';
    
    return 'default';
  }
}
