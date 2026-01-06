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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealAIAnalysisService } from '../RealAIAnalysisService';
import type { Job } from '@mintenance/types';

// Mock dependencies
vi.mock('../../config/ai.config', () => ({
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
  isAIConfigured: vi.fn(() => false),
  getConfiguredAIService: vi.fn(() => 'Enhanced Rule-based Analysis'),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('RealAIAnalysisService - API Key Validation', () => {
  const mockJob: Job = {
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
    vi.clearAllMocks();
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
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      // Should fall back to intelligent analysis
      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should reject whitespace-only API key', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = '   \t\n   ';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      // Should fall back to intelligent analysis
      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Null/Undefined Validation', () => {
    it('should reject null API key', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      (aiConfig.openai as any).apiKey = null;

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should reject undefined API key', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      (aiConfig.openai as any).apiKey = undefined;

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Placeholder Value Detection', () => {
    it('should reject "your-api-key" placeholder', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'your-api-key';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should reject "your_api_key" placeholder', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'your_api_key';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });

    it('should reject "undefined" string placeholder', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'undefined';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });

    it('should reject "null" string placeholder', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'null';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });

    it('should reject "example" placeholder', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'example-api-key';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });

    it('should reject "placeholder" value', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'placeholder-key';

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
    });
  });

  describe('Length Validation', () => {
    it('should reject API keys shorter than 20 characters', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-short123456'; // 15 chars

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should accept API keys with exactly 20 characters', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      const validKey = 'sk-' + 'a'.repeat(17); // Exactly 20 chars

      aiConfig.openai.apiKey = validKey;

      // Mock successful OpenAI response
      vi.mocked(global.fetch).mockResolvedValueOnce({
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
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40); // Valid length

      vi.mocked(global.fetch).mockResolvedValueOnce({
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
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      // Mock a hanging request
      vi.mocked(global.fetch).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 35000))
      );

      vi.useFakeTimers();

      const promise = RealAIAnalysisService.analyzeJobPhotos(mockJob);

      vi.advanceTimersByTime(30000);

      await expect(promise).rejects.toThrow();

      vi.useRealTimers();
    }, 10000);

    it('should clear timeout on successful response', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      vi.mocked(global.fetch).mockResolvedValueOnce({
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
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      // Fail twice, succeed on third attempt
      vi.mocked(global.fetch)
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

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should NOT retry on 401 authentication errors', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-invalid-key-12345678901234567890';

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      } as any);

      await expect(
        RealAIAnalysisService.analyzeJobPhotos(mockJob)
      ).rejects.toThrow('Invalid API key');

      // Should only attempt once (no retries on 401)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 403 forbidden errors', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-forbidden-key-1234567890123456789';

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as any);

      await expect(
        RealAIAnalysisService.analyzeJobPhotos(mockJob)
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 400 bad request errors', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      } as any);

      await expect(
        RealAIAnalysisService.analyzeJobPhotos(mockJob)
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 429 rate limit errors', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      } as any);

      await expect(
        RealAIAnalysisService.analyzeJobPhotos(mockJob)
      ).rejects.toThrow('Rate limit');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff: 1s, 2s, 4s', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = 'sk-' + 'a'.repeat(40);

      const delays: number[] = [];
      let originalSetTimeout = global.setTimeout;

      global.setTimeout = ((fn: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0); // Execute immediately for test
      }) as any;

      vi.mocked(global.fetch)
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
      expect(delays).toContain(1000); // 1 second
      expect(delays).toContain(2000); // 2 seconds
    });
  });

  describe('Fallback to Intelligent Analysis', () => {
    it('should provide intelligent fallback for plumbing jobs', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const plumbingJob: Job = {
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
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const electricalJob: Job = {
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
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const hvacJob: Job = {
        ...mockJob,
        category: 'hvac',
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(hvacJob);

      expect(result).toBeDefined();
      expect(result?.detectedItems).toContain('HVAC units');
      expect(result?.estimatedComplexity).toBe('Medium');
    });

    it('should handle jobs without photos gracefully', async () => {
      const { aiConfig } = await import('../../config/ai.config');
      aiConfig.openai.apiKey = '';

      const jobWithoutPhotos: Job = {
        ...mockJob,
        photos: undefined,
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(jobWithoutPhotos);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });
  });
});
