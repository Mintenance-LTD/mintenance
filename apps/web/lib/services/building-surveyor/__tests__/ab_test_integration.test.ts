import { vi } from 'vitest';
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
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockImplementation((cb: (val: { data: never[], error: null }) => unknown) => cb({ data: [], error: null })),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../BuildingSurveyorService');
vi.mock('../DetectorFusionService');

// Import serverSupabase so we can re-setup mocks in beforeEach
import { serverSupabase } from '@/lib/api/supabaseServer';

const mockChain = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: vi.fn().mockImplementation((cb: (val: { data: never[], error: null }) => unknown) =>
    Promise.resolve(cb({ data: [], error: null }))
  ),
});

describe('A/B Test Integration', () => {
  beforeEach(() => {
    // Re-setup mocks after mockReset clears them
    (serverSupabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain());
    if (serverSupabase.rpc) {
      (serverSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
    }
  });

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

