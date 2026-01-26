import { vi } from 'vitest';
/**
 * SAM 3 Integration Tests
 * Tests the complete SAM 3 integration including:
 * - Health checks with caching
 * - Circuit breaker functionality
 * - Gradual rollout
 * - Retry logic
 * - Bayesian fusion
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SAM3Service } from '../SAM3Service';
import { BayesianFusionService } from '../BayesianFusionService';
import { formatSAM3EvidenceForFusion } from '../evidence-formatter';

// Mock fetch globally
global.fetch = vi.fn();

// Mock logger
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SAM3Service', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    // Reset environment variables
    process.env.SAM3_SERVICE_URL = 'http://localhost:8001';
    process.env.SAM3_ROLLOUT_PERCENTAGE = '100';
    process.env.SAM3_TIMEOUT_MS = '30000';
    // Reset static properties (circuit breaker)
    (SAM3Service as any).failureCount = 0;
    (SAM3Service as any).healthCheckCache = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Health Check', () => {
    it('should successfully check health when service is available', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ status: 'healthy', model_loaded: true, service: 'sam3' }),
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await SAM3Service.healthCheck();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should cache health check results', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ status: 'healthy', model_loaded: true, service: 'sam3' }),
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      // First call - should hit the service
      await SAM3Service.healthCheck();
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await SAM3Service.healthCheck();
      expect(fetch).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should return false when service is unhealthy', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ status: 'unhealthy', model_loaded: false }),
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await SAM3Service.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      // Mock failures
      vi.mocked(global.fetch).mockRejectedValue(new Error('Connection failed'));

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await SAM3Service.healthCheck();
      }

      // Circuit breaker should be open now
      const result = await SAM3Service.healthCheck();
      expect(result).toBe(false);
      // Should not attempt fetch when circuit is open
      expect(fetch).toHaveBeenCalledTimes(3); // Only the initial 3 attempts
    });
  });

  describe('Gradual Rollout', () => {
    it('should respect rollout percentage', () => {
      // Test 0% rollout
      process.env.SAM3_ROLLOUT_PERCENTAGE = '0';
      expect(SAM3Service.shouldUseSAM3()).toBe(false);

      // Test 100% rollout
      process.env.SAM3_ROLLOUT_PERCENTAGE = '100';
      expect(SAM3Service.shouldUseSAM3()).toBe(true);

      // Test 50% rollout (statistical test)
      process.env.SAM3_ROLLOUT_PERCENTAGE = '50';
      let enabledCount = 0;
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        if (SAM3Service.shouldUseSAM3()) enabledCount++;
      }
      // Should be approximately 50% (allow 10% variance)
      expect(enabledCount).toBeGreaterThan(400);
      expect(enabledCount).toBeLessThan(600);
    });
  });

  describe('Segmentation with Retry Logic', () => {
    it('should retry on failure and eventually succeed', async () => {
      const mockImage = 'https://example.com/image.jpg';
      const mockImageResponse = {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      };

      // Mock image fetch
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mockImageResponse) // Image fetch
        .mockRejectedValueOnce(new Error('Temporary failure')) // First attempt fails
        .mockResolvedValueOnce(mockImageResponse) // Image fetch for retry
        .mockResolvedValueOnce({
          // Second attempt succeeds
          ok: true,
          json: async () => ({
            success: true,
            masks: [[[1, 0], [0, 1]]],
            boxes: [[10, 20, 30, 40]],
            scores: [0.95],
            num_instances: 1,
          }),
        });

      const result = await SAM3Service.segment(mockImage, 'crack', 0.5);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.scores[0]).toBe(0.95);
    });

    it('should return null after max retries', async () => {
      const mockImage = 'https://example.com/image.jpg';

      // Mock all attempts to fail
      vi.mocked(global.fetch).mockRejectedValue(new Error('Persistent failure'));

      const result = await SAM3Service.segment(mockImage, 'crack', 0.5);
      expect(result).toBeNull();
    });
  });

  describe('Multi-Damage Segmentation', () => {
    it('should segment multiple damage types', async () => {
      const mockImage = 'https://example.com/image.jpg';
      const damageTypes = ['water damage', 'crack', 'mold'];

      const mockImageResponse = {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      };

      // Mock successful response
      const mockSegmentationResponse = {
        ok: true,
        json: async () => ({
          success: true,
          damage_types: {
            'water damage': {
              masks: [[[1, 0]]],
              boxes: [[10, 20, 30, 40]],
              scores: [0.92],
              num_instances: 1,
            },
            'crack': {
              masks: [[[0, 1]], [[1, 1]]],
              boxes: [[15, 25, 35, 45], [50, 60, 70, 80]],
              scores: [0.88, 0.95],
              num_instances: 2,
            },
            'mold': {
              masks: [],
              boxes: [],
              scores: [],
              num_instances: 0,
            },
          },
        }),
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mockImageResponse)
        .mockResolvedValueOnce(mockSegmentationResponse);

      const result = await SAM3Service.segmentDamageTypes(mockImage, damageTypes);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.damage_types['crack'].num_instances).toBe(2);
      expect(result?.damage_types['mold'].num_instances).toBe(0);
    });
  });
});

describe('SAM 3 Evidence Formatting', () => {
  it('should format SAM 3 segmentation for Bayesian fusion', () => {
    const mockSegmentation = {
      success: true,
      damage_types: {
        'water damage': {
          masks: [[[1, 0]]],
          boxes: [[10, 20, 30, 40]],
          scores: [0.92],
          num_instances: 1,
          error: undefined,
        },
        'crack': {
          masks: [[[0, 1]], [[1, 1]]],
          boxes: [[15, 25, 35, 45], [50, 60, 70, 80]],
          scores: [0.88, 0.95],
          num_instances: 2,
          error: undefined,
        },
      },
    };

    const formatted = formatSAM3EvidenceForFusion(mockSegmentation);

    expect(formatted).not.toBeNull();
    expect(formatted?.damageTypes['water damage'].confidence).toBe(0.92);
    expect(formatted?.damageTypes['crack'].confidence).toBeCloseTo(0.915); // avg of 0.88 and 0.95
    expect(formatted?.damageTypes['crack'].numInstances).toBe(2);
    expect(formatted?.overallConfidence).toBeGreaterThan(0);
  });

  it('should handle empty segmentation results', () => {
    const emptySegmentation = {
      success: true,
      damage_types: {},
    };

    const formatted = formatSAM3EvidenceForFusion(emptySegmentation);
    expect(formatted).toBeNull();
  });
});

describe('Bayesian Fusion with SAM 3', () => {
  it('should fuse SAM 3 evidence with GPT-4 and scene graph', () => {
    const sam3Evidence = {
      damageTypes: {
        'water damage': { confidence: 0.92, numInstances: 1 },
        'crack': { confidence: 0.88, numInstances: 2 },
      },
      overallConfidence: 0.90,
    };

    const gpt4Assessment = {
      severity: 'moderate' as const,
      confidence: 0.85,
      damageType: 'water damage',
      hasCriticalHazards: false,
    };

    const sceneGraphFeatures = {
      featureVector: new Array(30).fill(0.5),
      compactFeatureVector: new Array(12).fill(0.5),
      spatialFeatures: {
        avgNodeConfidence: 0.75,
        edgeDensity: 0.6,
        avgDistance: 100,
        clusteringCoeff: 0.4,
        centralityScore: 0.5,
        overlapScore: 0.3,
      },
    };

    const result = BayesianFusionService.fuseEvidence({
      sam3Evidence,
      gpt4Assessment,
      sceneGraphFeatures,
    });

    expect(result).toBeDefined();
    expect(result.mean).toBeGreaterThan(0);
    expect(result.mean).toBeLessThanOrEqual(1);
    expect(result.variance).toBeGreaterThan(0);
    expect(result.confidenceInterval).toHaveLength(2);
    expect(result.confidenceInterval[0]).toBeLessThan(result.confidenceInterval[1]);
    expect(result.uncertaintyLevel).toMatch(/low|medium|high/);
  });

  it('should handle missing SAM 3 evidence gracefully', () => {
    const gpt4Assessment = {
      severity: 'severe' as const,
      confidence: 0.90,
      damageType: 'structural damage',
      hasCriticalHazards: true,
    };

    const result = BayesianFusionService.fuseEvidence({
      sam3Evidence: null,
      gpt4Assessment,
      sceneGraphFeatures: null,
    });

    expect(result).toBeDefined();
    expect(result.mean).toBeGreaterThan(0);
    // Should still produce valid fusion with just GPT-4
  });
});

describe('Performance and Monitoring', () => {
  it('should respect timeout configuration', async () => {
    process.env.SAM3_TIMEOUT_MS = '100'; // Very short timeout
    const mockImage = 'https://example.com/image.jpg';

    // Mock a slow response
    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 200))
    );

    const result = await SAM3Service.segment(mockImage, 'crack', 0.5);
    expect(result).toBeNull(); // Should timeout and return null
  });
});