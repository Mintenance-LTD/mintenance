/**
 * Mobile AI Service Wrapper
 * Provides all AI functionality to mobile app using the unified service
 */

import {
  UnifiedAIService,
  BuildingAssessment,
  PricingRecommendation,
  AgentDecision,
  SearchResult,
  SearchFilters,
  ESGScore,
  ImageAnalysis,
  SemanticSearchQuery,
  AgentContext,
  AIServiceResponse,
  AIServiceConfig,
  UserCorrection,
} from '@mintenance/ai-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config/environment';
import { logger } from '@mintenance/shared';
import { buildFallbackAssessment } from './aiFallbacks';

// Mobile-specific configuration
const mobileConfig: AIServiceConfig = {
  apiKeys: {
    // These are handled server-side for security
  },
  endpoints: {
    buildingSurveyor: config.apiBaseUrl + '/api/building-surveyor/assess',
    agents: config.apiBaseUrl + '/api/agents',
    search: config.apiBaseUrl + '/api/ai/search',
    training: config.apiBaseUrl + '/api/training',
  },
  limits: {
    daily: 100,
    weekly: 500,
    monthly: 2000,
    perUser: 50,
    perRequest: 10,
  },
  features: {
    enableSAM3: true,
    enableShadowMode: false, // Testing in production
    enableABTesting: true,
    enableContinuousLearning: true,
    enableTrainingDataCollection: true,
  },
  performance: {
    timeout: 30000,
    maxRetries: 3,
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
  },
};

class UnifiedAIServiceMobile {
  private service: UnifiedAIService;
  private static instance: UnifiedAIServiceMobile;

  private constructor() {
    this.service = new UnifiedAIService(mobileConfig);
    this.setupAuthInterceptor();
  }

  static getInstance(): UnifiedAIServiceMobile {
    if (!UnifiedAIServiceMobile.instance) {
      UnifiedAIServiceMobile.instance = new UnifiedAIServiceMobile();
    }
    return UnifiedAIServiceMobile.instance;
  }

  /**
   * Setup authentication for API calls
   * Auth is handled by mobileApiClient interceptor (see S2.1),
   * so this is intentionally a no-op.
   */
  private setupAuthInterceptor() {
    // Auth tokens are managed by mobileApiClient's 401 interceptor
  }

  /**
   * Assess building damage with full AI pipeline
   * Same as web - uses GPT-4, Roboflow, Google Vision, SAM3, Bayesian Fusion
   */
  async assessBuilding(
    images: string[],
    jobDetails?: {
      title?: string;
      description?: string;
      category?: string;
      location?: string;
      jobId?: string;
      propertyId?: string;
      gps?: { latitude: number; longitude: number };
      roomMetadata?: {
        room?: string;
        floor?: number;
        dimensions?: string;
        orientation?: string;
      };
    }
  ): Promise<BuildingAssessment | null> {
    try {
      const response = await this.service.assessBuilding(images, {
        description: jobDetails?.description,
        category: jobDetails?.category,
        location: jobDetails?.location,
        jobId: jobDetails?.jobId,
        propertyId: jobDetails?.propertyId,
        gps: jobDetails?.gps,
        roomMetadata: jobDetails?.roomMetadata,
      });

      if (response.success && response.data) {
        // Store assessment locally for offline access
        await this.storeAssessmentLocally(response.data);
        return response.data;
      }

      // Use fallback if API fails
      return this.getFallbackAssessment(images, jobDetails);
    } catch (error) {
      logger.error('Building assessment failed:', error, { service: 'mobile' });
      return this.getFallbackAssessment(images, jobDetails);
    }
  }

  /**
   * Get AI pricing recommendations
   */
  async getPricingRecommendation(
    jobId: string,
    contractorId?: string
  ): Promise<PricingRecommendation | null> {
    try {
      const response = await this.service.getPricingRecommendation(
        jobId,
        contractorId
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      logger.error('Pricing recommendation failed:', error, {
        service: 'mobile',
      });
      return null;
    }
  }

  /**
   * Request agent decision
   */
  async requestAgentDecision(
    agentName: string,
    context: AgentContext
  ): Promise<AgentDecision | null> {
    try {
      const response = await this.service.requestAgentDecision(
        agentName,
        context
      );

      if (response.success && response.data) {
        // Store decision for offline reference
        await this.storeAgentDecision(response.data);
        return response.data;
      }

      return null;
    } catch (error) {
      logger.error('Agent decision failed:', error, { service: 'mobile' });
      return null;
    }
  }

  /**
   * Semantic search
   */
  async search(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      const searchQuery: SemanticSearchQuery = {
        query,
        filters,
        limit: 20,
      };

      const response = await this.service.search(searchQuery);

      if (response.success && response.data) {
        return response.data;
      }

      // Fallback to local search
      return this.performLocalSearch(query, filters);
    } catch (error) {
      logger.error('Search failed:', error, { service: 'mobile' });
      return this.performLocalSearch(query, filters);
    }
  }

