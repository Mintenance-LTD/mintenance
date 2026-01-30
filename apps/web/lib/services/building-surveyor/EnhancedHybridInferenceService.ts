/**
 * Enhanced Hybrid Inference Service
 *
 * Thin orchestrator that coordinates three-way Bayesian fusion
 * across YOLO, SAM3, and GPT-4 models.
 *
 * Implementation details are split into:
 * - fusion/modelRunners.ts       — parallel model execution
 * - fusion/fusionPreparation.ts  — evidence preparation & assessment generation
 * - fusion/serviceTracking.ts    — availability, metrics, routing decisions
 */

import { logger } from '@mintenance/shared';
import { EnhancedBayesianFusionService } from './EnhancedBayesianFusionService';
import type { EnhancedFusionOutput } from './EnhancedBayesianFusionService';
import type { AssessmentContext, Phase1BuildingAssessment, RoboflowDetection } from './types';

// Re-export sub-module utilities for external consumers
export { runYOLOInference, runSAM3Inference, runGPT4Inference, processModelResult } from './fusion/modelRunners';
export type { YOLOOutput, SAM3Output, GPT4Output } from './fusion/modelRunners';
export { prepareFusionInput, generateFinalAssessment, getTimelineForUrgency, getRecommendationForSeverity } from './fusion/fusionPreparation';
export {
  checkServiceAvailability,
  determineRoute,
  recordRoutingDecision,
  updatePerformanceMetrics,
  createInitialAvailability,
  createInitialMetrics
} from './fusion/serviceTracking';
export type { ServiceAvailabilityMap, PerformanceMetrics, ServiceStatus } from './fusion/serviceTracking';

import {
  runYOLOInference,
  runSAM3Inference,
  runGPT4Inference,
  processModelResult
} from './fusion/modelRunners';
import { prepareFusionInput, generateFinalAssessment } from './fusion/fusionPreparation';
import {
  checkServiceAvailability,
  determineRoute,
  recordRoutingDecision,
  updatePerformanceMetrics,
  createInitialAvailability,
  createInitialMetrics,
  MAX_FAILURES_BEFORE_DISABLE
} from './fusion/serviceTracking';
import type { ServiceAvailabilityMap, PerformanceMetrics } from './fusion/serviceTracking';

/**
 * Enhanced routing options with SAM3 always included
 */
export type EnhancedInferenceRoute = 'yolo_sam3' | 'gpt4_sam3' | 'three_way_fusion';

/**
 * Enhanced result with three-way fusion data
 */
export interface EnhancedHybridInferenceResult {
  assessment: Phase1BuildingAssessment;
  route: EnhancedInferenceRoute;
  fusionOutput: EnhancedFusionOutput;

  yoloOutput?: {
    detections: RoboflowDetection[];
    confidence: number;
    inferenceMs: number;
  };

  sam3Output?: {
    damageDetected: boolean;
    damageTypes: string[];
    averagePresenceScore: number;
    masks?: unknown;
    inferenceMs: number;
  };

  gpt4Output?: {
    assessment: Phase1BuildingAssessment;
    confidence: number;
    inferenceMs: number;
  };

  totalInferenceMs: number;
  parallelExecutionMs: number;
  fusionMs: number;

  routingDecisionId?: string;
  agreementScore: number;
  fallbacksUsed: string[];
}

export class EnhancedHybridInferenceService {
  private static readonly SERVICE_NAME = 'EnhancedHybridInferenceService';

  private static serviceAvailability: ServiceAvailabilityMap = createInitialAvailability();
  private static performanceMetrics: PerformanceMetrics = createInitialMetrics();

  /**
   * Main entry point: Three-way fusion assessment
   */
  static async assessDamageWithFusion(
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<EnhancedHybridInferenceResult> {
    const startTime = Date.now();
    const fallbacksUsed: string[] = [];

    try {
      logger.info('Starting enhanced three-way fusion assessment', {
        service: this.SERVICE_NAME,
        imageCount: imageUrls.length,
        context
      });

      // Step 1: Check service availability
      await checkServiceAvailability(this.serviceAvailability);

      // Step 2: Run all three models in parallel
      const parallelStartTime = Date.now();
      const [yoloResult, sam3Result, gpt4Result] = await Promise.allSettled([
        runYOLOInference(imageUrls, context),
        runSAM3Inference(imageUrls),
        runGPT4Inference(imageUrls, context)
      ]);
      const parallelExecutionMs = Date.now() - parallelStartTime;

      // Step 3: Process results and handle failures
      const yoloOutput = processModelResult(yoloResult, 'yolo', fallbacksUsed, this.serviceAvailability, MAX_FAILURES_BEFORE_DISABLE);
      const sam3Output = processModelResult(sam3Result, 'sam3', fallbacksUsed, this.serviceAvailability, MAX_FAILURES_BEFORE_DISABLE);
      const gpt4Output = processModelResult(gpt4Result, 'gpt4', fallbacksUsed, this.serviceAvailability, MAX_FAILURES_BEFORE_DISABLE);

      // Step 4: Prepare fusion input
      const fusionInput = prepareFusionInput(yoloOutput, sam3Output, gpt4Output);

      // Step 5: Perform three-way Bayesian fusion
      const fusionStartTime = Date.now();
      const fusionOutput = EnhancedBayesianFusionService.fuseThreeWayEvidence(fusionInput);
      const fusionMs = Date.now() - fusionStartTime;

      // Step 6: Generate final assessment
      const assessment = generateFinalAssessment(
        fusionOutput, yoloOutput, sam3Output, gpt4Output, imageUrls, context
      );

      // Step 7-8: Agreement score and route
      const agreementScore = fusionOutput.modalityAgreement * 100;
      const route = determineRoute(yoloOutput, sam3Output, gpt4Output);

      // Step 9: Update adaptive weights if high agreement
      if (agreementScore > 80 && fusionOutput.adaptiveWeightUpdate) {
        await EnhancedBayesianFusionService.updateLearnedWeights(
          agreementScore / 100,
          fusionOutput.adaptiveWeightUpdate.suggested
        );
      }

      const result: EnhancedHybridInferenceResult = {
        assessment,
        route,
        fusionOutput,
        yoloOutput,
        sam3Output,
        gpt4Output,
        totalInferenceMs: Date.now() - startTime,
        parallelExecutionMs,
        fusionMs,
        agreementScore,
        fallbacksUsed
      };

      // Step 10-11: Record and update metrics
      await recordRoutingDecision(result, context);
      updatePerformanceMetrics(this.performanceMetrics, result);

      logger.info('Three-way fusion completed', {
        service: this.SERVICE_NAME,
        route,
        agreementScore,
        uncertaintyLevel: fusionOutput.uncertaintyLevel,
        totalInferenceMs: result.totalInferenceMs,
        fallbacksUsed
      });

      return result;
    } catch (error) {
      logger.error('Enhanced hybrid inference failed', error, {
        service: this.SERVICE_NAME
      });
      throw error;
    }
  }

  /** Get performance metrics */
  static getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /** Get service availability status */
  static getServiceAvailability(): ServiceAvailabilityMap {
    return { ...this.serviceAvailability };
  }

  /** Reset performance metrics (for testing) */
  static resetMetrics(): void {
    this.performanceMetrics = createInitialMetrics();
  }
}
