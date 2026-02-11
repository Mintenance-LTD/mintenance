// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Unit tests for ABTestAlertingService
 */

import { ABTestAlertingService } from '../ABTestAlertingService';
import { ABTestMonitoringService } from '../ABTestMonitoringService';

// Mock the monitoring service
vi.mock('../ABTestMonitoringService');

describe('ABTestAlertingService', () => {
  const mockExperimentId = 'test-experiment-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAlerts', () => {
    it('should detect critical SFN rate alerts', async () => {
      vi.mocked(ABTestMonitoringService.getMetrics).mockResolvedValue({
        sfnRate: 0.15, // Above 0.1% threshold
        automationRate: 50,
        escalationRate: 50,
        averageDecisionTime: 1.0,
        coverageRate: 90,
        calibrationDataPoints: 200,
        historicalValidations: 1000,
        seedSafeSetSize: 5,
        criticModelObservations: 150,
      });

      vi.mocked(ABTestMonitoringService.getCoverageViolations).mockResolvedValue([]);
      vi.mocked(ABTestMonitoringService.getAutomationRateOverTime).mockResolvedValue([]);

      const result = await ABTestAlertingService.checkAlerts(mockExperimentId);

      expect(result.hasAlerts).toBe(true);
      expect(result.criticalCount).toBeGreaterThan(0);
      expect(result.alerts.some(a => a.type === 'sfn_rate_exceeded')).toBe(true);
    });

    it('should detect warning coverage violations', async () => {
      vi.mocked(ABTestMonitoringService.getMetrics).mockResolvedValue({
        sfnRate: 0.05,
        automationRate: 50,
        escalationRate: 50,
        averageDecisionTime: 1.0,
        coverageRate: 90,
        calibrationDataPoints: 200,
        historicalValidations: 1000,
        seedSafeSetSize: 5,
        criticModelObservations: 150,
      });

      vi.mocked(ABTestMonitoringService.getCoverageViolations).mockResolvedValue([
        {
          stratum: 'test_stratum',
          expectedCoverage: 0.90,
          actualCoverage: 0.80,
          violation: 0.10, // 10% violation
          sampleSize: 100,
        },
      ]);

      vi.mocked(ABTestMonitoringService.getAutomationRateOverTime).mockResolvedValue([]);

      const result = await ABTestAlertingService.checkAlerts(mockExperimentId);

      expect(result.hasAlerts).toBe(true);
      expect(result.warningCount).toBeGreaterThan(0);
      expect(result.alerts.some(a => a.type === 'coverage_violation')).toBe(true);
    });

    it('should detect automation rate spikes', async () => {
      vi.mocked(ABTestMonitoringService.getMetrics).mockResolvedValue({
        sfnRate: 0.05,
        automationRate: 50,
        escalationRate: 50,
        averageDecisionTime: 1.0,
        coverageRate: 90,
        calibrationDataPoints: 200,
        historicalValidations: 1000,
        seedSafeSetSize: 5,
        criticModelObservations: 150,
      });

      vi.mocked(ABTestMonitoringService.getCoverageViolations).mockResolvedValue([]);

      vi.mocked(ABTestMonitoringService.getAutomationRateOverTime).mockResolvedValue([
        { date: '2024-01-01', rate: 30 },
        { date: '2024-01-02', rate: 55 }, // 25% spike
      ]);

      const result = await ABTestAlertingService.checkAlerts(mockExperimentId);

      expect(result.hasAlerts).toBe(true);
      expect(result.warningCount).toBeGreaterThan(0);
      expect(result.alerts.some(a => a.type === 'automation_rate_spike')).toBe(true);
    });

    it('should detect info alerts for low critic observations', async () => {
      vi.mocked(ABTestMonitoringService.getMetrics).mockResolvedValue({
        sfnRate: 0.05,
        automationRate: 50,
        escalationRate: 50,
        averageDecisionTime: 1.0,
        coverageRate: 90,
        calibrationDataPoints: 200,
        historicalValidations: 1000,
        seedSafeSetSize: 5,
        criticModelObservations: 50, // Below 100 threshold
      });

      vi.mocked(ABTestMonitoringService.getCoverageViolations).mockResolvedValue([]);
      vi.mocked(ABTestMonitoringService.getAutomationRateOverTime).mockResolvedValue([]);

      const result = await ABTestAlertingService.checkAlerts(mockExperimentId);

      expect(result.hasAlerts).toBe(true);
      expect(result.infoCount).toBeGreaterThan(0);
      expect(result.alerts.some(a => a.type === 'low_critic_observations')).toBe(true);
    });

    it('should return no alerts when all metrics are healthy', async () => {
      vi.mocked(ABTestMonitoringService.getMetrics).mockResolvedValue({
        sfnRate: 0.05,
        automationRate: 50,
        escalationRate: 50,
        averageDecisionTime: 1.0,
        coverageRate: 90,
        calibrationDataPoints: 200,
        historicalValidations: 1000,
        seedSafeSetSize: 5,
        criticModelObservations: 150,
      });

      vi.mocked(ABTestMonitoringService.getCoverageViolations).mockResolvedValue([]);
      vi.mocked(ABTestMonitoringService.getAutomationRateOverTime).mockResolvedValue([
        { date: '2024-01-01', rate: 50 },
        { date: '2024-01-02', rate: 52 }, // Small change
      ]);

      const result = await ABTestAlertingService.checkAlerts(mockExperimentId);

      expect(result.hasAlerts).toBe(false);
      expect(result.criticalCount).toBe(0);
      expect(result.warningCount).toBe(0);
    });
  });
});

