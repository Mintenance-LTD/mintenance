import { logger } from '@mintenance/shared';
import { SAM3Service } from '../SAM3Service';
import type { SAM3SegmentationData } from '../types';

/**
 * SAM3 segmentation orchestration extracted from
 * AssessmentOrchestrator.ts on 2026-05-09. Handles the env gate, the
 * health check, the per-image segmentation call, and the conversion
 * to the orchestrator's SAM3SegmentationData shape.
 *
 * Returns both the SAM3 raw result (for downstream training capture)
 * and the segmentation summary (for buildFinalAssessment).
 */

export interface SamSegmentationResult {
  segmentation: SAM3SegmentationData | undefined;
  result: Awaited<ReturnType<typeof SAM3Service.segmentDamageTypes>> | null;
  durationMs?: number;
  numInstances?: number;
  affectedArea?: number;
  failed?: boolean;
  errorMessage?: string;
}

/**
 * Kick off SAM3 health check + (if available) segmentation in parallel
 * with the main GPT-4 path. The orchestrator awaits the returned
 * promise after GPT-4 returns so the two run concurrently.
 */
export function startSam3Segmentation(
  imageUrls: string[],
  damageType: string,
  enabled: boolean,
  fallbackConfidence: number
): Promise<SamSegmentationResult> {
  const sam3HealthPromise =
    enabled && imageUrls.length > 0
      ? SAM3Service.healthCheck().catch(() => false)
      : Promise.resolve(false);

  return sam3HealthPromise.then(async (isSAM3Available) => {
    if (!isSAM3Available || imageUrls.length === 0) {
      return { segmentation: undefined, result: null };
    }

    const sam3Start = Date.now();
    try {
      const result = await SAM3Service.segmentDamageTypes(imageUrls[0], [
        damageType,
      ]);

      if (result?.success && result.damage_types[damageType]) {
        const damageSegmentation = result.damage_types[damageType];

        if (damageSegmentation.num_instances > 0) {
          const affectedArea = damageSegmentation.masks.reduce(
            (total, mask) => {
              const maskArea = mask.flat().filter((pixel) => pixel > 0).length;
              return total + maskArea;
            },
            0
          );

          const segmentation: SAM3SegmentationData = {
            preciseMasks: damageSegmentation.masks,
            preciseBoxes: damageSegmentation.boxes,
            affectedArea,
            segmentationConfidence:
              damageSegmentation.scores[0] || fallbackConfidence,
            masks: damageSegmentation.masks.map((mask, idx) => ({
              mask,
              box: damageSegmentation.boxes[idx],
              score: damageSegmentation.scores[idx],
            })),
          };

          const durationMs = Date.now() - sam3Start;
          logger.info('SAM 3 segmentation completed', {
            service: 'AssessmentOrchestrator',
            damageType,
            numInstances: damageSegmentation.num_instances,
            affectedArea,
          });

          return {
            segmentation,
            result,
            durationMs,
            numInstances: damageSegmentation.num_instances,
            affectedArea,
          };
        }
      }
      return { segmentation: undefined, result };
    } catch (sam3Error) {
      logger.warn('SAM 3 segmentation failed, using GPT-4 only', {
        service: 'AssessmentOrchestrator',
        error: sam3Error,
      });
      return {
        segmentation: undefined,
        result: null,
        failed: true,
        errorMessage:
          sam3Error instanceof Error ? sam3Error.message : 'Unknown error',
      };
    }
  });
}