  /**
   * Calculate ESG/Sustainability score
   */
  async calculateESGScore(contractorId: string): Promise<ESGScore | null> {
    try {
      const response = await this.service.calculateESGScore(contractorId);

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      logger.error('ESG calculation failed:', error, { service: 'mobile' });
      return null;
    }
  }

  /**
   * Analyze images
   */
  async analyzeImages(images: string[]): Promise<ImageAnalysis[]> {
    try {
      const response = await this.service.analyzeImages(images);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      logger.error('Image analysis failed:', error, { service: 'mobile' });
      return [];
    }
  }

  /**
   * Submit corrections for training
   */
  async submitCorrections(
    assessmentId: string,
    corrections: UserCorrection[]
  ): Promise<boolean> {
    try {
      const response = await this.service.submitCorrections(
        assessmentId,
        corrections
      );

      return response.success;
    } catch (error) {
      logger.error('Correction submission failed:', error, {
        service: 'mobile',
      });
      return false;
    }
  }

  /**
   * Get usage metrics
   */
  async getUsageMetrics(): Promise<unknown> {
    try {
      const response = await this.service.getUsageMetrics('monthly');

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch usage metrics:', error, {
        service: 'mobile',
      });
      return null;
    }
  }

  /**
   * Agent-specific methods for better mobile UX
   */
  async autoAcceptBid(jobId: string, bidId: string): Promise<boolean> {
    const response = await this.service.completeAgentAction(
      'BidAcceptanceAgent',
      'auto-accept',
      { jobId, bidId }
    );
    return response.success;
  }

  async scheduleAppointment(
    jobId: string,
    contractorId: string,
    preferredTimes: Date[]
  ): Promise<Date | null> {
    const response = await this.service.completeAgentAction(
      'SchedulingAgent',
      'schedule',
      { jobId, contractorId, preferredTimes }
    );

    const data = response.data as { appointmentTime?: string } | undefined;
    if (response.success && data?.appointmentTime) {
      return new Date(data.appointmentTime);
    }
    return null;
  }

  async resolveDispute(
    jobId: string,
    disputeDetails: unknown
  ): Promise<unknown> {
    const response = await this.service.completeAgentAction(
      'DisputeResolutionAgent',
      'resolve',
      { jobId, disputeDetails }
    );
    return response.data;
  }

  async predictJobDemand(category: string, location: string): Promise<unknown> {
    const response = await this.service.completeAgentAction(
      'PredictiveAgent',
      'predict-demand',
      { category, location }
    );
    return response.data;
  }

  // Helper methods for mobile-specific functionality

  /**
   * Store assessment locally for offline access
   */
  private async storeAssessmentLocally(
    assessment: BuildingAssessment
  ): Promise<void> {
    try {
      const key = `assessment_${assessment.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(assessment));

      // Store list of assessment IDs
      const assessmentIds = await this.getStoredAssessmentIds();
      assessmentIds.push(assessment.id);
      await AsyncStorage.setItem(
        'assessment_ids',
        JSON.stringify(assessmentIds)
      );
    } catch (error) {
      logger.error('Failed to store assessment locally:', error, {
        service: 'mobile',
      });
    }
  }

  /**
   * Get stored assessment IDs
   */
  private async getStoredAssessmentIds(): Promise<string[]> {
    try {
      const ids = await AsyncStorage.getItem('assessment_ids');
      return ids ? JSON.parse(ids) : [];
    } catch {
      return [];
    }
  }

  /**
   * Store agent decision locally
   */
  private async storeAgentDecision(decision: AgentDecision): Promise<void> {
    try {
      const key = `decision_${decision.agentName}_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify(decision));
    } catch (error) {
      logger.error('Failed to store agent decision:', error, {
        service: 'mobile',
      });
    }
  }

  /**
   * Fallback assessment for offline/error scenarios.
   * Delegates to the extracted helper in ./aiFallbacks.
   */
  private getFallbackAssessment(
    images: string[],
    jobDetails?: { category?: string }
  ): BuildingAssessment | null {
    return buildFallbackAssessment(images, jobDetails);
  }

  /**
   * Perform local search when API is unavailable
   */
  private async performLocalSearch(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    // Implement basic local search using AsyncStorage
    // This would search through cached jobs, contractors, etc.
    return [];
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.service.clearCache();

    // Clear local storage cache
    const assessmentIds = await this.getStoredAssessmentIds();
    for (const id of assessmentIds) {
      await AsyncStorage.removeItem(`assessment_${id}`);
    }
    await AsyncStorage.removeItem('assessment_ids');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): unknown {
    return this.service.getCacheStats();
  }
}

// Export singleton instance
export default UnifiedAIServiceMobile.getInstance();
