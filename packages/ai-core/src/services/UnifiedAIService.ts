/**
 * Unified AI Service
 * Provides consistent AI functionality across web and mobile platforms
 * Mobile calls these methods which internally use web API endpoints
 */
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
// import type { User } from '@/types';
import {
  BuildingAssessment,
  PricingRecommendation,
  AgentDecision,
  SearchResult,
  ESGScore,
  ImageAnalysis,
  SemanticSearchQuery,
  AgentContext,
  AIServiceResponse,
  AIServiceConfig,
  TrainingDataEntry,
  UserCorrection,
  UsageMetrics,
  ModelTrainingConfig,
  TrainingProgress,
  ResponseMetadata,
} from '../types';
import {
  generateRequestId,
  getPlatform,
  createMetadata,
  createEmptyMetadata,
} from './aiMetadataHelpers';
export class UnifiedAIService {
  private apiClient: AxiosInstance;
  private config: AIServiceConfig;
  private cache: Map<
    string,
    { data: Record<string, unknown>; timestamp: number }
  > = new Map();
  private maxCacheEntries = 1000;
  constructor(config: AIServiceConfig) {
    this.config = config;
    this.apiClient = axios.create({
      baseURL:
        config.endpoints.baseUrl ||
        config.endpoints.buildingSurveyor.replace(
          '/api/building-surveyor/assess',
          ''
        ),
      timeout: config.performance.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // Add request interceptor for auth and tracking
    this.apiClient.interceptors.request.use((config) => {
      config.headers['X-Request-ID'] = generateRequestId();
      config.headers['X-Platform'] = getPlatform();
      return config;
    });
    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          return this.retryRequest(error);
        }
        return Promise.reject(error);
      }
    );
  }
  /**
   * Building Assessment - Main AI feature
   * Uses GPT-4 Vision, Roboflow, Google Vision, SAM3, and Bayesian Fusion
   */
  async assessBuilding(
    images: string[],
    context?: {
      description?: string;
      category?: string;
      location?: string;
      urgency?: string;
      gps?: { latitude: number; longitude: number };
      roomMetadata?: {
        room?: string;
        floor?: number;
        dimensions?: string;
        orientation?: string;
      };
      jobId?: string;
      propertyId?: string;
    }
  ): Promise<AIServiceResponse<BuildingAssessment>> {
    const cacheKey = this.getCacheKey('assess', images, context);
    // Check cache first
    if (this.config.performance.cacheEnabled) {
      const cached = this.getFromCache<BuildingAssessment>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            requestId: generateRequestId(),
            timestamp: new Date().toISOString(),
            processingTime: 0,
            apiCalls: 0,
            totalCost: 0,
            cacheHit: true,
            modelVersion: this.config.features.enableShadowMode
              ? 'shadow'
              : 'production',
          },
        };
      }
    }
    try {
      const startTime = Date.now();
      // API expects `imageUrls` + top-level gps/roomMetadata/jobId/propertyId
      const response = await this.apiClient.post<BuildingAssessment>(
        '/api/building-surveyor/assess',
        {
          imageUrls: images,
          context: context && {
            location: context.location,
            propertyDetails: context.description,
          },
          ...(context?.jobId && { jobId: context.jobId }),
          ...(context?.propertyId && { propertyId: context.propertyId }),
          ...(context?.gps && { gps: context.gps }),
          ...(context?.roomMetadata && { roomMetadata: context.roomMetadata }),
        }
      );
      const assessment = response.data;
      // Cache the result
      if (this.config.performance.cacheEnabled) {
        this.saveToCache(cacheKey, assessment);
      }
      // Collect training data if enabled
      if (
        this.config.features.enableTrainingDataCollection &&
        assessment.trainingData
      ) {
        await this.submitTrainingData(assessment.trainingData);
      }
      return {
        success: true,
        data: assessment,
        metadata: {
          requestId: response.headers['x-request-id'] || generateRequestId(),
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          apiCalls: assessment.metadata?.apiCalls?.length || 1,
          totalCost: assessment.metadata?.costTracking?.actualCost || 0,
          cacheHit: false,
          modelVersion: assessment.metadata?.version || 'unknown',
        },
      };
    } catch (err: unknown) {
      if (!axios.isAxiosError(err)) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: (err as Error).message || 'Building assessment failed',
            details: err,
            retryable: false,
            fallbackUsed: false,
          },
          metadata: createEmptyMetadata(),
        };
      }
      const error = err;
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message || 'Building assessment failed',
          details: error.response?.data,
          retryable: error.response?.status !== 400,
          fallbackUsed: false,
        },
        metadata: {
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
          processingTime: 0,
          apiCalls: 0,
          totalCost: 0,
          cacheHit: false,
          modelVersion: 'error',
        },
      };
    }
  }
  /**
   * Get AI-powered pricing recommendation
   */
  async getPricingRecommendation(
    jobId: string,
    contractorId?: string,
    proposedPrice?: number
  ): Promise<AIServiceResponse<PricingRecommendation>> {
    try {
      const response = await this.apiClient.get<PricingRecommendation>(
        `/api/jobs/${jobId}/pricing-recommendation`,
        {
          params: { contractorId, proposedPrice },
        }
      );
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Pricing recommendation failed');
    }
  }
  /**
   * Request decision from AI agent
   */
  async requestAgentDecision(
    agentName: string,
    context: AgentContext
  ): Promise<AIServiceResponse<AgentDecision>> {
    try {
      const response = await this.apiClient.post<AgentDecision>(
        '/api/agents/decision',
        {
          agentName,
          context,
        }
      );
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Agent decision failed');
    }
  }
  /**
   * Perform semantic search
   */
  async search(
    query: SemanticSearchQuery
  ): Promise<AIServiceResponse<SearchResult[]>> {
    try {
      const response = await this.apiClient.post<SearchResult[]>(
        '/api/ai/search',
        query
      );
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Search failed');
    }
  }
  /**
   * Calculate ESG/Sustainability score
   */
  async calculateESGScore(
    contractorId: string,
    data?: unknown
  ): Promise<AIServiceResponse<ESGScore>> {
    try {
      const response = await this.apiClient.post<ESGScore>(
        '/api/sustainability/calculate',
        {
          contractorId,
          data,
        }
      );
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'ESG calculation failed');
    }
  }
  /**
   * Analyze images using Google Vision
   */
  async analyzeImages(
    images: string[]
  ): Promise<AIServiceResponse<ImageAnalysis[]>> {
    try {
      const response = await this.apiClient.post<ImageAnalysis[]>(
        '/api/images/analyze',
        { images }
      );
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Image analysis failed');
    }
  }
  /**
   * Submit training data for model improvement
   */
  async submitTrainingData(
    data: TrainingDataEntry
  ): Promise<AIServiceResponse<boolean>> {
    try {
      const response = await this.apiClient.post('/api/training/submit', data);
      return {
        success: true,
        data: true,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Training data submission failed');
    }
  }
  /**
   * Submit user corrections for training
   */
  async submitCorrections(
    assessmentId: string,
    corrections: UserCorrection[]
  ): Promise<AIServiceResponse<boolean>> {
    try {
      const response = await this.apiClient.post('/api/training/corrections', {
        assessmentId,
        corrections,
      });
      return {
        success: true,
        data: true,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Correction submission failed');
    }
  }
  /**
   * Get AI usage metrics
   */
  async getUsageMetrics(
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<AIServiceResponse<UsageMetrics[]>> {
    try {
      const response = await this.apiClient.get<UsageMetrics[]>(
        '/api/ai/metrics',
        { params: { period } }
      );
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch usage metrics');
    }
  }
  /**
   * Start model training (admin only)
   */
  async startModelTraining(
    config: ModelTrainingConfig
  ): Promise<AIServiceResponse<{ trainingId: string }>> {
    try {
      const response = await this.apiClient.post<{ trainingId: string }>(
        '/api/training/start',
        config
      );
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Failed to start model training');
    }
  }
  /**
   * Get training progress
   */
  async getTrainingProgress(
    trainingId: string
  ): Promise<AIServiceResponse<TrainingProgress>> {
    try {
      const response = await this.apiClient.get<TrainingProgress>(
        `/api/training/${trainingId}/progress`
      );
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch training progress');
    }
  }
  /**
   * Complete agent actions
   */
  async completeAgentAction(
    agentName: string,
    action: string,
    context: unknown
  ): Promise<AIServiceResponse<unknown>> {
    const agentEndpoints: { [key: string]: string } = {
      BidAcceptanceAgent: '/api/agents/bid-acceptance',
      SchedulingAgent: '/api/agents/scheduling',
      NotificationAgent: '/api/agents/notification',
      DisputeResolutionAgent: '/api/agents/dispute-resolution',
      EscrowReleaseAgent: '/api/agents/escrow-release',
      JobStatusAgent: '/api/agents/job-status',
      PredictiveAgent: '/api/agents/predictive',
    };
    const endpoint = agentEndpoints[agentName];
    if (!endpoint) {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT',
          message: `Unknown agent: ${agentName}`,
          retryable: false,
          fallbackUsed: false,
        },
        metadata: createEmptyMetadata(),
      };
    }
    try {
      const response = await this.apiClient.post(endpoint, {
        action,
        context,
      });
      return {
        success: true,
        data: response.data,
        metadata: createMetadata(response),
      };
    } catch (error) {
      return this.handleError(error, `${agentName} action failed`);
    }
  }
  // Helper methods
  private getCacheKey(operation: string, ...params: unknown[]): string {
    return `${operation}:${JSON.stringify(params)}`;
  }
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    const age = Date.now() - cached.timestamp;
    if (age > this.config.performance.cacheTTL * 1000) {
      this.cache.delete(key);
      return null;
    }
    // Refresh entry to keep LRU ordering
    this.cache.delete(key);
    this.cache.set(key, cached);
    return cached.data as T;
  }
  private saveToCache<T>(key: string, data: T): void {
    if (this.cache.size >= this.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, {
      data: data as Record<string, unknown>,
      timestamp: Date.now(),
    });
  }
  // generateRequestId, getPlatform, createMetadata, createEmptyMetadata imported from aiMetadataHelpers
  private handleError<T>(
    error: unknown,
    defaultMessage: string
  ): AIServiceResponse<T> {
    const isAxios = axios.isAxiosError(error);
    const axiosError = isAxios ? error : null;
    return {
      success: false,
      error: {
        code: axiosError?.response?.status?.toString() || 'UNKNOWN',
        message: (axiosError ?? (error as Error))?.message || defaultMessage,
        details: axiosError?.response?.data ?? error,
        retryable:
          isAxios &&
          axiosError?.response?.status !== 400 &&
          axiosError?.response?.status !== 401,
        fallbackUsed: false,
      },
      metadata: createEmptyMetadata(),
    };
  }
  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config;
    if (!config) return Promise.reject(error);
    const retryCount = Number(config.headers?.['X-Retry-Count'] ?? 0);
    if (retryCount >= this.config.performance.maxRetries)
      return Promise.reject(error);
    const retryAfter = error.response?.headers?.['retry-after'];
    await new Promise((resolve) =>
      setTimeout(resolve, retryAfter ? parseInt(retryAfter) * 1000 : 5000)
    );
    config.headers.set('X-Retry-Count', retryCount + 1);
    return this.apiClient.request(config);
  }
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: JSON.stringify([...this.cache.entries()]).length,
      entries: this.cache.size,
    };
  }
}
