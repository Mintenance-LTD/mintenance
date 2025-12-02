/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');

// Mock Redis
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

// Import after mocks
import { redis } from '@/lib/redis';

describe('Critic FNR Edge Cases', () => {
  let mockSupabase: any;
  let getFNR: any;
  let getFNRWithFallback: any;
  let shouldEscalate: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock implementation of getFNR
    getFNR = async (modelName: string, version: string) => {
      const cacheKey = `fnr:${modelName}:${version}`;

      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }

      try {
        const { data, error } = await mockSupabase
          .from('model_performance_metrics')
          .select('false_negative_rate, sample_count, last_updated')
          .eq('model_name', modelName)
          .eq('version', version)
          .single();

        if (error) throw error;

        const n = data?.sample_count || 0;
        const fnr = data?.false_negative_rate || 0;

        let confidence: 'none' | 'insufficient' | 'low' | 'medium' | 'high' | 'error';
        let adjustedFNR = fnr;
        let shouldEscalate = false;

        if (n === 0) {
          confidence = 'none';
          shouldEscalate = true;
        } else if (n < 10) {
          confidence = 'insufficient';
          shouldEscalate = true;
        } else if (n < 100) {
          confidence = 'low';
          // Wilson score interval adjustment
          const z = 1.96; // 95% confidence
          const phat = fnr;
          const denominator = 1 + (z * z) / n;
          const centerAdjustment = phat + (z * z) / (2 * n);
          const marginOfError = z * Math.sqrt((phat * (1 - phat)) / n + (z * z) / (4 * n * n));
          adjustedFNR = (centerAdjustment + marginOfError) / denominator;
        } else {
          confidence = 'high';
          adjustedFNR = fnr;
        }

        const result = {
          fnr: adjustedFNR,
          confidence,
          sampleCount: n,
          shouldEscalate,
          lastUpdated: data?.last_updated,
        };

        // Cache valid results only
        if (!shouldEscalate) {
          await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
        }

        return result;
      } catch (error) {
        return {
          fnr: 1.0,
          confidence: 'error' as const,
          sampleCount: 0,
          shouldEscalate: true,
          error: (error as Error).message,
        };
      }
    };

    getFNRWithFallback = async (modelName: string, version: string) => {
      // Try specific version first
      let result = await getFNR(modelName, version);
      if (!result.shouldEscalate) return result;

      // Try latest version
      result = await getFNR(modelName, 'latest');
      if (!result.shouldEscalate) return result;

      // Try baseline
      result = await getFNR('baseline', 'v1.0');
      if (!result.shouldEscalate) return result;

      // Ultimate fallback: human escalation
      return {
        fnr: 1.0,
        confidence: 'none' as const,
        sampleCount: 0,
        shouldEscalate: true,
        fallbackUsed: 'human_escalation',
      };
    };

    shouldEscalate = (fnrResult: any, threshold = 0.05) => {
      if (fnrResult.shouldEscalate) return true;
      return fnrResult.fnr > threshold;
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getFNR with n=0 (no data)', () => {
    it('should escalate with confidence="none"', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0,
          sample_count: 0,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        fnr: expect.any(Number),
        confidence: 'none',
        sampleCount: 0,
        shouldEscalate: true,
      });
    });

    it('should not cache escalation results', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0,
          sample_count: 0,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      await getFNR('test-model', 'v1.0');

      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('getFNR with n<10 (insufficient data)', () => {
    it('should escalate with confidence="insufficient"', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.02,
          sample_count: 5,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        confidence: 'insufficient',
        sampleCount: 5,
        shouldEscalate: true,
      });
    });

    it('should handle edge case n=9', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.03,
          sample_count: 9,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        confidence: 'insufficient',
        sampleCount: 9,
        shouldEscalate: true,
      });
    });
  });

  describe('getFNR with 10≤n<100 (low confidence)', () => {
    it('should use Wilson score interval and confidence="low"', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.02,
          sample_count: 50,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        confidence: 'low',
        sampleCount: 50,
        shouldEscalate: false,
      });

      // Wilson score should adjust FNR upward for safety
      expect(result.fnr).toBeGreaterThan(0.02);
      expect(result.fnr).toBeLessThan(0.1); // Reasonable upper bound
    });

    it('should handle edge case n=10', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.01,
          sample_count: 10,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        confidence: 'low',
        sampleCount: 10,
      });
    });

    it('should handle edge case n=99', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.03,
          sample_count: 99,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        confidence: 'low',
        sampleCount: 99,
      });
    });

    it('should cache valid low-confidence results', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.02,
          sample_count: 50,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      await getFNR('test-model', 'v1.0');

      expect(redis.set).toHaveBeenCalledWith(
        'fnr:test-model:v1.0',
        expect.any(String),
        'EX',
        3600
      );
    });
  });

  describe('getFNR with n≥100 (high confidence)', () => {
    it('should use point estimate and confidence="high"', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.025,
          sample_count: 1000,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        fnr: 0.025,
        confidence: 'high',
        sampleCount: 1000,
        shouldEscalate: false,
      });
    });

    it('should handle edge case n=100', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.03,
          sample_count: 100,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        fnr: 0.03,
        confidence: 'high',
        sampleCount: 100,
      });
    });

    it('should cache high-confidence results', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.025,
          sample_count: 1000,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      await getFNR('test-model', 'v1.0');

      expect(redis.set).toHaveBeenCalledWith(
        'fnr:test-model:v1.0',
        expect.any(String),
        'EX',
        3600
      );
    });
  });

  describe('getFNR database errors', () => {
    it('should escalate with confidence="error" on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        fnr: 1.0,
        confidence: 'error',
        sampleCount: 0,
        shouldEscalate: true,
        error: 'Database connection failed',
      });
    });

    it('should not cache error results', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      await getFNR('test-model', 'v1.0');

      expect(redis.set).not.toHaveBeenCalled();
    });

    it('should handle network timeout', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network timeout'));

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toMatchObject({
        confidence: 'error',
        shouldEscalate: true,
      });
    });
  });

  describe('getFNR cache behavior', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        fnr: 0.03,
        confidence: 'high',
        sampleCount: 500,
        shouldEscalate: false,
        lastUpdated: new Date().toISOString(),
      };

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedResult));

      const result = await getFNR('test-model', 'v1.0');

      expect(result).toEqual(cachedResult);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should query database if cache miss', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.02,
          sample_count: 200,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      await getFNR('test-model', 'v1.0');

      expect(mockSupabase.from).toHaveBeenCalledWith('model_performance_metrics');
    });

    it('should not cache results that require escalation', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0,
          sample_count: 3,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      await getFNR('test-model', 'v1.0');

      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('getFNRWithFallback', () => {
    it('should return specific version if available', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.02,
          sample_count: 200,
          last_updated: new Date().toISOString(),
        },
        error: null,
      });

      const result = await getFNRWithFallback('test-model', 'v2.0');

      expect(result.shouldEscalate).toBe(false);
      expect(result.fnr).toBeLessThan(0.1);
    });

    it('should fall back to latest version if specific version unavailable', async () => {
      let callCount = 0;
      mockSupabase.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: specific version has no data
          return Promise.resolve({
            data: { false_negative_rate: 0, sample_count: 0, last_updated: new Date().toISOString() },
            error: null,
          });
        } else {
          // Second call: latest version has data
          return Promise.resolve({
            data: { false_negative_rate: 0.025, sample_count: 300, last_updated: new Date().toISOString() },
            error: null,
          });
        }
      });

      const result = await getFNRWithFallback('test-model', 'v1.0');

      expect(result.shouldEscalate).toBe(false);
    });

    it('should fall back to baseline if latest unavailable', async () => {
      let callCount = 0;
      mockSupabase.single.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // First two calls: no data
          return Promise.resolve({
            data: { false_negative_rate: 0, sample_count: 0, last_updated: new Date().toISOString() },
            error: null,
          });
        } else {
          // Third call: baseline has data
          return Promise.resolve({
            data: { false_negative_rate: 0.04, sample_count: 500, last_updated: new Date().toISOString() },
            error: null,
          });
        }
      });

      const result = await getFNRWithFallback('test-model', 'v1.0');

      expect(result.shouldEscalate).toBe(false);
    });

    it('should escalate to human if all fallbacks fail', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { false_negative_rate: 0, sample_count: 0, last_updated: new Date().toISOString() },
        error: null,
      });

      const result = await getFNRWithFallback('test-model', 'v1.0');

      expect(result).toMatchObject({
        fnr: 1.0,
        confidence: 'none',
        shouldEscalate: true,
        fallbackUsed: 'human_escalation',
      });
    });
  });

  describe('FNR decision logic', () => {
    it('should respect shouldEscalate flag when true', () => {
      const fnrResult = {
        fnr: 0.01,
        confidence: 'insufficient' as const,
        sampleCount: 5,
        shouldEscalate: true,
      };

      expect(shouldEscalate(fnrResult)).toBe(true);
    });

    it('should escalate when FNR exceeds threshold', () => {
      const fnrResult = {
        fnr: 0.08,
        confidence: 'high' as const,
        sampleCount: 1000,
        shouldEscalate: false,
      };

      expect(shouldEscalate(fnrResult, 0.05)).toBe(true);
    });

    it('should not escalate when FNR below threshold', () => {
      const fnrResult = {
        fnr: 0.03,
        confidence: 'high' as const,
        sampleCount: 1000,
        shouldEscalate: false,
      };

      expect(shouldEscalate(fnrResult, 0.05)).toBe(false);
    });

    it('should use custom threshold', () => {
      const fnrResult = {
        fnr: 0.06,
        confidence: 'high' as const,
        sampleCount: 1000,
        shouldEscalate: false,
      };

      expect(shouldEscalate(fnrResult, 0.05)).toBe(true);
      expect(shouldEscalate(fnrResult, 0.1)).toBe(false);
    });
  });
});
