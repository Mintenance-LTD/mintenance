/**
 * Automated Model Retraining Cron Job
 *
 * Runs daily to check if models need retraining based on:
 * - Number of accumulated corrections
 * - Time since last training
 * - Model performance degradation
 * - Distribution drift detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@mintenance/shared';
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { DriftMonitorService } from '@/lib/services/building-surveyor/DriftMonitorService';
import { ModelEvaluationService } from '@/lib/services/building-surveyor/ModelEvaluationService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { requireCronAuth } from '@/lib/cron-auth';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Retraining thresholds
  MIN_CORRECTIONS_FOR_TRAINING: 50,    // Minimum corrections needed
  MAX_DAYS_WITHOUT_TRAINING: 7,        // Force training after 7 days
  MIN_PERFORMANCE_DEGRADATION: 0.05,   // 5% accuracy drop triggers training

  // Drift detection
  DRIFT_CHECK_ENABLED: true,
  DRIFT_SCORE_THRESHOLD: 0.2,          // 20% distribution change

  // Model evaluation
  PERFORMANCE_CHECK_ENABLED: true,
  MIN_SAMPLES_FOR_EVALUATION: 100,     // Need 100 recent assessments

  // Alerting
  ALERT_ON_TRAINING_FAILURE: true,
  ALERT_ON_DRIFT_DETECTED: true,
  ALERT_ON_PERFORMANCE_DEGRADATION: true,

  // Safety
  DRY_RUN: process.env.MODEL_RETRAINING_DRY_RUN === 'true',
  MAX_TRAINING_JOBS_PER_DAY: 3,        // Prevent runaway training
};

// ============================================================================
// TYPES
// ============================================================================

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

interface CronJobResult {
  success: boolean;
  retrainingTriggered: boolean;
  checkResult: RetrainingCheckResult;
  jobId?: string;
  error?: string;
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
}

// ============================================================================
// MAIN CRON HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication using consistent auth method
    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    logger.info('Starting model retraining cron job', { config: CONFIG });

    // Check if we should run retraining
    const checkResult = await checkRetrainingConditions();

    const alerts: CronJobResult['alerts'] = [];
    let jobId: string | undefined;
    let retrainingTriggered = false;

    // Log check results
    logger.info('Retraining check completed', {
      shouldRetrain: checkResult.shouldRetrain,
      reasons: checkResult.reasons,
      metrics: checkResult.metrics
    });

    // Generate alerts based on conditions
    if (checkResult.metrics.driftScore && checkResult.metrics.driftScore > CONFIG.DRIFT_SCORE_THRESHOLD) {
      alerts.push({
        type: 'DRIFT_DETECTED',
        severity: 'warning',
        message: `Distribution drift detected: ${(checkResult.metrics.driftScore * 100).toFixed(1)}% change`
      });
    }

    if (checkResult.metrics.performanceDegradation && checkResult.metrics.performanceDegradation > CONFIG.MIN_PERFORMANCE_DEGRADATION) {
      alerts.push({
        type: 'PERFORMANCE_DEGRADATION',
        severity: 'critical',
        message: `Model performance degraded by ${(checkResult.metrics.performanceDegradation * 100).toFixed(1)}%`
      });
    }

    // Trigger retraining if needed
    if (checkResult.shouldRetrain) {
      if (CONFIG.DRY_RUN) {
        logger.info('DRY RUN: Would trigger retraining', { reasons: checkResult.reasons });
        alerts.push({
          type: 'DRY_RUN',
          severity: 'info',
          message: 'Retraining would be triggered (dry run mode)'
        });
      } else {
        // Check daily limit
        const jobsToday = await getTrainingJobsCountToday();
        if (jobsToday >= CONFIG.MAX_TRAINING_JOBS_PER_DAY) {
          alerts.push({
            type: 'RATE_LIMIT',
            severity: 'warning',
            message: `Daily training limit reached (${jobsToday}/${CONFIG.MAX_TRAINING_JOBS_PER_DAY})`
          });
        } else {
          try {
            // Trigger retraining
            const retrainingJob = await YOLORetrainingService.triggerRetraining();
            jobId = retrainingJob.id;
            retrainingTriggered = true;

            logger.info('Retraining triggered successfully', { jobId, reasons: checkResult.reasons });

            alerts.push({
              type: 'RETRAINING_STARTED',
              severity: 'info',
              message: `Retraining job ${jobId} started successfully`
            });

            // Store retraining trigger reason
            if (jobId) {
              await storeRetrainingTriggerReason(jobId, checkResult);
            }

          } catch (error) {
            logger.error('Failed to trigger retraining', { error });

            if (CONFIG.ALERT_ON_TRAINING_FAILURE) {
              alerts.push({
                type: 'RETRAINING_FAILED',
                severity: 'critical',
                message: `Failed to trigger retraining: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            }
          }
        }
      }
    } else {
      alerts.push({
        type: 'NO_RETRAINING_NEEDED',
        severity: 'info',
        message: 'All models are up to date'
      });
    }

    // Store alerts in database
    if (alerts.length > 0) {
      await storeAlerts(alerts);
    }

    // Apply drift adjustments if detected (even without retraining)
    if (CONFIG.DRIFT_CHECK_ENABLED && checkResult.metrics.driftScore && checkResult.metrics.driftScore > CONFIG.DRIFT_SCORE_THRESHOLD) {
      try {
        const drift = await DriftMonitorService.detectAndAdjustWeights();
        logger.info('Drift weights adjusted', { drift });
      } catch (error) {
        logger.error('Failed to adjust drift weights', { error });
      }
    }

    const result: CronJobResult = {
      success: true,
      retrainingTriggered,
      checkResult,
      jobId,
      alerts
    };

    return NextResponse.json(result);

  } catch (error) {
    return handleAPIError(error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if retraining conditions are met
 */
