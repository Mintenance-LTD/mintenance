/**
 * Pipeline status orchestration.
 *
 * Extracted from `ContinuousLearningService.ts` (2026-04-26).
 * `getStatus()` is the read-only fanout that aggregates state from
 * every sub-service into a single dashboard-shaped struct.
 *
 * `calculateHealthStatus()` is the local pure-function decision rule
 * for the `isHealthy` flag — kept private to this module so the
 * health rules can evolve independently of consumers.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { YOLOCorrectionService } from '../YOLOCorrectionService';
import { YOLORetrainingService } from '../YOLORetrainingService';
import { DriftMonitorService } from '../DriftMonitorService';
import { ModelEvaluationService } from '../ModelEvaluationService';
import {
  pipelineConfig,
  getCurrentSeason,
  type LearningPipelineStatus,
} from './types';

/**
 * Pure-function health-status decision. Inputs already aggregated
 * by `getStatus()` so this is testable in isolation.
 *
 * Pipeline is unhealthy if any of:
 *   - Too many pending corrections (> 2x batch size)
 *   - Model is too old (> 2x retraining interval)
 *   - Significant distribution drift (> 1.5x threshold)
 *   - Current model F1 score below 0.6
 */
function calculateHealthStatus(params: {
  pendingCorrections: number;
  daysSinceLastTraining: number;
  driftScore: number;
  currentModelMetrics?: { f1Score?: number };
}): boolean {
  if (params.pendingCorrections > pipelineConfig.maxCorrectionsPerBatch * 2) {
    return false;
  }
  if (
    params.daysSinceLastTraining >
    pipelineConfig.retrainingIntervalDays * 2
  ) {
    return false;
  }
  if (params.driftScore > pipelineConfig.driftScoreThreshold * 1.5) {
    return false;
  }
  if (params.currentModelMetrics) {
    if ((params.currentModelMetrics.f1Score ?? 1) < 0.6) {
      return false;
    }
  }
  return true;
}

/**
 * Get the current pipeline status. Aggregates from:
 *   - YOLOCorrectionService — pending / approved correction counts
 *   - YOLORetrainingService — last retraining job timestamp
 *   - yolo_models table — current active model version
 *   - ModelEvaluationService — historical metrics for the active model
 *   - DriftMonitorService — current distribution drift signal
 *   - model_ab_tests — running A/B test count
 *   - system_alerts — last 10 alerts
 */
export async function getStatus(): Promise<LearningPipelineStatus> {
  try {
    const supabase = serverSupabase;

    const correctionStats = await YOLOCorrectionService.getCorrectionStats();
    const lastJob = await YOLORetrainingService.getLastJob();

    const { data: currentModel } = await supabase
      .from('yolo_models')
      .select('version, created_at')
      .eq('is_active', true)
      .single();

    const historicalMetrics = await ModelEvaluationService.getHistoricalMetrics(
      'yolo',
      1
    );
    const currentMetrics = historicalMetrics[0]?.test_metrics;

    const driftResult = await DriftMonitorService.detectDrift({
      season: getCurrentSeason(),
    });

    const { data: activeTests } = await supabase
      .from('model_ab_tests')
      .select('test_id')
      .eq('status', 'running');

    const { data: recentAlerts } = await supabase
      .from('system_alerts')
      .select('type, severity, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    let nextScheduledRetraining: string | undefined;
    if (lastJob?.completedAt) {
      const nextDate = new Date(lastJob.completedAt);
      nextDate.setDate(
        nextDate.getDate() + pipelineConfig.retrainingIntervalDays
      );
      nextScheduledRetraining = nextDate.toISOString();
    }

    const isHealthy = calculateHealthStatus({
      pendingCorrections: correctionStats.pending,
      daysSinceLastTraining: lastJob?.completedAt
        ? Math.floor(
            (Date.now() - new Date(lastJob.completedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999,
      driftScore: driftResult.driftScore,
      currentModelMetrics: currentMetrics
        ? { f1Score: currentMetrics.f1_score }
        : undefined,
    });

    return {
      isHealthy,
      lastRetrainingDate: lastJob?.completedAt?.toISOString(),
      nextScheduledRetraining,
      pendingCorrections: correctionStats.pending,
      approvedCorrections: correctionStats.approved,
      currentModelVersion: currentModel?.version || 'unknown',
      currentModelMetrics: currentMetrics
        ? {
            mAP50: currentMetrics.mAP50,
            precision: currentMetrics.precision,
            recall: currentMetrics.recall,
            f1Score: currentMetrics.f1_score,
          }
        : undefined,
      activeDrift: driftResult.hasDrift
        ? {
            type: driftResult.driftType,
            score: driftResult.driftScore,
          }
        : undefined,
      activeABTests: activeTests?.length || 0,
      recentAlerts: (recentAlerts || []).map((alert) => ({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.created_at,
      })),
    };
  } catch (error) {
    logger.error('Failed to get continuous learning status', { error });
    throw error;
  }
}
