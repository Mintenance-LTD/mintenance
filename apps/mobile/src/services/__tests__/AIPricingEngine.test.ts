/**
 * Comprehensive tests for AIPricingEngine
 * Tests AI-powered pricing calculations with market data integration
 * BUSINESS CRITICAL - determines real pricing for jobs
 *
 * Target Coverage: 60-80%
 * Pattern: Following successful Phase 1 & 2 test patterns
 */

import { AIPricingEngine } from '../AIPricingEngine';
import { MLEngine } from '../ml-engine';
import { MarketDataService } from '../pricing/MarketDataService';
import { ComplexityAnalysisService } from '../pricing/ComplexityAnalysisService';
import { PricingCalculationService } from '../pricing/PricingCalculationService';
import { RecommendationService } from '../pricing/RecommendationService';
import type { JobPricingInput, PricingAnalysis, JobComplexityMetrics, MarketContext } from '../pricing/types';

// Mock all dependencies
jest.mock('../ml-engine');
jest.mock('../pricing/MarketDataService');
jest.mock('../pricing/ComplexityAnalysisService');
jest.mock('../pricing/PricingCalculationService');
jest.mock('../pricing/RecommendationService');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AIPricingEngine', () => {
  let engine: AIPricingEngine;
  let mockMarketDataService: jest.Mocked<MarketDataService>;
  let mockComplexityService: jest.Mocked<ComplexityAnalysisService>;
  let mockPricingCalcService: jest.Mocked<PricingCalculationService>;
  let mockRecommendationService: jest.Mocked<RecommendationService>;

  const mockJobInput: JobPricingInput = {
    title: 'Fix leaking kitchen tap',
    description: 'Kitchen tap is dripping constantly, needs urgent repair',
    category: 'plumbing',
    location: 'Central London, SW1A 1AA',
    photos: ['photo1.jpg', 'photo2.jpg'],
    homeownerBudget: 250,
    urgency: 'high',
    propertyType: 'flat',
    estimatedDuration: 2,
  };

  const mockLocationCoords = {
    lat: 51.5074,
    lng: -0.1278,
    postcode: 'SW1A 1AA',
  };

  const mockMLPricingResult = {
    marketAnalysis: {
      averageRate: 225,
      priceRange: { min: 150, max: 350 },
      confidence: 0.87,
      competitionLevel: 'high' as const,
      demandTrend: 'increasing' as const,
    },
    recommendations: [
      'Budget is reasonable for this type of work',
      'High demand for plumbers in this area',
    ],
    budgetAssessment: {
      status: 'market_rate' as const,
      adjustment: 0,
      explanation: 'Budget aligns with market rates',
    },
  };

  const mockComplexityMetrics: JobComplexityMetrics = {
    textComplexity: 0.6,
    skillRequirements: ['plumbing', 'diagnostics'],
    timeEstimate: 2.5,
    materialComplexity: 0.4,
    riskLevel: 0.5,
  };

  const mockMarketContext: MarketContext = {
    averagePrice: 220,
    priceRange: [150, 320],
    demandLevel: 'high',
    seasonalFactor: 1.1,
    locationMultiplier: 1.4,
    contractorAvailability: 0.7,
  };

  const mockEnhancedPricing = {
    min: 160,
    max: 340,
    optimal: 240,
  };

  const mockPricingFactors = [
    {
      name: 'Market Rate',
      impact: 0.3,
      description: 'Current market rate for plumbing',
      weight: 0.8,
    },
    {
      name: 'Location Premium',
      impact: 0.4,
      description: 'Central London premium',
      weight: 0.7,
    },
    {
      name: 'Urgency',
      impact: 0.2,
      description: 'High urgency job',
      weight: 0.6,
    },
  ];

  const mockRecommendations = [
    'Budget is competitive for this area',
    'Consider scheduling during off-peak hours to save costs',
    'Multiple contractors available in your area',
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocked service instances
    mockMarketDataService = {
      parseLocationToCoordinates: jest.fn().mockReturnValue(mockLocationCoords),
      getMarketContext: jest.fn().mockResolvedValue(mockMarketContext),
    } as any;

    mockComplexityService = {
      analyzeJobComplexity: jest.fn().mockResolvedValue(mockComplexityMetrics),
    } as any;

    mockPricingCalcService = {
      combineMLWithMarketData: jest.fn().mockReturnValue(mockEnhancedPricing),
      generateEnhancedPricingFactors: jest.fn().mockReturnValue(mockPricingFactors),
      getFallbackPricing: jest.fn().mockResolvedValue({
        suggestedPrice: { min: 100, max: 300, optimal: 200 },
        confidence: 0.5,
        factors: [],
        marketData: mockMarketContext,
        recommendations: ['Using fallback pricing'],
        complexity: 'moderate' as const,
      }),
    } as any;

    mockRecommendationService = {
      generateMLEnhancedRecommendations: jest.fn().mockReturnValue(mockRecommendations),
    } as any;

    // Mock the constructors to return our mocked instances
    (MarketDataService as jest.MockedClass<typeof MarketDataService>).mockImplementation(
      () => mockMarketDataService
    );
    (ComplexityAnalysisService as jest.MockedClass<typeof ComplexityAnalysisService>).mockImplementation(
      () => mockComplexityService
    );
    (PricingCalculationService as jest.MockedClass<typeof PricingCalculationService>).mockImplementation(
      () => mockPricingCalcService
    );
    (RecommendationService as jest.MockedClass<typeof RecommendationService>).mockImplementation(
      () => mockRecommendationService
    );

    // Mock MLEngine static method
    (MLEngine.getPricingInsights as jest.Mock).mockResolvedValue(mockMLPricingResult);

    engine = new AIPricingEngine();
  });

  describe('analyzePricing - Main Pricing Flow', () => {
    it('should successfully analyze pricing with all components', async () => {
      const result = await engine.analyzePricing(mockJobInput);

      expect(result).toBeDefined();
      expect(result.suggestedPrice).toEqual(mockEnhancedPricing);
      expect(result.confidence).toBe(0.85);
      expect(result.complexity).toBe('moderate');
      expect(result.factors).toEqual(mockPricingFactors);
      expect(result.marketData).toEqual(mockMarketContext);
      expect(result.recommendations).toEqual(mockRecommendations);
    });

    it('should parse location to coordinates', async () => {
      await engine.analyzePricing(mockJobInput);

      expect(mockMarketDataService.parseLocationToCoordinates).toHaveBeenCalledWith(
        mockJobInput.location
      );
    });

    it('should call MLEngine with correct parameters', async () => {
      await engine.analyzePricing(mockJobInput);

      expect(MLEngine.getPricingInsights).toHaveBeenCalledWith(
        mockJobInput.category,
        { lat: mockLocationCoords.lat, lng: mockLocationCoords.lng },
        mockJobInput.homeownerBudget
      );
    });

    it('should analyze job complexity', async () => {
      await engine.analyzePricing(mockJobInput);

      expect(mockComplexityService.analyzeJobComplexity).toHaveBeenCalledWith(mockJobInput);
    });

    it('should get market context', async () => {
      await engine.analyzePricing(mockJobInput);

      expect(mockMarketDataService.getMarketContext).toHaveBeenCalledWith(mockJobInput);
    });

    it('should combine ML results with market data', async () => {
      await engine.analyzePricing(mockJobInput);

      expect(mockPricingCalcService.combineMLWithMarketData).toHaveBeenCalledWith(
        mockMLPricingResult,
        mockMarketContext,
        mockJobInput
      );
    });

    it('should generate enhanced pricing factors', async () => {
      await engine.analyzePricing(mockJobInput);

      expect(mockPricingCalcService.generateEnhancedPricingFactors).toHaveBeenCalledWith(
        mockJobInput,
        mockComplexityMetrics,
        mockMarketContext,
        mockMLPricingResult
      );
    });

    it('should generate ML-enhanced recommendations', async () => {
      await engine.analyzePricing(mockJobInput);

      expect(mockRecommendationService.generateMLEnhancedRecommendations).toHaveBeenCalledWith(
        mockJobInput,
        mockEnhancedPricing,
        mockPricingFactors,
        mockMLPricingResult
      );
    });
  });

  describe('Complexity Classification', () => {
    it('should classify as "simple" for basic jobs', async () => {
      mockComplexityService.analyzeJobComplexity.mockResolvedValue({
        textComplexity: 0.3,
        skillRequirements: ['basic'],
        timeEstimate: 1,
        materialComplexity: 0.2,
        riskLevel: 0.3,
      });

      const result = await engine.analyzePricing(mockJobInput);

      expect(result.complexity).toBe('simple');
    });

    it('should classify as "moderate" for standard jobs', async () => {
      mockComplexityService.analyzeJobComplexity.mockResolvedValue({
        textComplexity: 0.5,
        skillRequirements: ['plumbing', 'diagnostics'],
        timeEstimate: 2,
        materialComplexity: 0.4,
        riskLevel: 0.5,
      });

      const result = await engine.analyzePricing(mockJobInput);

      expect(result.complexity).toBe('moderate');
    });

    it('should classify as "complex" for multi-skill jobs', async () => {
      mockComplexityService.analyzeJobComplexity.mockResolvedValue({
        textComplexity: 0.7,
        skillRequirements: ['plumbing', 'electrical', 'carpentry'],
        timeEstimate: 8,
        materialComplexity: 0.7,
        riskLevel: 0.6,
      });

      const result = await engine.analyzePricing(mockJobInput);

      expect(result.complexity).toBe('complex');
    });

    it('should classify as "specialist" for high-risk complex jobs', async () => {
      mockComplexityService.analyzeJobComplexity.mockResolvedValue({
        textComplexity: 0.9,
        skillRequirements: ['specialist_plumbing', 'gas_safe', 'structural'],
        timeEstimate: 16,
        materialComplexity: 0.9,
        riskLevel: 0.85,
      });

      const result = await engine.analyzePricing(mockJobInput);

      expect(result.complexity).toBe('specialist');
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should use fallback pricing when ML service fails', async () => {
      (MLEngine.getPricingInsights as jest.Mock).mockRejectedValue(
        new Error('ML service unavailable')
      );

      const result = await engine.analyzePricing(mockJobInput);

      expect(mockPricingCalcService.getFallbackPricing).toHaveBeenCalledWith(mockJobInput);
      expect(result.suggestedPrice.optimal).toBe(200);
      expect(result.recommendations).toContain('Using fallback pricing');
    });

    it('should use fallback when complexity analysis fails', async () => {
      mockComplexityService.analyzeJobComplexity.mockRejectedValue(
        new Error('Complexity analysis failed')
      );

      const result = await engine.analyzePricing(mockJobInput);

      expect(mockPricingCalcService.getFallbackPricing).toHaveBeenCalled();
    });

    it('should use fallback when market context fails', async () => {
      mockMarketDataService.getMarketContext.mockRejectedValue(
        new Error('Market data unavailable')
      );

      const result = await engine.analyzePricing(mockJobInput);

      expect(mockPricingCalcService.getFallbackPricing).toHaveBeenCalled();
    });

    it('should handle null/undefined budget gracefully', async () => {
      const inputWithoutBudget = { ...mockJobInput, homeownerBudget: undefined };

      const result = await engine.analyzePricing(inputWithoutBudget);

      expect(MLEngine.getPricingInsights).toHaveBeenCalledWith(
        mockJobInput.category,
        expect.any(Object),
        5000 // default budget
      );
      expect(result).toBeDefined();
    });
  });

  describe('Pricing Calculations - Various Job Types', () => {
    it('should handle small budget jobs correctly', async () => {
      const smallJobInput = {
        ...mockJobInput,
        homeownerBudget: 50,
        category: 'cleaning',
      };

      const result = await engine.analyzePricing(smallJobInput);

      expect(result).toBeDefined();
      expect(MLEngine.getPricingInsights).toHaveBeenCalledWith(
        'cleaning',
        expect.any(Object),
        50
      );
    });

    it('should handle large budget jobs correctly', async () => {
      const largeJobInput = {
        ...mockJobInput,
        homeownerBudget: 5000,
        category: 'roofing',
        estimatedDuration: 40,
      };

      const result = await engine.analyzePricing(largeJobInput);

      expect(result).toBeDefined();
      expect(MLEngine.getPricingInsights).toHaveBeenCalledWith(
        'roofing',
        expect.any(Object),
        5000
      );
    });

    it('should handle electrical jobs with high risk', async () => {
      const electricalInput = {
        ...mockJobInput,
        category: 'electrical',
        description: 'Rewiring entire flat, consumer unit replacement',
      };

      // Need >2 skills AND risk >0.7 for specialist classification
      mockComplexityService.analyzeJobComplexity.mockResolvedValue({
        textComplexity: 0.8,
        skillRequirements: ['electrical', 'certification', 'safety'],
        timeEstimate: 24,
        materialComplexity: 0.8,
        riskLevel: 0.9,
      });

      const result = await engine.analyzePricing(electricalInput);

      expect(result.complexity).toBe('specialist');
    });

    it('should handle painting jobs as simpler work', async () => {
      const paintingInput = {
        ...mockJobInput,
        category: 'painting',
        description: 'Paint two bedroom walls',
      };

      mockComplexityService.analyzeJobComplexity.mockResolvedValue({
        textComplexity: 0.3,
        skillRequirements: ['painting'],
        timeEstimate: 6,
        materialComplexity: 0.2,
        riskLevel: 0.2,
      });

      const result = await engine.analyzePricing(paintingInput);

      expect(result.complexity).toBe('simple');
    });
  });

  describe('Market Factor Integration', () => {
    it('should factor in high demand areas', async () => {
      const highDemandMarket = {
        ...mockMarketContext,
        demandLevel: 'high' as const,
        locationMultiplier: 1.5,
      };

      mockMarketDataService.getMarketContext.mockResolvedValue(highDemandMarket);

      const result = await engine.analyzePricing(mockJobInput);

      expect(result.marketData.demandLevel).toBe('high');
      expect(result.marketData.locationMultiplier).toBe(1.5);
    });

    it('should factor in seasonal adjustments', async () => {
      const winterMarket = {
        ...mockMarketContext,
        seasonalFactor: 1.3,
      };

      mockMarketDataService.getMarketContext.mockResolvedValue(winterMarket);

      const result = await engine.analyzePricing(mockJobInput);

      expect(result.marketData.seasonalFactor).toBe(1.3);
    });

    it('should factor in contractor availability', async () => {
      const lowAvailabilityMarket = {
        ...mockMarketContext,
        contractorAvailability: 0.3,
      };

      mockMarketDataService.getMarketContext.mockResolvedValue(lowAvailabilityMarket);

      const result = await engine.analyzePricing(mockJobInput);

      expect(result.marketData.contractorAvailability).toBe(0.3);
    });
  });

  describe('Urgency Impact', () => {
    it('should handle high urgency jobs', async () => {
      const urgentInput = { ...mockJobInput, urgency: 'high' as const };

      const result = await engine.analyzePricing(urgentInput);

      expect(result).toBeDefined();
      expect(mockComplexityService.analyzeJobComplexity).toHaveBeenCalledWith(urgentInput);
    });

    it('should handle low urgency jobs', async () => {
      const lowUrgencyInput = { ...mockJobInput, urgency: 'low' as const };

      const result = await engine.analyzePricing(lowUrgencyInput);

      expect(result).toBeDefined();
      expect(mockComplexityService.analyzeJobComplexity).toHaveBeenCalledWith(lowUrgencyInput);
    });
  });

  describe('Property Type Considerations', () => {
    it('should handle flat properties', async () => {
      const flatInput = { ...mockJobInput, propertyType: 'flat' as const };

      const result = await engine.analyzePricing(flatInput);

      expect(result).toBeDefined();
    });

    it('should handle house properties', async () => {
      const houseInput = { ...mockJobInput, propertyType: 'house' as const };

      const result = await engine.analyzePricing(houseInput);

      expect(result).toBeDefined();
    });

    it('should handle commercial properties', async () => {
      const commercialInput = { ...mockJobInput, propertyType: 'commercial' as const };

      const result = await engine.analyzePricing(commercialInput);

      expect(result).toBeDefined();
    });
  });

  describe('parseLocationToCoordinates', () => {
    it('should delegate to MarketDataService', () => {
      const location = 'Manchester, M1 1AA';

      const result = engine.parseLocationToCoordinates(location);

      expect(mockMarketDataService.parseLocationToCoordinates).toHaveBeenCalledWith(location);
      expect(result).toEqual(mockLocationCoords);
    });

    it('should handle different location formats', () => {
      const locations = [
        'London',
        'SW1A 1AA',
        'Birmingham, B1 1AA',
        '51.5074, -0.1278',
      ];

      locations.forEach(location => {
        engine.parseLocationToCoordinates(location);
        expect(mockMarketDataService.parseLocationToCoordinates).toHaveBeenCalledWith(location);
      });
    });
  });

  describe('Pricing Range Validation', () => {
    it('should ensure min < optimal < max', async () => {
      const result = await engine.analyzePricing(mockJobInput);

      expect(result.suggestedPrice.min).toBeLessThan(result.suggestedPrice.optimal);
      expect(result.suggestedPrice.optimal).toBeLessThan(result.suggestedPrice.max);
    });

    it('should have reasonable pricing ranges', async () => {
      const result = await engine.analyzePricing(mockJobInput);

      // Price range should be reasonable (max shouldn't be more than 3x min)
      const ratio = result.suggestedPrice.max / result.suggestedPrice.min;
      expect(ratio).toBeLessThan(3);
    });
  });

  describe('Confidence Scores', () => {
    it('should return high confidence for successful ML analysis', async () => {
      const result = await engine.analyzePricing(mockJobInput);

      expect(result.confidence).toBe(0.85);
    });

    it('should return lower confidence for fallback pricing', async () => {
      (MLEngine.getPricingInsights as jest.Mock).mockRejectedValue(new Error('ML failed'));

      const result = await engine.analyzePricing(mockJobInput);

      expect(result.confidence).toBe(0.5); // Fallback confidence
    });
  });

  describe('Integration with Photo Analysis', () => {
    it('should handle jobs with photos', async () => {
      const inputWithPhotos = {
        ...mockJobInput,
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
      };

      const result = await engine.analyzePricing(inputWithPhotos);

      expect(result).toBeDefined();
      expect(mockComplexityService.analyzeJobComplexity).toHaveBeenCalledWith(inputWithPhotos);
    });

    it('should handle jobs without photos', async () => {
      const inputWithoutPhotos = {
        ...mockJobInput,
        photos: undefined,
      };

      const result = await engine.analyzePricing(inputWithoutPhotos);

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', async () => {
      const minimalInput: JobPricingInput = {
        title: 'Basic repair',
        description: 'Fix something',
        category: 'handyman',
        location: 'London',
      };

      const result = await engine.analyzePricing(minimalInput);

      expect(result).toBeDefined();
      expect(MLEngine.getPricingInsights).toHaveBeenCalledWith(
        'handyman',
        expect.any(Object),
        5000 // default budget
      );
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(5000);
      const inputWithLongDesc = {
        ...mockJobInput,
        description: longDescription,
      };

      const result = await engine.analyzePricing(inputWithLongDesc);

      expect(result).toBeDefined();
    });

    it('should handle special characters in title', async () => {
      const specialTitle = 'Fix £€$¥ symbols & "quotes" & <html>';
      const inputWithSpecialChars = {
        ...mockJobInput,
        title: specialTitle,
      };

      const result = await engine.analyzePricing(inputWithSpecialChars);

      expect(result).toBeDefined();
    });
  });
});
