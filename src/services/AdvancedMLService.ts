/**
 * Advanced ML Service
 * 
 * Enhanced machine learning algorithms for pricing, matching, and business intelligence.
 */

import { PerformanceOptimizer } from '../utils/PerformanceOptimizer';
import { SecurityManager } from '../utils/SecurityManager';

interface JobComplexityFactors {
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  toolsRequired: string[];
  timeEstimate: number; // hours
  riskLevel: 'low' | 'medium' | 'high';
  accessibilityScore: number; // 1-10
  materialsCost: number;
}

interface MarketData {
  regionCode: string;
  averagePricing: Record<string, number>;
  demandLevel: number; // 1-10
  contractorAvailability: number; // 1-10
  seasonalMultiplier: number;
}

interface ContractorProfile {
  id: string;
  skillLevel: number; // 1-10
  specializations: string[];
  averageRating: number;
  completionRate: number;
  responseTime: number; // minutes
  priceRange: { min: number; max: number };
  location: { lat: number; lng: number };
}

interface AdvancedPricingResult {
  basePrice: number;
  complexityAdjustment: number;
  marketAdjustment: number;
  urgencyMultiplier: number;
  finalPrice: number;
  confidenceScore: number; // 0-1
  priceRange: { min: number; max: number };
  breakdown: {
    labor: number;
    materials: number;
    overhead: number;
    profit: number;
  };
}

interface ContractorMatch {
  contractor: ContractorProfile;
  matchScore: number; // 0-1
  estimatedPrice: number;
  availability: 'immediate' | 'within_hour' | 'within_day' | 'scheduled';
  distance: number; // km
  reasoning: string[];
}

class AdvancedMLServiceClass {
  private marketDataCache: Map<string, MarketData> = new Map();
  private contractorProfiles: ContractorProfile[] = [];

  /**
   * Advanced pricing algorithm with multiple factors
   */
  public async calculateAdvancedPricing(
    jobDescription: string,
    category: string,
    location: string,
    urgency: 'low' | 'medium' | 'high',
    complexityFactors?: Partial<JobComplexityFactors>
  ): Promise<AdvancedPricingResult> {
    PerformanceOptimizer.startMetric('advanced-pricing-calculation');

    try {
      // Analyze job complexity using NLP
      const complexity = await this.analyzeJobComplexity(jobDescription, category, complexityFactors);
      
      // Get market data for location
      const marketData = await this.getMarketData(location);
      
      // Calculate base price from category and complexity
      const basePrice = this.calculateBasePrice(category, complexity);
      
      // Apply market adjustments
      const marketAdjustment = this.calculateMarketAdjustment(basePrice, marketData);
      
      // Apply urgency multiplier
      const urgencyMultiplier = this.getUrgencyMultiplier(urgency);
      
      // Calculate complexity adjustment
      const complexityAdjustment = this.calculateComplexityAdjustment(basePrice, complexity);
      
      // Final price calculation
      const adjustedPrice = basePrice + complexityAdjustment + marketAdjustment;
      const finalPrice = adjustedPrice * urgencyMultiplier;
      
      // Calculate confidence score based on data quality
      const confidenceScore = this.calculateConfidenceScore(
        complexity,
        marketData,
        category
      );
      
      // Calculate price range (±15% typically)
      const variance = finalPrice * 0.15;
      const priceRange = {
        min: Math.max(finalPrice - variance, basePrice * 0.8),
        max: finalPrice + variance,
      };
      
      // Price breakdown
      const breakdown = this.calculatePriceBreakdown(finalPrice, complexity);

      return {
        basePrice,
        complexityAdjustment,
        marketAdjustment,
        urgencyMultiplier,
        finalPrice: Math.round(finalPrice),
        confidenceScore,
        priceRange: {
          min: Math.round(priceRange.min),
          max: Math.round(priceRange.max),
        },
        breakdown,
      };
    } finally {
      PerformanceOptimizer.endMetric('advanced-pricing-calculation');
    }
  }

