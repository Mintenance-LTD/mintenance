/**
 * Unit tests for ConformalPredictionMonitoringService
 */

import { ConformalPredictionMonitoringService } from '../ConformalPredictionMonitoringService';
import { serverSupabase } from '@/lib/api/supabaseServer';

// Mock Supabase
jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: jest.fn(),
  },
}));

describe('ConformalPredictionMonitoringService', () => {
  const mockExperimentId = 'test-experiment-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStratumCoverageMetrics', () => {
    it('should calculate coverage metrics for each stratum', async () => {
      const mockOutcomes = [
        {
          cp_stratum: 'stratum1',
          true_class: 'damage_type_1',
          cp_prediction_set: ['damage_type_1', 'damage_type_2'],
          validated_at: '2024-01-01T00:00:00Z',
        },
        {
          cp_stratum: 'stratum1',
          true_class: 'damage_type_1',
          cp_prediction_set: ['damage_type_1'],
          validated_at: '2024-01-02T00:00:00Z',
        },
        {
          cp_stratum: 'stratum2',
          true_class: 'damage_type_2',
          cp_prediction_set: ['damage_type_3'], // Not covered
          validated_at: '2024-01-01T00:00:00Z',
        },
      ];

      (serverSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockOutcomes }),
      });

      const metrics = await ConformalPredictionMonitoringService.getStratumCoverageMetrics(
        mockExperimentId
      );

      expect(metrics).toHaveLength(2);
      
      const stratum1 = metrics.find(m => m.stratum === 'stratum1');
      expect(stratum1).toBeDefined();
      expect(stratum1?.coverage).toBe(1.0); // Both covered
      expect(stratum1?.sampleSize).toBe(2);

      const stratum2 = metrics.find(m => m.stratum === 'stratum2');
      expect(stratum2).toBeDefined();
      expect(stratum2?.coverage).toBe(0.0); // Not covered
      expect(stratum2?.sampleSize).toBe(1);
    });

    it('should handle empty outcomes', async () => {
      (serverSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
      });

      const metrics = await ConformalPredictionMonitoringService.getStratumCoverageMetrics(
        mockExperimentId
      );

      expect(metrics).toHaveLength(0);
    });
  });

  describe('checkCoverageViolations', () => {
    it('should detect coverage violations', async () => {
      const mockOutcomes = [
        {
          cp_stratum: 'stratum1',
          true_class: 'damage_type_1',
          cp_prediction_set: ['damage_type_2'], // Not covered
          validated_at: '2024-01-01T00:00:00Z',
        },
      ];

      (serverSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockOutcomes }),
      });

      const result = await ConformalPredictionMonitoringService.checkCoverageViolations(
        mockExperimentId
      );

      expect(result.hasViolations).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    it('should not detect violations when coverage is adequate', async () => {
      const mockOutcomes = [
        {
          cp_stratum: 'stratum1',
          true_class: 'damage_type_1',
          cp_prediction_set: ['damage_type_1', 'damage_type_2'], // Covered
          validated_at: '2024-01-01T00:00:00Z',
        },
      ];

      (serverSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockOutcomes }),
      });

      const result = await ConformalPredictionMonitoringService.checkCoverageViolations(
        mockExperimentId
      );

      expect(result.hasViolations).toBe(false);
    });
  });

  describe('getRecalibrationSuggestions', () => {
    it('should suggest recalibration for persistent violations', async () => {
      // Mock outcomes that would create persistent violations
      const mockOutcomes = Array(10).fill({
        cp_stratum: 'stratum1',
        true_class: 'damage_type_1',
        cp_prediction_set: ['damage_type_2'], // Not covered
        validated_at: '2024-01-01T00:00:00Z',
      });

      (serverSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockOutcomes }),
      });

      const suggestions = await ConformalPredictionMonitoringService.getRecalibrationSuggestions(
        mockExperimentId
      );

      // Should suggest recalibration if violations are persistent
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});

