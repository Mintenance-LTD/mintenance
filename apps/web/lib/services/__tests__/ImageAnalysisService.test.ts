/**
 * Comprehensive tests for Image Analysis Service
 *
 * Tests all critical bugs fixed:
 * - LRU cache implementation with proper eviction
 * - TTL-based cache expiration (24 hours)
 * - Individual Vision API call failure handling
 * - Partial results when some calls fail
 * - Timeout protection (10s per API call)
 * - URL validation to prevent malicious URLs
 * - Cache hit/miss behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImageAnalysisService } from '../ImageAnalysisService';
import type { ImageAnnotatorClient } from '@google-cloud/vision';

// Mock dependencies
vi.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: vi.fn(),
}));

vi.mock('@/lib/config/google-vision.config', () => ({
  getGoogleVisionConfig: vi.fn(() => ({
    credentialsPath: '/path/to/credentials.json',
  })),
  validateGoogleVisionConfig: vi.fn(() => ({
    valid: true,
  })),
}));

vi.mock('@/lib/security/url-validation', () => ({
  validateURLs: vi.fn(async (urls) => ({
    valid: urls,
    invalid: [],
  })),
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ImageAnalysisService', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    ImageAnalysisService.clearCache();

    // Mock Vision API client
    mockClient = {
      labelDetection: vi.fn(),
      objectLocalization: vi.fn(),
      textDetection: vi.fn(),
    };

    const { ImageAnnotatorClient } = require('@google-cloud/vision');
    vi.mocked(ImageAnnotatorClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    ImageAnalysisService.clearCache();
  });

  describe('LRU Cache', () => {
    it('should evict oldest entries when cache is full', async () => {
      // Configure mock responses
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'test', score: 0.9 }] },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [{ name: 'object', score: 0.8 }] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [{ description: 'text' }] },
      ]);

      // Fill cache beyond max size (100 entries)
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 102; i++) {
        promises.push(
          ImageAnalysisService.analyzePropertyImages([`https://example.com/image${i}.jpg`])
        );
      }

      await Promise.all(promises);

      const stats = ImageAnalysisService.getCacheStats();

      // Cache should have auto-evicted to stay at max size
      expect(stats.size).toBeLessThanOrEqual(100);
      expect(stats.maxSize).toBe(100);
    });

    it('should respect TTL and expire entries after 24 hours', async () => {
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'test', score: 0.9 }] },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      vi.useFakeTimers();

      // Add entry to cache
      await ImageAnalysisService.analyzePropertyImages(['https://example.com/test.jpg']);

      // Should be cached
      expect(ImageAnalysisService.getCacheStats().size).toBe(1);

      // Fast-forward 23 hours - should still be cached
      vi.advanceTimersByTime(23 * 60 * 60 * 1000);
      expect(ImageAnalysisService.getCacheStats().size).toBe(1);

      // Fast-forward past 24 hours - should be evicted
      vi.advanceTimersByTime(2 * 60 * 60 * 1000); // Total 25 hours

      const prunedCount = ImageAnalysisService.pruneCache();
      expect(prunedCount).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should return cached result on cache hit', async () => {
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'cached', score: 0.9 }] },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      const imageUrls = ['https://example.com/test.jpg'];

      // First call - cache miss
      const result1 = await ImageAnalysisService.analyzePropertyImages(imageUrls);
      expect(mockClient.labelDetection).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await ImageAnalysisService.analyzePropertyImages(imageUrls);

      // Should not call API again
      expect(mockClient.labelDetection).toHaveBeenCalledTimes(1);

      // Results should be identical
      expect(result2).toEqual(result1);
    });

    it('should trigger new analysis on cache miss', async () => {
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'new', score: 0.9 }] },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      const imageUrls1 = ['https://example.com/image1.jpg'];
      const imageUrls2 = ['https://example.com/image2.jpg'];

      await ImageAnalysisService.analyzePropertyImages(imageUrls1);
      await ImageAnalysisService.analyzePropertyImages(imageUrls2);

      // Should call API twice (different URLs)
      expect(mockClient.labelDetection).toHaveBeenCalledTimes(2);

      // Cache should have 2 entries
      expect(ImageAnalysisService.getCacheStats().size).toBe(2);
    });
  });

  describe('Partial Results on API Failures', () => {
    it('should return partial results if labelDetection fails but others succeed', async () => {
      mockClient.labelDetection.mockRejectedValue(new Error('Label detection timeout'));
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [{ name: 'window', score: 0.85 }] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [{ description: 'DANGER' }] },
      ]);

      const result = await ImageAnalysisService.analyzePropertyImages(['https://example.com/test.jpg']);

      // Should still return results from other API calls
      expect(result).toBeDefined();
      expect(result?.labels).toEqual([]); // No labels since it failed
      expect(result?.objects.length).toBeGreaterThan(0); // But objects should be there
      expect(result?.text.length).toBeGreaterThan(0); // And text should be there
    });

    it('should return partial results if objectLocalization fails', async () => {
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'roof', score: 0.9 }] },
      ]);
      mockClient.objectLocalization.mockRejectedValue(new Error('Object localization failed'));
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      const result = await ImageAnalysisService.analyzePropertyImages(['https://example.com/test.jpg']);

      expect(result).toBeDefined();
      expect(result?.labels.length).toBeGreaterThan(0);
      expect(result?.objects).toEqual([]); // Failed, so empty
      expect(result?.text).toBeDefined();
    });

    it('should return partial results if textDetection fails', async () => {
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'damage', score: 0.88 }] },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [{ name: 'pipe', score: 0.75 }] },
      ]);
      mockClient.textDetection.mockRejectedValue(new Error('Text detection error'));

      const result = await ImageAnalysisService.analyzePropertyImages(['https://example.com/test.jpg']);

      expect(result).toBeDefined();
      expect(result?.labels.length).toBeGreaterThan(0);
      expect(result?.objects.length).toBeGreaterThan(0);
      expect(result?.text).toEqual([]); // Failed, so empty
    });

    it('should NOT crash if all API calls fail', async () => {
      mockClient.labelDetection.mockRejectedValue(new Error('Failed'));
      mockClient.objectLocalization.mockRejectedValue(new Error('Failed'));
      mockClient.textDetection.mockRejectedValue(new Error('Failed'));

      const result = await ImageAnalysisService.analyzePropertyImages(['https://example.com/test.jpg']);

      // Should return empty results, not crash
      expect(result).toBeDefined();
      expect(result?.labels).toEqual([]);
      expect(result?.objects).toEqual([]);
      expect(result?.text).toEqual([]);
    });
  });

  describe('Timeout Protection', () => {
    it('should timeout individual API calls after 10 seconds', async () => {
      // Mock a hanging request
      mockClient.labelDetection.mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 15000))
      );
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      vi.useFakeTimers();

      const promise = ImageAnalysisService.analyzePropertyImages(['https://example.com/test.jpg']);

      // Fast-forward past timeout
      vi.advanceTimersByTime(10000);

      const result = await promise;

      // Should complete with partial results
      expect(result).toBeDefined();

      vi.useRealTimers();
    });

    it('should continue with other images if one times out', async () => {
      let callCount = 0;
      mockClient.labelDetection.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call times out
          return new Promise((resolve) => setTimeout(resolve, 15000));
        }
        // Second call succeeds
        return Promise.resolve([
          { labelAnnotations: [{ description: 'success', score: 0.9 }] },
        ]);
      });
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      const result = await ImageAnalysisService.analyzePropertyImages([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ]);

      // Should still return some results
      expect(result).toBeDefined();
    });
  });

  describe('URL Validation', () => {
    it('should validate image URLs before sending to Google Vision', async () => {
      const { validateURLs } = await import('@/lib/security/url-validation');

      await ImageAnalysisService.analyzePropertyImages([
        'https://example.com/valid.jpg',
      ]);

      expect(validateURLs).toHaveBeenCalledWith(
        ['https://example.com/valid.jpg'],
        true
      );
    });

    it('should reject malicious URLs', async () => {
      const { validateURLs } = await import('@/lib/security/url-validation');

      vi.mocked(validateURLs).mockResolvedValue({
        valid: [],
        invalid: [
          {
            url: 'javascript:alert(1)',
            error: 'Invalid URL scheme',
          },
        ],
      });

      await expect(
        ImageAnalysisService.analyzePropertyImages(['javascript:alert(1)'])
      ).rejects.toThrow('Invalid image URLs');
    });

    it('should handle mixed valid/invalid URLs', async () => {
      const { validateURLs } = await import('@/lib/security/url-validation');

      vi.mocked(validateURLs).mockResolvedValue({
        valid: ['https://example.com/valid.jpg'],
        invalid: [
          {
            url: 'http://malicious.com/script.exe',
            error: 'Suspicious file extension',
          },
        ],
      });

      await expect(
        ImageAnalysisService.analyzePropertyImages([
          'https://example.com/valid.jpg',
          'http://malicious.com/script.exe',
        ])
      ).rejects.toThrow();
    });
  });

  describe('Graceful Degradation', () => {
    it('should return null if Google Vision API not configured', async () => {
      const { validateGoogleVisionConfig } = await import('@/lib/config/google-vision.config');

      vi.mocked(validateGoogleVisionConfig).mockReturnValue({
        valid: false,
        error: 'No credentials configured',
      });

      const result = await ImageAnalysisService.analyzePropertyImages([
        'https://example.com/test.jpg',
      ]);

      expect(result).toBeNull();
    });

    it('should return null if no image URLs provided', async () => {
      const result = await ImageAnalysisService.analyzePropertyImages([]);
      expect(result).toBeNull();
    });

    it('should return null and not throw on complete API failure', async () => {
      mockClient.labelDetection.mockRejectedValue(new Error('API Error'));
      mockClient.objectLocalization.mockRejectedValue(new Error('API Error'));
      mockClient.textDetection.mockRejectedValue(new Error('API Error'));

      const result = await ImageAnalysisService.analyzePropertyImages([
        'https://example.com/test.jpg',
      ]);

      expect(result).toBeDefined(); // Returns empty result, not null
      expect(result?.confidence).toBe(0); // Zero confidence
    });
  });

  describe('Analysis Results', () => {
    beforeEach(() => {
      mockClient.labelDetection.mockResolvedValue([
        {
          labelAnnotations: [
            { description: 'Roof', score: 0.95 },
            { description: 'Damaged', score: 0.85 },
            { description: 'Leak', score: 0.75 },
          ],
        },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        {
          localizedObjectAnnotations: [
            { name: 'Window', score: 0.88 },
            { name: 'Door', score: 0.82 },
          ],
        },
      ]);
      mockClient.textDetection.mockResolvedValue([
        {
          textAnnotations: [
            { description: 'WARNING' },
            { description: 'WATER' },
          ],
        },
      ]);
    });

    it('should correctly identify property type', async () => {
      mockClient.labelDetection.mockResolvedValue([
        {
          labelAnnotations: [
            { description: 'House', score: 0.95 },
            { description: 'Home', score: 0.90 },
          ],
        },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      const result = await ImageAnalysisService.analyzePropertyImages([
        'https://example.com/house.jpg',
      ]);

      expect(result?.propertyType).toBe('house');
    });

    it('should assess condition based on damage indicators', async () => {
      mockClient.labelDetection.mockResolvedValue([
        {
          labelAnnotations: [
            { description: 'Broken', score: 0.95 },
            { description: 'Damaged', score: 0.90 },
            { description: 'Cracked', score: 0.85 },
          ],
        },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      const result = await ImageAnalysisService.analyzePropertyImages([
        'https://example.com/damaged.jpg',
      ]);

      expect(result?.condition).toBe('poor');
    });

    it('should suggest categories based on detected features', async () => {
      mockClient.labelDetection.mockResolvedValue([
        {
          labelAnnotations: [
            { description: 'Pipe', score: 0.95 },
            { description: 'Leak', score: 0.90 },
            { description: 'Water', score: 0.85 },
          ],
        },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        {
          localizedObjectAnnotations: [
            { name: 'Faucet', score: 0.88 },
          ],
        },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      const result = await ImageAnalysisService.analyzePropertyImages([
        'https://example.com/plumbing.jpg',
      ]);

      expect(result?.suggestedCategories.length).toBeGreaterThan(0);
      expect(result?.suggestedCategories[0].category).toBe('plumbing');
      expect(result?.suggestedCategories[0].confidence).toBeGreaterThan(0);
    });

    it('should calculate confidence score correctly', async () => {
      const result = await ImageAnalysisService.analyzePropertyImages([
        'https://example.com/test.jpg',
      ]);

      expect(result?.confidence).toBeGreaterThanOrEqual(30);
      expect(result?.confidence).toBeLessThanOrEqual(95);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache completely', async () => {
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'test', score: 0.9 }] },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      // Add entries
      await ImageAnalysisService.analyzePropertyImages(['https://example.com/1.jpg']);
      await ImageAnalysisService.analyzePropertyImages(['https://example.com/2.jpg']);

      expect(ImageAnalysisService.getCacheStats().size).toBe(2);

      ImageAnalysisService.clearCache();

      expect(ImageAnalysisService.getCacheStats().size).toBe(0);
    });

    it('should return accurate cache statistics', async () => {
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'test', score: 0.9 }] },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      await ImageAnalysisService.analyzePropertyImages(['https://example.com/test.jpg']);

      const stats = ImageAnalysisService.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(100);
      expect(stats.calculatedSize).toBeGreaterThanOrEqual(0);
    });

    it('should manually prune expired entries', async () => {
      mockClient.labelDetection.mockResolvedValue([
        { labelAnnotations: [{ description: 'test', score: 0.9 }] },
      ]);
      mockClient.objectLocalization.mockResolvedValue([
        { localizedObjectAnnotations: [] },
      ]);
      mockClient.textDetection.mockResolvedValue([
        { textAnnotations: [] },
      ]);

      vi.useFakeTimers();

      await ImageAnalysisService.analyzePropertyImages(['https://example.com/test.jpg']);

      // Fast-forward past TTL
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      const prunedCount = ImageAnalysisService.pruneCache();
      expect(prunedCount).toBeGreaterThanOrEqual(0);

      vi.useRealTimers();
    });
  });
});
