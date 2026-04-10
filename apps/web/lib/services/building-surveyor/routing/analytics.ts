/**
 * Hybrid Inference - Analytics and Calibration
 *
 * Records routing decisions, calibrates confidence thresholds,
 * and provides routing statistics.
 */

import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import type { AssessmentContext, DamageSeverity, UrgencyLevel } from '../types';
import { CONFIDENCE_THRESHOLDS } from './types';
import type { HybridInferenceResult, InferenceRoute } from './types';

const SERVICE_NAME = 'HybridInferenceService';

/**
 * Record routing decision to database for analytics
 */
export async function recordRoutingDecision(
  result: HybridInferenceResult,
  imageUrls: string[],
  context?: AssessmentContext
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('hybrid_routing_decisions')
      .insert({
        assessment_id: context?.assessmentId || null,
        route_selected: result.route,
        internal_confidence: result.internalPrediction?.confidence || null,
        internal_prediction: result.internalPrediction || null,
        gpt4_prediction: result.gpt4Prediction || null,
        final_assessment: result.assessment,
        route_reasoning: result.reasoning,
        inference_time_ms: result.inferenceTimeMs,
        image_count: imageUrls.length,
        agreement_score: result.agreementScore || null,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to record routing decision', error, {
        service: SERVICE_NAME,
      });
    } else {
      result.routingDecisionId = data?.id;
    }
  } catch (error) {
    logger.error('Error recording routing decision', error, {
      service: SERVICE_NAME,
    });
  }
}

/**
 * Calibrate confidence thresholds based on actual outcomes
 * Called after human validation to adjust thresholds
 */
export async function calibrateConfidence(
  assessmentId: string,
  actualOutcome: {
    wasCorrect: boolean;
    actualSeverity?: DamageSeverity;
    actualUrgency?: UrgencyLevel;
  }
): Promise<void> {
  try {
    const { data: decision, error } = await supabase
      .from('hybrid_routing_decisions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .single();

    if (error || !decision) {
      logger.warn('No routing decision found for calibration', {
        service: SERVICE_NAME,
        assessmentId,
      });
      return;
    }

    await supabase.from('confidence_calibration_data').insert({
      routing_decision_id: decision.id,
      route_used: decision.route_selected,
      internal_confidence: decision.internal_confidence,
      was_correct: actualOutcome.wasCorrect,
      actual_severity: actualOutcome.actualSeverity,
      actual_urgency: actualOutcome.actualUrgency,
    });

    logger.info('Confidence calibration recorded', {
      service: SERVICE_NAME,
      assessmentId,
      wasCorrect: actualOutcome.wasCorrect,
    });

    // Calibration analysis can be triggered via analyzeCalibration() below,
    // intended to be called from a scheduled cron job.
  } catch (error) {
    logger.error('Failed to calibrate confidence', error, {
      service: SERVICE_NAME,
      assessmentId,
    });
  }
}

/**
 * Get statistics on route usage and performance
 */
export async function getRoutingStatistics(timeRange?: {
  start: Date;
  end: Date;
}): Promise<{
  totalAssessments: number;
  routeDistribution: Record<InferenceRoute, number>;
  averageConfidence: Record<InferenceRoute, number>;
  averageInferenceTime: Record<InferenceRoute, number>;
  agreementScores: number[];
}> {
  try {
    let query = supabase.from('hybrid_routing_decisions').select('*');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data: decisions, error } = await query;

    if (error || !decisions) {
      throw error || new Error('No routing decisions found');
    }

    const stats = {
      totalAssessments: decisions.length,
      routeDistribution: { internal: 0, gpt4_vision: 0, hybrid: 0 } as Record<
        InferenceRoute,
        number
      >,
      averageConfidence: { internal: 0, gpt4_vision: 0, hybrid: 0 } as Record<
        InferenceRoute,
        number
      >,
      averageInferenceTime: {
        internal: 0,
        gpt4_vision: 0,
        hybrid: 0,
      } as Record<InferenceRoute, number>,
      agreementScores: [] as number[],
    };

    const routeCounts: Record<InferenceRoute, number> = {
      internal: 0,
      gpt4_vision: 0,
      hybrid: 0,
      student_vlm: 0,
      student_shadow: 0,
    };
    const confSums: Record<InferenceRoute, number> = {
      internal: 0,
      gpt4_vision: 0,
      hybrid: 0,
      student_vlm: 0,
      student_shadow: 0,
    };
    const timeSums: Record<InferenceRoute, number> = {
      internal: 0,
      gpt4_vision: 0,
      hybrid: 0,
      student_vlm: 0,
      student_shadow: 0,
    };

    for (const decision of decisions) {
      const route = decision.route_selected as InferenceRoute;
      routeCounts[route]++;
      stats.routeDistribution[route]++;

      if (decision.internal_confidence) {
        confSums[route] += decision.internal_confidence;
      }
      if (decision.inference_time_ms) {
        timeSums[route] += decision.inference_time_ms;
      }
      if (decision.agreement_score) {
        stats.agreementScores.push(decision.agreement_score);
      }
    }

    for (const route of [
      'internal',
      'gpt4_vision',
      'hybrid',
    ] as InferenceRoute[]) {
      if (routeCounts[route] > 0) {
        stats.averageConfidence[route] = confSums[route] / routeCounts[route];
        stats.averageInferenceTime[route] =
          timeSums[route] / routeCounts[route];
      }
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get routing statistics', error, {
      service: SERVICE_NAME,
    });
    throw error;
  }
}

