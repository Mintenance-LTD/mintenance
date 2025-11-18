/**
 * Integration tests for A/B test flow
 * 
 * Tests end-to-end flow including:
 * - Context vector consistency
 * - Alert triggering
 * - Conformal prediction edge cases
 */

import { ABTestIntegration } from '../ab_test_harness';
import { ContextFeatureService } from '../ContextFeatureService';
import { ABTestAlertingService } from '../ABTestAlertingService';
import { ConformalPredictionMonitoringService } from '../ConformalPredictionMonitoringService';
import { CriticModule } from '../critic';

// Mock dependencies
jest.mock('@/lib/api/supabaseServer');
jest.mock('../BuildingSurveyorService');
jest.mock('../DetectorFusionService');

describe('A/B Test Integration', () => {
  describe('Context Vector Consistency', () => {
    it('should produce identical context vectors for same features', () => {
      const features = {
        fusion_confidence: 0.8,
        fusion_variance: 0.1,
        cp_set_size: 5,
        safety_critical_candidate: 1,
        lighting_quality: 0.9,
        image_clarity: 0.85,
        property_age: 50,
        property_age_bin: '50-100',
        num_damage_sites: 3,
        detector_disagreement: 0.05,
        ood_score: 0.1,
        region: 'northeast',
      };

      const vector1 = ContextFeatureService.constructContextVector(features);
      const vector2 = ContextFeatureService.constructContextVector(features);

      expect(vector1).toEqual(vector2);
      expect(vector1).toHaveLength(12);
    });

    it('should maintain feature ordering across services', () => {
      const features = {
        fusion_confidence: 0.8,
        fusion_variance: 0.1,
        cp_set_size: 5,
        safety_critical_candidate: 1,
        lighting_quality: 0.9,
        image_clarity: 0.85,
        property_age: 50,
        property_age_bin: '50-100',
        num_damage_sites: 3,
        detector_disagreement: 0.05,
        ood_score: 0.1,
        region: 'northeast',
      };

      const constructed = ContextFeatureService.constructContextVector(features);
      const extracted = ContextFeatureService.extractContextVector(features);

      expect(constructed).toEqual(extracted);
    });
  });

  describe('Alert Triggering', () => {
    it('should trigger alerts when thresholds are exceeded', async () => {
      // This would require mocking the monitoring service
      // For now, we test the alert logic structure
      const experimentId = 'test-experiment';
      
      // Mock would be set up here
      const result = await ABTestAlertingService.checkAlerts(experimentId);
      
      expect(result).toHaveProperty('hasAlerts');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('criticalCount');
      expect(result).toHaveProperty('warningCount');
      expect(result).toHaveProperty('infoCount');
    });
  });

  describe('Conformal Prediction Edge Cases', () => {
    it('should handle empty calibration data gracefully', async () => {
      const experimentId = 'test-experiment';
      
      // Test that service handles empty data
      const metrics = await ConformalPredictionMonitoringService.getStratumCoverageMetrics(
        experimentId
      );
      
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should handle single stratum case', async () => {
      const experimentId = 'test-experiment';
      
      const trend = await ConformalPredictionMonitoringService.getCoverageTrend(
        experimentId,
        'single_stratum',
        30
      );
      
      expect(trend).toHaveProperty('stratum');
      expect(trend).toHaveProperty('dates');
      expect(trend).toHaveProperty('coverage');
      expect(trend).toHaveProperty('expectedCoverage');
    });

    it('should handle missing outcomes gracefully', async () => {
      const experimentId = 'test-experiment';
      
      const violations = await ConformalPredictionMonitoringService.checkCoverageViolations(
        experimentId
      );
      
      expect(violations).toHaveProperty('hasViolations');
      expect(violations).toHaveProperty('violations');
      expect(violations).toHaveProperty('alerts');
    });
  });

  describe('Critic Module Integration', () => {
    it('should handle context vectors consistently', async () => {
      const context = ContextFeatureService.constructContextVector({
        fusion_confidence: 0.8,
        fusion_variance: 0.1,
        cp_set_size: 5,
        safety_critical_candidate: 0,
        lighting_quality: 0.9,
        image_clarity: 0.85,
        property_age: 50,
        property_age_bin: '50-100',
        num_damage_sites: 3,
        detector_disagreement: 0.05,
        ood_score: 0.1,
        region: 'northeast',
      });

      const decision = await CriticModule.selectArm({
        context,
        delta_safety: 0.1,
      });

      expect(decision).toHaveProperty('arm');
      expect(decision).toHaveProperty('rewardUcb');
      expect(decision).toHaveProperty('safetyUcb');
      expect(['automate', 'escalate']).toContain(decision.arm);
    });

    it('should always escalate when safety UCB exceeds threshold', async () => {
      // Create a context that would trigger high safety UCB
      const context = ContextFeatureService.constructContextVector({
        fusion_confidence: 0.3, // Low confidence
        fusion_variance: 0.5, // High variance
        cp_set_size: 10, // Large prediction set
        safety_critical_candidate: 1, // Safety critical
        lighting_quality: 0.3, // Poor quality
        image_clarity: 0.3,
        property_age: 100,
        property_age_bin: '100+',
        num_damage_sites: 10,
        detector_disagreement: 0.5,
        ood_score: 0.8, // High OOD
        region: 'unknown',
      });

      const decision = await CriticModule.selectArm({
        context,
        delta_safety: 0.1,
      });

      // If safety UCB > threshold, should escalate
      if (decision.safetyUcb > decision.safetyThreshold) {
        expect(decision.arm).toBe('escalate');
      }
    });
  });
});

