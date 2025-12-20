/**
 * Edge Case Unit Tests for BuildingSurveyorService
 * 
 * Tests error handling, boundary conditions, and async operation failures
 */

import { BuildingSurveyorService } from '../BuildingSurveyorService';
import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { ImageAnalysisService } from '@/lib/services/ImageAnalysisService';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';

// Mock dependencies
jest.mock('../RoboflowDetectionService');
jest.mock('@/lib/services/ImageAnalysisService');
jest.mock('../../ml-engine/memory/MemoryManager');
jest.mock('@/lib/security/url-validation', () => ({
  validateURLs: jest.fn(),
}));
jest.mock('../config/BuildingSurveyorConfig', () => ({
  getConfig: jest.fn(() => ({
    openaiApiKey: 'test-key',
    detectorTimeoutMs: 7000,
    visionTimeoutMs: 9000,
  })),
}));

describe('BuildingSurveyorService - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assessDamage - Error Handling', () => {
    it('should throw error when no images provided', async () => {
      await expect(
        BuildingSurveyorService.assessDamage([])
      ).rejects.toThrow('At least one image is required');
    });

    it('should throw error when imageUrls is null', async () => {
      await expect(
        BuildingSurveyorService.assessDamage(null as unknown as string[])
      ).rejects.toThrow();
    });

    it('should throw error when imageUrls is undefined', async () => {
      await expect(
        BuildingSurveyorService.assessDamage(undefined as unknown as string[])
      ).rejects.toThrow();
    });

    it('should handle invalid image URLs', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: [],
        invalid: [{ url: 'invalid-url', error: 'Invalid URL format' }],
      });

      await expect(
        BuildingSurveyorService.assessDamage(['invalid-url'])
      ).rejects.toThrow('Invalid image URLs');
    });

    it('should handle missing OpenAI API key', async () => {
      const { getConfig } = require('../config/BuildingSurveyorConfig');
      getConfig.mockReturnValue({
        openaiApiKey: null,
        detectorTimeoutMs: 7000,
        visionTimeoutMs: 9000,
      });

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).rejects.toThrow('AI assessment service is not configured');
    });
  });

  describe('assessDamage - Async Operation Failures', () => {
    it('should handle Roboflow detection timeout', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn(() =>
        new Promise((resolve) => setTimeout(() => resolve([]), 10000))
      );

      ImageAnalysisService.analyzePropertyImages = jest.fn().mockResolvedValue({});

      // Should not throw, but handle timeout gracefully
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle Google Vision analysis timeout', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = jest.fn(() =>
        new Promise((resolve) => setTimeout(() => resolve({}), 10000))
      );

      // Should not throw, but handle timeout gracefully
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle Roboflow detection failure', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn().mockRejectedValue(
        new Error('Roboflow API error')
      );
      ImageAnalysisService.analyzePropertyImages = jest.fn().mockResolvedValue({});

      // Should handle failure gracefully and continue with vision analysis
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle Google Vision analysis failure', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = jest.fn().mockRejectedValue(
        new Error('Vision API error')
      );

      // Should handle failure gracefully and continue with Roboflow detections
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle both detectors failing', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn().mockRejectedValue(
        new Error('Roboflow error')
      );
      ImageAnalysisService.analyzePropertyImages = jest.fn().mockRejectedValue(
        new Error('Vision error')
      );

      // Should still attempt to create assessment with available data
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });
  });

  describe('assessDamage - Boundary Conditions', () => {
    it('should handle single image', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = jest.fn().mockResolvedValue({});

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle maximum number of images', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      const manyImages = Array(20).fill('https://example.com/image.jpg');
      validateURLs.mockResolvedValue({
        valid: manyImages,
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = jest.fn().mockResolvedValue({});

      await expect(
        BuildingSurveyorService.assessDamage(manyImages)
      ).resolves.toBeDefined();
    });

    it('should handle very long image URLs', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      const longUrl = 'https://example.com/' + 'a'.repeat(2000) + '.jpg';
      validateURLs.mockResolvedValue({
        valid: [longUrl],
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = jest.fn().mockResolvedValue({});

      await expect(
        BuildingSurveyorService.assessDamage([longUrl])
      ).resolves.toBeDefined();
    });

    it('should handle empty context', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = jest.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = jest.fn().mockResolvedValue({});

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'], undefined)
      ).resolves.toBeDefined();
    });
  });

  describe('assessDamage - Memory System Edge Cases', () => {
    it('should handle memory system initialization failure', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      memoryManager.initialize = jest.fn().mockRejectedValue(
        new Error('Memory initialization failed')
      );

      // Should handle gracefully or throw appropriately
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).rejects.toThrow();
    });

    it('should handle memory query returning null', async () => {
      const { validateURLs } = require('@/lib/security/url-validation');
      validateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      memoryManager.queryMemory = jest.fn().mockResolvedValue(null);

      RoboflowDetectionService.detect = jest.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = jest.fn().mockResolvedValue({});

      // Should handle null memory results gracefully
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });
  });
});

