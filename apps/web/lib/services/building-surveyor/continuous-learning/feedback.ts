/**
 * Feedback ingestion + quality metrics.
 *
 * Extracted from `ContinuousLearningService.ts` (2026-04-26).
 *
 * The "feedback" here is YOLO correction submissions — humans
 * marking up bounding-box mistakes that flow back into the next
 * training run. This module owns:
 *   - validating individual corrections before they enter the
 *     training pool
 *   - deciding whether a single new correction warrants
 *     immediately-trigger retraining
 *   - aggregating quality metrics across the correction set
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { YOLOCorrectionService } from '../YOLOCorrectionService';
import { YOLORetrainingService } from '../YOLORetrainingService';
import { DriftMonitorService } from '../DriftMonitorService';
import {
  pipelineConfig,
  getCurrentSeason,
  type FeedbackQualityMetrics,
} from './types';

/**
 * Validate a single correction:
 *   - Has the user actually made changes? (`corrections_made` non-empty)
 *   - Is the confidence reasonable? (>= 0.1)
 *   - If expert approval is required by config, has it been granted?
 *
 * Returns false on any failed check; logs + returns false on errors.
 */
async function validateCorrection(correctionId: string): Promise<boolean> {
  try {
    const { data: correction } = await serverSupabase
      .from('yolo_corrections')
      .select('*')
      .eq('id', correctionId)
      .single();

    if (!correction) return false;

    if (
      !correction.corrections_made ||
      Object.keys(correction.corrections_made).length === 0
    ) {
      return false;
    }

    if (correction.confidence_score < 0.1) {
      return false;
    }

    if (
      pipelineConfig.requireExpertApproval &&
      correction.status !== 'approved'
    ) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to validate correction', { error, correctionId });
    return false;
  }
}

/**
 * Decide whether a single new correction warrants immediate
 * retraining (vs. waiting for the next scheduled cycle).
 *
 * Triggers if:
 *   - We have 2x the configured min-corrections threshold approved
 *   - OR the current drift score is 2x the threshold
 */
async function checkImmediateRetrainingTrigger(): Promise<boolean> {
  const stats = await YOLOCorrectionService.getCorrectionStats();
  if (stats.approved >= pipelineConfig.minCorrectionsForTraining * 2) {
    return true;
  }

  const drift = await DriftMonitorService.detectDrift({
    season: getCurrentSeason(),
  });
  if (drift.driftScore > pipelineConfig.driftScoreThreshold * 2) {
    return true;
  }

  return false;
}

/**
 * Aggregate quality metrics across all corrections in the system.
 *
 * Used by the dashboard + by `processFeedback()` for periodic
 * recalculation. Returns a zero-state struct when no corrections
 * exist rather than throwing — empty data isn't a failure.
 */
export async function getFeedbackQualityMetrics(): Promise<FeedbackQualityMetrics> {
  try {
    const { data: corrections } = await serverSupabase
      .from('yolo_corrections')
      .select('status, confidence_score, correction_quality, corrected_by');

    if (!corrections || corrections.length === 0) {
      return {
        totalCorrections: 0,
        approvedCorrections: 0,
        rejectedCorrections: 0,
        averageConfidenceScore: 0,
        expertVerifiedPercentage: 0,
        correctionConsistencyScore: 0,
      };
    }

    const approved = corrections.filter((c) => c.status === 'approved').length;
    const rejected = corrections.filter((c) => c.status === 'rejected').length;
    const expertVerified = corrections.filter(
      (c) => c.correction_quality === 'expert'
    ).length;
    const avgConfidence =
      corrections.reduce((sum, c) => sum + (c.confidence_score || 0), 0) /
      corrections.length;

    // Calculate consistency score (simplified — would need more
    // complex logic in production: compare corrections on similar
    // images and check for consistency in labeling).
    const consistencyScore = await calculateConsistencyScore(corrections);

    return {
      totalCorrections: corrections.length,
      approvedCorrections: approved,
      rejectedCorrections: rejected,
      averageConfidenceScore: avgConfidence,
      expertVerifiedPercentage: (expertVerified / corrections.length) * 100,
      correctionConsistencyScore: consistencyScore,
    };
  } catch (error) {
    logger.error('Failed to get feedback quality metrics', { error });
    throw error;
  }
}

async function calculateConsistencyScore(
  _corrections: unknown[]
): Promise<number> {
  // Simplified consistency calculation. In production would compare
  // corrections on similar images and check for consistency in
  // labeling. Returns a placeholder of 0.85 for now.
  return 0.85;
}

async function updateFeedbackQualityMetrics(): Promise<void> {
  // This would update aggregated metrics in a separate table.
  // For now, we just log.
  const metrics = await getFeedbackQualityMetrics();
  logger.info('Feedback quality metrics updated', { metrics });
}

/**
 * Process new feedback (correction submitted by user).
 *
 * Pipeline:
 *   1. Validate the correction's quality.
 *   2. Decide whether it warrants immediate retraining.
 *   3. Refresh aggregated quality metrics.
 *
 * Errors are logged but never thrown — feedback processing must
 * not break the user-facing submission flow.
 */
export async function processFeedback(correctionId: string): Promise<void> {
  try {
    logger.info('Processing feedback for continuous learning', {
      correctionId,
    });

    const isValid = await validateCorrection(correctionId);
    if (!isValid) {
      logger.warn('Correction failed validation', { correctionId });
      return;
    }

    const shouldRetrain = await checkImmediateRetrainingTrigger();
    if (shouldRetrain) {
      logger.info('Immediate retraining triggered by feedback', {
        correctionId,
      });
      await YOLORetrainingService.triggerRetraining();
    }

    // Note: SAM3 mask capture is already handled asynchronously
    // inside YOLOCorrectionService.

    await updateFeedbackQualityMetrics();
  } catch (error) {
    logger.error('Failed to process feedback', { error, correctionId });
    // Don't throw — feedback processing shouldn't break the main flow.
  }
}
