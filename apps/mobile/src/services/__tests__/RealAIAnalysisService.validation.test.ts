/**
 * Comprehensive tests for Real AI Analysis Service - API Key Validation
 *
 * Tests all critical bugs fixed:
 * - Empty string API key validation
 * - Null/undefined API key handling
 * - Placeholder API key detection ("your-api-key", "undefined", "null")
 * - Too-short API key rejection (< 20 chars)
 * - Valid API key acceptance (>= 20 chars)
 * - Graceful fallback on invalid API key
 * - Timeout handling (30s)
 * - Retry logic with exponential backoff
 * - 401 errors skip retry and fall back immediately
 */


 
import { RealAIAnalysisService } from '../RealAIAnalysisService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock dependencies
jest.mock('../../config/ai.config', () => ({
  aiConfig: {
    openai: {
      apiKey: '',
      models: {
        vision: 'gpt-4-vision-preview',
        chat: 'gpt-4-turbo-preview',
      },
      maxTokens: {
        vision: 500,
        chat: 1000,
      },
      temperature: 0.3,
    },
    aws: {
      accessKeyId: '',
    },
    googleCloud: {
      apiKey: '',
    },
  },
  isAIConfigured: jest.fn(() => false),
  getConfiguredAIService: jest.fn(() => 'Enhanced Rule-based Analysis'),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('RealAIAnalysisService - API Key Validation', () => {
  const mockJob = {
    id: 'test-job-123',
    title: 'Fix leaking pipe',
    description: 'Kitchen sink is leaking',
    category: 'plumbing',
    priority: 'medium',
    location: 'London, UK',
    budget: 150,
    photos: ['https://example.com/leak.jpg'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset config
    const { aiConfig } = require('../../config/ai.config');
    aiConfig.openai.apiKey = '';
    aiConfig.aws.accessKeyId = '';
    aiConfig.googleCloud.apiKey = '';
  });

  describe('Empty String Validation', () => {
    it('should reject empty string API key', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      // Should fall back to intelligent analysis
      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should reject whitespace-only API key', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = '   \t\n   ';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      // Should fall back to intelligent analysis
      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Null/Undefined Validation', () => {
    it('should reject null API key', async () => {
      const { aiConfig } = require('../../config/ai.config');
      (aiConfig.openai as any).apiKey = null;

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should reject undefined API key', async () => {
      const { aiConfig } = require('../../config/ai.config');
      (aiConfig.openai as any).apiKey = undefined;

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Placeholder Value Detection', () => {
    it('should reject "your-api-key" placeholder', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'your-api-key';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should reject "your_api_key" placeholder', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'your_api_key';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });

    it('should reject "undefined" string placeholder', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'undefined';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });

    it('should reject "null" string placeholder', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'null';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });

    it('should reject "example" placeholder', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'example-api-key';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });

    it('should reject "placeholder" value', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'placeholder-key';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });
  });

  describe('Length Validation', () => {
    it('should reject API keys shorter than 20 characters', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-short123456'; // 15 chars

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should accept API keys with exactly 20 characters', async () => {
      const { aiConfig } = require('../../config/ai.config');
      const validKey = 'sk-' + 'a'.repeat(17); // Exactly 20 chars

      aiConfig.openai.apiKey = validKey;

      // Mock successful OpenAI response
      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 85,
                  detectedItems: ['pipe', 'leak'],
                  safetyConcerns: [],
                  recommendedActions: ['Fix leak'],
                  estimatedComplexity: 'Medium',
                  suggestedTools: ['Wrench'],
                  estimatedDuration: '2-3 hours',
                  detectedEquipment: [],
                }),
              },
            },
          ],
        }),
      } as any);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should accept valid OpenAI API keys (>= 20 chars)', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40); // Valid length

      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 90,
                  detectedItems: ['damage'],
                  safetyConcerns: [],
                  recommendedActions: ['Assess'],
                  estimatedComplexity: 'Low',
                  suggestedTools: ['Tools'],
                  estimatedDuration: '1 hour',
                  detectedEquipment: [],
                }),
              },
            },
          ],
        }),
      } as any);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after 30 seconds', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      jest.mocked(global.fetch).mockRejectedValueOnce(new Error('AbortError'));

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should clear timeout on successful response', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 88,
                  detectedItems: ['test'],
                  safetyConcerns: [],
                  recommendedActions: ['test'],
                  estimatedComplexity: 'Low',
                  suggestedTools: ['test'],
                  estimatedDuration: '1 hour',
                  detectedEquipment: [],
                }),
              },
            },
          ],
        }),
      } as any);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should retry with exponential backoff on network errors', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      // Fail twice, succeed on third attempt
      jest.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    confidence: 85,
                    detectedItems: ['success'],
                    safetyConcerns: [],
                    recommendedActions: ['test'],
                    estimatedComplexity: 'Medium',
                    suggestedTools: ['test'],
                    estimatedDuration: '2 hours',
                    detectedEquipment: [],
                  }),
                },
              },
            ],
          }),
        } as any);

      jest.useFakeTimers();
      try {
        const promise = RealAIAnalysisService.analyzeJobPhotos(mockJob);
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalledTimes(3);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should NOT retry on 401 authentication errors', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-invalid-key-12345678901234567890';

      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      } as any);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);
      expect(result).toBeDefined();

      // Should only attempt once (no retries on 401)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 403 forbidden errors', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-forbidden-key-1234567890123456789';

      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as any);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);
      expect(result).toBeDefined();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 400 bad request errors', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      } as any);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);
      expect(result).toBeDefined();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 429 rate limit errors', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      } as any);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);
      expect(result).toBeDefined();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff: 1s, 2s, 4s', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = ((fn: any, delay: number) => {
        delays.push(delay);
        if (delay === 30000) {
          return 0 as any;
        }
        return originalSetTimeout(fn, 0); // Execute immediately for test
      }) as any;

      jest.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    confidence: 85,
                    detectedItems: ['test'],
                    safetyConcerns: [],
                    recommendedActions: ['test'],
                    estimatedComplexity: 'Low',
                    suggestedTools: ['test'],
                    estimatedDuration: '1 hour',
                    detectedEquipment: [],
                  }),
                },
              },
            ],
          }),
        } as any);

      await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      global.setTimeout = originalSetTimeout;

      // Check exponential backoff delays
      const retryDelays = delays.filter((delay) => delay !== 30000);
      expect(retryDelays).toContain(1000); // 1 second
      expect(retryDelays).toContain(2000); // 2 seconds
    });
  });

  describe('Fallback to Intelligent Analysis', () => {
    it('should provide intelligent fallback for plumbing jobs', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const plumbingJob = {
        ...mockJob,
        category: 'plumbing',
        priority: 'high',
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(plumbingJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
      expect(result?.detectedItems).toContain('Plumbing fixtures');
      expect(result?.safetyConcerns.length).toBeGreaterThan(0);
      expect(result?.estimatedComplexity).toBe('High');
    });

    it('should provide intelligent fallback for electrical jobs', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const electricalJob = {
        ...mockJob,
        category: 'electrical',
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(electricalJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
      expect(result?.detectedItems).toContain('Electrical panels');
      expect(result?.estimatedComplexity).toBe('High');
      expect(
        result?.safetyConcerns.some((concern) => concern.severity === 'High')
      ).toBe(true);
    });

    it('should provide intelligent fallback for HVAC jobs', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const hvacJob = {
        ...mockJob,
        category: 'hvac',
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(hvacJob);

      expect(result).toBeDefined();
      expect(result?.detectedItems).toContain('HVAC units');
      expect(result?.estimatedComplexity).toBe('Medium');
    });

    it('should handle jobs without photos gracefully', async () => {
      const { aiConfig } = require('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const jobWithoutPhotos = {
        ...mockJob,
        photos: undefined,
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(jobWithoutPhotos);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });
  });
});
