/**
 * Unit tests for DetectorFusionService
 * Tests Bayesian fusion math, correlation terms, and variance calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DetectorFusionService } from '../DetectorFusionService';
import type { RoboflowDetection } from '../types';

// Mock the DriftMonitorService to avoid async drift detection in tests
vi.mock('../DriftMonitorService', () => ({
  DriftMonitorService: {
    detectDrift: vi.fn().mockResolvedValue({ hasDrift: false }),
    applyWeightAdjustments: vi.fn().mockReturnValue({ yolo: 0.35, maskrcnn: 0.50, sam: 0.15 }),
  },
}));

describe('DetectorFusionService', () => {
  beforeEach(() => {
    // Reset detector weights before each test
    DetectorFusionService.resetWeights();
  });

  describe('fuseDetectors', () => {
    it('should compute fusion mean as weighted average', async () => {
      const detections: RoboflowDetection[] = [
        {
          id: '1',
          className: 'crack',
          confidence: 80,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          imageUrl: 'test.jpg',
        },
      ];

      const result = await DetectorFusionService.fuseDetectors(detections, 80);

      // Fusion mean should be weighted average of detector confidences
      // w = [0.35, 0.50, 0.15] for [yolo, maskrcnn, sam]
      // yolo = 0.80, maskrcnn = 0.80 * 0.95 = 0.76, sam = 0.80 * 0.90 = 0.72
      // mean = 0.35 * 0.80 + 0.50 * 0.76 + 0.15 * 0.72 = 0.28 + 0.38 + 0.108 = 0.768
      expect(result.fusionMean).toBeCloseTo(0.768, 2);
    });

    it('should include correlation term in variance', async () => {
      const detections: RoboflowDetection[] = [
        {
          id: '1',
          className: 'crack',
          confidence: 80,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          imageUrl: 'test.jpg',
        },
      ];

      const result = await DetectorFusionService.fuseDetectors(detections, 80);

      // Variance should include: epistemic + disagreement + correlation
      expect(result.fusionVariance).toBeGreaterThan(result.epistemicVariance);
      expect(result.fusionVariance).toBeGreaterThan(result.disagreementVariance);
      expect(result.correlationTerm).toBeGreaterThan(0);
    });

    it('should handle empty detections', async () => {
      const result = await DetectorFusionService.fuseDetectors([], 50);

      expect(result.fusionMean).toBeGreaterThanOrEqual(0);
      expect(result.fusionMean).toBeLessThanOrEqual(1);
      expect(result.fusionVariance).toBeGreaterThan(0);
    });

    it('should handle multiple detections', async () => {
      const detections: RoboflowDetection[] = [
        {
          id: '1',
          className: 'crack',
          confidence: 80,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          imageUrl: 'test.jpg',
        },
        {
          id: '2',
          className: 'water_damage',
          confidence: 90,
          boundingBox: { x: 50, y: 50, width: 100, height: 100 },
          imageUrl: 'test.jpg',
        },
      ];

      const result = await DetectorFusionService.fuseDetectors(detections, 85);

      // Average confidence = (80 + 90) / 2 = 85%  = 0.85
      // yolo = 0.85, maskrcnn = 0.85 * 0.95 = 0.8075, sam = 0.85 * 0.90 = 0.765
      // mean = 0.35 * 0.85 + 0.50 * 0.8075 + 0.15 * 0.765 = 0.2975 + 0.40375 + 0.11475 = 0.816
      expect(result.fusionMean).toBeCloseTo(0.816, 2);
    });
  });

  describe('correlation matrix', () => {
    it('should have correct dimensions', () => {
      const matrix = DetectorFusionService.getCorrelationMatrix();
      expect(matrix.length).toBe(3); // 3 detectors
      expect(matrix[0].length).toBe(3);
    });

    it('should be symmetric', () => {
      const matrix = DetectorFusionService.getCorrelationMatrix();
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
          expect(matrix[i][j]).toBeCloseTo(matrix[j][i], 5);
        }
      }
    });

    it('should have diagonal elements equal to 1.0', () => {
      const matrix = DetectorFusionService.getCorrelationMatrix();
      for (let i = 0; i < matrix.length; i++) {
        expect(matrix[i][i]).toBeCloseTo(1.0, 5);
      }
    });
  });

  describe('detector weights', () => {
    it('should sum to 1.0', () => {
      const weights = DetectorFusionService.getDetectorWeights();
      const sum = weights.yolo + weights.maskrcnn + weights.sam;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should have positive weights', () => {
      const weights = DetectorFusionService.getDetectorWeights();
      expect(weights.yolo).toBeGreaterThan(0);
      expect(weights.maskrcnn).toBeGreaterThan(0);
      expect(weights.sam).toBeGreaterThan(0);
    });
  });
});