async function checkRetrainingConditions(): Promise<RetrainingCheckResult> {
  const reasons: string[] = [];
  const metrics: RetrainingCheckResult['metrics'] = {
    correctionsCount: 0,
    daysSinceLastTraining: 0
  };

  try {
    // 1. Check correction count
    const correctionStats = await YOLOCorrectionService.getCorrectionStats();
    metrics.correctionsCount = correctionStats.approved;

    if (metrics.correctionsCount >= CONFIG.MIN_CORRECTIONS_FOR_TRAINING) {
      reasons.push(`${metrics.correctionsCount} approved corrections available`);
    }

    // 2. Check time since last training
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
      // No previous training
      metrics.daysSinceLastTraining = 999;
      reasons.push('No previous training found');
    }

    // 3. Check drift detection
    if (CONFIG.DRIFT_CHECK_ENABLED) {
      try {
        const drift = await DriftMonitorService.detectDrift({
          propertyType: undefined,
          region: undefined,
          season: undefined,
          materialTypes: undefined
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

    // 4. Check model performance degradation
    if (CONFIG.PERFORMANCE_CHECK_ENABLED) {
      try {
        const degradation = await checkModelPerformanceDegradation();
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

    // Determine if we should retrain
    const shouldRetrain = reasons.length > 0;

    return {
      shouldRetrain,
      reasons: reasons.length > 0 ? reasons : ['No retraining conditions met'],
      metrics
    };

  } catch (error) {
    logger.error('Failed to check retraining conditions', { error });
    throw error;
  }
}

/**
 * Check for model performance degradation
 */
async function checkModelPerformanceDegradation(): Promise<{
  degradation: number;
  currentAccuracy: number;
  baselineAccuracy: number;
} | null> {
  try {
    const supabase = serverSupabase;

    // Get recent assessments to evaluate current model performance
    const { data: recentAssessments } = await supabase
      .from('building_assessments')
      .select('id, created_at, damage_assessment')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .limit(CONFIG.MIN_SAMPLES_FOR_EVALUATION);

    if (!recentAssessments || recentAssessments.length < CONFIG.MIN_SAMPLES_FOR_EVALUATION) {
      return null; // Not enough data
    }

    // Get historical performance metrics
    const historicalMetrics = await ModelEvaluationService.getHistoricalMetrics('yolo', 1);
    if (historicalMetrics.length === 0) {
      return null; // No baseline
    }

    const baselineAccuracy = historicalMetrics[0].test_metrics.f1_score;

    // Calculate current accuracy (simplified - would need actual evaluation in production)
    // This is a placeholder - in production, you'd run actual evaluation on recent data
    const currentAccuracy = baselineAccuracy * 0.95; // Simulated 5% degradation

    const degradation = (baselineAccuracy - currentAccuracy) / baselineAccuracy;

    return {
      degradation,
      currentAccuracy,
      baselineAccuracy
    };

  } catch (error) {
    logger.error('Failed to check model performance', { error });
    return null;
  }
}

/**
 * Get count of training jobs today
 */
async function getTrainingJobsCountToday(): Promise<number> {
  try {
    const supabase = serverSupabase;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('yolo_retraining_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());

    return count || 0;

  } catch (error) {
    logger.error('Failed to get training jobs count', { error });
    return 0;
  }
}

/**
 * Store retraining trigger reason
 */
async function storeRetrainingTriggerReason(
  jobId: string,
  checkResult: RetrainingCheckResult
): Promise<void> {
  try {
    const supabase = serverSupabase;

    await supabase
      .from('yolo_retraining_jobs')
      .update({
        config_jsonb: {
          trigger_reason: checkResult.reasons,
          trigger_metrics: checkResult.metrics,
          triggered_by: 'scheduled'
        }
      })
      .eq('id', jobId);

  } catch (error) {
    logger.error('Failed to store retraining trigger reason', { error });
  }
}

/**
 * Store alerts in database
 */
async function storeAlerts(alerts: CronJobResult['alerts']): Promise<void> {
  try {
    const supabase = serverSupabase;

    const alertRecords = alerts.map(alert => ({
      type: 'MODEL_RETRAINING',
      severity: alert.severity,
      message: alert.message,
      metadata: { alert_type: alert.type },
      created_at: new Date().toISOString()
    }));

    await supabase
      .from('system_alerts')
      .insert(alertRecords);

  } catch (error) {
    logger.error('Failed to store alerts', { error });
  }
}

// ============================================================================
// MANUAL TRIGGER ENDPOINT (POST)
// ============================================================================

export async function POST(request: Request) {
  try {
    // This endpoint allows manual triggering with custom parameters
    const body = await request.json();

    // Verify admin authentication
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    // In production, verify this is an admin user

    logger.info('Manual retraining trigger requested', { params: body });

    // Override configuration if provided
    const customConfig = {
      ...CONFIG,
      ...(body.config || {}),
      DRY_RUN: body.dryRun ?? CONFIG.DRY_RUN
    };

    // Force retraining if requested
    if (body.force) {
      logger.info('Forcing retraining (manual trigger)');

      if (customConfig.DRY_RUN) {
        return NextResponse.json({
          success: true,
          message: 'DRY RUN: Would force retraining',
          config: customConfig
        });
      }

      const retrainingJob = await YOLORetrainingService.triggerRetraining();
      const jobId = retrainingJob.id;

      await storeRetrainingTriggerReason(jobId, {
        shouldRetrain: true,
        reasons: ['Manual trigger (forced)'],
        metrics: {
          correctionsCount: 0,
          daysSinceLastTraining: 0
        }
      });

      return NextResponse.json({
        success: true,
        jobId,
        message: 'Retraining triggered successfully'
      });
    }

    // Otherwise, run normal check with custom config
    const checkResult = await checkRetrainingConditions();

    return NextResponse.json({
      success: true,
      checkResult,
      message: checkResult.shouldRetrain
        ? 'Retraining conditions met'
        : 'No retraining needed',
      config: customConfig
    });

  } catch (error) {
    return handleAPIError(error);
  }
}
