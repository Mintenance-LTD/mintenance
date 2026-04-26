/**
 * `ContinuousLearningService` — facade over the continuous-learning
 * helper modules in `./continuous-learning/`.
 *
 * # History
 *
 * Until 2026-04-26 this file was a 687-line single class containing
 * the type definitions, default config singleton, status orchestration,
 * feedback ingestion, model deployment decisioning, health monitoring,
 * and a top-level convenience function — all in one place. That file
 * was on the pre-commit `KNOWN_LARGE_FILES` allowlist for months.
 *
 * The 2026-04-26 split moves each concern into its own module:
 *
 *   - `./continuous-learning/types.ts`       — config, status, metrics
 *                                              types + the mutable
 *                                              `pipelineConfig`
 *                                              singleton + season helper
 *   - `./continuous-learning/status.ts`      — getStatus + private
 *                                              calculateHealthStatus
 *   - `./continuous-learning/feedback.ts`    — processFeedback +
 *                                              quality metrics
 *                                              aggregation
 *   - `./continuous-learning/deployment.ts`  — evaluateAndDeploy +
 *                                              private deployModel
 *   - `./continuous-learning/health.ts`      — monitorPipelineHealth +
 *                                              alert storage
 *
 * This file remains as a static-method facade so every existing
 * `ContinuousLearningService.foo(...)` call site continues to work
 * without modification. New call sites SHOULD prefer importing the
 * specific helper they need:
 *
 *   import { getStatus } from '.../continuous-learning/status';
 *
 * over:
 *
 *   import { ContinuousLearningService } from '.../ContinuousLearningService';
 *
 * The narrower import lets webpack tree-shake unused helpers out of
 * the route bundle (e.g. an admin dashboard that only needs status
 * shouldn't pull in the deployment + ABTesting code paths).
 */

import { logger } from '@mintenance/shared';
import { YOLORetrainingService } from './YOLORetrainingService';
import {
  pipelineConfig,
  type LearningPipelineConfig,
  type LearningPipelineStatus,
} from './continuous-learning/types';
import { getStatus } from './continuous-learning/status';
import {
  processFeedback,
  getFeedbackQualityMetrics,
} from './continuous-learning/feedback';
import { evaluateAndDeploy } from './continuous-learning/deployment';
import { monitorPipelineHealth } from './continuous-learning/health';

export type {
  LearningPipelineConfig,
  LearningPipelineStatus,
  FeedbackQualityMetrics,
} from './continuous-learning/types';

/**
 * Initialize the pipeline with optional config overrides. Mutates the
 * shared `pipelineConfig` singleton so every helper module sees the
 * new values without prop-drilling, then propagates the relevant
 * sub-set down to YOLORetrainingService.
 *
 * Idempotent — safe to call multiple times. The mutation is explicit
 * (`Object.assign`) rather than reassignment to preserve the singleton
 * reference held by every helper.
 */
async function initialize(
  config?: Partial<LearningPipelineConfig>
): Promise<void> {
  if (config) {
    Object.assign(pipelineConfig, config);
  }

  logger.info('Continuous Learning Pipeline initialized', {
    config: pipelineConfig,
  });

  await YOLORetrainingService.configure({
    minCorrections: pipelineConfig.minCorrectionsForTraining,
    maxCorrections: pipelineConfig.maxCorrectionsPerBatch,
    retrainingIntervalDays: pipelineConfig.retrainingIntervalDays,
    autoApprove: !pipelineConfig.requireExpertApproval,
  });
}

/**
 * Static-method facade preserving the legacy
 * `ContinuousLearningService.X` call shape.
 */
export class ContinuousLearningService {
  static initialize = initialize;
  static getStatus = getStatus;
  static processFeedback = processFeedback;
  static evaluateAndDeploy = evaluateAndDeploy;
  static monitorPipelineHealth = monitorPipelineHealth;
  static getFeedbackQualityMetrics = getFeedbackQualityMetrics;
}

// ============================================================================
// CONVENIENCE FUNCTIONS (top-level exports for direct import)
// ============================================================================

/**
 * Quick function to check if retraining is needed.
 */
export async function shouldTriggerRetraining(): Promise<boolean> {
  return YOLORetrainingService.shouldRetrain();
}

/**
 * Get a summary of the learning pipeline for the admin dashboard.
 *
 * Wraps `getStatus()` with a derived 3-tier status label and a list
 * of human-readable recommendations based on the current state.
 */
export async function getLearningPipelineSummary(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  metrics: LearningPipelineStatus;
  recommendations: string[];
}> {
  const metrics = await getStatus();

  const status = metrics.isHealthy
    ? 'healthy'
    : metrics.recentAlerts.some((a) => a.severity === 'critical')
      ? 'critical'
      : 'warning';

  const recommendations: string[] = [];

  if (metrics.pendingCorrections > 100) {
    recommendations.push('Review pending corrections to improve model');
  }

  if (metrics.activeDrift) {
    recommendations.push(
      `Address ${metrics.activeDrift.type} drift with targeted training data`
    );
  }

  if (
    !metrics.currentModelMetrics ||
    metrics.currentModelMetrics.f1Score < 0.7
  ) {
    recommendations.push(
      'Model performance below target, consider additional training'
    );
  }

  return {
    status,
    metrics,
    recommendations,
  };
}
