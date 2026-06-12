/**
 * Assessment Orchestrator
 *
 * Coordinates the building-damage assessment pipeline: detection,
 * feature extraction, continuum-memory query, GPT-4 Vision call (with
 * caching), optional SAM3 segmentation, and final assembly.
 *
 * Refactored 2026-05-09: helpers, memory config, GPT-4 step, SAM3 step,
 * and memory-adjustment step extracted into siblings under
 * `orchestration/`. This file is now the thin sequencer that wires
 * them together.
 */

import { logger } from '@mintenance/shared';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';
import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { FeatureExtractionService } from './FeatureExtractionService';
import { PromptBuilder } from './PromptBuilder';
import { getConfig } from '../config/BuildingSurveyorConfig';
import { HybridInferenceService } from '../HybridInferenceService';
import { GPT4CacheService } from '../../ai/GPT4CacheService';
import { buildFinalAssessment } from './build-assessment';
import { captureTrainingDataAsync } from './training-capture';
import {
  buildMetricRecorder,
  buildSurveyorMemoryConfig,
  runWithTimeout,
  validateURLs,
} from './helpers';
import { runGptVision } from './gpt-vision';
import { startSam3Segmentation } from './sam3-segmentation';
import { computeMemoryAdjustments } from './memory-adjustments';
import type {
  AssessmentContext,
  Phase1BuildingAssessment,
  VisionAnalysisSummary,
} from '../types';

export class AssessmentOrchestrator {
  private static readonly AGENT_NAME = 'building-surveyor';
  private static memorySystemInitialized = false;
  private static recordMetric = buildMetricRecorder(
    AssessmentOrchestrator.AGENT_NAME
  );

  static async initialize(): Promise<void> {
    await this.initializeMemorySystem();
    await FeatureExtractionService.initialize();
  }

  private static async initializeMemorySystem(): Promise<void> {
    if (this.memorySystemInitialized) return;
    const config = getConfig();
    try {
      const memoryConfig = buildSurveyorMemoryConfig(this.AGENT_NAME);
      const memorySystem =
        await memoryManager.getOrCreateMemorySystem(memoryConfig);
      if (config.useTitans) {
        memorySystem.enableTitans(true);
        logger.info('Titans enabled for building surveyor', {
          agentName: this.AGENT_NAME,
        });
      }
      this.memorySystemInitialized = true;
      logger.info('AssessmentOrchestrator memory system initialized', {
        agentName: this.AGENT_NAME,
        levels: memoryConfig.levels.length,
        useLearnedFeatures: config.useLearnedFeatures,
        useTitans: config.useTitans,
      });
    } catch (error) {
      logger.error('Failed to initialize memory system', error, {
        service: 'AssessmentOrchestrator',
      });
    }
  }

