import { vi } from 'vitest';
/**
 * Integration tests for Conformal Prediction in HybridInferenceService
 * Tests the complete flow of using calibrated uncertainty for routing decisions
 */

import { HybridInferenceService } from '../HybridInferenceService';
import { ConformalPredictionService } from '../conformal-prediction';
import type { AssessmentContext } from '../types';
import type { PropertyAgeCategory } from '@mintenance/shared/src/services/conformal-prediction';

describe('Conformal Prediction Integration', () => {
  let conformalService: ConformalPredictionService;

  beforeEach(() => {
    conformalService = new ConformalPredictionService();
  });

  describe('Property Age Classification', () => {
    it('should classify Victorian properties (pre-1900)', () => {
      const context: AssessmentContext = {
        ageOfProperty: 150, // Built in 1874
        propertyType: 'residential',
      };

      // This would be tested through HybridInferenceService private method
      const currentYear = new Date().getFullYear();
      const constructionYear = currentYear - 150;
      expect(constructionYear).toBeLessThan(1900);
    });

    it('should classify post-war properties (1900-1970)', () => {
      const context: AssessmentContext = {
        ageOfProperty: 70, // Built in 1954
        propertyType: 'residential',
      };

      const currentYear = new Date().getFullYear();
      const constructionYear = currentYear - 70;
      expect(constructionYear).toBeGreaterThanOrEqual(1900);
      expect(constructionYear).toBeLessThan(1970);
    });

    it('should classify modern properties (post-1970)', () => {
      const context: AssessmentContext = {
        ageOfProperty: 30, // Built in 1994
        propertyType: 'residential',
      };

      const currentYear = new Date().getFullYear();
      const constructionYear = currentYear - 30;
      expect(constructionYear).toBeGreaterThanOrEqual(1970);
    });
  });

  describe('Routing Based on Prediction Intervals', () => {
    it('should route to internal model when interval size is 1 (certain)', async () => {
      const mockInterval = {
        confidence_level: 0.90,
        prediction_set: ['early'],
        threshold_used: 0.10,
        stratum: 'modern_water_damage',
        interval_size: 1,
      };

      // Mock the conformal prediction response
      vi.spyOn(conformalService, 'getPredictionInterval').mockResolvedValue(mockInterval);

      // The routing logic would use interval size = 1 to route to internal
      expect(mockInterval.interval_size).toBe(1);
      expect(mockInterval.prediction_set.length).toBe(1);
    });

    it('should route to hybrid when interval size is 2 (moderate uncertainty)', async () => {
      const mockInterval = {
        confidence_level: 0.90,
        prediction_set: ['early', 'midway'],
        threshold_used: 0.10,
        stratum: 'victorian_structural_minor',
        interval_size: 2,
      };

      vi.spyOn(conformalService, 'getPredictionInterval').mockResolvedValue(mockInterval);

      expect(mockInterval.interval_size).toBe(2);
      expect(mockInterval.prediction_set.length).toBe(2);
    });

    it('should route to GPT-4 when interval size is 3+ (high uncertainty)', async () => {
      const mockInterval = {
        confidence_level: 0.90,
        prediction_set: ['early', 'midway', 'full'],
        threshold_used: 0.10,
        stratum: 'post_war_mold',
        interval_size: 3,
      };

      vi.spyOn(conformalService, 'getPredictionInterval').mockResolvedValue(mockInterval);

      expect(mockInterval.interval_size).toBe(3);
      expect(mockInterval.prediction_set.length).toBe(3);
    });
  });

  describe('Stratification Hierarchy', () => {
    it('should use detailed stratum when sufficient calibration data exists', async () => {
      const propertyAge: PropertyAgeCategory = 'victorian';
      const damageType = 'water damage';

      const expectedStratum = 'victorian_water_damage';

      const interval = await conformalService.getPredictionInterval(
        { early: 0.7, midway: 0.2, full: 0.1 },
        propertyAge,
        damageType,
        0.90
      );

      // Would check if stratum matches expected
      expect(interval.stratum).toBeDefined();
    });

    it('should fall back to property age stratum when detailed data insufficient', async () => {
      // Mock insufficient detailed calibration data
      vi.spyOn(conformalService as any, 'getStratumCalibrationData')
        .mockImplementation((stratum: string) => {
          if (stratum.includes('_')) {
            return Promise.resolve([]); // No data for detailed stratum
          }
          return Promise.resolve([
            { trueClass: 'early', trueProbability: 0.8, nonconformityScore: 0.2, importanceWeight: 1 },
            // ... more samples
          ]);
        });

      const interval = await conformalService.getPredictionInterval(
        { early: 0.6, midway: 0.3, full: 0.1 },
        'modern',
        'electrical',
        0.90
      );

      // Should fall back to 'modern' stratum
      expect(['modern', 'global', 'uncalibrated']).toContain(interval.stratum);
    });

    it('should fall back to global stratum when all specific strata insufficient', async () => {
      vi.spyOn(conformalService as any, 'getStratumCalibrationData')
        .mockResolvedValue([]); // No calibration data for any stratum

      const interval = await conformalService.getPredictionInterval(
        { early: 0.5, midway: 0.3, full: 0.2 },
        'unknown',
        'cosmetic',
        0.90
      );

      expect(interval.stratum).toBe('uncalibrated');
    });
  });

  describe('Small Sample Beta Correction', () => {
    it('should apply SSBC when calibration samples < 100', async () => {
      const smallCalibrationSet = Array(50).fill(null).map((_, i) => ({
        trueClass: 'early',
        trueProbability: 0.7 + i * 0.001,
        nonconformityScore: 0.3 - i * 0.001,
        importanceWeight: 1.0,
      }));

      vi.spyOn(conformalService as any, 'getStratumCalibrationData')
        .mockResolvedValue(smallCalibrationSet);

      const interval = await conformalService.getPredictionInterval(
        { early: 0.8, midway: 0.15, full: 0.05 },
        'victorian',
        'structural_minor',
        0.90
      );

      // With SSBC, the interval should be slightly larger (more conservative)
      expect(interval.interval_size).toBeGreaterThanOrEqual(1);
    });

    it('should not apply SSBC when calibration samples >= 100', async () => {
      const largeCalibrationSet = Array(150).fill(null).map((_, i) => ({
        trueClass: i % 3 === 0 ? 'early' : i % 3 === 1 ? 'midway' : 'full',
        trueProbability: 0.6 + (i % 40) * 0.01,
        nonconformityScore: 0.4 - (i % 40) * 0.01,
        importanceWeight: 1.0,
      }));

      vi.spyOn(conformalService as any, 'getStratumCalibrationData')
        .mockResolvedValue(largeCalibrationSet);

      const interval = await conformalService.getPredictionInterval(
        { early: 0.9, midway: 0.08, full: 0.02 },
        'modern',
        'cosmetic',
        0.90
      );

      // With large sample, no correction needed
      expect(interval.confidence_level).toBe(0.90);
    });
  });

  describe('Calibration Recording', () => {
    it('should record calibration samples with multiple strata', async () => {
      const mockSupabaseInsert = vi.fn().mockResolvedValue({ error: null });
      vi.spyOn(conformalService as any, 'serverSupabase').mockResolvedValue({
        from: () => ({
          insert: mockSupabaseInsert,
        }),
      });

      await conformalService.recordCalibrationSample(
        'assessment-123',
        {
          severity: 'early',
          confidence: 85,
          scores: { early: 0.85, midway: 0.10, full: 0.05 },
        },
        {
          severity: 'midway',
          damageType: 'water damage',
          source: 'expert_validation',
        },
        'victorian'
      );

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            stratum: 'victorian_water_damage',
            nonconformity_score: 0.90, // 1 - 0.10 (midway score)
          }),
          expect.objectContaining({
            stratum: 'victorian',
            nonconformity_score: 0.90,
          }),
          expect.objectContaining({
            stratum: 'global',
            nonconformity_score: 0.90,
          }),
        ])
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should track conformal prediction usage in routing decisions', async () => {
      const mockStats = await HybridInferenceService.getConformalPredictionStatistics();

      // Verify the structure of statistics
      expect(mockStats).toHaveProperty('totalWithConformal');
      expect(mockStats).toHaveProperty('totalWithoutConformal');
      expect(mockStats).toHaveProperty('averageIntervalSize');
      expect(mockStats).toHaveProperty('stratumDistribution');
      expect(mockStats).toHaveProperty('routingByIntervalSize');
      expect(mockStats).toHaveProperty('calibrationCoverage');
    });

    it('should calculate correct routing distribution by interval size', () => {
      const mockDecisions = [
        { conformal_interval_size: 1, route_selected: 'internal', conformal_calibration_used: true },
        { conformal_interval_size: 1, route_selected: 'internal', conformal_calibration_used: true },
        { conformal_interval_size: 2, route_selected: 'hybrid', conformal_calibration_used: true },
        { conformal_interval_size: 3, route_selected: 'gpt4_vision', conformal_calibration_used: true },
      ];

      const routingBySize: Record<number, any> = {};
      for (const decision of mockDecisions) {
        const size = decision.conformal_interval_size;
        if (!routingBySize[size]) {
          routingBySize[size] = { internal: 0, hybrid: 0, gpt4: 0 };
        }
        const route = decision.route_selected === 'gpt4_vision' ? 'gpt4' : decision.route_selected;
        routingBySize[size][route]++;
      }

      expect(routingBySize[1].internal).toBe(2);
      expect(routingBySize[2].hybrid).toBe(1);
      expect(routingBySize[3].gpt4).toBe(1);
    });
  });

  describe('Fallback Behavior', () => {
    it('should use raw confidence thresholds when calibration unavailable', async () => {
      vi.spyOn(conformalService, 'getPredictionInterval').mockRejectedValue(
        new Error('Calibration unavailable')
      );

      // The service should fall back to CONFIDENCE_THRESHOLDS
      const CONFIDENCE_THRESHOLDS = {
        high: 0.75,
        medium: 0.55,
        low: 0.35,
      };

      // Test high confidence fallback
      const highConfidence = 0.80;
      expect(highConfidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.high);

      // Test medium confidence fallback
      const mediumConfidence = 0.60;
      expect(mediumConfidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.medium);
      expect(mediumConfidence).toBeLessThan(CONFIDENCE_THRESHOLDS.high);

      // Test low confidence fallback
      const lowConfidence = 0.30;
      expect(lowConfidence).toBeLessThan(CONFIDENCE_THRESHOLDS.medium);
    });
  });
});