/**
 * Pseudo-label generation for unlabeled images via SAM3.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { SAM3Service } from '../SAM3Service';
import { convertSAM3ToYOLO } from './format-converters';
import type {
  SAM3PseudoLabel,
  SAM3PseudoLabelInput,
  PseudoLabelGenerationOptions,
  PseudoLabelResult,
} from '../training-data-types';
import * as crypto from 'crypto';

const DEFAULT_IMAGE_WIDTH = 640;
const DEFAULT_IMAGE_HEIGHT = 640;

/**
 * Generate pseudo-labels using SAM3 for unlabeled images
 */
export async function generatePseudoLabels(
  imageUrls: string[],
  options: PseudoLabelGenerationOptions = {}
): Promise<PseudoLabelResult[]> {
  const {
    damageTypes = ['water damage', 'crack', 'rot', 'mold', 'structural damage'],
    minConfidence = 0.6,
    qualityThreshold = 0.7,
    autoConvertToYOLO = true,
    imageWidth = DEFAULT_IMAGE_WIDTH,
    imageHeight = DEFAULT_IMAGE_HEIGHT,
  } = options;

  const results: PseudoLabelResult[] = [];

  for (const imageUrl of imageUrls) {
    try {
      const isAvailable = await SAM3Service.healthCheck();
      if (!isAvailable) {
        results.push({
          imageUrl,
          success: false,
          damageTypesDetected: [],
          totalInstances: 0,
          overallConfidence: 0,
          passesQualityThreshold: false,
          error: 'SAM3 service unavailable',
        });
        continue;
      }

      const sam3Result = await SAM3Service.segmentDamageTypes(imageUrl, damageTypes);

      if (!sam3Result || !sam3Result.success) {
        results.push({
          imageUrl,
          success: false,
          damageTypesDetected: [],
          totalInstances: 0,
          overallConfidence: 0,
          passesQualityThreshold: false,
          error: 'SAM3 segmentation failed',
        });
        continue;
      }

      const detectedTypes: string[] = [];
      const segmentationData: SAM3PseudoLabel['segmentationData'] = {};
      let totalInstances = 0;
      const confidences: number[] = [];

      for (const [damageType, segmentation] of Object.entries(sam3Result.damage_types)) {
        if (!segmentation.error && segmentation.num_instances > 0) {
          const validIndices = segmentation.scores
            .map((score, idx) => ({ score, idx }))
            .filter((item) => item.score >= minConfidence)
            .map((item) => item.idx);

          if (validIndices.length > 0) {
            detectedTypes.push(damageType);
            segmentationData[damageType] = {
              masks: validIndices.map((idx) => segmentation.masks[idx]),
              boxes: validIndices.map((idx) => segmentation.boxes[idx]),
              scores: validIndices.map((idx) => segmentation.scores[idx]),
              numInstances: validIndices.length,
            };
            totalInstances += validIndices.length;
            confidences.push(...validIndices.map((idx) => segmentation.scores[idx]));
          }
        }
      }

      const overallConfidence =
        confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
      const passesQualityThreshold = overallConfidence >= qualityThreshold;

      let yoloLabels: string | undefined;
      if (autoConvertToYOLO && detectedTypes.length > 0) {
        yoloLabels = convertSAM3ToYOLO(segmentationData, imageWidth, imageHeight);
      }

      if (detectedTypes.length > 0) {
        const imageHash = crypto.createHash('sha256').update(imageUrl).digest('hex');

        const pseudoLabelInput: SAM3PseudoLabelInput = {
          imageUrl,
          imageHash,
          damageTypesDetected: detectedTypes,
          segmentationData,
          yoloLabels,
          qualityScore: overallConfidence,
        };

        await storePseudoLabel(pseudoLabelInput, passesQualityThreshold);
      }

      results.push({
        imageUrl,
        success: true,
        damageTypesDetected: detectedTypes,
        totalInstances,
        overallConfidence,
        passesQualityThreshold,
        yoloLabels,
      });

      logger.info('Pseudo-label generated', {
        service: 'SAM3TrainingDataService',
        imageUrl,
        detectedTypes,
        totalInstances,
        overallConfidence,
      });
    } catch (error) {
      results.push({
        imageUrl,
        success: false,
        damageTypesDetected: [],
        totalInstances: 0,
        overallConfidence: 0,
        passesQualityThreshold: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error('Failed to generate pseudo-label', error, {
        service: 'SAM3TrainingDataService',
        imageUrl,
      });
    }
  }

  return results;
}

/**
 * Store pseudo-label in database
 */
async function storePseudoLabel(
  input: SAM3PseudoLabelInput,
  passesQualityThreshold: boolean
): Promise<string> {
  try {
    const confidences = Object.values(input.segmentationData).flatMap((data) => data.scores);
    const overallConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const minConfidence = Math.min(...confidences);
    const maxConfidence = Math.max(...confidences);

    const { data, error } = await serverSupabase
      .from('sam3_pseudo_labels')
      .insert({
        image_url: input.imageUrl,
        image_hash: input.imageHash,
        damage_types_detected: input.damageTypesDetected,
        segmentation_data: input.segmentationData,
        overall_confidence: overallConfidence,
        min_confidence: minConfidence,
        max_confidence: maxConfidence,
        yolo_labels: input.yoloLabels,
        passes_quality_threshold: passesQualityThreshold,
        quality_score: input.qualityScore || overallConfidence,
        used_in_training: false,
        human_reviewed: false,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to store pseudo-label: ${error.message}`);
    }

    return data.id;
  } catch (error) {
    logger.error('Failed to store pseudo-label', error, {
      service: 'SAM3TrainingDataService',
    });
    throw error;
  }
}
