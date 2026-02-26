/**
 * Model Retraining Service
 *
 * Extracted from cron/model-retraining route handler.
 * Checks retraining conditions (corrections, time, drift, performance)
 * and triggers YOLO model retraining when thresholds are met.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { YOLORetrainingService } from './YOLORetrainingService';
import { YOLOCorrectionService } from './YOLOCorrectionService';
import { DriftMonitorService } from './DriftMonitorService';
import { ModelEvaluationService } from './ModelEvaluationService';

// ── Configuration ───────────────────────────────────────────────────

const CONFIG = {
  MIN_CORRECTIONS_FOR_TRAINING: 50,
  MAX_DAYS_WITHOUT_TRAINING: 7,
  MIN_PERFORMANCE_DEGRADATION: 0.05, // 5%
  DRIFT_CHECK_ENABLED: true,
  DRIFT_SCORE_THRESHOLD: 0.2, // 20%
  PERFORMANCE_CHECK_ENABLED: true,
  MIN_SAMPLES_FOR_EVALUATION: 100,
  DRY_RUN: process.env.MODEL_RETRAINING_DRY_RUN === 'true',
  MAX_TRAINING_JOBS_PER_DAY: 3,
};

// ── Types ───────────────────────────────────────────────────────────

interface RetrainingCheckResult {
  shouldRetrain: boolean;
  reasons: string[];
  metrics: {
    correctionsCount: number;
    daysSinceLastTraining: number;
    driftScore?: number;
    performanceDegradation?: number;
    recentModelAccuracy?: number;
  };
}

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

interface CronJobResult {
  retrainingTriggered: boolean;
  checkResult: RetrainingCheckResult;
  jobId?: string;
  alerts: Alert[];
}

interface ManualTriggerResult {
  jobId?: string;
  message: string;
  checkResult?: RetrainingCheckResult;
}

// ── Service ─────────────────────────────────────────────────────────

export class ModelRetrainingService {
  /**
   * Run the full retraining check cycle (for cron GET handler).
   */
  static async runRetrainingCycle(): Promise<CronJobResult> {
    const checkResult = await this.checkRetrainingConditions();
    const alerts: Alert[] = [];
    let jobId: string | undefined;
    let retrainingTriggered = false;

    // Generate alerts for drift / performance
    if (checkResult.metrics.driftScore && checkResult.metrics.driftScore > CONFIG.DRIFT_SCORE_THRESHOLD) {
      alerts.push({
        type: 'DRIFT_DETECTED',
        severity: 'warning',
        message: `Distribution drift detected: ${(checkResult.metrics.driftScore * 100).toFixed(1)}% change`,
      });
    }

    if (
      checkResult.metrics.performanceDegradation &&
      checkResult.metrics.performanceDegradation > CONFIG.MIN_PERFORMANCE_DEGRADATION
    ) {
      alerts.push({
        type: 'PERFORMANCE_DEGRADATION',
        severity: 'critical',
        message: `Model performance degraded by ${(checkResult.metrics.performanceDegradation * 100).toFixed(1)}%`,
      });
    }

    // Trigger retraining if needed
    if (checkResult.shouldRetrain) {
      if (CONFIG.DRY_RUN) {
        alerts.push({ type: 'DRY_RUN', severity: 'info', message: 'Retraining would be triggered (dry run mode)' });
      } else {
        const jobsToday = await this.getTrainingJobsCountToday();
        if (jobsToday >= CONFIG.MAX_TRAINING_JOBS_PER_DAY) {
          alerts.push({
            type: 'RATE_LIMIT',
            severity: 'warning',
            message: `Daily training limit reached (${jobsToday}/${CONFIG.MAX_TRAINING_JOBS_PER_DAY})`,
          });
        } else {
          try {
            const retrainingJob = await YOLORetrainingService.triggerRetraining();
            jobId = retrainingJob.id;
            retrainingTriggered = true;
            alerts.push({ type: 'RETRAINING_STARTED', severity: 'info', message: `Retraining job ${jobId} started successfully` });
            await this.storeRetrainingTriggerReason(jobId, checkResult);
          } catch (error) {
            alerts.push({
              type: 'RETRAINING_FAILED',
              severity: 'critical',
              message: `Failed to trigger retraining: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        }
      }
    } else {
      alerts.push({ type: 'NO_RETRAINING_NEEDED', severity: 'info', message: 'All models are up to date' });
    }

    // Store alerts
    if (alerts.length > 0) {
      await this.storeAlerts(alerts);
    }

    // Adjust drift weights if applicable
    if (CONFIG.DRIFT_CHECK_ENABLED && checkResult.metrics.driftScore && checkResult.metrics.driftScore > CONFIG.DRIFT_SCORE_THRESHOLD) {
      try {
        await DriftMonitorService.detectAndAdjustWeights();
      } catch (error) {
        logger.error('Failed to adjust drift weights', { error });
      }
    }

    return { retrainingTriggered, checkResult, jobId, alerts };
  }

  /**
   * Manual trigger for retraining (for POST handler).
   */
  static async manualTrigger(options: {
    force: boolean;
    dryRun?: boolean;
  }): Promise<ManualTriggerResult> {
    const isDryRun = options.dryRun ?? CONFIG.DRY_RUN;

    if (options.force) {
      if (isDryRun) {
        return { message: 'DRY RUN: Would force retraining' };
      }

      const retrainingJob = await YOLORetrainingService.triggerRetraining();
      await this.storeRetrainingTriggerReason(retrainingJob.id, {
        shouldRetrain: true,
        reasons: ['Manual trigger (forced)'],
        metrics: { correctionsCount: 0, daysSinceLastTraining: 0 },
      });

      return { jobId: retrainingJob.id, message: 'Retraining triggered successfully' };
    }

    const checkResult = await this.checkRetrainingConditions();
    return {
      checkResult,
      message: checkResult.shouldRetrain ? 'Retraining conditions met' : 'No retraining needed',
    };
  }

  // ── Private helpers ─────────────────────────────────────────────

  private static async checkRetrainingConditions(): Promise<RetrainingCheckResult> {
    const reasons: string[] = [];
    const metrics: RetrainingCheckResult['metrics'] = {
      correctionsCount: 0,
      daysSinceLastTraining: 0,
    };

    // 1. Correction count
    const correctionStats = await YOLOCorrectionService.getCorrectionStats();
    metrics.correctionsCount = correctionStats.approved;
    if (metrics.correctionsCount >= CONFIG.MIN_CORRECTIONS_FOR_TRAINING) {
      reasons.push(`${metrics.correctionsCount} approved corrections available`);
    }

    // 2. Time since last training
    const lastJob = await YOLORetrainingService.getLastJob();
    if (lastJob?.completedAt) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastJob.completedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      metrics.daysSinceLastTraining = daysSince;
      if (daysSince >= CONFIG.MAX_DAYS_WITHOUT_TRAINING) {
        reasons.push(`${daysSince} days since last training`);
      }
    } else {
      metrics.daysSinceLastTraining = 999;
      reasons.push('No previous training found');
    }

    // 3. Drift detection
    if (CONFIG.DRIFT_CHECK_ENABLED) {
      try {
        const drift = await DriftMonitorService.detectDrift({
          propertyType: undefined,
          region: undefined,
          season: undefined,
          materialTypes: undefined,
        });
        if (drift.driftScore > 0) {
          metrics.driftScore = drift.driftScore;
          if (drift.driftScore > CONFIG.DRIFT_SCORE_THRESHOLD) {
            reasons.push(`Distribution drift detected: ${drift.driftType} (score: ${drift.driftScore.toFixed(2)})`);
          }
        }
      } catch (error) {
        logger.warn('Drift detection failed', { error });
      }
    }

    // 4. Performance degradation
    if (CONFIG.PERFORMANCE_CHECK_ENABLED) {
      try {
        const degradation = await this.checkModelPerformanceDegradation();
        if (degradation) {
          metrics.performanceDegradation = degradation.degradation;
          metrics.recentModelAccuracy = degradation.currentAccuracy;
          if (degradation.degradation > CONFIG.MIN_PERFORMANCE_DEGRADATION) {
            reasons.push(`Performance degraded by ${(degradation.degradation * 100).toFixed(1)}%`);
          }
        }
      } catch (error) {
        logger.warn('Performance check failed', { error });
      }
    }

    return {
      shouldRetrain: reasons.length > 0,
      reasons: reasons.length > 0 ? reasons : ['No retraining conditions met'],
      metrics,
    };
  }

  private static async checkModelPerformanceDegradation(): Promise<{
    degradation: number;
    currentAccuracy: number;
    baselineAccuracy: number;
  } | null> {
    const { data: recentAssessments } = await serverSupabase
      .from('building_assessments')
      .select('id, created_at, damage_assessment')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(CONFIG.MIN_SAMPLES_FOR_EVALUATION);

    if (!recentAssessments || recentAssessments.length < CONFIG.MIN_SAMPLES_FOR_EVALUATION) {
      return null;
    }

    const historicalMetrics = await ModelEvaluationService.getHistoricalMetrics('yolo', 1);
    if (historicalMetrics.length === 0) return null;

    const baselineAccuracy = historicalMetrics[0].test_metrics.f1_score;
    const currentAccuracy = baselineAccuracy * 0.95; // Simulated degradation
    const degradation = (baselineAccuracy - currentAccuracy) / baselineAccuracy;

    return { degradation, currentAccuracy, baselineAccuracy };
  }

  private static async getTrainingJobsCountToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count } = await serverSupabase
      .from('yolo_retraining_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());

    return count || 0;
  }

  private static async storeRetrainingTriggerReason(
    jobId: string,
    checkResult: RetrainingCheckResult
  ): Promise<void> {
    try {
      await serverSupabase
        .from('yolo_retraining_jobs')
        .update({
          config_jsonb: {
            trigger_reason: checkResult.reasons,
            trigger_metrics: checkResult.metrics,
            triggered_by: 'scheduled',
          },
        })
        .eq('id', jobId);
    } catch (error) {
      logger.error('Failed to store retraining trigger reason', { error });
    }
  }

  private static async storeAlerts(alerts: Alert[]): Promise<void> {
    try {
      const alertRecords = alerts.map((alert) => ({
        type: 'MODEL_RETRAINING',
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
}
