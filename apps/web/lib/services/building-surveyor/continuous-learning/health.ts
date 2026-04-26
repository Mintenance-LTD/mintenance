/**
 * Pipeline health monitoring + alert generation.
 *
 * Extracted from `ContinuousLearningService.ts` (2026-04-26).
 *
 * `monitorPipelineHealth()` is the cron-driven check (every
 * `monitoringIntervalMinutes`) that turns the current `getStatus()`
 * snapshot into actionable alerts in `system_alerts`.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getStatus } from './status';
import { pipelineConfig } from './types';

interface PipelineAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

async function storeAlerts(alerts: PipelineAlert[]): Promise<void> {
  try {
    const alertRecords = alerts.map((alert) => ({
      type: 'CONTINUOUS_LEARNING',
      severity: alert.severity,
      message: alert.message,
      metadata: { alert_type: alert.type },
      created_at: new Date().toISOString(),
    }));

    await serverSupabase.from('system_alerts').insert(alertRecords);
  } catch (error) {
    logger.error('Failed to store alerts', { error });
  }
}

/**
 * Check pipeline health, generate any alerts, and (when alerting
 * is enabled) persist them to `system_alerts`.
 *
 * Errors are logged but never thrown — this is a background cron
 * task, and a failure to write alerts should not crash the worker.
 */
export async function monitorPipelineHealth(): Promise<void> {
  try {
    const status = await getStatus();
    const alerts: PipelineAlert[] = [];

    if (!status.isHealthy) {
      alerts.push({
        type: 'PIPELINE_UNHEALTHY',
        severity: 'warning',
        message: 'Continuous learning pipeline health check failed',
      });
    }

    if (status.lastRetrainingDate) {
      const daysSince = Math.floor(
        (Date.now() - new Date(status.lastRetrainingDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysSince > pipelineConfig.retrainingIntervalDays * 2) {
        alerts.push({
          type: 'STALE_MODEL',
          severity: 'warning',
          message: `Model hasn't been retrained in ${daysSince} days`,
        });
      }
    }

    if (status.pendingCorrections > pipelineConfig.maxCorrectionsPerBatch) {
      alerts.push({
        type: 'HIGH_PENDING_CORRECTIONS',
        severity: 'warning',
        message: `${status.pendingCorrections} corrections pending review`,
      });
    }

    if (
      status.activeDrift &&
      status.activeDrift.score > pipelineConfig.driftScoreThreshold
    ) {
      alerts.push({
        type: 'DISTRIBUTION_DRIFT',
        severity: 'warning',
        message: `${status.activeDrift.type} drift detected (score: ${status.activeDrift.score.toFixed(2)})`,
      });
    }

    if (alerts.length > 0 && pipelineConfig.alertingEnabled) {
      await storeAlerts(alerts);
    }

    logger.info('Pipeline health monitoring completed', {
      isHealthy: status.isHealthy,
      alertCount: alerts.length,
    });
  } catch (error) {
    logger.error('Failed to monitor pipeline health', { error });
  }
}
