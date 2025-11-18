/**
 * Unit tests for DetectorFusionService
 * Tests Bayesian fusion math, correlation terms, and variance calculations
 */

import { DetectorFusionService } from '../DetectorFusionService';
import type { RoboflowDetection } from '../types';

describe('DetectorFusionService', () => {
  describe('fuseDetectors', () => {
    it('should compute fusion mean as weighted average', () => {
      const detections: RoboflowDetection[] = [
        {
          id: '1',
          className: 'crack',
          confidence: 80,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          imageUrl: 'test.jpg',
        },
      ];

      const result = DetectorFusionService.fuseDetectors(detections, 80);

      // Fusion mean should be weighted average of detector confidences
      // w = [0.35, 0.50, 0.15] for [yolo, maskrcnn, sam]
      // yolo = 0.80, maskrcnn = 0.80 * 0.95 = 0.76, sam = 0.80 * 0.90 = 0.72
      // mean = 0.35 * 0.80 + 0.50 * 0.76 + 0.15 * 0.72 = 0.28 + 0.38 + 0.108 = 0.768
      expect(result.fusionMean).toBeCloseTo(0.768, 2);
    });

    it('should include correlation term in variance', () => {
      const detections: RoboflowDetection[] = [
        {
          id: '1',
          className: 'crack',
          confidence: 80,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          imageUrl: 'test.jpg',
        },
      ];

      const result = DetectorFusionService.fuseDetectors(detections, 80);

      // Variance should include: epistemic + disagreement + correlation
      expect(result.fusionVariance).toBeGreaterThan(result.epistemicVariance);
      expect(result.fusionVariance).toBeGreaterThan(result.disagreementVariance);
      expect(result.correlationTerm).toBeGreaterThan(0);
    });

    it('should handle empty detections', () => {
      const result = DetectorFusionService.fuseDetectors([], 50);

      expect(result.fusionMean).toBeGreaterThanOrEqual(0);
      expect(result.fusionMean).toBeLessThanOrEqual(1);
      expect(result.fusionVariance).toBeGreaterThan(0);
    });

    it('should handle multiple detections', () => {
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

      const result = DetectorFusionService.fuseDetectors(detections, 85);

      // Average confidence = (80 + 90) / 2 = 85
      expect(result.fusionMean).toBeCloseTo(0.85 * 0.35 + 0.85 * 0.95 * 0.50 + 0.85 * 0.90 * 0.15, 2);
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

