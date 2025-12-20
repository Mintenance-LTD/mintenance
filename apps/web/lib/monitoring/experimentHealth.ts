/**
 * Experiment Health Monitoring
 *
 * Aggregates metrics from ABTestMonitoringService, ConformalPredictionMonitoringService,
 * and ABTestAlertingService to provide a unified view of experiment health.
 */

import { ABTestMonitoringService } from '@/lib/services/building-surveyor/ABTestMonitoringService';
import { ConformalPredictionMonitoringService } from '@/lib/services/building-surveyor/ConformalPredictionMonitoringService';
import { ABTestAlertingService } from '@/lib/services/building-surveyor/ABTestAlertingService';
import { logger } from '@mintenance/shared';

export interface ExperimentHealth {
  experimentId: string;
  automationRate: number; // 0-1
  escalationRate: number; // 0-1
  sfnRate: number; // 0-1
  averageDecisionTimeMs: number;
  calibrationCount: number;
  validationCount: number;
  seedSafeSetSize: number;
  criticObservations: number;

  // CP coverage
  coverageOverall: number; // 0-1
  worstStratum?: {
    id: string;
    coverage: number; // 0-1
    targetCoverage: number; // 0-1
    violation: number; // coverage deficit
    n: number; // calibration sample size
  };

  // Alerts (recent subset)
  recentAlerts: Array<{
    id: string;
    createdAt: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    type: string;
    message: string;
  }>;
}

/**
 * Get aggregated experiment health data for a given experiment ID.
 *
 * @param experimentId - The A/B test experiment ID
 * @returns Aggregated experiment health metrics
 */
export async function getExperimentHealth(experimentId: string): Promise<ExperimentHealth> {
  try {
    // Get A/B test metrics
    const abMetrics = await ABTestMonitoringService.getMetrics(experimentId);

    // Get conformal prediction coverage metrics
    const cpMetrics = await ConformalPredictionMonitoringService.getStratumCoverageMetrics(
      experimentId
    );

    // Calculate overall coverage (weighted average across strata)
    let coverageOverall = 0;
    let totalSamples = 0;
    let worstStratum: ExperimentHealth['worstStratum'] | undefined;

    if (cpMetrics.length > 0) {
      for (const stratum of cpMetrics) {
        const stratumSamples = stratum.sampleSize;
        totalSamples += stratumSamples;
        coverageOverall += stratum.coverage * stratumSamples;

        // Track worst stratum (highest violation)
        if (!worstStratum || stratum.violation > worstStratum.violation) {
          worstStratum = {
            id: stratum.stratum,
            coverage: stratum.coverage,
            targetCoverage: stratum.expectedCoverage,
            violation: stratum.violation,
            n: stratum.sampleSize,
          };
        }
      }

      if (totalSamples > 0) {
        coverageOverall = coverageOverall / totalSamples;
      }
    } else {
      // Fallback: use coverage rate from AB metrics if available
      coverageOverall = abMetrics.coverageRate / 100; // Convert from percentage
    }

    // Get recent alerts (limit to most recent 10)
    const alertCheck = await ABTestAlertingService.checkAlerts(experimentId);
    const recentAlerts = alertCheck.alerts
      .slice(0, 10)
      .map((alert) => ({
        id: alert.id || `${alert.type}-${alert.createdAt}`,
        createdAt: alert.createdAt,
        severity: alert.severity.toUpperCase() as 'CRITICAL' | 'WARNING' | 'INFO',
        type: alert.type,
        message: alert.message,
      }));

    return {
      experimentId,
      automationRate: abMetrics.automationRate / 100, // Convert from percentage to 0-1
      escalationRate: abMetrics.escalationRate / 100,
      sfnRate: abMetrics.sfnRate / 100,
      averageDecisionTimeMs: abMetrics.averageDecisionTime * 1000, // Convert from seconds to ms
      calibrationCount: abMetrics.calibrationDataPoints,
      validationCount: abMetrics.historicalValidations,
      seedSafeSetSize: abMetrics.seedSafeSetSize,
      criticObservations: abMetrics.criticModelObservations,
      coverageOverall,
      worstStratum,
      recentAlerts,
    };
  } catch (error) {
    logger.error('Failed to get experiment health', {
      service: 'ExperimentHealth',
      experimentId,
      error,
    });

    // Return fallback data on error
    return {
      experimentId,
      automationRate: 0,
      escalationRate: 0,
      sfnRate: 0,
      averageDecisionTimeMs: 0,
      calibrationCount: 0,
      validationCount: 0,
      seedSafeSetSize: 0,
      criticObservations: 0,
      coverageOverall: 0,
      worstStratum: undefined,
      recentAlerts: [],
    };
  }
}