  /**
   * Advanced contractor matching algorithm
   */
  public async findOptimalContractors(
    jobDescription: string,
    category: string,
    location: { lat: number; lng: number },
    budget: number,
    urgency: 'low' | 'medium' | 'high',
    maxResults = 5
  ): Promise<ContractorMatch[]> {
    PerformanceOptimizer.startMetric('contractor-matching');

    try {
      // Analyze job requirements
      const jobComplexity = await this.analyzeJobComplexity(jobDescription, category);
      
      // Filter contractors by basic criteria
      const eligibleContractors = this.contractorProfiles.filter(contractor => 
        contractor.specializations.includes(category) &&
        contractor.priceRange.min <= budget * 1.2 // Allow 20% budget flexibility
      );
      
      // Calculate match scores for each contractor
      const matches: ContractorMatch[] = [];
      
      for (const contractor of eligibleContractors) {
        const matchScore = this.calculateContractorMatchScore(
          contractor,
          jobComplexity,
          location,
          budget,
          urgency
        );
        
        if (matchScore > 0.3) { // Minimum threshold
          const distance = this.calculateDistance(location, contractor.location);
          const estimatedPrice = this.estimateContractorPrice(contractor, jobComplexity, distance);
          const availability = this.estimateAvailability(contractor, urgency);
          const reasoning = this.generateMatchReasoning(contractor, jobComplexity, matchScore);
          
          matches.push({
            contractor,
            matchScore,
            estimatedPrice,
            availability,
            distance,
            reasoning,
          });
        }
      }
      
      // Sort by match score and return top results
      return matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, maxResults);
    } finally {
      PerformanceOptimizer.endMetric('contractor-matching');
    }
  }

  /**
   * Business intelligence insights
   */
  public generateBusinessInsights(timeframe: 'week' | 'month' | 'quarter'): {
    demandTrends: Array<{ category: string; change: number; trend: 'up' | 'down' | 'stable' }>;
    pricingOptimization: Array<{ category: string; suggestedAdjustment: number; reasoning: string }>;
    marketOpportunities: Array<{ region: string; category: string; opportunity: string }>;
    performanceMetrics: {
      averageMatchScore: number;
      pricingAccuracy: number;
      customerSatisfaction: number;
    };
  } {
    // Mock implementation - in production this would analyze real data
    return {
      demandTrends: [
        { category: 'plumbing', change: 15, trend: 'up' },
        { category: 'electrical', change: 8, trend: 'up' },
        { category: 'gardening', change: -5, trend: 'down' },
        { category: 'cleaning', change: 2, trend: 'stable' },
      ],
      pricingOptimization: [
        {
          category: 'plumbing',
          suggestedAdjustment: 10,
          reasoning: 'High demand and limited contractor availability in North London',
        },
        {
          category: 'electrical',
          suggestedAdjustment: 5,
          reasoning: 'Increased complexity of smart home installations',
        },
      ],
      marketOpportunities: [
        {
          region: 'South London',
          category: 'solar installation',
          opportunity: 'Growing demand for renewable energy solutions',
        },
        {
          region: 'Birmingham',
          category: 'home security',
          opportunity: 'Underserved market with high potential',
        },
      ],
      performanceMetrics: {
        averageMatchScore: 0.87,
        pricingAccuracy: 0.92,
        customerSatisfaction: 0.89,
      },
    };
  }

  /**
   * Private helper methods
   */
  private async analyzeJobComplexity(
    description: string,
    category: string,
    providedFactors?: Partial<JobComplexityFactors>
  ): Promise<JobComplexityFactors> {
    // Validate input with SecurityManager
    const validation = SecurityManager.validateTextInput(description, {
      maxLength: 2000,
      fieldName: 'Job Description',
    });
    
    if (!validation.isValid) {
      throw new Error('Invalid job description');
    }

    // Simple NLP analysis (in production, use advanced ML models)
    const complexityKeywords = {
      basic: ['clean', 'tidy', 'basic', 'simple'],
      intermediate: ['install', 'repair', 'replace', 'maintenance'],
      advanced: ['renovate', 'upgrade', 'complex', 'custom'],
      expert: ['design', 'engineer', 'specialist', 'commercial'],
    };

    let skillLevel: JobComplexityFactors['skillLevel'] = 'basic';
    const lowerDesc = description.toLowerCase();
    
    for (const [level, keywords] of Object.entries(complexityKeywords)) {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        skillLevel = level as JobComplexityFactors['skillLevel'];
      }
    }

    // Estimate time based on complexity and description length
    const timeMultiplier = { basic: 1, intermediate: 2, advanced: 4, expert: 8 };
    const baseTime = Math.max(1, Math.ceil(description.length / 100));
    const timeEstimate = baseTime * timeMultiplier[skillLevel];

    return {
      skillLevel,
      toolsRequired: this.extractRequiredTools(description, category),
      timeEstimate,
      riskLevel: skillLevel === 'expert' ? 'high' : skillLevel === 'advanced' ? 'medium' : 'low',
      accessibilityScore: providedFactors?.accessibilityScore || 7,
      materialsCost: providedFactors?.materialsCost || this.estimateMaterialsCost(category, skillLevel),
      ...providedFactors,
    };
  }

  private async getMarketData(location: string): Promise<MarketData> {
    // Check cache first
    if (this.marketDataCache.has(location)) {
      return this.marketDataCache.get(location)!;
    }

    // Mock market data - in production, fetch from real market API
    const mockData: MarketData = {
      regionCode: location.toLowerCase().replace(/\s+/g, '-'),
      averagePricing: {
        plumbing: 85,
        electrical: 95,
        gardening: 45,
        cleaning: 25,
        painting: 35,
      },
      demandLevel: Math.floor(Math.random() * 5) + 5, // 5-10
      contractorAvailability: Math.floor(Math.random() * 5) + 5, // 5-10
      seasonalMultiplier: this.getSeasonalMultiplier(),
    };

    this.marketDataCache.set(location, mockData);
    return mockData;
  }

  private calculateBasePrice(category: string, complexity: JobComplexityFactors): number {
    const basePrices = {
      plumbing: 120,
      electrical: 140,
      gardening: 60,
      cleaning: 40,
      painting: 50,
      carpentry: 100,
      other: 80,
    };

    const skillMultipliers = {
      basic: 1,
      intermediate: 1.5,
      advanced: 2.5,
      expert: 4,
    };

    const basePrice = basePrices[category] || basePrices.other;
    return basePrice * skillMultipliers[complexity.skillLevel] * complexity.timeEstimate;
  }

  private calculateMarketAdjustment(basePrice: number, marketData: MarketData): number {
    const demandAdjustment = (marketData.demandLevel - 5) * 0.05; // -25% to +25%
    const availabilityAdjustment = (5 - marketData.contractorAvailability) * 0.03; // -15% to +15%
    const seasonalAdjustment = marketData.seasonalMultiplier - 1;
    
    const totalAdjustment = demandAdjustment + availabilityAdjustment + seasonalAdjustment;
    return basePrice * totalAdjustment;
  }

  private getUrgencyMultiplier(urgency: 'low' | 'medium' | 'high'): number {
    const multipliers = {
      low: 1.0,
      medium: 1.15,
      high: 1.35,
    };
    return multipliers[urgency];
  }

  private calculateComplexityAdjustment(basePrice: number, complexity: JobComplexityFactors): number {
    let adjustment = 0;
    
    // Risk level adjustment
    if (complexity.riskLevel === 'high') adjustment += basePrice * 0.2;
    else if (complexity.riskLevel === 'medium') adjustment += basePrice * 0.1;
    
    // Accessibility adjustment
    if (complexity.accessibilityScore < 5) adjustment += basePrice * 0.15;
    
    // Materials cost
    adjustment += complexity.materialsCost;
    
    return adjustment;
  }

  private calculateConfidenceScore(
    complexity: JobComplexityFactors,
    marketData: MarketData,
    category: string
  ): number {
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence for expert-level jobs (more uncertainty)
    if (complexity.skillLevel === 'expert') confidence -= 0.1;
    
    // Reduce confidence for high-risk jobs
    if (complexity.riskLevel === 'high') confidence -= 0.1;
    
    // Adjust based on market data availability
    if (marketData.averagePricing[category]) confidence += 0.1;
    
    return Math.max(0.5, Math.min(1, confidence));
  }

  private calculatePriceBreakdown(finalPrice: number, complexity: JobComplexityFactors) {
    return {
      labor: Math.round(finalPrice * 0.6),
      materials: complexity.materialsCost,
      overhead: Math.round(finalPrice * 0.15),
      profit: Math.round(finalPrice * 0.25),
    };
  }

  private calculateContractorMatchScore(
    contractor: ContractorProfile,
    jobComplexity: JobComplexityFactors,
    location: { lat: number; lng: number },
    budget: number,
    urgency: 'low' | 'medium' | 'high'
  ): number {
    let score = 0;
    
    // Skill level match (40% weight)
    const skillMatch = Math.min(contractor.skillLevel / this.getRequiredSkillLevel(jobComplexity), 1);
    score += skillMatch * 0.4;
    
    // Price compatibility (30% weight)
    const priceMatch = contractor.priceRange.max >= budget ? 1 : contractor.priceRange.max / budget;
    score += Math.min(priceMatch, 1) * 0.3;
    
    // Distance (20% weight)
    const distance = this.calculateDistance(location, contractor.location);
    const distanceScore = Math.max(0, 1 - distance / 50); // 50km max reasonable distance
    score += distanceScore * 0.2;
    
    // Rating and reliability (10% weight)
    const reliabilityScore = (contractor.averageRating / 5) * contractor.completionRate;
    score += reliabilityScore * 0.1;
    
    return Math.min(score, 1);
  }

  private extractRequiredTools(description: string, category: string): string[] {
    // Simple keyword extraction - in production, use more sophisticated NLP
    const toolKeywords = {
      plumbing: ['wrench', 'pipe', 'drain', 'snake'],
      electrical: ['wire', 'circuit', 'breaker', 'voltage'],
      gardening: ['shovel', 'pruning', 'mower', 'trimmer'],
    };
    
    return toolKeywords[category] || [];
  }

  private estimateMaterialsCost(category: string, skillLevel: JobComplexityFactors['skillLevel']): number {
    const baseCosts = {
      plumbing: 50,
      electrical: 75,
      gardening: 30,
      cleaning: 15,
      painting: 40,
    };
    
    const skillMultipliers = {
      basic: 1,
      intermediate: 1.5,
      advanced: 2,
      expert: 3,
    };
    
    const baseCost = baseCosts[category] || 40;
    return baseCost * skillMultipliers[skillLevel];
  }

  private getSeasonalMultiplier(): number {
    const month = new Date().getMonth();
    // Higher prices in spring/summer for outdoor work
    if (month >= 3 && month <= 8) return 1.1;
    return 1.0;
  }

  private getRequiredSkillLevel(complexity: JobComplexityFactors): number {
    const skillLevels = {
      basic: 3,
      intermediate: 5,
      advanced: 7,
      expert: 9,
    };
    return skillLevels[complexity.skillLevel];
  }

  private calculateDistance(loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private estimateContractorPrice(
    contractor: ContractorProfile,
    complexity: JobComplexityFactors,
    distance: number
  ): number {
    const baseRate = (contractor.priceRange.min + contractor.priceRange.max) / 2;
    const complexityMultiplier = this.getRequiredSkillLevel(complexity) / contractor.skillLevel;
    const distanceAdjustment = distance > 20 ? 1.1 : 1.0;
    
    return Math.round(baseRate * complexity.timeEstimate * complexityMultiplier * distanceAdjustment);
  }

  private estimateAvailability(
    contractor: ContractorProfile,
    urgency: 'low' | 'medium' | 'high'
  ): ContractorMatch['availability'] {
    // Mock availability based on response time and urgency
    if (contractor.responseTime < 30 && urgency === 'high') return 'immediate';
    if (contractor.responseTime < 60) return 'within_hour';
    if (contractor.responseTime < 240) return 'within_day';
    return 'scheduled';
  }

  private generateMatchReasoning(
    contractor: ContractorProfile,
    complexity: JobComplexityFactors,
    score: number
  ): string[] {
    const reasons: string[] = [];
    
    if (score > 0.8) reasons.push('Excellent match for your requirements');
    if (contractor.averageRating > 4.5) reasons.push('Highly rated by previous customers');
    if (contractor.skillLevel >= this.getRequiredSkillLevel(complexity)) {
      reasons.push('Has the required skill level for this job');
    }
    if (contractor.responseTime < 60) reasons.push('Quick to respond');
    if (contractor.completionRate > 0.95) reasons.push('Excellent completion rate');
    
    return reasons;
  }
}

export const AdvancedMLService = new AdvancedMLServiceClass();
export default AdvancedMLService;
