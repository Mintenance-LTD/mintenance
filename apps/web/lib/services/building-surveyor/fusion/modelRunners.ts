/**
 * Model Runners - Parallel inference execution for YOLO, SAM3, and GPT-4
 */

import { logger } from '@mintenance/shared';
import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { SAM3Service } from '../SAM3Service';
import { AssessmentOrchestrator } from '../orchestration/AssessmentOrchestrator';
import type { AssessmentContext, RoboflowDetection } from '../types';

const SERVICE_NAME = 'EnhancedHybridInferenceService';

export interface YOLOOutput {
  detections: RoboflowDetection[];
  confidence: number;
  inferenceMs: number;
  damageTypes: Record<string, number>;
  totalDetections: number;
}

export interface SAM3Output {
  damageDetected: boolean;
  damageTypes: string[];
  damageNotDetected: string[];
  averagePresenceScore: number;
  detectionRate: number;
  masks: unknown;
  inferenceMs: number;
  presenceResults: Record<string, unknown>;
}

export interface GPT4Output {
  assessment: import('../types').Phase1BuildingAssessment;
  confidence: number;
  inferenceMs: number;
}

/**
 * Run YOLO inference
 */
export async function runYOLOInference(
  imageUrls: string[],
  _context?: AssessmentContext
): Promise<YOLOOutput> {
  const startTime = Date.now();

  try {
    const detections = await RoboflowDetectionService.detect(imageUrls);

    const damageTypes: Record<string, number> = {};
    let totalConfidence = 0;

    for (const detection of detections) {
      const damageType = detection.class || detection.label || 'unknown';
      damageTypes[damageType] = (damageTypes[damageType] || 0) + 1;
      totalConfidence += detection.confidence;
    }

    const avgConfidence = detections.length > 0
      ? totalConfidence / detections.length
      : 0;

    return {
      detections,
      confidence: avgConfidence,
      inferenceMs: Date.now() - startTime,
      damageTypes,
      totalDetections: detections.length
    };
  } catch (error) {
    logger.error('YOLO inference failed', error, { service: SERVICE_NAME });
    throw error;
  }
}

/**
 * Run SAM3 inference with presence detection
 */
export async function runSAM3Inference(imageUrls: string[]): Promise<SAM3Output> {
  const startTime = Date.now();

  try {
    const available = await SAM3Service.healthCheck();
    if (!available) {
      throw new Error('SAM3 service not available');
    }

    const imageResponse = await fetch(imageUrls[0]);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

    const damageTypesToCheck = [
      'water damage', 'water stain', 'crack', 'structural crack',
      'rot', 'wood rot', 'mold', 'mildew', 'stain', 'damage',
      'deterioration', 'structural damage', 'peeling paint', 'rust', 'corrosion'
    ];

    const presenceResult = await SAM3Service.checkDamagePresence(
      imageBase64,
      damageTypesToCheck
    );

    if (!presenceResult || !presenceResult.success) {
      throw new Error('SAM3 presence check failed');
    }

    let masks = null;
    if (presenceResult.damage_detected.length > 0) {
      const segmentationResult = await SAM3Service.segmentDamageTypes(
        imageUrls[0],
        presenceResult.damage_detected.slice(0, 5)
      );

      if (segmentationResult && segmentationResult.success) {
        masks = segmentationResult.damage_types;
      }
    }

    return {
      damageDetected: presenceResult.damage_detected.length > 0,
      damageTypes: presenceResult.damage_detected,
      damageNotDetected: presenceResult.damage_not_detected,
      averagePresenceScore: presenceResult.summary.average_presence_score,
      detectionRate: presenceResult.summary.detection_rate,
      masks,
      inferenceMs: Date.now() - startTime,
      presenceResults: presenceResult.presence_results
    };
  } catch (error) {
    logger.error('SAM3 inference failed', error, { service: SERVICE_NAME });
    throw error;
  }
}

/**
 * Run GPT-4 Vision inference
 */
export async function runGPT4Inference(
  imageUrls: string[],
  context?: AssessmentContext
): Promise<GPT4Output> {
  const startTime = Date.now();

  try {
    const assessment = await AssessmentOrchestrator.assessDamage(imageUrls, context);

    return {
      assessment,
      confidence: assessment.damageAssessment.confidence,
      inferenceMs: Date.now() - startTime
    };
  } catch (error) {
    logger.error('GPT-4 inference failed', error, { service: SERVICE_NAME });
    throw error;
  }
}

/**
 * Process a model result from Promise.allSettled and handle failures
 */
export function processModelResult<T>(
  result: PromiseSettledResult<T>,
  modelName: string,
  fallbacksUsed: string[],
  serviceAvailability: Record<string, { available: boolean; lastCheck: number; failures: number }>,
  maxFailuresBeforeDisable: number
): T | null {
  if (result.status === 'fulfilled') {
    serviceAvailability[modelName].failures = 0;
    serviceAvailability[modelName].available = true;
    return result.value;
  }

  const service = serviceAvailability[modelName];
  service.failures++;

  if (service.failures >= maxFailuresBeforeDisable) {
    service.available = false;
    logger.warn(`${modelName} service disabled after ${service.failures} failures`, {
      service: SERVICE_NAME
    });
  }

  fallbacksUsed.push(modelName);

  logger.warn(`${modelName} inference failed, using fallback`, {
    service: SERVICE_NAME,
    error: result.reason
  });

  return null;
}
