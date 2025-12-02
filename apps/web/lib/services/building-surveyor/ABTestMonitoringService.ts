/**
 * A/B Test Monitoring Service
 * 
 * Tracks automation rate, SFN rates, coverage violations, and other metrics
 * for the Safe-LUCB A/B testing system.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

export interface ABTestMetrics {
  automationRate: number; // Percentage of assessments automated
  escalationRate: number; // Percentage escalated to human review
  sfnRate: number; // Safety False Negative rate
  averageDecisionTime: number; // Average decision time in seconds
  coverageRate: number; // Conformal prediction coverage rate
  calibrationDataPoints: number; // Number of calibration points
  historicalValidations: number; // Number of historical validations
  seedSafeSetSize: number; // Number of contexts in seed safe set
  criticModelObservations: number; // Number of observations in critic model
}

export interface CoverageViolation {
  stratum: string;
  expectedCoverage: number;
  actualCoverage: number;
  violation: number; // Difference (should be close to 0)
  sampleSize: number;
}

export class ABTestMonitoringService {
  /**
   * Get current A/B test metrics
   */
  static async getMetrics(experimentId: string): Promise<ABTestMetrics> {
    try {
      // Get decision counts
      const { data: decisions } = await serverSupabase
        .from('ab_decisions')
        .select('decision, decision_time_ms')
        .eq('experiment_id', experimentId);

      const totalDecisions = decisions?.length || 0;
      const automatedCount = decisions?.filter(d => d.decision === 'automate').length || 0;
      const escalatedCount = decisions?.filter(d => d.decision === 'escalate').length || 0;

      const automationRate = totalDecisions > 0 ? (automatedCount / totalDecisions) * 100 : 0;
      const escalationRate = totalDecisions > 0 ? (escalatedCount / totalDecisions) * 100 : 0;

      // Calculate average decision time
      const avgDecisionTime = decisions && decisions.length > 0
        ? decisions.reduce((sum, d) => sum + (d.decision_time_ms || 0), 0) / decisions.length / 1000
        : 0;

      // Get SFN rate from outcomes
      const { data: outcomes } = await serverSupabase
        .from('ab_outcomes')
        .select('sfn')
        .eq('experiment_id', experimentId);

      const totalOutcomes = outcomes?.length || 0;
      const sfnCount = outcomes?.filter(o => o.sfn === true).length || 0;
      const sfnRate = totalOutcomes > 0 ? (sfnCount / totalOutcomes) * 100 : 0;

      // Get coverage rate (from calibration data)
      const coverageRate = await this.getCoverageRate();

      // Get calibration data count
      const { count: calibrationCount } = await serverSupabase
        .from('ab_calibration_data')
        .select('*', { count: 'exact', head: true });

      // Get historical validations count
      const { count: historicalCount } = await serverSupabase
        .from('ab_historical_validations')
        .select('*', { count: 'exact', head: true });

      // Get seed safe set size (contexts with n≥1000, SFN=0)
      const seedSafeSetSize = await this.getSeedSafeSetSize();

      // Get critic model observations
      const { data: criticModel } = await serverSupabase
        .from('ab_critic_models')
        .select('parameters')
        .eq('model_type', 'safe_lucb')
        .single();

      const criticObservations = criticModel?.parameters?.n || 0;

      return {
        automationRate,
        escalationRate,
        sfnRate,
        averageDecisionTime: avgDecisionTime,
        coverageRate,
        calibrationDataPoints: calibrationCount || 0,
        historicalValidations: historicalCount || 0,
        seedSafeSetSize,
        criticModelObservations: criticObservations,
      };
    } catch (error) {
      logger.error('Failed to get A/B test metrics', {
        service: 'ABTestMonitoringService',
        experimentId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get coverage violations (where actual coverage < expected)
   */
  static async getCoverageViolations(
    expectedCoverage: number = 0.90
  ): Promise<CoverageViolation[]> {
    try {
      // Get outcomes grouped by stratum
      const { data: outcomes } = await serverSupabase
        .from('ab_outcomes')
        .select('cp_stratum, true_class, cp_prediction_set');

      if (!outcomes || outcomes.length === 0) {
        return [];
      }

      // Group by stratum
      const stratumGroups = new Map<string, {
        total: number;
        covered: number;
      }>();

      for (const outcome of outcomes) {
        const stratum = outcome.cp_stratum || 'global';
        const trueClass = outcome.true_class;
        const predictionSet = outcome.cp_prediction_set || [];

        const group = stratumGroups.get(stratum) || { total: 0, covered: 0 };
        group.total += 1;
        if (predictionSet.includes(trueClass)) {
          group.covered += 1;
        }
        stratumGroups.set(stratum, group);
      }

      // Calculate violations
      const violations: CoverageViolation[] = [];
      for (const [stratum, group] of stratumGroups.entries()) {
        const actualCoverage = group.total > 0 ? group.covered / group.total : 0;
        const violation = expectedCoverage - actualCoverage;

        if (violation > 0.05) { // Only report significant violations (>5%)
          violations.push({
            stratum,
            expectedCoverage,
            actualCoverage,
            violation,
            sampleSize: group.total,
          });
        }
      }

      return violations.sort((a, b) => b.violation - a.violation);
    } catch (error) {
      logger.error('Failed to get coverage violations', {
        service: 'ABTestMonitoringService',
        error,
      });
      return [];
    }
  }

  /**
   * Get coverage rate (overall)
   */
  private static async getCoverageRate(): Promise<number> {
    try {
      const { data: outcomes } = await serverSupabase
        .from('ab_outcomes')
        .select('true_class, cp_prediction_set')
        .limit(1000);

      if (!outcomes || outcomes.length === 0) {
        return 0;
      }

      let covered = 0;
      for (const outcome of outcomes) {
        const trueClass = outcome.true_class;
        const predictionSet = outcome.cp_prediction_set || [];
        if (predictionSet.includes(trueClass)) {
          covered += 1;
        }
      }

      return (covered / outcomes.length) * 100;
    } catch (error) {
      logger.warn('Failed to calculate coverage rate', {
        service: 'ABTestMonitoringService',
        error,
      });
      return 0;
    }
  }

  /**
   * Get seed safe set size (contexts with n≥1000, SFN=0)
   */
  private static async getSeedSafeSetSize(): Promise<number> {
    try {
      const { data: validations } = await serverSupabase
        .from('ab_historical_validations')
        .select('property_type, property_age_bin, region, sfn')
        .limit(10000);

      if (!validations || validations.length === 0) {
        return 0;
      }

      // Group by context
      const contextGroups = new Map<string, {
        total: number;
        sfn: number;
      }>();

      for (const v of validations) {
        const key = `${v.property_type}_${v.property_age_bin}_${v.region}`;
        const group = contextGroups.get(key) || { total: 0, sfn: 0 };
        group.total += 1;
        if (v.sfn === true) {
          group.sfn += 1;
        }
        contextGroups.set(key, group);
      }

      // Count contexts with n≥1000 and SFN=0
      let safeSetSize = 0;
      for (const [_, group] of contextGroups.entries()) {
        if (group.total >= 1000 && group.sfn === 0) {
          safeSetSize += 1;
        }
      }

      return safeSetSize;
    } catch (error) {
      logger.warn('Failed to calculate seed safe set size', {
        service: 'ABTestMonitoringService',
        error,
      });
      return 0;
    }
  }

  /**
   * Alert on coverage violations
   */
  static async checkCoverageViolations(
    expectedCoverage: number = 0.90,
    threshold: number = 0.05
  ): Promise<{
    hasViolations: boolean;
    violations: CoverageViolation[];
    alert: string | null;
  }> {
    const violations = await this.getCoverageViolations(expectedCoverage);
    const significantViolations = violations.filter(v => v.violation > threshold);

    let alert: string | null = null;
    if (significantViolations.length > 0) {
      alert = `Coverage violation detected: ${significantViolations.length} strata below ${(expectedCoverage * 100).toFixed(0)}% coverage`;
      logger.warn('Coverage violation alert', {
        service: 'ABTestMonitoringService',
        violations: significantViolations,
      });
    }

    return {
      hasViolations: significantViolations.length > 0,
      violations: significantViolations,
      alert,
    };
  }

  /**
   * Get per-stratum coverage metrics
   */
  static async getPerStratumCoverage(
    experimentId: string
  ): Promise<Array<{
    stratum: string;
    coverage: number;
    sampleSize: number;
    expectedCoverage: number;
  }>> {
    try {
      const { data: outcomes } = await serverSupabase
        .from('ab_outcomes')
        .select('cp_stratum, true_class, cp_prediction_set')
        .eq('experiment_id', experimentId)
        .limit(5000);

      if (!outcomes || outcomes.length === 0) {
        return [];
      }

      const stratumGroups = new Map<string, { total: number; covered: number }>();

      for (const outcome of outcomes) {
        const stratum = outcome.cp_stratum || 'global';
        const trueClass = outcome.true_class;
        const predictionSet = outcome.cp_prediction_set || [];

        const group = stratumGroups.get(stratum) || { total: 0, covered: 0 };
        group.total += 1;
        if (predictionSet.includes(trueClass)) {
          group.covered += 1;
        }
        stratumGroups.set(stratum, group);
      }

      return Array.from(stratumGroups.entries())
        .map(([stratum, group]) => ({
          stratum,
          coverage: group.total > 0 ? (group.covered / group.total) * 100 : 0,
          sampleSize: group.total,
          expectedCoverage: 90, // Target 90% coverage
        }))
        .sort((a, b) => b.sampleSize - a.sampleSize);
    } catch (error) {
      logger.error('Failed to get per-stratum coverage', {
        service: 'ABTestMonitoringService',
        error,
      });
      return [];
    }
  }

  /**
   * Get per-arm SFN rates (control vs treatment)
   */
  static async getPerArmSFNRates(
    experimentId: string
  ): Promise<{
    control: { sfnRate: number; totalOutcomes: number; sfnCount: number };
    treatment: { sfnRate: number; totalOutcomes: number; sfnCount: number };
  }> {
    try {
      // Get outcomes with arm information
      const { data: outcomes } = await serverSupabase
        .from('ab_outcomes')
        .select('sfn, ab_arms!inner(name)')
        .eq('experiment_id', experimentId);

      if (!outcomes || outcomes.length === 0) {
        return {
          control: { sfnRate: 0, totalOutcomes: 0, sfnCount: 0 },
          treatment: { sfnRate: 0, totalOutcomes: 0, sfnCount: 0 },
        };
      }

      // Handle Supabase join result: ab_arms can be array or single object
      const getArmName = (arm: unknown): string | null => {
        if (!arm) return null;
        if (Array.isArray(arm)) {
          return (arm[0] as { name?: string })?.name || null;
        }
        return (arm as { name?: string })?.name || null;
      };

      const controlOutcomes = outcomes.filter(o => getArmName(o.ab_arms) === 'control');
      const treatmentOutcomes = outcomes.filter(o => getArmName(o.ab_arms) === 'treatment');

      const controlSfnCount = controlOutcomes.filter(o => o.sfn === true).length;
      const treatmentSfnCount = treatmentOutcomes.filter(o => o.sfn === true).length;

      return {
        control: {
          sfnRate: controlOutcomes.length > 0 ? (controlSfnCount / controlOutcomes.length) * 100 : 0,
          totalOutcomes: controlOutcomes.length,
          sfnCount: controlSfnCount,
        },
        treatment: {
          sfnRate: treatmentOutcomes.length > 0 ? (treatmentSfnCount / treatmentOutcomes.length) * 100 : 0,
          totalOutcomes: treatmentOutcomes.length,
          sfnCount: treatmentSfnCount,
        },
      };
    } catch (error) {
      logger.error('Failed to get per-arm SFN rates', {
        service: 'ABTestMonitoringService',
        error,
      });
      return {
        control: { sfnRate: 0, totalOutcomes: 0, sfnCount: 0 },
        treatment: { sfnRate: 0, totalOutcomes: 0, sfnCount: 0 },
      };
    }
  }

  /**
   * Calculate moving averages for trend analysis
   */
  static calculateMovingAverages(
    data: Array<{ date: string; rate: number }>,
    windowSize: number = 7
  ): Array<{ date: string; rate: number; movingAverage: number }> {
    if (data.length === 0) {
      return [];
    }

    const result: Array<{ date: string; rate: number; movingAverage: number }> = [];

    for (let i = 0; i < data.length; i++) {
      const windowStart = Math.max(0, i - windowSize + 1);
      const window = data.slice(windowStart, i + 1);
      const movingAverage = window.reduce((sum, d) => sum + d.rate, 0) / window.length;

      result.push({
        date: data[i].date,
        rate: data[i].rate,
        movingAverage,
      });
    }

    return result;
  }

  /**
   * Detect anomalies in time series (spikes or drops)
   */
  static detectAnomalies(
    data: Array<{ date: string; rate: number }>,
    threshold: number = 20 // 20% change threshold
  ): Array<{ date: string; rate: number; change: number; type: 'spike' | 'drop' }> {
    if (data.length < 2) {
      return [];
    }

    const anomalies: Array<{ date: string; rate: number; change: number; type: 'spike' | 'drop' }> = [];

    for (let i = 1; i < data.length; i++) {
      const change = Math.abs(data[i].rate - data[i - 1].rate);
      if (change > threshold) {
        anomalies.push({
          date: data[i].date,
          rate: data[i].rate,
          change,
          type: data[i].rate > data[i - 1].rate ? 'spike' : 'drop',
        });
      }
    }

    return anomalies;
  }

  /**
   * Track automation rate over time
   */
  static async getAutomationRateOverTime(
    experimentId: string,
    days: number = 7
  ): Promise<Array<{ date: string; rate: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: decisions } = await serverSupabase
        .from('ab_decisions')
        .select('decision, decision_time_ms')
        .eq('experiment_id', experimentId)
        .gte('decision_time_ms', startDate.getTime());

      if (!decisions || decisions.length === 0) {
        return [];
      }

      // Group by day
      const dailyGroups = new Map<string, { total: number; automated: number }>();

      for (const decision of decisions) {
        const date = new Date(decision.decision_time_ms).toISOString().split('T')[0];
        const group = dailyGroups.get(date) || { total: 0, automated: 0 };
        group.total += 1;
        if (decision.decision === 'automate') {
          group.automated += 1;
        }
        dailyGroups.set(date, group);
      }

      return Array.from(dailyGroups.entries())
        .map(([date, group]) => ({
          date,
          rate: group.total > 0 ? (group.automated / group.total) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('Failed to get automation rate over time', {
        service: 'ABTestMonitoringService',
        error,
      });
      return [];
    }
  }
}

