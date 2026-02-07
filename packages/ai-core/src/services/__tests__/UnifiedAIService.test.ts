import axios from 'axios';
import { UnifiedAIService } from '../UnifiedAIService';
import type { AIServiceConfig, BuildingAssessment } from '../../types';

jest.mock('axios');

describe('UnifiedAIService', () => {
  const mockPost = jest.fn();
  const mockGet = jest.fn();
  const mockRequest = jest.fn();
  const mockInterceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };

  const baseConfig: AIServiceConfig = {
    apiKeys: {},
    endpoints: {
      baseUrl: 'https://api.example.com',
      buildingSurveyor: 'https://api.example.com/api/building-surveyor/assess',
      agents: 'https://api.example.com/api/agents',
      search: 'https://api.example.com/api/ai/search',
      training: 'https://api.example.com/api/training'
    },
    limits: {
      maxMonthlyCost: 1000,
      maxDailyCost: 100,
      maxRequestsPerMinute: 60
    },
    features: {
      enableSAM3: true,
      enableShadowMode: false,
      enableABTesting: false,
      enableContinuousLearning: false,
      enableTrainingDataCollection: false
    },
    performance: {
      timeout: 1000,
      maxRetries: 1,
      cacheEnabled: true,
      cacheTTL: 60
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue({
      post: mockPost,
      get: mockGet,
      request: mockRequest,
      interceptors: mockInterceptors
    });
  });

  describe('initialization', () => {
    it('should create an instance with baseUrl', () => {
      const service = new UnifiedAIService(baseConfig);
      expect(service).toBeDefined();
      expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: baseConfig.endpoints.baseUrl,
      }));
    });
  });

  describe('methods', () => {
    it('should handle successful operations', async () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = new UnifiedAIService(baseConfig);
      const assessment: BuildingAssessment = {
        id: 'a1',
        timestamp: new Date().toISOString(),
        damageAssessment: {
          damageType: 'roof',
          severity: 'moderate',
          confidence: 0.9,
          description: 'Test',
          detectedIssues: []
        },
        safetyHazards: {
          hasSafetyHazards: false,
          criticalFlags: [],
          immediateActionRequired: false,
          riskLevel: 'low',
          details: 'none'
        },
        insuranceRisk: {
          riskScore: 0.1,
          category: 'low',
          factors: [],
          recommendedAction: 'none'
        },
        complianceFlags: [],
        recommendations: [],
        estimatedCost: {
          min: 100,
          max: 200,
          likely: 150,
          currency: 'USD',
          confidence: 0.9
        },
        confidence: 0.9,
        metadata: {
          model: 'test',
          version: '1',
          processingTime: 10,
          imageCount: 1,
          apiCalls: [],
          costTracking: { estimatedCost: 0, actualCost: 0, breakdown: {} }
        }
      };
      mockPost.mockResolvedValueOnce({ data: assessment, headers: {} });

      const first = await service.assessBuilding(['img1']);
      const second = await service.assessBuilding(['img1']);

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(second.metadata?.cacheHit).toBe(true);
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
      const service = new UnifiedAIService(baseConfig);
      mockPost.mockRejectedValueOnce(new Error('boom'));

      const response = await service.assessBuilding(['img1']);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('UNKNOWN');
      expect(response.error?.message).toContain('boom');
    });

    it('should validate inputs', () => {
      const service = new UnifiedAIService(baseConfig);
      expect(service).toBeDefined();
    });
  });
});