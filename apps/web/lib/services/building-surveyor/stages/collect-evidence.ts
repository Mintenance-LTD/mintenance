import { logger } from '@mintenance/shared';
import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { runWithTimeout } from '../utils/timeout-utils';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import type {
  RoboflowDetection,
  VisionAnalysisSummary,
} from '../types';
import type { DamageTypeSegmentation } from '../SAM3Service';

const AGENT_NAME = 'building-surveyor';

function recordMetric(metric: string, payload: Record<string, unknown>): void {
  MonitoringService.record(metric, { agentName: AGENT_NAME, ...payload });
}

export interface EvidenceResult {
  roboflowDetections: RoboflowDetection[];
  visionAnalysis: VisionAnalysisSummary | null;
  sam3Segmentation: DamageTypeSegmentation | undefined;
  hasMachineEvidence: boolean;
}

export interface PreRunEvidence {
  roboflowDetections: RoboflowDetection[];
  visionAnalysis: VisionAnalysisSummary | null;
  sam3Segmentation?: DamageTypeSegmentation;
}

/**
 * Collects evidence from external detectors (Roboflow, SAM3).
 * Google Cloud Vision removed — GPT-4o handles visual analysis directly.
 * If preRunEvidence is provided, skips detector calls.
 */
export async function collectEvidence(
  validatedImageUrls: string[],
  detectorTimeoutMs: number,
  _visionTimeoutMs: number,
  preRunEvidence?: PreRunEvidence,
): Promise<EvidenceResult> {
  if (preRunEvidence) {
    return {
      roboflowDetections: preRunEvidence.roboflowDetections,
      visionAnalysis: preRunEvidence.visionAnalysis ?? null,
      sam3Segmentation: preRunEvidence.sam3Segmentation,
      hasMachineEvidence:
        preRunEvidence.roboflowDetections.length > 0 || !!preRunEvidence.visionAnalysis,
    };
  }

  // Run Roboflow detection with timeout
  const roboflowResult = await runWithTimeout(
    () => RoboflowDetectionService.detect(validatedImageUrls),
    detectorTimeoutMs,
    'roboflow-detect',
  );

  const roboflowDetections: RoboflowDetection[] =
    roboflowResult.success && Array.isArray(roboflowResult.data)
      ? roboflowResult.data
      : [];

  if (!roboflowResult.success) {
    logger.warn('Roboflow detection unavailable', {
      service: 'BuildingSurveyorService',
      timedOut: roboflowResult.timedOut,
      error: roboflowResult.error instanceof Error
        ? roboflowResult.error.message
        : roboflowResult.error,
    });
  }

  recordMetric('detector.roboflow', {
    success: roboflowResult.success,
    durationMs: roboflowResult.durationMs,
    timedOut: roboflowResult.timedOut,
    detectionCount: roboflowDetections.length,
  });

  const hasMachineEvidence =
    roboflowResult.success && roboflowDetections.length > 0;

  if (!hasMachineEvidence) {
    logger.warn('Proceeding with GPT-only assessment (no Roboflow evidence)', {
      service: 'BuildingSurveyorService',
      roboflowSuccess: roboflowResult.success,
    });
    recordMetric('detector.fallback', {
      reason: 'no_machine_evidence',
      roboflowSuccess: roboflowResult.success,
    });
  }

  // Optional SAM3 segmentation
  let sam3Segmentation: DamageTypeSegmentation | undefined;
  if (process.env.ENABLE_SAM3_SEGMENTATION === 'true' && validatedImageUrls.length > 0) {
    try {
      const { SAM3Service } = await import('../SAM3Service');
      const isSAM3Available = await SAM3Service.healthCheck();
      if (isSAM3Available) {
        const damageTypes = ['water damage', 'crack', 'rot', 'mold', 'stain', 'structural damage'];
        const result = await SAM3Service.segmentDamageTypes(validatedImageUrls[0], damageTypes);
        sam3Segmentation = result || undefined;
      }
    } catch (error) {
      logger.warn('SAM 3 segmentation failed, falling back to Roboflow', {
        service: 'BuildingSurveyorService',
        error,
      });
    }
  }

  return {
    roboflowDetections,
    visionAnalysis: null,
    sam3Segmentation,
    hasMachineEvidence,
  };
}
