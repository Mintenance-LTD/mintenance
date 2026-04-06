/**
 * SAM3 Training Data Service
 *
 * Manages SAM3 segmentation outputs for enhanced YOLO training:
 * 1. Captures SAM3 outputs during assessments
 * 2. Enriches user corrections with SAM3 masks
 * 3. Generates pseudo-labels for unlabeled images
 * 4. Exports enhanced YOLO training data
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { SAM3Service } from './SAM3Service';
import type {
  SAM3TrainingMask,
  SAM3TrainingMaskInput,
  PseudoLabelGenerationOptions,
  PseudoLabelResult,
  EnhancedYOLODetection,
  YOLOTrainingExport,
  TrainingDataExportOptions,
} from './training-data-types';
import type { RoboflowDetection } from './types';
import type { DamageTypeSegmentation } from './SAM3Service';
import { findBestSAM3Match } from './sam3-training/geometry-helpers';
import { yoloToEnhanced, mapRowToSAM3Mask } from './sam3-training/format-converters';
import { generatePseudoLabels } from './sam3-training/pseudo-label-generator';
import { exportEnhancedTrainingData } from './sam3-training/training-data-exporter';

export class SAM3TrainingDataService {
  // ========================================================================
  // CAPTURE SAM3 OUTPUTS
  // ========================================================================

  /**
   * Store SAM3 segmentation output for training
   */
  static async captureSAM3Output(
    assessmentId: string,
    imageUrl: string,
    sam3Data: DamageTypeSegmentation,
    imageIndex: number = 0
  ): Promise<string[]> {
    try {
      const maskIds: string[] = [];

      for (const [damageType, segmentation] of Object.entries(sam3Data.damage_types)) {
        if (segmentation.error || segmentation.num_instances === 0) {
          logger.debug('Skipping SAM3 capture for damage type with no instances', {
            service: 'SAM3TrainingDataService',
            damageType,
            error: segmentation.error,
          });
          continue;
        }

        const totalAffectedArea = segmentation.masks.reduce((total, mask) => {
          const maskArea = mask.flat().filter((pixel) => pixel > 0).length;
          return total + maskArea;
        }, 0);

        const avgConfidence = segmentation.scores.reduce((a, b) => a + b, 0) / segmentation.scores.length;
        const segmentationQuality =
          avgConfidence >= 0.9
            ? 'excellent'
            : avgConfidence >= 0.7
            ? 'good'
            : avgConfidence >= 0.5
            ? 'fair'
            : 'poor';

        const input: SAM3TrainingMaskInput = {
          assessmentId,
          imageUrl,
          imageIndex,
          damageType,
          masks: segmentation.masks,
          boxes: segmentation.boxes,
          scores: segmentation.scores,
          numInstances: segmentation.num_instances,
          totalAffectedArea,
          segmentationQuality: segmentationQuality as 'excellent' | 'good' | 'fair' | 'poor',
        };

        const maskId = await this.storeSAM3Mask(input);
        maskIds.push(maskId);

        logger.info('SAM3 segmentation captured for training', {
          service: 'SAM3TrainingDataService',
          assessmentId,
          damageType,
          numInstances: segmentation.num_instances,
          quality: segmentationQuality,
          maskId,
        });
      }

      return maskIds;
    } catch (error) {
      logger.error('Failed to capture SAM3 output', error, {
        service: 'SAM3TrainingDataService',
        assessmentId,
      });
      throw error;
    }
  }

  /**
   * Store a single SAM3 training mask
   */
  static async storeSAM3Mask(input: SAM3TrainingMaskInput): Promise<string> {
    try {
      const { data, error } = await serverSupabase
        .from('sam3_training_masks')
        .insert({
          assessment_id: input.assessmentId,
          image_url: input.imageUrl,
          image_index: input.imageIndex || 0,
          damage_type: input.damageType,
          masks: input.masks,
          boxes: input.boxes,
          scores: input.scores,
          num_instances: input.numInstances,
          total_affected_area: input.totalAffectedArea,
          yolo_correction_id: input.yoloCorrectionId,
          segmentation_quality: input.segmentationQuality || 'good',
          used_in_training: false,
          human_verified: false,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to store SAM3 mask: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      logger.error('Failed to store SAM3 mask', error, {
        service: 'SAM3TrainingDataService',
      });
      throw error;
    }
  }

  // ========================================================================
  // PSEUDO-LABEL GENERATION
  // ========================================================================

  /**
   * Generate pseudo-labels using SAM3 for unlabeled images
   */
  static async generatePseudoLabels(
    imageUrls: string[],
    options: PseudoLabelGenerationOptions = {}
  ): Promise<PseudoLabelResult[]> {
    return generatePseudoLabels(imageUrls, options);
  }

  // ========================================================================
  // ENHANCE YOLO WITH SAM3
  // ========================================================================

  /**
   * Enhance YOLO detections with SAM3 precise masks
   */
  static async enhanceYOLOWithSAM3(
    yoloDetections: RoboflowDetection[],
    imageUrl: string,
    damageTypes?: string[]
  ): Promise<EnhancedYOLODetection[]> {
    try {
      const typesToSegment =
        damageTypes || yoloDetections.map((det) => det.className).filter((v, i, a) => a.indexOf(v) === i);

      if (typesToSegment.length === 0) {
        return yoloDetections.map(yoloToEnhanced);
      }

      const sam3Result = await SAM3Service.segmentDamageTypes(imageUrl, typesToSegment);

      if (!sam3Result || !sam3Result.success) {
        logger.warn('SAM3 enhancement failed, using YOLO only', {
          service: 'SAM3TrainingDataService',
        });
        return yoloDetections.map(yoloToEnhanced);
      }

      const enhanced: EnhancedYOLODetection[] = [];

      for (const yoloDetection of yoloDetections) {
        const sam3Segmentation = sam3Result.damage_types[yoloDetection.className];

        if (!sam3Segmentation || sam3Segmentation.error || sam3Segmentation.num_instances === 0) {
          enhanced.push(yoloToEnhanced(yoloDetection));
          continue;
        }

        const bestMatch = findBestSAM3Match(yoloDetection.boundingBox, sam3Segmentation.boxes);

        if (bestMatch.index !== -1) {
          enhanced.push({
            classId: 0,
            className: yoloDetection.className,
            confidence: yoloDetection.confidence,
            boundingBox: yoloDetection.boundingBox,
            preciseMask: sam3Segmentation.masks[bestMatch.index],
            preciseBox: sam3Segmentation.boxes[bestMatch.index],
            segmentationConfidence: sam3Segmentation.scores[bestMatch.index],
            affectedArea: sam3Segmentation.masks[bestMatch.index].flat().filter((p) => p > 0).length,
            fusedConfidence: (yoloDetection.confidence + sam3Segmentation.scores[bestMatch.index] * 100) / 2,
            fusionMethod: 'weighted_average',
          });
        } else {
          enhanced.push(yoloToEnhanced(yoloDetection));
        }
      }

      return enhanced;
    } catch (error) {
      logger.error('Failed to enhance YOLO with SAM3', error, {
        service: 'SAM3TrainingDataService',
      });
      return yoloDetections.map(yoloToEnhanced);
    }
  }

  // ========================================================================
  // EXPORT TRAINING DATA
  // ========================================================================

  /**
   * Export SAM3-enhanced YOLO training data
   */
  static async exportEnhancedTrainingData(
    options: TrainingDataExportOptions
  ): Promise<YOLOTrainingExport> {
    return exportEnhancedTrainingData(options);
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Get SAM3 masks for a specific assessment
   */
  static async getMasksForAssessment(assessmentId: string): Promise<SAM3TrainingMask[]> {
    try {
      const { data, error } = await serverSupabase
        .from('sam3_training_masks')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to get SAM3 masks: ${error.message}`);
      }

      return (data || []).map(mapRowToSAM3Mask);
    } catch (error) {
      logger.error('Failed to get SAM3 masks for assessment', error, {
        service: 'SAM3TrainingDataService',
        assessmentId,
      });
      throw error;
    }
  }
}
