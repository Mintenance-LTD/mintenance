/**
 * ML Service Coordinator
 *
 * Central orchestrator for all ML services providing unified interface and workflow coordination.
 * Acts as the main entry point for ML operations across the application.
 *
 * @filesize Target: <500 lines
 * @compliance Architecture principles - Facade pattern, dependency coordination
 */

import { mlCoreService } from './core/MLCoreService';
import { jobAnalysisMLService, type JobComplexityResult, type NLPAnalysisResult } from './analysis/JobAnalysisMLService';
import { pricingMLService, type PricingPredictionResult, type MarketRateAnalysis } from './pricing/PricingMLService';
import { contractorMatchingMLService, type ContractorMatchResult, type ContractorProfile, type JobRequirements } from './matching/ContractorMatchingMLService';
import { performanceAnalyticsMLService, type ModelPerformanceMetrics, type PerformanceInsights } from './analytics/PerformanceAnalyticsMLService';
import { circuitBreakerManager } from '../../utils/circuitBreaker';
import { logger } from '../../utils/logger';

export interface JobAnalysisRequest {
  title: string;
  description: string;
  category: string;
  budget?: number;
  images?: string[];
  location?: {
    lat: number;
    lng: number;
  };
}

export interface ComprehensiveJobAnalysis {
  complexity: JobComplexityResult;
  nlpAnalysis: NLPAnalysisResult;
  pricingPrediction: PricingPredictionResult;
  marketAnalysis: MarketRateAnalysis;
  recommendations: string[];
  processingTime: number;
  confidenceScore: number;
}

export interface ContractorRecommendationRequest {
  jobRequirements: JobRequirements;
  availableContractors: ContractorProfile[];
  clientHistory?: {
    previousJobs: Array<{
      contractorId: string;
      rating: number;
      category: string;
      satisfaction: number;
    }>;
    preferences: {
      preferredSkills: string[];
      budgetRange: [number, number];
      communicationStyle: 'formal' | 'casual' | 'minimal';
    };
  };
  maxResults?: number;
}

export interface MLHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  core: { status: string; modelsLoaded: string[]; errors: string[] };
  services: {
    jobAnalysis: 'online' | 'offline' | 'error';
    pricing: 'online' | 'offline' | 'error';
    matching: 'online' | 'offline' | 'error';
    analytics: 'online' | 'offline' | 'error';
  };
  performance: PerformanceInsights;
  lastHealthCheck: string;
}

/**
 * ML Service Coordinator
 *
 * Provides unified interface for all ML operations, coordinates between services,
 * and manages cross-cutting concerns like performance tracking and error handling.
 */
