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
import { loadClassNames } from './yolo-class-names';
import { convertDetectionsToYOLO } from './YOLOCorrectionService';
import type {
  SAM3TrainingMask,
  SAM3TrainingMaskInput,
  SAM3PseudoLabel,
  SAM3PseudoLabelInput,
  PseudoLabelGenerationOptions,
  PseudoLabelResult,
  EnhancedYOLODetection,
  YOLOTrainingExport,
  TrainingDataExportOptions,
} from './training-data-types';
import type { RoboflowDetection } from './types';
import type { DamageTypeSegmentation } from './SAM3Service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class SAM3TrainingDataService {
  private static readonly DEFAULT_IMAGE_WIDTH = 640;
  private static readonly DEFAULT_IMAGE_HEIGHT = 640;

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

      // Iterate through each damage type's segmentation
      for (const [damageType, segmentation] of Object.entries(sam3Data.damage_types)) {
        if (!segmentation.success || segmentation.num_instances === 0) {
          logger.debug('Skipping SAM3 capture for damage type with no instances', {
            service: 'SAM3TrainingDataService',
            damageType,
          });
          continue;
        }

        // Calculate total affected area
        const totalAffectedArea = segmentation.masks.reduce((total, mask) => {
          const maskArea = mask.flat().filter((pixel) => pixel > 0).length;
          return total + maskArea;
        }, 0);

        // Determine quality based on confidence scores
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
    const {
      damageTypes = ['water damage', 'crack', 'rot', 'mold', 'structural damage'],
      threshold = 0.5,
      minConfidence = 0.6,
      qualityThreshold = 0.7,
      autoConvertToYOLO = true,
      imageWidth = this.DEFAULT_IMAGE_WIDTH,
      imageHeight = this.DEFAULT_IMAGE_HEIGHT,
    } = options;

    const results: PseudoLabelResult[] = [];

    for (const imageUrl of imageUrls) {
      try {
        // Check if SAM3 is available
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

        // Run SAM3 segmentation for all damage types
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

        // Extract detected damage types and calculate metrics
        const detectedTypes: string[] = [];
        const segmentationData: SAM3PseudoLabel['segmentationData'] = {};
        let totalInstances = 0;
        const confidences: number[] = [];

        for (const [damageType, segmentation] of Object.entries(sam3Result.damage_types)) {
          if (segmentation.success && segmentation.num_instances > 0) {
            // Filter by minimum confidence
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

        // Convert to YOLO format if requested
        let yoloLabels: string | undefined;
        if (autoConvertToYOLO && detectedTypes.length > 0) {
          yoloLabels = this.convertSAM3ToYOLO(segmentationData, imageWidth, imageHeight);
        }

        // Store pseudo-label
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

          await this.storePseudoLabel(pseudoLabelInput, passesQualityThreshold);
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
  private static async storePseudoLabel(
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
      // Determine damage types to segment
      const typesToSegment =
        damageTypes || yoloDetections.map((det) => det.className).filter((v, i, a) => a.indexOf(v) === i);

      if (typesToSegment.length === 0) {
        // No damage types to segment, return YOLO-only detections
        return yoloDetections.map(this.yoloToEnhanced);
      }

      // Run SAM3 segmentation
      const sam3Result = await SAM3Service.segmentDamageTypes(imageUrl, typesToSegment);

      if (!sam3Result || !sam3Result.success) {
        // SAM3 failed, return YOLO-only detections
        logger.warn('SAM3 enhancement failed, using YOLO only', {
          service: 'SAM3TrainingDataService',
        });
        return yoloDetections.map(this.yoloToEnhanced);
      }

      // Match SAM3 masks to YOLO detections
      const enhanced: EnhancedYOLODetection[] = [];

      for (const yoloDetection of yoloDetections) {
        const sam3Segmentation = sam3Result.damage_types[yoloDetection.className];

        if (!sam3Segmentation || !sam3Segmentation.success || sam3Segmentation.num_instances === 0) {
          // No SAM3 match, use YOLO only
          enhanced.push(this.yoloToEnhanced(yoloDetection));
          continue;
        }

        // Find best matching SAM3 instance based on IoU with YOLO box
        const bestMatch = this.findBestSAM3Match(yoloDetection.boundingBox, sam3Segmentation.boxes);

        if (bestMatch.index !== -1) {
          // Enhanced with SAM3
          enhanced.push({
            classId: 0, // Will be set during YOLO export
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
          // No good match, use YOLO only
          enhanced.push(this.yoloToEnhanced(yoloDetection));
        }
      }

      return enhanced;
    } catch (error) {
      logger.error('Failed to enhance YOLO with SAM3', error, {
        service: 'SAM3TrainingDataService',
      });
      // Return YOLO-only on error
      return yoloDetections.map(this.yoloToEnhanced);
    }
  }

  /**
   * Convert YOLO detection to enhanced format (no SAM3)
   */
  private static yoloToEnhanced(detection: RoboflowDetection): EnhancedYOLODetection {
    return {
      classId: 0,
      className: detection.className,
      confidence: detection.confidence,
      boundingBox: detection.boundingBox,
      fusedConfidence: detection.confidence,
      fusionMethod: 'yolo_only',
    };
  }

  /**
   * Find best matching SAM3 instance for a YOLO bounding box
   */
  private static findBestSAM3Match(
    yoloBox: { x: number; y: number; width: number; height: number },
    sam3Boxes: number[][]
  ): { index: number; iou: number } {
    let bestIoU = 0;
    let bestIndex = -1;

    for (let i = 0; i < sam3Boxes.length; i++) {
      const [x, y, w, h] = sam3Boxes[i];
      const iou = this.calculateIoU(yoloBox, { x, y, width: w, height: h });

      if (iou > bestIoU) {
        bestIoU = iou;
        bestIndex = i;
      }
    }

    // Only accept matches with IoU > 0.3
    return bestIoU > 0.3 ? { index: bestIndex, iou: bestIoU } : { index: -1, iou: 0 };
  }

  /**
   * Calculate Intersection over Union (IoU) between two bounding boxes
   */
  private static calculateIoU(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;
    const unionArea = box1Area + box2Area - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
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
    try {
      const {
        includeYOLOCorrections = true,
        includeSAM3Masks = true,
        includePseudoLabels = true,
        minConfidence = 0.5,
        onlyHumanVerified = false,
        onlySAM3Enhanced = false,
        maxSamples,
        outputDirectory,
      } = options;

      // Ensure output directory exists
      if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
      }

      const imagesDir = path.join(outputDirectory, 'images');
      const labelsDir = path.join(outputDirectory, 'labels');
      fs.mkdirSync(imagesDir, { recursive: true });
      fs.mkdirSync(labelsDir, { recursive: true });

      const exportId = `export-${Date.now()}`;
      const imagePaths: string[] = [];
      const labelPaths: string[] = [];
      const classDistribution: Record<string, number> = {};
      const sources = {
        yoloCorrections: 0,
        sam3Masks: 0,
        pseudoLabels: 0,
        baseDataset: 0,
      };

      let totalConfidence = 0;
      let humanVerifiedCount = 0;
      let sam3EnhancedCount = 0;
      let totalSamples = 0;

      // TODO: Implement actual export logic
      // This would involve:
      // 1. Querying approved YOLO corrections
      // 2. Querying SAM3 masks
      // 3. Querying approved pseudo-labels
      // 4. Converting each to YOLO format
      // 5. Writing images and labels to files
      // 6. Creating data.yaml

      logger.info('Training data export completed', {
        service: 'SAM3TrainingDataService',
        exportId,
        totalSamples,
      });

      return {
        exportId,
        exportDate: new Date(),
        totalSamples,
        classDistribution,
        sources,
        files: {
          images: imagePaths,
          labels: labelPaths,
          dataYaml: path.join(outputDirectory, 'data.yaml'),
        },
        qualityMetrics: {
          averageConfidence: totalSamples > 0 ? totalConfidence / totalSamples : 0,
          humanVerifiedRatio: totalSamples > 0 ? humanVerifiedCount / totalSamples : 0,
          sam3EnhancedRatio: totalSamples > 0 ? sam3EnhancedCount / totalSamples : 0,
        },
      };
    } catch (error) {
      logger.error('Failed to export training data', error, {
        service: 'SAM3TrainingDataService',
      });
      throw error;
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Convert SAM3 segmentation to YOLO format
   */
  private static convertSAM3ToYOLO(
    segmentationData: Record<
      string,
      {
        masks: number[][][];
        boxes: number[][];
        scores: number[];
        numInstances: number;
      }
    >,
    imageWidth: number,
    imageHeight: number
  ): string {
    const classNames = loadClassNames();
    const detections: Array<{ class: string; bbox: { x: number; y: number; width: number; height: number } }> =
      [];

    for (const [damageType, data] of Object.entries(segmentationData)) {
      for (const box of data.boxes) {
        const [x, y, w, h] = box;
        detections.push({
          class: damageType,
          bbox: { x, y, width: w, height: h },
        });
      }
    }

    return convertDetectionsToYOLO(detections, imageWidth, imageHeight, classNames);
  }

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

      return (data || []).map(this.mapRowToSAM3Mask);
    } catch (error) {
      logger.error('Failed to get SAM3 masks for assessment', error, {
        service: 'SAM3TrainingDataService',
        assessmentId,
      });
      throw error;
    }
  }

  /**
   * Map database row to SAM3TrainingMask
   */
  private static mapRowToSAM3Mask(row: Record<string, unknown>): SAM3TrainingMask {
    return {
      id: row.id as string,
      assessmentId: row.assessment_id as string,
      imageUrl: row.image_url as string,
      imageIndex: row.image_index as number,
      damageType: row.damage_type as string,
      masks: row.masks as number[][][],
      boxes: row.boxes as number[][],
      scores: row.scores as number[],
      numInstances: row.num_instances as number,
      totalAffectedArea: row.total_affected_area as number | undefined,
      averageConfidence: row.average_confidence as number | undefined,
      yoloCorrectionId: row.yolo_correction_id as string | undefined,
      usedInTraining: row.used_in_training as boolean,
      trainingVersion: row.training_version as string | undefined,
      trainingJobId: row.training_job_id as string | undefined,
      segmentationQuality: row.segmentation_quality as 'excellent' | 'good' | 'fair' | 'poor' | undefined,
      humanVerified: row.human_verified as boolean,
      verifiedBy: row.verified_by as string | undefined,
      verifiedAt: row.verified_at ? new Date(row.verified_at as string) : undefined,
      verificationNotes: row.verification_notes as string | undefined,
      createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
    };
  }
}
