/**
 * Conformal Prediction Monitoring Service
 * 
 * Tracks coverage per stratum over time and alerts when coverage drops below target.
 * Suggests recalibration when violations persist.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

export interface StratumCoverageMetrics {
  stratum: string;
  coverage: number; // Actual coverage rate (0-1)
  expectedCoverage: number; // Target coverage (default 0.90)
  violation: number; // Difference (expected - actual)
  sampleSize: number;
  lastUpdated: string;
  violationCount: number; // Number of times this stratum has violated
  needsRecalibration: boolean;
}

export interface CoverageTrend {
  stratum: string;
  dates: string[];
  coverage: number[];
  expectedCoverage: number;
}

export class ConformalPredictionMonitoringService {
  private static readonly TARGET_COVERAGE = 0.90; // 90% coverage target
  private static readonly VIOLATION_THRESHOLD = 0.05; // 5% violation threshold
  private static readonly RECALIBRATION_THRESHOLD = 3; // Suggest recalibration after 3 violations

  /**
   * Get coverage metrics for all strata
   */
  static async getStratumCoverageMetrics(
    experimentId: string
  ): Promise<StratumCoverageMetrics[]> {
    try {
      const { data: outcomes } = await serverSupabase
        .from('ab_outcomes')
        .select('cp_stratum, true_class, cp_prediction_set, validated_at')
        .eq('experiment_id', experimentId)
        .order('validated_at', { ascending: false })
        .limit(10000);

      if (!outcomes || outcomes.length === 0) {
        return [];
      }

      // Group by stratum
      const stratumGroups = new Map<string, {
        total: number;
        covered: number;
        lastUpdated: string;
      }>();

      for (const outcome of outcomes) {
        const stratum = outcome.cp_stratum || 'global';
        const trueClass = outcome.true_class;
        const predictionSet = outcome.cp_prediction_set || [];
        const validatedAt = outcome.validated_at || new Date().toISOString();

        const group = stratumGroups.get(stratum) || {
          total: 0,
          covered: 0,
          lastUpdated: validatedAt,
        };
        group.total += 1;
        if (predictionSet.includes(trueClass)) {
          group.covered += 1;
        }
        if (validatedAt > group.lastUpdated) {
          group.lastUpdated = validatedAt;
        }
        stratumGroups.set(stratum, group);
      }

      // Get violation history for each stratum
      const violationHistory = await this.getViolationHistory(experimentId);

      // Build metrics
      const metrics: StratumCoverageMetrics[] = [];
      for (const [stratum, group] of stratumGroups.entries()) {
        const coverage = group.total > 0 ? group.covered / group.total : 0;
        const violation = this.TARGET_COVERAGE - coverage;
        const violationCount = violationHistory.get(stratum) || 0;

        metrics.push({
          stratum,
          coverage,
          expectedCoverage: this.TARGET_COVERAGE,
          violation: Math.max(0, violation),
          sampleSize: group.total,
          lastUpdated: group.lastUpdated,
          violationCount,
          needsRecalibration: violationCount >= this.RECALIBRATION_THRESHOLD && violation > this.VIOLATION_THRESHOLD,
        });
      }

      return metrics.sort((a, b) => b.violation - a.violation);
    } catch (error) {
      logger.error('Failed to get stratum coverage metrics', {
        service: 'ConformalPredictionMonitoringService',
        experimentId,
        error,
      });
      return [];
    }
  }

  /**
   * Get coverage trend over time for a specific stratum
   */
  static async getCoverageTrend(
    experimentId: string,
    stratum: string,
    days: number = 30
  ): Promise<CoverageTrend> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: outcomes } = await serverSupabase
        .from('ab_outcomes')
        .select('cp_stratum, true_class, cp_prediction_set, validated_at')
        .eq('experiment_id', experimentId)
        .eq('cp_stratum', stratum)
        .gte('validated_at', startDate.toISOString())
        .order('validated_at', { ascending: true });

      if (!outcomes || outcomes.length === 0) {
        return {
          stratum,
          dates: [],
          coverage: [],
          expectedCoverage: this.TARGET_COVERAGE,
        };
      }

      // Group by date
      const dailyGroups = new Map<string, { total: number; covered: number }>();

      for (const outcome of outcomes) {
        const date = new Date(outcome.validated_at).toISOString().split('T')[0];
        const trueClass = outcome.true_class;
        const predictionSet = outcome.cp_prediction_set || [];

        const group = dailyGroups.get(date) || { total: 0, covered: 0 };
        group.total += 1;
        if (predictionSet.includes(trueClass)) {
          group.covered += 1;
        }
        dailyGroups.set(date, group);
      }

      const dates: string[] = [];
      const coverage: number[] = [];

      for (const [date, group] of Array.from(dailyGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        dates.push(date);
        coverage.push(group.total > 0 ? group.covered / group.total : 0);
      }

      return {
        stratum,
        dates,
        coverage,
        expectedCoverage: this.TARGET_COVERAGE,
      };
    } catch (error) {
      logger.error('Failed to get coverage trend', {
        service: 'ConformalPredictionMonitoringService',
        experimentId,
        stratum,
        error,
      });
      return {
        stratum,
        dates: [],
        coverage: [],
        expectedCoverage: this.TARGET_COVERAGE,
      };
    }
  }

  /**
   * Check for coverage violations and return alerts
   */
  static async checkCoverageViolations(
    experimentId: string
  ): Promise<{
    hasViolations: boolean;
    violations: StratumCoverageMetrics[];
    alerts: string[];
  }> {
    const metrics = await this.getStratumCoverageMetrics(experimentId);
    const violations = metrics.filter(m => m.violation > this.VIOLATION_THRESHOLD);

    const alerts: string[] = [];
    for (const violation of violations) {
      if (violation.needsRecalibration) {
        alerts.push(
          `Stratum "${violation.stratum}" has ${violation.violationCount} coverage violations and needs recalibration. ` +
          `Current coverage: ${(violation.coverage * 100).toFixed(2)}%, Expected: ${(violation.expectedCoverage * 100).toFixed(0)}%`
        );
      } else if (violation.violation > this.VIOLATION_THRESHOLD) {
        alerts.push(
          `Stratum "${violation.stratum}" coverage violation: ${(violation.coverage * 100).toFixed(2)}% ` +
          `(expected ${(violation.expectedCoverage * 100).toFixed(0)}%, sample size: ${violation.sampleSize})`
        );
      }
    }

    return {
      hasViolations: violations.length > 0,
      violations,
      alerts,
    };
  }

  /**
   * Get violation history for all strata
   */
  private static async getViolationHistory(
    experimentId: string
  ): Promise<Map<string, number>> {
    try {
      // Get historical coverage violations from outcomes
      // Count how many times each stratum has violated
      const { data: outcomes } = await serverSupabase
        .from('ab_outcomes')
        .select('cp_stratum, true_class, cp_prediction_set, validated_at')
        .eq('experiment_id', experimentId)
        .order('validated_at', { ascending: false })
        .limit(50000);

      if (!outcomes || outcomes.length === 0) {
        return new Map();
      }

      // Group by stratum and date, then count violations per stratum
      const violationCounts = new Map<string, number>();
      const stratumDateGroups = new Map<string, Map<string, { total: number; covered: number }>>();

      for (const outcome of outcomes) {
        const stratum = outcome.cp_stratum || 'global';
        const date = new Date(outcome.validated_at).toISOString().split('T')[0];
        const trueClass = outcome.true_class;
        const predictionSet = outcome.cp_prediction_set || [];

        let dateGroups = stratumDateGroups.get(stratum);
        if (!dateGroups) {
          dateGroups = new Map();
          stratumDateGroups.set(stratum, dateGroups);
        }

        let dayGroup = dateGroups.get(date);
        if (!dayGroup) {
          dayGroup = { total: 0, covered: 0 };
          dateGroups.set(date, dayGroup);
        }

        dayGroup.total += 1;
        if (predictionSet.includes(trueClass)) {
          dayGroup.covered += 1;
        }
      }

      // Count violations per stratum
      for (const [stratum, dateGroups] of stratumDateGroups.entries()) {
        let violations = 0;
        for (const [_, dayGroup] of dateGroups.entries()) {
          const coverage = dayGroup.total > 0 ? dayGroup.covered / dayGroup.total : 0;
          if (coverage < this.TARGET_COVERAGE - this.VIOLATION_THRESHOLD) {
            violations += 1;
          }
        }
        violationCounts.set(stratum, violations);
      }

      return violationCounts;
    } catch (error) {
      logger.warn('Failed to get violation history', {
        service: 'ConformalPredictionMonitoringService',
        error,
      });
      return new Map();
    }
  }

  /**
   * Suggest recalibration for strata with persistent violations
   */
  static async getRecalibrationSuggestions(
    experimentId: string
  ): Promise<Array<{
    stratum: string;
    reason: string;
    currentCoverage: number;
    expectedCoverage: number;
    sampleSize: number;
    recommendation: string;
  }>> {
    const metrics = await this.getStratumCoverageMetrics(experimentId);
    const suggestions: Array<{
      stratum: string;
      reason: string;
      currentCoverage: number;
      expectedCoverage: number;
      sampleSize: number;
      recommendation: string;
    }> = [];

    for (const metric of metrics) {
      if (metric.needsRecalibration) {
        suggestions.push({
          stratum: metric.stratum,
          reason: `Persistent coverage violations (${metric.violationCount} violations)`,
          currentCoverage: metric.coverage,
          expectedCoverage: metric.expectedCoverage,
          sampleSize: metric.sampleSize,
          recommendation: `Recalibrate conformal prediction for stratum "${metric.stratum}". ` +
            `Consider: 1) Collect more calibration data, 2) Adjust quantile computation, 3) Review stratification logic.`,
        });
      } else if (metric.violation > this.VIOLATION_THRESHOLD && metric.sampleSize < 100) {
        suggestions.push({
          stratum: metric.stratum,
          reason: `Low sample size (${metric.sampleSize}) with coverage violation`,
          currentCoverage: metric.coverage,
          expectedCoverage: metric.expectedCoverage,
          sampleSize: metric.sampleSize,
          recommendation: `Collect more calibration data for stratum "${metric.stratum}" before recalibrating.`,
        });
      }
    }

    return suggestions;
  }
}

