/**
 * Unit tests for DetectorFusionService
 * Tests Bayesian fusion math, correlation terms, and variance calculations
 */

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
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
      // Currently YOLO-only: w = [1.0, 0.0, 0.0] for [yolo, maskrcnn, sam]
      // yolo = 80/100 = 0.80, maskrcnn = 0 (not deployed), sam = 0 (not deployed)
      // mean = 1.0 * 0.80 + 0 + 0 = 0.80
      expect(result.fusionMean).toBeCloseTo(0.80, 2);
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

      // Average confidence = (80 + 90) / 2 = 85% = 0.85
      // Currently YOLO-only: w = [1.0, 0.0, 0.0]
      // yolo = 0.85, maskrcnn = 0 (not deployed), sam = 0 (not deployed)
      // mean = 1.0 * 0.85 + 0 + 0 = 0.85
      expect(result.fusionMean).toBeCloseTo(0.85, 2);
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

    it('should have positive YOLO weight (maskrcnn and sam not yet deployed)', () => {
      const weights = DetectorFusionService.getDetectorWeights();
      expect(weights.yolo).toBeGreaterThan(0);
      // Mask R-CNN and SAM are not yet deployed, weights are 0
      expect(weights.maskrcnn).toBe(0);
      expect(weights.sam).toBe(0);
    });
  });
});

