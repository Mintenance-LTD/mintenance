/**
 * Service Availability Tracking, Performance Metrics, and Routing Decision Recording
 */

import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import { SAM3Service } from '../SAM3Service';
import type { AssessmentContext } from '../types';
import type { EnhancedHybridInferenceResult, EnhancedInferenceRoute } from '../EnhancedHybridInferenceService';

const SERVICE_NAME = 'EnhancedHybridInferenceService';
const AVAILABILITY_CHECK_INTERVAL = 60000; // 1 minute
const MAX_FAILURES_BEFORE_DISABLE = 5;

export interface ServiceStatus {
  available: boolean;
  lastCheck: number;
  failures: number;
}

export type ServiceAvailabilityMap = {
  yolo: ServiceStatus;
  sam3: ServiceStatus;
  gpt4: ServiceStatus;
};

export interface PerformanceMetrics {
  totalInferences: number;
  threeWayFusions: number;
  averageInferenceMs: number;
  averageFusionMs: number;
  sam3UsageRate: number;
  fallbackRate: number;
}

export function createInitialAvailability(): ServiceAvailabilityMap {
  return {
    yolo: { available: true, lastCheck: 0, failures: 0 },
    sam3: { available: true, lastCheck: 0, failures: 0 },
    gpt4: { available: true, lastCheck: 0, failures: 0 }
  };
}

export function createInitialMetrics(): PerformanceMetrics {
  return {
    totalInferences: 0,
    threeWayFusions: 0,
    averageInferenceMs: 0,
    averageFusionMs: 0,
    sam3UsageRate: 0,
    fallbackRate: 0
  };
}

/**
 * Check service availability, updating the map in place
 */
export async function checkServiceAvailability(
  availability: ServiceAvailabilityMap
): Promise<void> {
  const now = Date.now();

  availability.yolo.available = true;
  availability.yolo.lastCheck = now;

  if (now - availability.sam3.lastCheck > AVAILABILITY_CHECK_INTERVAL) {
    try {
      const available = await SAM3Service.healthCheck();
      availability.sam3.available = available;
      availability.sam3.lastCheck = now;
      if (available) {
        availability.sam3.failures = 0;
      }
    } catch {
      availability.sam3.available = false;
    }
  }

  availability.gpt4.available = true;
  availability.gpt4.lastCheck = now;
}

/**
 * Determine route based on available model outputs
 */
export function determineRoute(
  yoloOutput: unknown,
  sam3Output: unknown,
  gpt4Output: unknown
): EnhancedInferenceRoute {
  const hasYolo = yoloOutput !== null;
  const hasSam3 = sam3Output !== null;
  const hasGpt4 = gpt4Output !== null;

  if (hasYolo && hasSam3 && hasGpt4) {
    return 'three_way_fusion';
  } else if (hasGpt4 && hasSam3) {
    return 'gpt4_sam3';
  } else if (hasYolo && hasSam3) {
    return 'yolo_sam3';
  }
  return 'three_way_fusion';
}

/**
 * Record routing decision for analytics
 */
export async function recordRoutingDecision(
  result: EnhancedHybridInferenceResult,
  context?: AssessmentContext
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('enhanced_routing_decisions')
      .insert({
        assessment_id: context?.assessmentId || null,
        route_selected: result.route,
        fusion_mean: result.fusionOutput.mean,
        fusion_variance: result.fusionOutput.variance,
        uncertainty_level: result.fusionOutput.uncertaintyLevel,
        modality_agreement: result.agreementScore,
        attention_weights: result.fusionOutput.attentionWeights,
        yolo_available: result.yoloOutput !== null,
        sam3_available: result.sam3Output !== null,
        gpt4_available: result.gpt4Output !== null,
        total_inference_ms: result.totalInferenceMs,
        parallel_execution_ms: result.parallelExecutionMs,
        fusion_ms: result.fusionMs,
        fallbacks_used: result.fallbacksUsed,
        refined_boxes_count: result.fusionOutput.refinedBoundingBoxes?.length || 0,
        entropy_reduction: result.fusionOutput.fusionMetrics.entropyReduction,
        information_gain: result.fusionOutput.fusionMetrics.informationGain,
        effective_sample_size: result.fusionOutput.fusionMetrics.effectiveSampleSize
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to record routing decision', error, { service: SERVICE_NAME });
    } else {
      result.routingDecisionId = data?.id;
    }
  } catch (error) {
    logger.error('Error recording routing decision', error, { service: SERVICE_NAME });
  }
}

/**
 * Update rolling performance metrics
 */
export function updatePerformanceMetrics(
  metrics: PerformanceMetrics,
  result: EnhancedHybridInferenceResult
): void {
  metrics.totalInferences++;

  if (result.route === 'three_way_fusion') {
    metrics.threeWayFusions++;
  }

  const n = metrics.totalInferences;
  metrics.averageInferenceMs =
    (metrics.averageInferenceMs * (n - 1) + result.totalInferenceMs) / n;
  metrics.averageFusionMs =
    (metrics.averageFusionMs * (n - 1) + result.fusionMs) / n;

  metrics.sam3UsageRate =
    result.sam3Output !== null
      ? (metrics.sam3UsageRate * (n - 1) + 1) / n
      : (metrics.sam3UsageRate * (n - 1)) / n;

  metrics.fallbackRate =
    result.fallbacksUsed.length > 0
      ? (metrics.fallbackRate * (n - 1) + 1) / n
      : (metrics.fallbackRate * (n - 1)) / n;

  if (metrics.totalInferences % 100 === 0) {
    logger.info('Performance metrics update', {
      service: SERVICE_NAME,
      metrics
    });
  }
}

export { MAX_FAILURES_BEFORE_DISABLE };
