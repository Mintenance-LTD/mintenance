/**
 * FNR Monitoring Service
 *
 * Provides monitoring and alerting for False Negative Rate (FNR) statistics
 * with confidence intervals and edge case detection.
 *
 * Monitors:
 * - FNR by confidence level (high/medium/low/insufficient)
 * - Edge cases (insufficient data, high FNR, etc.)
 * - Recent escalations
 * - Stratum health
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Summary of FNR statistics grouped by confidence level
 */
export interface FNRMonitoringSummary {
  confidenceCategory: 'high_confidence' | 'medium_confidence' | 'low_confidence' | 'insufficient_data';
  stratumCount: number;
  avgFnr: number;
  avgFnrUpperBound: number;
  maxFnrUpperBound: number;
  strataExceedingThreshold: number;
  avgSampleSize: number;
  totalEscalations: number;
}

/**
 * Edge case requiring attention
 */
export interface FNREdgeCase {
  stratum: string;
  fnr: number;
  fnrUpperBound: number;
  sampleSize: number;
  confidenceLevel: number;
  edgeCaseType: 'insufficient_sample_size' | 'high_fnr_low_confidence' | 'very_high_fnr' | 'very_high_fnr_upper_bound';
  lastEscalationAt: string | null;
}

/**
 * Recent escalation event
 */
export interface FNREscalation {
  stratum: string;
  fnr: number;
  fnrUpperBound: number;
  sampleSize: number;
  escalationCount: number;
  lastEscalationAt: string;
  excessFnrPercentage: number;
}

/**
 * Alert severity level
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert for edge cases
 */
export interface FNRAlert {
  severity: AlertSeverity;
  stratum: string;
  message: string;
  metadata: Record<string, unknown>;
}

/**
 * FNR Monitoring Service
 */
export class FNRMonitoringService {
  private static readonly FNR_THRESHOLD = 0.05; // 5% maximum FNR
  private static readonly MIN_SAMPLE_SIZE = 10;

  /**
   * Get monitoring summary by confidence level
   *
   * @returns Array of summaries grouped by confidence category
   */
  static async getMonitoringSummary(): Promise<FNRMonitoringSummary[]> {
    try {
      const { data, error } = await serverSupabase
        .from('v_fnr_monitoring_summary')
        .select('*');

      if (error) {
        logger.error('Failed to fetch FNR monitoring summary', {
          service: 'FNRMonitoringService',
          error,
        });
        throw error;
      }

      return (data || []).map((row) => ({
        confidenceCategory: row.confidence_category as FNRMonitoringSummary['confidenceCategory'],
        stratumCount: row.stratum_count || 0,
        avgFnr: parseFloat(row.avg_fnr?.toString() || '0'),
        avgFnrUpperBound: parseFloat(row.avg_fnr_upper_bound?.toString() || '0'),
        maxFnrUpperBound: parseFloat(row.max_fnr_upper_bound?.toString() || '0'),
        strataExceedingThreshold: row.strata_exceeding_threshold || 0,
        avgSampleSize: parseFloat(row.avg_sample_size?.toString() || '0'),
        totalEscalations: row.total_escalations || 0,
      }));
    } catch (error) {
      logger.error('Error getting FNR monitoring summary', {
        service: 'FNRMonitoringService',
        error,
      });
      throw error;
    }
  }

  /**
   * Get recent escalations (last 7 days)
   *
   * @returns Array of recent escalation events
   */
  static async getRecentEscalations(): Promise<FNREscalation[]> {
    try {
      const { data, error } = await serverSupabase
        .from('v_fnr_recent_escalations')
        .select('*');

      if (error) {
        logger.error('Failed to fetch recent FNR escalations', {
          service: 'FNRMonitoringService',
          error,
        });
        throw error;
      }

      return (data || []).map((row) => ({
        stratum: row.stratum,
        fnr: parseFloat(row.fnr?.toString() || '0'),
        fnrUpperBound: parseFloat(row.fnr_upper_bound?.toString() || '0'),
        sampleSize: row.total_automated || 0,
        escalationCount: row.escalation_count || 0,
        lastEscalationAt: row.last_escalation_at,
        excessFnrPercentage: parseFloat(row.excess_fnr_percentage?.toString() || '0'),
      }));
    } catch (error) {
      logger.error('Error getting recent FNR escalations', {
        service: 'FNRMonitoringService',
        error,
      });
      throw error;
    }
  }

