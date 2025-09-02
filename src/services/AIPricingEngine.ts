import { logger } from '../utils/logger';
import { realMLService } from './RealMLService';

export interface JobPricingInput {
  title: string;
  description: string;
  category: string;
  location: string;
  photos?: string[];
  homeownerBudget?: number;
  urgency?: 'low' | 'medium' | 'high';
  propertyType?: 'flat' | 'house' | 'commercial';
  estimatedDuration?: number; // hours
}

export interface PricingAnalysis {
  suggestedPrice: {
    min: number;
    max: number;
    optimal: number;
  };
  confidence: number; // 0-1
  factors: PricingFactor[];
  marketData: MarketContext;
  recommendations: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'specialist';
}

export interface PricingFactor {
  name: string;
  impact: number; // -1 to 1 (negative = reduces price, positive = increases)
  description: string;
  weight: number; // 0-1
}

export interface MarketContext {
  averagePrice: number;
  priceRange: [number, number];
  demandLevel: 'low' | 'medium' | 'high';
  seasonalFactor: number;
  locationMultiplier: number;
  contractorAvailability: number; // 0-1
}

interface JobComplexityMetrics {
  textComplexity: number;
  skillRequirements: string[];
  timeEstimate: number;
  materialComplexity: number;
  riskLevel: number;
}