/**
 * Confidence bucket used in calibration analysis
 */
interface ConfidenceBucket {
  /** Lower bound of the confidence range (inclusive) */
  rangeMin: number;
  /** Upper bound of the confidence range (exclusive) */
  rangeMax: number;
  /** Total predictions in this bucket */
  total: number;
  /** Correct predictions in this bucket */
  correct: number;
  /** Accuracy rate (0-1) */
  accuracy: number;
}

/**
 * Result of calibration analysis, including recommended threshold adjustments
 */
export interface CalibrationAnalysisResult {
  /** Number of calibration data points analysed */
  dataPointsAnalysed: number;
  /** Accuracy broken down by confidence level */
  buckets: ConfidenceBucket[];
  /** Overall accuracy across all data points */
  overallAccuracy: number;
  /** Current thresholds from CONFIDENCE_THRESHOLDS */
  currentThresholds: { high: number; medium: number; low: number };
  /** Recommended new thresholds based on the analysis */
  recommendedThresholds: { high: number; medium: number; low: number };
  /** Whether thresholds should be updated (significant drift detected) */
  shouldUpdate: boolean;
  /** Human-readable summary of findings */
  summary: string;
}

/**
 * Analyse calibration data to recommend CONFIDENCE_THRESHOLD adjustments.
 *
 * Queries recent calibration data, buckets predictions by confidence level,
 * measures accuracy within each bucket, and recommends threshold changes.
 *
 * Designed to be called from a scheduled cron job (e.g. daily).
 *
 * @param minDataPoints - Minimum data points required for a meaningful analysis (default 50)
 * @param lookbackDays  - Number of days of data to analyse (default 30)
 */