  /**
   * Get edge cases requiring attention
   *
   * @returns Array of edge cases
   */
  static async getEdgeCases(): Promise<FNREdgeCase[]> {
    try {
      const { data, error } = await serverSupabase
        .from('v_fnr_edge_cases')
        .select('*');

      if (error) {
        logger.error('Failed to fetch FNR edge cases', {
          service: 'FNRMonitoringService',
          error,
        });
        throw error;
      }

      return (data || []).map((row) => ({
        stratum: row.stratum,
        fnr: parseFloat(row.fnr?.toString() || '0'),
        fnrUpperBound: parseFloat(row.fnr_upper_bound?.toString() || '0'),
        sampleSize: row.total_automated || 0,
        confidenceLevel: parseFloat(row.confidence_level?.toString() || '0.95'),
        edgeCaseType: row.edge_case_type as FNREdgeCase['edgeCaseType'],
        lastEscalationAt: row.last_escalation_at,
      }));
    } catch (error) {
      logger.error('Error getting FNR edge cases', {
        service: 'FNRMonitoringService',
        error,
      });
      throw error;
    }
  }

  /**
   * Check and alert on edge cases
   *
   * Proactively identifies edge cases and generates alerts
   * for human intervention.
   *
   * @returns Array of alerts
   */
  static async checkAndAlertEdgeCases(): Promise<FNRAlert[]> {
    try {
      const edgeCases = await this.getEdgeCases();
      const alerts: FNRAlert[] = [];

      for (const edgeCase of edgeCases) {
        const alert = this.generateAlert(edgeCase);
        if (alert) {
          alerts.push(alert);
        }
      }

      // Log summary
      logger.info('FNR edge case check completed', {
        service: 'FNRMonitoringService',
        totalEdgeCases: edgeCases.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'critical').length,
        warningAlerts: alerts.filter((a) => a.severity === 'warning').length,
        infoAlerts: alerts.filter((a) => a.severity === 'info').length,
      });

      return alerts;
    } catch (error) {
      logger.error('Error checking FNR edge cases', {
        service: 'FNRMonitoringService',
        error,
      });
      throw error;
    }
  }

  /**
   * Generate alert from edge case
   */
  private static generateAlert(edgeCase: FNREdgeCase): FNRAlert | null {
    switch (edgeCase.edgeCaseType) {
      case 'very_high_fnr_upper_bound':
        return {
          severity: 'critical',
          stratum: edgeCase.stratum,
          message: `CRITICAL: FNR upper bound (${(edgeCase.fnrUpperBound * 100).toFixed(2)}%) is very high (≥10%). Immediate review required.`,
          metadata: {
            fnr: edgeCase.fnr,
            fnrUpperBound: edgeCase.fnrUpperBound,
            sampleSize: edgeCase.sampleSize,
            threshold: 0.10,
          },
        };

      case 'very_high_fnr':
        return {
          severity: 'critical',
          stratum: edgeCase.stratum,
          message: `CRITICAL: Point estimate FNR (${(edgeCase.fnr * 100).toFixed(2)}%) is very high (≥10%). Model may be unsafe.`,
          metadata: {
            fnr: edgeCase.fnr,
            fnrUpperBound: edgeCase.fnrUpperBound,
            sampleSize: edgeCase.sampleSize,
            threshold: 0.10,
          },
        };

      case 'high_fnr_low_confidence':
        return {
          severity: 'warning',
          stratum: edgeCase.stratum,
          message: `WARNING: FNR exceeds threshold (${(edgeCase.fnrUpperBound * 100).toFixed(2)}%) with low confidence (n=${edgeCase.sampleSize}). Need more data.`,
          metadata: {
            fnr: edgeCase.fnr,
            fnrUpperBound: edgeCase.fnrUpperBound,
            sampleSize: edgeCase.sampleSize,
            threshold: this.FNR_THRESHOLD,
          },
        };

      case 'insufficient_sample_size':
        return {
          severity: 'info',
          stratum: edgeCase.stratum,
          message: `INFO: Insufficient sample size (n=${edgeCase.sampleSize}) for reliable FNR estimation. Need at least ${this.MIN_SAMPLE_SIZE} samples.`,
          metadata: {
            fnr: edgeCase.fnr,
            fnrUpperBound: edgeCase.fnrUpperBound,
            sampleSize: edgeCase.sampleSize,
            minSampleSize: this.MIN_SAMPLE_SIZE,
          },
        };

      default:
        return null;
    }
  }

  /**
   * Get health status for all strata
   *
   * Returns a summary of health across all strata
   */
  static async getHealthStatus(): Promise<{
    healthy: number;
    warning: number;
    critical: number;
    insufficient: number;
    total: number;
  }> {
    try {
      const { data, error } = await serverSupabase
        .from('ab_critic_fnr_tracking')
        .select('stratum, fnr, fnr_upper_bound, total_automated');

      if (error) {
        logger.error('Failed to fetch FNR health status', {
          service: 'FNRMonitoringService',
          error,
        });
        throw error;
      }

      let healthy = 0;
      let warning = 0;
      let critical = 0;
      let insufficient = 0;

      for (const row of data || []) {
        const fnrUpperBound = parseFloat(row.fnr_upper_bound?.toString() || '1');
        const sampleSize = row.total_automated || 0;
        const fnr = parseFloat(row.fnr?.toString() || '0');

        if (sampleSize < this.MIN_SAMPLE_SIZE) {
          insufficient++;
        } else if (fnrUpperBound >= 0.10 || fnr >= 0.10) {
          critical++;
        } else if (fnrUpperBound >= this.FNR_THRESHOLD) {
          warning++;
        } else {
          healthy++;
        }
      }

      const status = {
        healthy,
        warning,
        critical,
        insufficient,
        total: data?.length || 0,
      };

      logger.info('FNR health status computed', {
        service: 'FNRMonitoringService',
        status,
      });

      return status;
    } catch (error) {
      logger.error('Error getting FNR health status', {
        service: 'FNRMonitoringService',
        error,
      });
      throw error;
    }
  }

  /**
   * Record escalation event
   *
   * Updates escalation count and timestamp for a stratum
   */
  static async recordEscalation(stratum: string): Promise<void> {
    try {
      // Get current escalation count
      const { data: existing } = await serverSupabase
        .from('ab_critic_fnr_tracking')
        .select('escalation_count')
        .eq('stratum', stratum)
        .single();

      const escalationCount = (existing?.escalation_count || 0) + 1;

      // Update escalation metadata
      await serverSupabase
        .from('ab_critic_fnr_tracking')
        .update({
          last_escalation_at: new Date().toISOString(),
          escalation_count: escalationCount,
        })
        .eq('stratum', stratum);

      logger.info('Recorded FNR escalation', {
        service: 'FNRMonitoringService',
        stratum,
        escalationCount,
      });
    } catch (error) {
      logger.error('Failed to record FNR escalation', {
        service: 'FNRMonitoringService',
        stratum,
        error,
      });
      // Don't throw - escalation tracking is best-effort
    }
  }

  /**
   * Get strata needing more data
   *
   * Returns strata with insufficient sample sizes
   */
  static async getStrataNeedingData(): Promise<
    Array<{ stratum: string; sampleSize: number; neededSamples: number }>
  > {
    try {
      const { data, error } = await serverSupabase
        .from('ab_critic_fnr_tracking')
        .select('stratum, total_automated')
        .lt('total_automated', this.MIN_SAMPLE_SIZE);

      if (error) {
        logger.error('Failed to fetch strata needing data', {
          service: 'FNRMonitoringService',
          error,
        });
        throw error;
      }

      return (data || []).map((row) => ({
        stratum: row.stratum,
        sampleSize: row.total_automated || 0,
        neededSamples: this.MIN_SAMPLE_SIZE - (row.total_automated || 0),
      }));
    } catch (error) {
      logger.error('Error getting strata needing data', {
        service: 'FNRMonitoringService',
        error,
      });
      throw error;
    }
  }
}
