/**
 * A/B Test Alerting Service
 * 
 * Monitors A/B test metrics and triggers alerts when thresholds are exceeded.
 * Alerts are persisted to the database and can trigger notifications.
 * 
 * Alert Types:
 * - CRITICAL: SFN rate > 0.1% (safety violation)
 * - WARNING: Coverage violation > 5%, automation rate spike > 20%
 * - INFO: Critic model observations < 100, low calibration data
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ABTestMonitoringService } from './ABTestMonitoringService';

export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert metadata structure
 */
export interface AlertMetadata {
  totalOutcomes?: number;
  violations?: Array<{
    stratum: string;
    violation: number;
    sampleSize: number;
  }>;
  yesterdayRate?: number;
  todayRate?: number;
  change?: number;
  recommendations?: string[];
  [key: string]: unknown; // Allow additional metadata fields
}

export interface Alert {
  id?: string;
  experimentId: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  threshold: number;
  actualValue: number;
  metadata?: AlertMetadata;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface AlertCheckResult {
  hasAlerts: boolean;
  alerts: Alert[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export class ABTestAlertingService {
  // Alert thresholds (configurable via environment variables)
  private static readonly SFN_RATE_CRITICAL_THRESHOLD = parseFloat(
    process.env.AB_TEST_SFN_RATE_THRESHOLD || '0.1'
  ); // 0.1%

  private static readonly COVERAGE_VIOLATION_WARNING_THRESHOLD = parseFloat(
    process.env.AB_TEST_COVERAGE_VIOLATION_THRESHOLD || '5.0'
  ); // 5%

  private static readonly AUTOMATION_RATE_SPIKE_THRESHOLD = parseFloat(
    process.env.AB_TEST_AUTOMATION_SPIKE_THRESHOLD || '20.0'
  ); // 20% day-over-day

  private static readonly CRITIC_OBSERVATIONS_INFO_THRESHOLD = parseInt(
    process.env.AB_TEST_CRITIC_OBSERVATIONS_THRESHOLD || '100',
    10
  );

  private static readonly CALIBRATION_DATA_INFO_THRESHOLD = parseInt(
    process.env.AB_TEST_CALIBRATION_DATA_THRESHOLD || '100',
    10
  );

  /**
   * Check for alerts and persist them to database
   */
  static async checkAndPersistAlerts(experimentId: string): Promise<AlertCheckResult> {
    try {
      const result = await this.checkAlerts(experimentId);

      if (result.hasAlerts) {
        // Persist alerts to database (non-blocking)
        this.persistAlerts(experimentId, result.alerts).catch((error) => {
          logger.error('Failed to persist alerts', {
            service: 'ABTestAlertingService',
            experimentId,
            error,
          });
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to check alerts', {
        service: 'ABTestAlertingService',
        experimentId,
        error,
      });
      return {
        hasAlerts: false,
        alerts: [],
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
      };
    }
  }

  /**
   * Check for alerts without persisting
   */
  static async checkAlerts(experimentId: string): Promise<AlertCheckResult> {
    const alerts: Alert[] = [];
    const now = new Date().toISOString();

    // Get current metrics
    const metrics = await ABTestMonitoringService.getMetrics(experimentId);

    // 1. Check SFN rate (CRITICAL)
    if (metrics.sfnRate > this.SFN_RATE_CRITICAL_THRESHOLD) {
      alerts.push({
        experimentId,
        severity: 'critical',
        type: 'sfn_rate_exceeded',
        message: `SFN rate (${metrics.sfnRate.toFixed(4)}%) exceeds critical threshold (${this.SFN_RATE_CRITICAL_THRESHOLD}%)`,
        threshold: this.SFN_RATE_CRITICAL_THRESHOLD,
        actualValue: metrics.sfnRate,
        metadata: {
          totalOutcomes: metrics.sfnRate > 0 ? Math.round(metrics.sfnRate / this.SFN_RATE_CRITICAL_THRESHOLD * 100) : 0,
        },
        acknowledged: false,
        createdAt: now,
      });
    }

    // 2. Check coverage violations (WARNING)
    const coverageViolations = await ABTestMonitoringService.getCoverageViolations();
    const significantViolations = coverageViolations.filter(
      v => v.violation * 100 > this.COVERAGE_VIOLATION_WARNING_THRESHOLD
    );

    if (significantViolations.length > 0) {
      alerts.push({
        experimentId,
        severity: 'warning',
        type: 'coverage_violation',
        message: `${significantViolations.length} strata have coverage violations > ${this.COVERAGE_VIOLATION_WARNING_THRESHOLD}%`,
        threshold: this.COVERAGE_VIOLATION_WARNING_THRESHOLD,
        actualValue: Math.max(...significantViolations.map(v => v.violation * 100)),
        metadata: {
          violations: significantViolations.map(v => ({
            stratum: v.stratum,
            violation: v.violation * 100,
            sampleSize: v.sampleSize,
          })),
        },
        acknowledged: false,
        createdAt: now,
      });
    }

    // 3. Check automation rate spike (WARNING)
    const automationOverTime = await ABTestMonitoringService.getAutomationRateOverTime(experimentId, 2);
    if (automationOverTime.length >= 2) {
      const [yesterday, today] = automationOverTime.slice(-2);
      const dayOverDayChange = Math.abs(today.rate - yesterday.rate);

      if (dayOverDayChange > this.AUTOMATION_RATE_SPIKE_THRESHOLD) {
        alerts.push({
          experimentId,
          severity: 'warning',
          type: 'automation_rate_spike',
          message: `Automation rate changed by ${dayOverDayChange.toFixed(2)}% day-over-day (${yesterday.rate.toFixed(2)}% → ${today.rate.toFixed(2)}%)`,
          threshold: this.AUTOMATION_RATE_SPIKE_THRESHOLD,
          actualValue: dayOverDayChange,
          metadata: {
            yesterdayRate: yesterday.rate,
            todayRate: today.rate,
            change: today.rate - yesterday.rate,
          },
          acknowledged: false,
          createdAt: now,
        });
      }
    }

    // 4. Check critic model observations (INFO)
    if (metrics.criticModelObservations < this.CRITIC_OBSERVATIONS_INFO_THRESHOLD) {
      alerts.push({
        experimentId,
        severity: 'info',
        type: 'low_critic_observations',
        message: `Critic model has only ${metrics.criticModelObservations} observations (threshold: ${this.CRITIC_OBSERVATIONS_INFO_THRESHOLD})`,
        threshold: this.CRITIC_OBSERVATIONS_INFO_THRESHOLD,
        actualValue: metrics.criticModelObservations,
        metadata: {
          recommendations: ['Validate more assessments to train the critic model'],
        },
        acknowledged: false,
        createdAt: now,
      });
    }

    // 5. Check calibration data (INFO)
    if (metrics.calibrationDataPoints < this.CALIBRATION_DATA_INFO_THRESHOLD) {
      alerts.push({
        experimentId,
        severity: 'info',
        type: 'low_calibration_data',
        message: `Only ${metrics.calibrationDataPoints} calibration data points (threshold: ${this.CALIBRATION_DATA_INFO_THRESHOLD})`,
        threshold: this.CALIBRATION_DATA_INFO_THRESHOLD,
        actualValue: metrics.calibrationDataPoints,
        metadata: {
          recommendations: ['Run populate-ab-test-calibration-data.ts script'],
        },
        acknowledged: false,
        createdAt: now,
      });
    }

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    const infoCount = alerts.filter(a => a.severity === 'info').length;

    return {
      hasAlerts: alerts.length > 0,
      alerts,
      criticalCount,
      warningCount,
      infoCount,
    };
  }

  /**
   * Persist alerts to database
   */
  private static async persistAlerts(experimentId: string, alerts: Alert[]): Promise<void> {
    // Check if alert table exists, if not, log warning
    // For now, we'll use a simple logging approach
    // In production, you'd want to create an ab_alerts table

    for (const alert of alerts) {
      // Check if similar alert already exists (avoid duplicates)
      const existingAlerts = await this.getRecentAlerts(experimentId, alert.type, 1);
      
      if (existingAlerts.length === 0 || this.shouldCreateNewAlert(alert, existingAlerts[0])) {
        logger.warn('A/B Test Alert', {
          service: 'ABTestAlertingService',
          experimentId,
          severity: alert.severity,
          type: alert.type,
          message: alert.message,
          threshold: alert.threshold,
          actualValue: alert.actualValue,
        });

        // Insert into ab_alerts table
        const { error: insertError } = await serverSupabase
          .from('ab_alerts')
          .insert({
            experiment_id: alert.experimentId,
            severity: alert.severity,
            type: alert.type,
            message: alert.message,
            threshold: alert.threshold,
            actual_value: alert.actualValue,
            metadata: alert.metadata || {},
            is_resolved: false,
          });

        if (insertError) {
          logger.error('Failed to insert AB alert', insertError, {
            service: 'ABTestAlertingService',
            experimentId: alert.experimentId,
          });
        }
      }
    }
  }

  /**
   * Get recent alerts for an experiment
   */
  static async getRecentAlerts(
    experimentId: string,
    type?: string,
    limit: number = 10
  ): Promise<Alert[]> {
    try {
      let query = serverSupabase
        .from('ab_alerts')
        .select('*')
        .eq('experiment_id', experimentId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch AB alerts', error, {
          service: 'ABTestAlertingService',
          experimentId,
        });
        return [];
      }

      // Map database records to Alert interface
      return (data || []).map((record) => ({
        id: record.id,
        experimentId: record.experiment_id,
        severity: record.severity as AlertSeverity,
        type: record.type,
        message: record.message,
        threshold: record.threshold,
        actualValue: record.actual_value,
        metadata: record.metadata || {},
        acknowledged: record.is_resolved,
        acknowledgedBy: record.resolved_by,
        acknowledgedAt: record.resolved_at,
        createdAt: record.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching AB alerts', error, {
        service: 'ABTestAlertingService',
        experimentId,
      });
      return [];
    }
  }

  /**
   * Determine if a new alert should be created (avoid spam)
   */
  private static shouldCreateNewAlert(newAlert: Alert, existingAlert: Alert): boolean {
    // Don't create duplicate alerts within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if (existingAlert.createdAt > oneHourAgo) {
      return false;
    }

    // Create new alert if severity increased
    const severityOrder: Record<AlertSeverity, number> = {
      info: 1,
      warning: 2,
      critical: 3,
    };
    if (severityOrder[newAlert.severity] > severityOrder[existingAlert.severity]) {
      return true;
    }

    // Create new alert if value changed significantly (>10%)
    const valueChange = Math.abs(newAlert.actualValue - existingAlert.actualValue);
    const percentChange = (valueChange / Math.max(existingAlert.actualValue, 0.01)) * 100;
    if (percentChange > 10) {
      return true;
    }

    return false;
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<void> {
    // TODO: Update ab_alerts table when schema is created
    logger.info('Alert acknowledged', {
      service: 'ABTestAlertingService',
      alertId,
      acknowledgedBy,
    });
  }

  /**
   * Get unacknowledged alerts
   */
  static async getUnacknowledgedAlerts(experimentId: string): Promise<Alert[]> {
    // TODO: Query from ab_alerts table when schema is created
    return [];
  }
}