export class MLServiceCoordinator {
  private static instance: MLServiceCoordinator;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): MLServiceCoordinator {
    if (!MLServiceCoordinator.instance) {
      MLServiceCoordinator.instance = new MLServiceCoordinator();
    }
    return MLServiceCoordinator.instance;
  }

  /**
   * Initialize all ML services
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._performInitialization();
    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Perform comprehensive job analysis using all relevant ML services
   */
  public async analyzeJob(request: JobAnalysisRequest): Promise<ComprehensiveJobAnalysis> {
    await this.initialize();

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('comprehensive_job_analysis');

    return circuitBreaker.execute(async () => {
      const startTime = Date.now();

      try {
        // Parallel execution of ML analyses
        const [complexity, nlpAnalysis, pricingPrediction, marketAnalysis] = await Promise.all([
          jobAnalysisMLService.analyzeJobComplexity({
            title: request.title,
            description: request.description,
            category: request.category,
            budget: request.budget,
            images: request.images,
            location: request.location,
          }),
          jobAnalysisMLService.analyzeJobText(request.title, request.description),
          pricingMLService.predictJobPricing({
            jobCategory: request.category,
            description: request.description,
            skillsRequired: [], // Would extract from NLP analysis
            location: request.location || { lat: 0, lng: 0 },
            urgency: 'medium', // Default, could be derived from NLP
            estimatedDuration: 8, // Default, could be derived from complexity
            materialComplexity: 0.5, // Default, could be derived from analysis
            customerBudget: request.budget,
          }),
          pricingMLService.analyzeMarketRates(
            request.category,
            request.location || { lat: 0, lng: 0 }
          ),
        ]);

        // Generate combined recommendations
        const recommendations = await this._generateCombinedRecommendations(
          complexity,
          nlpAnalysis,
          pricingPrediction,
          marketAnalysis
        );

        // Calculate overall confidence score
        const confidenceScore = this._calculateOverallConfidence(
          complexity,
          nlpAnalysis,
          pricingPrediction
        );

        const processingTime = Date.now() - startTime;

        // Track performance
        await performanceAnalyticsMLService.trackPrediction(
          'comprehensive_analysis',
          [confidenceScore, processingTime / 1000],
          [complexity.overallComplexity, pricingPrediction.estimatedPrice],
          confidenceScore,
          processingTime
        );

        return {
          complexity,
          nlpAnalysis,
          pricingPrediction,
          marketAnalysis,
          recommendations,
          processingTime,
          confidenceScore,
        };
      } catch (error) {
        logger.error('Comprehensive job analysis failed', error as Error);
        throw error;
      }
    });
  }

  /**
   * Get contractor recommendations with intelligent matching
   */
  public async getContractorRecommendations(
    request: ContractorRecommendationRequest
  ): Promise<ContractorMatchResult[]> {
    await this.initialize();

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('contractor_recommendations');

    return circuitBreaker.execute(async () => {
      const startTime = Date.now();

      try {
        let recommendations: ContractorMatchResult[];

        // Use personalized recommendations if client history is available
        if (request.clientHistory) {
          recommendations = await contractorMatchingMLService.getPersonalizedRecommendations(
            request.clientHistory,
            request.jobRequirements,
            request.availableContractors
          );
        } else {
          recommendations = await contractorMatchingMLService.findContractorMatches(
            request.jobRequirements,
            request.availableContractors,
            request.maxResults
          );
        }

        const processingTime = Date.now() - startTime;

        // Track performance
        await performanceAnalyticsMLService.trackPrediction(
          'contractor_matching',
          [request.availableContractors.length, request.jobRequirements.complexity],
          [recommendations.length, recommendations[0]?.matchScore || 0],
          recommendations.length > 0 ? 0.8 : 0.3,
          processingTime
        );

        return recommendations;
      } catch (error) {
        logger.error('Contractor recommendations failed', error as Error);
        throw error;
      }
    });
  }

  /**
   * Get intelligent pricing recommendations
   */
  public async getPricingInsights(
    jobCategory: string,
    location: { lat: number; lng: number; region?: string },
    customerBudget?: number
  ): Promise<{
    marketAnalysis: MarketRateAnalysis;
    recommendations: string[];
    budgetAssessment?: {
      status: 'below_market' | 'market_rate' | 'above_market';
      adjustment: number;
      explanation: string;
    };
  }> {
    await this.initialize();

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('pricing_insights');

    return circuitBreaker.execute(async () => {
      const startTime = Date.now();

      const marketAnalysis = await pricingMLService.analyzeMarketRates(jobCategory, location);

      const recommendations: string[] = [];
      let budgetAssessment;

      if (customerBudget) {
        const averageMarketRate = marketAnalysis.averageRate;
        const ratio = customerBudget / averageMarketRate;

        if (ratio < 0.8) {
          budgetAssessment = {
            status: 'below_market' as const,
            adjustment: averageMarketRate - customerBudget,
            explanation: 'Budget is below typical market rates for this type of work',
          };
          recommendations.push('Consider increasing budget to attract quality contractors');
        } else if (ratio > 1.3) {
          budgetAssessment = {
            status: 'above_market' as const,
            adjustment: customerBudget - averageMarketRate,
            explanation: 'Budget is above typical market rates - you may get premium service',
          };
          recommendations.push('Budget allows for premium contractors and expedited service');
        } else {
          budgetAssessment = {
            status: 'market_rate' as const,
            adjustment: 0,
            explanation: 'Budget is aligned with current market rates',
          };
          recommendations.push('Budget is competitive for this type of work');
        }
      }

      // Add market-based recommendations
      if (marketAnalysis.demandIndicator === 'high') {
        recommendations.push('High demand market - consider booking early');
      }

      if (marketAnalysis.marketTrend === 'rising') {
        recommendations.push('Market rates are rising - current timing may be favorable');
      }

      const processingTime = Date.now() - startTime;

      await performanceAnalyticsMLService.trackPrediction(
        'pricing_insights',
        [marketAnalysis.averageRate, customerBudget || 0],
        [marketAnalysis.averageRate],
        0.85,
        processingTime
      );

      return {
        marketAnalysis,
        recommendations,
        budgetAssessment,
      };
    });
  }

  /**
   * Get ML system health status
   */
  public async getHealthStatus(): Promise<MLHealthStatus> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('ml_health_check');

    return circuitBreaker.execute(async () => {
      const [coreHealth, performanceInsights] = await Promise.all([
        mlCoreService.healthCheck(),
        performanceAnalyticsMLService.getPerformanceInsights(),
      ]);

      // Check individual service status
      const services = {
        jobAnalysis: await this._checkServiceHealth('jobAnalysis'),
        pricing: await this._checkServiceHealth('pricing'),
        matching: await this._checkServiceHealth('matching'),
        analytics: await this._checkServiceHealth('analytics'),
      };

      // Determine overall status
      let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (coreHealth.status === 'unhealthy') {
        overall = 'unhealthy';
      } else if (coreHealth.status === 'degraded' || Object.values(services).includes('error')) {
        overall = 'degraded';
      }

      return {
        overall,
        core: coreHealth,
        services,
        performance: performanceInsights,
        lastHealthCheck: new Date().toISOString(),
      };
    });
  }

  /**
   * Get comprehensive performance report
   */
  public async getPerformanceReport(): Promise<{
    report: any;
    modelMetrics: ModelPerformanceMetrics[];
    insights: PerformanceInsights;
  }> {
    await this.initialize();

    const [report, modelMetrics, insights] = await Promise.all([
      performanceAnalyticsMLService.generatePerformanceReport(24),
      performanceAnalyticsMLService.getAllModelPerformance(),
      performanceAnalyticsMLService.getPerformanceInsights(),
    ]);

    return {
      report,
      modelMetrics,
      insights,
    };
  }

  /**
   * Cleanup and dispose all services
   */
  public dispose(): void {
    mlCoreService.dispose();
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Perform service initialization
   */
  private async _performInitialization(): Promise<void> {
    try {
      logger.info('Initializing ML Service Coordinator');

      // Initialize core ML infrastructure
      await mlCoreService.initialize();

      // Verify all services are accessible
      await this._verifyServiceAvailability();

      logger.info('ML Service Coordinator initialized successfully');
    } catch (error) {
      logger.error('ML Service Coordinator initialization failed', error as Error);
      throw error;
    }
  }

  /**
   * Verify all ML services are available
   */
  private async _verifyServiceAvailability(): Promise<void> {
    const verificationPromises = [
      this._verifyService('jobAnalysis', () => jobAnalysisMLService),
      this._verifyService('pricing', () => pricingMLService),
      this._verifyService('matching', () => contractorMatchingMLService),
      this._verifyService('analytics', () => performanceAnalyticsMLService),
    ];

    await Promise.all(verificationPromises);
  }

  /**
   * Verify individual service availability
   */
  private async _verifyService(serviceName: string, serviceFactory: () => any): Promise<void> {
    try {
      const service = serviceFactory();
      if (!service) {
        throw new Error(`Service ${serviceName} not available`);
      }
      logger.info('Service verified', { serviceName });
    } catch (error) {
      logger.error('Service verification failed', { serviceName, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Check individual service health
   */
  private async _checkServiceHealth(serviceName: string): Promise<'online' | 'offline' | 'error'> {
    try {
      // Mock health check - would implement actual health checks for each service
      return 'online';
    } catch (error) {
      logger.error('Service health check failed', { serviceName, error: (error as Error).message });
      return 'error';
    }
  }

  /**
   * Generate combined recommendations from all analyses
   */
  private async _generateCombinedRecommendations(
    complexity: JobComplexityResult,
    nlpAnalysis: NLPAnalysisResult,
    pricingPrediction: PricingPredictionResult,
    marketAnalysis: MarketRateAnalysis
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Complexity-based recommendations
    recommendations.push(...complexity.recommendations);

    // NLP-based recommendations
    if (nlpAnalysis.urgency === 'high') {
      recommendations.push('High urgency detected - consider expedited contractor matching');
    }

    if (nlpAnalysis.skillsDetected.length > 3) {
      recommendations.push('Multiple specialized skills required - seek experienced contractors');
    }

    // Pricing-based recommendations
    if (pricingPrediction.marketComparison.percentile > 80) {
      recommendations.push('Estimated price is above market average - consider budget adjustment');
    }

    // Market-based recommendations
    if (marketAnalysis.demandIndicator === 'high') {
      recommendations.push('High market demand - early booking recommended');
    }

    // Cross-domain recommendations
    if (complexity.overallComplexity > 0.8 && pricingPrediction.confidence < 0.7) {
      recommendations.push('Complex job with uncertain pricing - detailed consultation recommended');
    }

    // Get specific recommendations from job analysis service
    const jobRecommendations = await jobAnalysisMLService.getJobRecommendations(
      complexity,
      nlpAnalysis
    );
    recommendations.push(...jobRecommendations);

    // Remove duplicates and return unique recommendations
    return Array.from(new Set(recommendations));
  }

  /**
   * Calculate overall confidence score
   */
  private _calculateOverallConfidence(
    complexity: JobComplexityResult,
    nlpAnalysis: NLPAnalysisResult,
    pricingPrediction: PricingPredictionResult
  ): number {
    const complexityConfidence = complexity.confidenceScore;
    const nlpConfidence = nlpAnalysis.estimatedDuration.confidence;
    const pricingConfidence = pricingPrediction.confidence;

    // Weighted average with pricing being most important
    const weightedConfidence =
      (complexityConfidence * 0.3) +
      (nlpConfidence * 0.2) +
      (pricingConfidence * 0.5);

    return Math.min(1, Math.max(0, weightedConfidence));
  }
}

// Export singleton instance
export const mlServiceCoordinator = MLServiceCoordinator.getInstance();

// Export unified interface for backward compatibility
export class MLEngine {
  /**
   * Comprehensive job analysis
   */
  public static async analyzeJob(request: JobAnalysisRequest): Promise<ComprehensiveJobAnalysis> {
    return mlServiceCoordinator.analyzeJob(request);
  }

  /**
   * Contractor recommendations
   */
  public static async getContractorRecommendations(
    request: ContractorRecommendationRequest
  ): Promise<ContractorMatchResult[]> {
    return mlServiceCoordinator.getContractorRecommendations(request);
  }

  /**
   * Pricing insights
   */
  public static async getPricingInsights(
    jobCategory: string,
    location: { lat: number; lng: number; region?: string },
    customerBudget?: number
  ) {
    return mlServiceCoordinator.getPricingInsights(jobCategory, location, customerBudget);
  }

  /**
   * Health status
   */
  public static async getHealthStatus(): Promise<MLHealthStatus> {
    return mlServiceCoordinator.getHealthStatus();
  }

  /**
   * Performance report
   */
  public static async getPerformanceReport() {
    return mlServiceCoordinator.getPerformanceReport();
  }

  /**
   * Initialize ML engine
   */
  public static async initialize(): Promise<void> {
    return mlServiceCoordinator.initialize();
  }

  /**
   * Cleanup ML engine
   */
  public static dispose(): void {
    mlServiceCoordinator.dispose();
  }
}