export async function analyzeCalibration(
  minDataPoints: number = 50,
  lookbackDays: number = 30
): Promise<CalibrationAnalysisResult> {
  const currentThresholds = { ...CONFIDENCE_THRESHOLDS };

  try {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    const { data: calibrationData, error } = await supabase
      .from('confidence_calibration_data')
      .select('internal_confidence, was_correct, route_used, created_at')
      .gte('created_at', lookbackDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const points = calibrationData || [];

    if (points.length < minDataPoints) {
      logger.info('Insufficient calibration data for threshold analysis', {
        service: SERVICE_NAME,
        dataPoints: points.length,
        required: minDataPoints,
      });

      return {
        dataPointsAnalysed: points.length,
        buckets: [],
        overallAccuracy: 0,
        currentThresholds,
        recommendedThresholds: { ...currentThresholds },
        shouldUpdate: false,
        summary: `Insufficient data: ${points.length}/${minDataPoints} points. Collect more validated assessments before adjusting thresholds.`,
      };
    }

    // Bucket predictions by confidence in 10% increments
    const bucketSize = 0.1;
    const buckets: ConfidenceBucket[] = [];

    for (let rangeMin = 0; rangeMin < 1; rangeMin += bucketSize) {
      const rangeMax = Math.min(rangeMin + bucketSize, 1.01); // slightly over 1 to include 1.0
      const inBucket = points.filter(
        (p) =>
          p.internal_confidence !== null &&
          p.internal_confidence >= rangeMin &&
          p.internal_confidence < rangeMax
      );
      const correct = inBucket.filter((p) => p.was_correct).length;

      buckets.push({
        rangeMin: Math.round(rangeMin * 100) / 100,
        rangeMax: Math.round(Math.min(rangeMin + bucketSize, 1) * 100) / 100,
        total: inBucket.length,
        correct,
        accuracy: inBucket.length > 0 ? correct / inBucket.length : 0,
      });
    }

    // Overall accuracy
    const totalCorrect = points.filter((p) => p.was_correct).length;
    const overallAccuracy =
      points.length > 0 ? totalCorrect / points.length : 0;

    // Determine recommended thresholds.
    // "high" threshold: lowest confidence where accuracy >= 90%
    // "medium" threshold: lowest confidence where accuracy >= 75%
    // "low" threshold: lowest confidence where accuracy >= 50%
    const TARGET_HIGH = 0.9;
    const TARGET_MEDIUM = 0.75;
    const TARGET_LOW = 0.5;

    const findThreshold = (
      targetAccuracy: number,
      fallback: number
    ): number => {
      // Walk buckets from low to high, find the first bucket that consistently meets the target
      for (const bucket of buckets) {
        if (bucket.total >= 5 && bucket.accuracy >= targetAccuracy) {
          return bucket.rangeMin;
        }
      }
      return fallback;
    };

    const recommendedThresholds = {
      high: findThreshold(TARGET_HIGH, currentThresholds.high),
      medium: findThreshold(TARGET_MEDIUM, currentThresholds.medium),
      low: findThreshold(TARGET_LOW, currentThresholds.low),
    };

    // Ensure ordering: low < medium < high
    if (recommendedThresholds.medium <= recommendedThresholds.low) {
      recommendedThresholds.medium = recommendedThresholds.low + 0.05;
    }
    if (recommendedThresholds.high <= recommendedThresholds.medium) {
      recommendedThresholds.high = recommendedThresholds.medium + 0.05;
    }

    // Determine if thresholds should be updated (drift > 5%)
    const drift =
      Math.abs(recommendedThresholds.high - currentThresholds.high) +
      Math.abs(recommendedThresholds.medium - currentThresholds.medium) +
      Math.abs(recommendedThresholds.low - currentThresholds.low);
    const shouldUpdate = drift > 0.15; // Combined drift across all 3 thresholds exceeds 15%

    const summary = shouldUpdate
      ? `Threshold drift detected (${(drift * 100).toFixed(1)}% combined). Recommend updating: high ${currentThresholds.high} -> ${recommendedThresholds.high.toFixed(2)}, medium ${currentThresholds.medium} -> ${recommendedThresholds.medium.toFixed(2)}, low ${currentThresholds.low} -> ${recommendedThresholds.low.toFixed(2)}. Based on ${points.length} data points (${(overallAccuracy * 100).toFixed(1)}% overall accuracy).`
      : `Thresholds are well-calibrated (${(drift * 100).toFixed(1)}% drift). Overall accuracy: ${(overallAccuracy * 100).toFixed(1)}% across ${points.length} data points.`;

    logger.info('Calibration analysis complete', {
      service: SERVICE_NAME,
      dataPoints: points.length,
      overallAccuracy: overallAccuracy.toFixed(3),
      shouldUpdate,
      drift: drift.toFixed(3),
    });

    return {
      dataPointsAnalysed: points.length,
      buckets,
      overallAccuracy,
      currentThresholds,
      recommendedThresholds,
      shouldUpdate,
      summary,
    };
  } catch (error) {
    logger.error('Failed to analyze calibration data', error, {
      service: SERVICE_NAME,
    });
    throw error;
  }
}