  /**
   * Orchestrate a complete building damage assessment.
   */
  static async assessDamage(
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<Phase1BuildingAssessment> {
    const startedAt = Date.now();
    const config = getConfig();

    try {
      await this.initialize();

      if (!config.openaiApiKey) {
        logger.warn('OpenAI API key not configured', {
          service: 'AssessmentOrchestrator',
        });
        throw new Error('AI assessment service is not configured');
      }
      if (!imageUrls || imageUrls.length === 0) {
        throw new Error('At least one image is required for assessment');
      }

      const urlValidation = await validateURLs(imageUrls);
      if (urlValidation.invalid.length > 0) {
        logger.warn('Invalid image URLs rejected for building assessment', {
          service: 'AssessmentOrchestrator',
          invalidUrls: urlValidation.invalid,
        });
        throw new Error(
          `Invalid image URLs: ${urlValidation.invalid
            .map((i) => i.error)
            .join(', ')}`
        );
      }
      const validatedImageUrls = urlValidation.valid;

      // Hybrid inference short-circuits the rest of the pipeline
      if (config.useHybridInference) {
        logger.info('Using hybrid inference routing', {
          service: 'AssessmentOrchestrator',
        });
        const result = await HybridInferenceService.assessDamage(
          validatedImageUrls,
          context
        );
        logger.info('Hybrid inference completed', {
          service: 'AssessmentOrchestrator',
          route: result.route,
          confidence: result.confidence,
          durationMs: Date.now() - startedAt,
        });
        return result.assessment;
      }

      logger.info('Using standard GPT-4 Vision pipeline', {
        service: 'AssessmentOrchestrator',
      });

      // 1. Roboflow detection
      const roboflowResult = await runWithTimeout(
        () => RoboflowDetectionService.detect(validatedImageUrls),
        config.detectorTimeoutMs,
        'roboflow-detect'
      );
      const roboflowDetections =
        roboflowResult.success && Array.isArray(roboflowResult.data)
          ? roboflowResult.data
          : [];
      const visionAnalysis: VisionAnalysisSummary | null = null;
      if (!roboflowResult.success) {
        logger.warn('Roboflow detection unavailable', {
          service: 'AssessmentOrchestrator',
          timedOut: roboflowResult.timedOut,
        });
      }
      this.recordMetric('detector.roboflow', {
        success: roboflowResult.success,
        durationMs: roboflowResult.durationMs,
        timedOut: roboflowResult.timedOut,
        detectionCount: roboflowDetections.length,
      });

      // 2. Feature extraction + memory query (best-effort, non-fatal)
      const features = await FeatureExtractionService.extractFeatures(
        validatedImageUrls,
        context,
        undefined,
        roboflowDetections,
        visionAnalysis
      );
      await computeMemoryAdjustments(
        this.AGENT_NAME,
        features,
        Boolean(config.useTitans)
      );

      // 3. GPT-4 Vision (cache-aware)
      const gptResult = await runGptVision(
        validatedImageUrls,
        context,
        roboflowDetections,
        visionAnalysis,
        config.openaiApiKey
      );
      this.recordMetric('gpt.vision', {
        success: true,
        cached: gptResult.cached,
        durationMs: gptResult.durationMs,
        tokensUsed: gptResult.tokensUsed,
      });
      const aiAssessment = gptResult.aiAssessment;

      // 4. SAM3 segmentation (parallel with GPT-4 in spirit, awaited here)
      const damageType =
        (aiAssessment.damageType as string) ||
        ((aiAssessment.damageAssessment as Record<string, unknown>)
          ?.damageType as string) ||
        'damage';
      const sam3Data = await startSam3Segmentation(
        validatedImageUrls,
        damageType,
        process.env.ENABLE_SAM3_SEGMENTATION === 'true',
        (aiAssessment.confidence as number) || 0
      );
      this.recordMetric('segmentation.sam3', {
        success: !sam3Data.failed && Boolean(sam3Data.segmentation),
        durationMs: sam3Data.durationMs,
        numInstances: sam3Data.numInstances,
        affectedArea: sam3Data.affectedArea,
        ...(sam3Data.failed && { error: sam3Data.errorMessage }),
      });

      // 5. Final assemblage
      const assessment = await buildFinalAssessment(
        aiAssessment as Parameters<typeof buildFinalAssessment>[0],
        context,
        roboflowDetections,
        visionAnalysis,
        sam3Data.segmentation
      );

      // 6. Cache the assessment if it was a fresh GPT call
      if (!gptResult.cached) {
        GPT4CacheService.setCached(
          validatedImageUrls,
          context,
          assessment
        ).catch((error) => {
          logger.warn('Failed to cache GPT-4 response', {
            service: 'AssessmentOrchestrator',
            error,
          });
        });
      }

      // 7. Async training capture — non-blocking for the response, but the
      // promise must outlive it: Vercel freezes the function instance as
      // soon as the response is sent, which killed the shadow student call
      // mid-flight (Modal cold start is 60-90s; verified 2026-06-12 — the
      // teacher cost record landed, the shadow row never did). after()
      // keeps the instance alive until the capture completes. Outside a
      // request scope (tests, scripts) it throws — fall back to plain
      // fire-and-forget there.
      const shadowMessages = PromptBuilder.buildMessages(
        validatedImageUrls,
        context,
        roboflowDetections,
        visionAnalysis
      );
      const runTrainingCapture = () =>
        captureTrainingDataAsync(
          context?.assessmentId,
          validatedImageUrls,
          assessment,
          sam3Data.result,
          context,
          shadowMessages,
          config.openaiApiKey
        ).catch((error) => {
          logger.warn('Failed to capture training data (non-critical)', {
            service: 'AssessmentOrchestrator',
            error,
          });
        });
      try {
        const { after } = await import('next/server');
        after(runTrainingCapture);
      } catch {
        void runTrainingCapture();
      }

      const totalDuration = Date.now() - startedAt;
      this.recordMetric('assessment.complete', {
        success: true,
        durationMs: totalDuration,
        imageCount: validatedImageUrls.length,
        detectionCount: roboflowDetections.length,
        hasSAM3Segmentation: Boolean(sam3Data.segmentation),
      });
      logger.info('Building damage assessment completed', {
        service: 'AssessmentOrchestrator',
        durationMs: totalDuration,
        damageType: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        urgency: assessment.urgency.urgency,
        hasSAM3Segmentation: Boolean(sam3Data.segmentation),
      });
      return assessment;
    } catch (error) {
      const totalDuration = Date.now() - startedAt;
      this.recordMetric('assessment.error', {
        success: false,
        durationMs: totalDuration,
        error: error instanceof Error ? error.message : 'unknown',
      });
      logger.error('Building damage assessment failed', error, {
        service: 'AssessmentOrchestrator',
        durationMs: totalDuration,
      });
      throw error;
    }
  }

  /**
   * Trigger self-modification when accuracy drops. Currently a logger
   * stub — wired into the agent dashboard for future tuning loops.
   */
  static async triggerSelfModification(accuracyDrop: number): Promise<void> {
    logger.info('AssessmentOrchestrator self-modification triggered', {
      agentName: this.AGENT_NAME,
      accuracyDrop,
    });
  }
}