export class AIPricingEngine {
  private realMLService = realMLService;
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
    ['flooring', 38]
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
    ['default', 1.0]
  ]);

  private seasonalFactors: Map<number, number> = new Map([
    // Month-based seasonal adjustments
    [0, 0.9],  // January - post-holiday low demand
    [1, 0.95], // February
    [2, 1.1],  // March - spring preparation
    [3, 1.2],  // April - peak spring
    [4, 1.15], // May
    [5, 1.0],  // June
    [6, 0.95], // July - holiday season
    [7, 0.9],  // August - holiday season
    [8, 1.1],  // September - back to normal
    [9, 1.15], // October - winter prep
    [10, 1.05], // November
    [11, 0.95]  // December - holiday season
  ]);

  async analyzePricing(input: JobPricingInput): Promise<PricingAnalysis> {
    try {
      logger.info('Starting Real AI pricing analysis', { jobTitle: input.title });

      // Step 1: Use Real ML Service for comprehensive pricing prediction
      const mlPricingResult = await this.realMLService.predictJobPricing({
        description: input.description,
        category: input.category,
        location: this.parseLocationToCoordinates(input.location),
        urgency: input.urgency || 'medium',
        timeOfYear: new Date().getMonth() + 1,
        dayOfWeek: new Date().getDay() + 1,
        timeOfDay: new Date().getHours(),
        images: input.photos,
        additionalRequirements: []
      });

      // Step 2: Analyze job complexity (enhanced with ML)
      const complexity = await this.analyzeJobComplexity(input);
      
      // Step 3: Get market context
      const marketData = await this.getMarketContext(input);
      
      // Step 4: Combine ML predictions with market data
      const enhancedPricing = this.combineMLWithMarketData(mlPricingResult, marketData, input);
      
      // Step 5: Generate pricing factors (enhanced)
      const factors = this.generateEnhancedPricingFactors(input, complexity, marketData, mlPricingResult);
      
      // Step 6: Generate recommendations
      const recommendations = this.generateMLEnhancedRecommendations(input, enhancedPricing, factors, mlPricingResult);

      const analysis: PricingAnalysis = {
        suggestedPrice: enhancedPricing,
        confidence: Math.min(mlPricingResult.confidence / 100, 0.95), // Convert to 0-1 scale, cap at 95%
        factors,
        marketData,
        recommendations,
        complexity: complexity.skillRequirements.length > 2 ? 
          (complexity.riskLevel > 0.7 ? 'specialist' : 'complex') :
          (complexity.skillRequirements.length > 1 ? 'moderate' : 'simple')
      };

      logger.info('Real AI pricing analysis completed', {
        optimal: enhancedPricing.optimal,
        confidence: analysis.confidence,
        complexity: analysis.complexity,
        mlConfidence: mlPricingResult.confidence,
        mlPredictedPrice: mlPricingResult.predictedPrice
      });

      return analysis;
    } catch (error) {
      logger.error('Real AI pricing analysis failed, using fallback', error);
      
      // Fallback to rule-based pricing
      return this.getFallbackPricing(input);
    }
  }

  /**
   * Parse location string to coordinates (simplified)
   */
  private parseLocationToCoordinates(location: string) {
    // In production, this would use geocoding API
    // For now, return London coordinates as default
    return {
      lat: 51.5074,
      lng: -0.1278,
      postcode: location || 'SW1A 1AA'
    };
  }

  /**
   * Combine ML predictions with market data for enhanced accuracy
   */
  private combineMLWithMarketData(mlResult: any, marketData: MarketContext, input: JobPricingInput) {
    const mlPrice = mlResult.predictedPrice;
    const marketAverage = marketData.averagePrice;
    
    // Weight ML prediction (70%) with market average (30%)
    const optimal = Math.round(mlPrice * 0.7 + marketAverage * 0.3);
    
    return {
      min: Math.max(mlResult.priceRange.min, Math.round(optimal * 0.8)),
      max: Math.min(mlResult.priceRange.max, Math.round(optimal * 1.3)),
      optimal
    };
  }

  /**
   * Generate enhanced pricing factors using ML insights
   */
  private generateEnhancedPricingFactors(input: JobPricingInput, complexity: JobComplexityMetrics, marketData: MarketContext, mlResult: any): PricingFactor[] {
    const factors: PricingFactor[] = [
      {
        name: 'ML Complexity Analysis',
        impact: (mlResult.factors.complexity - 0.5) * 2, // Convert 0-1 to -1 to 1
        description: `AI-analyzed job complexity: ${(mlResult.factors.complexity * 100).toFixed(0)}%`,
        weight: 0.25
      },
      {
        name: 'Market Demand (ML)',
        impact: (mlResult.factors.demand - 0.5) * 1.5,
        description: `AI-predicted market demand factor`,
        weight: 0.2
      },
      {
        name: 'Location Premium (ML)',
        impact: (mlResult.factors.location - 1) * 0.8,
        description: `ML-calculated location adjustment`,
        weight: 0.15
      },
      {
        name: 'Seasonal Timing (ML)',
        impact: (mlResult.factors.seasonality - 1) * 0.6,
        description: `AI seasonal demand prediction`,
        weight: 0.1
      },
      {
        name: 'Skill Requirements',
        impact: (complexity.skillRequirements.length - 2) * 0.1,
        description: `${complexity.skillRequirements.length} specialized skills required`,
        weight: 0.15
      },
      {
        name: 'Risk Assessment',
        impact: complexity.riskLevel * 0.3,
        description: `Risk level: ${(complexity.riskLevel * 100).toFixed(0)}%`,
        weight: 0.15
      }
    ];

    return factors;
  }

  /**
   * Generate ML-enhanced recommendations
   */
  private generateMLEnhancedRecommendations(input: JobPricingInput, pricing: any, factors: PricingFactor[], mlResult: any): string[] {
    const recommendations: string[] = [];

    // ML confidence-based recommendations
    if (mlResult.confidence < 70) {
      recommendations.push('Consider requesting additional job details to improve pricing accuracy');
    }

    if (mlResult.confidence > 85) {
      recommendations.push('High confidence pricing - suitable for immediate quoting');
    }

    // ML factor-based recommendations
    if (mlResult.factors.complexity > 0.7) {
      recommendations.push('Complex job detected - consider adding 10-20% contingency buffer');
    }

    if (mlResult.factors.demand > 0.8) {
      recommendations.push('High demand period - pricing can be at premium end of range');
    }

    if (mlResult.factors.demand < 0.3) {
      recommendations.push('Low demand period - consider competitive pricing to win job');
    }

    // Market context recommendations
    const marketFactor = factors.find(f => f.name.includes('Market'));
    if (marketFactor && marketFactor.impact > 0.2) {
      recommendations.push('Market conditions favorable - consider higher end of price range');
    }

    // Risk-based recommendations
    const riskFactor = factors.find(f => f.name.includes('Risk'));
    if (riskFactor && riskFactor.impact > 0.3) {
      recommendations.push('High-risk job identified - ensure adequate insurance coverage');
    }

    return recommendations;
  }

  private async analyzeJobComplexity(input: JobPricingInput): Promise<JobComplexityMetrics> {
    try {
      // Use real ML service for advanced job complexity analysis
      const mlAnalysis = await this.realMLService.analyzeJobComplexity(
        input.description, 
        input.category, 
        input.photos
      );

      // Convert ML analysis to our expected format
      return {
        textComplexity: mlAnalysis.overallComplexity,
        skillRequirements: mlAnalysis.skillRequirements,
        timeEstimate: mlAnalysis.timeEstimate,
        materialComplexity: this.assessMaterialComplexity(input.description),
        riskLevel: mlAnalysis.riskLevel === 'critical' ? 0.9 :
                  mlAnalysis.riskLevel === 'high' ? 0.7 :
                  mlAnalysis.riskLevel === 'medium' ? 0.4 : 0.2
      };
    } catch (error) {
      logger.warn('ML complexity analysis failed, using fallback', error);
      
      // Fallback to rule-based analysis
      const textComplexity = this.analyzeTextComplexity(input.description);
      const skillRequirements = this.extractSkillRequirements(input.title, input.description, input.category);
      const timeEstimate = this.estimateTimeRequirement(input);
      const materialComplexity = this.assessMaterialComplexity(input.description);
      const riskLevel = this.assessRiskLevel(input);

      return {
        textComplexity,
        skillRequirements,
        timeEstimate,
        materialComplexity,
        riskLevel
      };
    }
  }

  private analyzeTextComplexity(description: string): number {
    // Analyze description complexity based on keywords and structure
    const complexityKeywords = [
      'complex', 'difficult', 'specialist', 'custom', 'bespoke',
      'rewire', 'structural', 'emergency', 'urgent', 'multiple',
      'complicated', 'professional', 'certified', 'licensed'
    ];
    
    const simpleKeywords = [
      'simple', 'basic', 'easy', 'quick', 'minor', 'small',
      'touch-up', 'clean', 'tidy', 'straightforward'
    ];

    const words = description.toLowerCase().split(/\\s+/);
    let complexity = 0.5; // Base complexity

    complexityKeywords.forEach(keyword => {
      if (description.toLowerCase().includes(keyword)) {
        complexity += 0.1;
      }
    });

    simpleKeywords.forEach(keyword => {
      if (description.toLowerCase().includes(keyword)) {
        complexity -= 0.1;
      }
    });

    // Adjust based on description length (longer = more complex)
    complexity += Math.min(words.length / 100, 0.3);

    return Math.max(0, Math.min(1, complexity));
  }

  private extractSkillRequirements(title: string, description: string, category: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const skills: string[] = [];

    const skillMap = {
      'plumbing': ['leak', 'pipe', 'drain', 'toilet', 'shower', 'tap', 'boiler'],
      'electrical': ['wire', 'socket', 'light', 'switch', 'fuse', 'circuit', 'power'],
      'carpentry': ['wood', 'door', 'window', 'cabinet', 'shelf', 'frame', 'timber'],
      'painting': ['paint', 'wall', 'ceiling', 'brush', 'roller', 'colour', 'decoration'],
      'roofing': ['roof', 'tile', 'gutter', 'chimney', 'slate', 'leak', 'repair'],
      'heating': ['heating', 'radiator', 'thermostat', 'boiler', 'gas', 'temperature'],
      'flooring': ['floor', 'carpet', 'laminate', 'tile', 'vinyl', 'hardwood'],
      'gardening': ['garden', 'lawn', 'tree', 'hedge', 'plant', 'grass', 'landscape']
    };

    Object.entries(skillMap).forEach(([skill, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword)) || category === skill) {
        skills.push(skill);
      }
    });

    return skills.length > 0 ? skills : [category];
  }

  private estimateTimeRequirement(input: JobPricingInput): number {
    if (input.estimatedDuration) {
      return input.estimatedDuration;
    }

    // Base time estimates by category (hours)
    const baseTimeMap: Record<string, number> = {
      'cleaning': 2,
      'painting': 8,
      'plumbing': 4,
      'electrical': 3,
      'carpentry': 6,
      'gardening': 4,
      'handyman': 3,
      'roofing': 12,
      'heating': 6,
      'flooring': 10
    };

    let baseTime = baseTimeMap[input.category] || 4;

    // Adjust based on description keywords
    const timeModifiers = {
      'emergency': 0.5,
      'quick': 0.7,
      'major': 2.0,
      'complete': 1.8,
      'full': 1.5,
      'multiple': 1.4,
      'entire': 1.6
    };

    Object.entries(timeModifiers).forEach(([keyword, modifier]) => {
      if (input.description.toLowerCase().includes(keyword)) {
        baseTime *= modifier;
      }
    });

    return Math.max(1, Math.min(40, baseTime)); // 1-40 hour range
  }

  private assessMaterialComplexity(description: string): number {
    const materialKeywords = [
      'materials', 'supplies', 'parts', 'components', 'specialist',
      'custom', 'imported', 'high-end', 'premium', 'branded'
    ];

    const complexity = materialKeywords.reduce((acc, keyword) => {
      return description.toLowerCase().includes(keyword) ? acc + 0.15 : acc;
    }, 0.3);

    return Math.min(1, complexity);
  }

  private assessRiskLevel(input: JobPricingInput): number {
    const riskKeywords = [
      'electrical', 'gas', 'structural', 'roof', 'height', 'ladder',
      'emergency', 'urgent', 'damage', 'leak', 'safety', 'dangerous'
    ];

    const text = `${input.title} ${input.description}`.toLowerCase();
    let riskLevel = 0.2; // Base risk

    riskKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        riskLevel += 0.1;
      }
    });

    // Higher risk for certain categories
    const highRiskCategories = ['electrical', 'gas', 'roofing', 'structural'];
    if (highRiskCategories.includes(input.category)) {
      riskLevel += 0.2;
    }

    return Math.min(1, riskLevel);
  }

  private async getMarketContext(input: JobPricingInput): Promise<MarketContext> {
    // In a real implementation, this would query historical data
    // For now, we'll use simulated market data
    
    const baseRate = this.baseRates.get(input.category) || 35;
    const locationKey = this.getLocationKey(input.location);
    const locationMultiplier = this.locationMultipliers.get(locationKey) || 1.0;
    const seasonalFactor = this.seasonalFactors.get(new Date().getMonth()) || 1.0;

    // Simulate market conditions
    const averagePrice = baseRate * locationMultiplier;
    const priceVariation = averagePrice * 0.3;

    return {
      averagePrice,
      priceRange: [averagePrice - priceVariation, averagePrice + priceVariation],
      demandLevel: this.getDemandLevel(input.category),
      seasonalFactor,
      locationMultiplier,
      contractorAvailability: Math.random() * 0.4 + 0.6 // 0.6-1.0
    };
  }

  private getLocationKey(location: string): string {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('central london') || locationLower.includes('zone 1')) {
      return 'central_london';
    }
    if (locationLower.includes('inner london') || locationLower.includes('zone 2')) {
      return 'inner_london';
    }
    if (locationLower.includes('london')) {
      return 'outer_london';
    }
    
    const cities = ['manchester', 'birmingham', 'leeds', 'glasgow', 'liverpool', 'bristol', 'edinburgh'];
    const matchedCity = cities.find(city => locationLower.includes(city));
    
    return matchedCity || 'default';
  }

  private getDemandLevel(category: string): 'low' | 'medium' | 'high' {
    const highDemandCategories = ['plumbing', 'electrical', 'heating'];
    const lowDemandCategories = ['painting', 'gardening'];
    
    if (highDemandCategories.includes(category)) return 'high';
    if (lowDemandCategories.includes(category)) return 'low';
    return 'medium';
  }

  private calculateBasePrice(input: JobPricingInput, complexity: JobComplexityMetrics): number {
    const baseRate = this.baseRates.get(input.category) || 35;
    const complexityMultiplier = 1 + (complexity.textComplexity * 0.5);
    const skillMultiplier = 1 + (complexity.skillRequirements.length - 1) * 0.15;
    const riskMultiplier = 1 + (complexity.riskLevel * 0.3);

    return baseRate * complexity.timeEstimate * complexityMultiplier * skillMultiplier * riskMultiplier;
  }

  private applyMarketAdjustments(basePrice: number, market: MarketContext, input: JobPricingInput): number {
    let adjustedPrice = basePrice;

    // Apply location multiplier
    adjustedPrice *= market.locationMultiplier;

    // Apply seasonal adjustment
    adjustedPrice *= market.seasonalFactor;

    // Apply demand/supply dynamics
    const supplyDemandFactor = market.demandLevel === 'high' ? 1.15 :
                              market.demandLevel === 'low' ? 0.9 : 1.0;
    adjustedPrice *= supplyDemandFactor;

    // Apply urgency factor
    if (input.urgency === 'high') {
      adjustedPrice *= 1.25;
    } else if (input.urgency === 'low') {
      adjustedPrice *= 0.9;
    }

    // Contractor availability factor
    if (market.contractorAvailability < 0.7) {
      adjustedPrice *= 1.1; // Higher prices when fewer contractors available
    }

    return adjustedPrice;
  }

  private generatePricingFactors(input: JobPricingInput, complexity: JobComplexityMetrics, market: MarketContext): PricingFactor[] {
    const factors: PricingFactor[] = [];

    // Job complexity factor
    if (complexity.textComplexity > 0.6) {
      factors.push({
        name: 'Job Complexity',
        impact: 0.3,
        description: 'Complex job requirements increase pricing',
        weight: 0.8
      });
    }

    // Location factor
    if (market.locationMultiplier > 1.1) {
      factors.push({
        name: 'Premium Location',
        impact: 0.25,
        description: `${input.location} has higher market rates`,
        weight: 0.9
      });
    }

    // Urgency factor
    if (input.urgency === 'high') {
      factors.push({
        name: 'Urgent Request',
        impact: 0.25,
        description: 'Emergency jobs command premium pricing',
        weight: 0.7
      });
    }

    // Market demand factor
    if (market.demandLevel === 'high') {
      factors.push({
        name: 'High Demand',
        impact: 0.15,
        description: `${input.category} services are in high demand`,
        weight: 0.6
      });
    }

    // Seasonal factor
    if (market.seasonalFactor > 1.1) {
      factors.push({
        name: 'Peak Season',
        impact: 0.15,
        description: 'Seasonal demand increases pricing',
        weight: 0.5
      });
    } else if (market.seasonalFactor < 0.95) {
      factors.push({
        name: 'Off Season',
        impact: -0.1,
        description: 'Lower seasonal demand reduces pricing',
        weight: 0.4
      });
    }

    // Risk factor
    if (complexity.riskLevel > 0.6) {
      factors.push({
        name: 'High Risk Work',
        impact: 0.2,
        description: 'Specialized or risky work requires premium',
        weight: 0.7
      });
    }

    return factors;
  }

  private calculateFinalPricing(basePrice: number, factors: PricingFactor[]): { min: number; max: number; optimal: number } {
    const totalImpact = factors.reduce((sum, factor) => sum + (factor.impact * factor.weight), 0);
    const adjustedPrice = basePrice * (1 + totalImpact);

    // Calculate price range
    const variationPercent = 0.15; // 15% variation
    const min = Math.round(adjustedPrice * (1 - variationPercent));
    const max = Math.round(adjustedPrice * (1 + variationPercent));
    const optimal = Math.round(adjustedPrice);

    return { min, max, optimal };
  }

  private generateRecommendations(input: JobPricingInput, pricing: { min: number; max: number; optimal: number }, factors: PricingFactor[]): string[] {
    const recommendations: string[] = [];

    // Pricing strategy recommendations
    if (pricing.optimal > pricing.min * 1.3) {
      recommendations.push('Consider starting at the lower end to attract more bids');
    } else {
      recommendations.push('Your pricing is competitive for this type of work');
    }

    // Market timing recommendations
    const urgentFactor = factors.find(f => f.name === 'Urgent Request');
    if (urgentFactor) {
      recommendations.push('Emergency surcharge justified due to urgency');
    }

    // Quality recommendations
    const complexityFactor = factors.find(f => f.name === 'Job Complexity');
    if (complexityFactor) {
      recommendations.push('Consider requiring photos/videos for accurate estimates');
    }

    // Budget recommendations
    if (input.homeownerBudget && input.homeownerBudget < pricing.min) {
      recommendations.push(`Budget may be low - market rate is £${pricing.min}-£${pricing.max}`);
    } else if (input.homeownerBudget && input.homeownerBudget > pricing.max) {
      recommendations.push('Budget is generous - you may attract premium contractors');
    }

    return recommendations;
  }

  private calculateConfidence(factors: PricingFactor[], complexity: JobComplexityMetrics): number {
    // Base confidence
    let confidence = 0.7;

    // Reduce confidence for very complex jobs
    if (complexity.textComplexity > 0.8) {
      confidence -= 0.2;
    }

    // Reduce confidence for high-risk jobs
    if (complexity.riskLevel > 0.7) {
      confidence -= 0.15;
    }

    // Increase confidence with more pricing factors
    confidence += Math.min(factors.length * 0.05, 0.2);

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private getFallbackPricing(input: JobPricingInput): PricingAnalysis {
    const baseRate = this.baseRates.get(input.category) || 35;
    const estimatedHours = 4; // Default estimate
    const basePrice = baseRate * estimatedHours;

    return {
      suggestedPrice: {
        min: Math.round(basePrice * 0.8),
        max: Math.round(basePrice * 1.3),
        optimal: Math.round(basePrice)
      },
      confidence: 0.3,
      factors: [{
        name: 'Fallback Pricing',
        impact: 0,
        description: 'Using basic category-based pricing',
        weight: 1.0
      }],
      marketData: {
        averagePrice: basePrice,
        priceRange: [basePrice * 0.7, basePrice * 1.5],
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        locationMultiplier: 1.0,
        contractorAvailability: 0.8
      },
      recommendations: [
        'Basic pricing estimate - consider providing more job details for better accuracy'
      ],
      complexity: 'moderate'
    };
  }
}

export const aiPricingEngine = new AIPricingEngine();