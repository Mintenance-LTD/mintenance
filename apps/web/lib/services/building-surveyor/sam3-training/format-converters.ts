/**
 * Format conversion helpers: SAM3 -> YOLO, row -> SAM3TrainingMask, YOLO -> Enhanced.
 */

import { loadClassNames } from '../yolo-class-names';
import { convertDetectionsToYOLO } from '../YOLOCorrectionService';
import type { SAM3TrainingMask, EnhancedYOLODetection } from '../training-data-types';
import type { RoboflowDetection } from '../types';

/**
 * Convert SAM3 segmentation to YOLO format
 */
export function convertSAM3ToYOLO(
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
 * Convert YOLO detection to enhanced format (no SAM3)
 */
export function yoloToEnhanced(detection: RoboflowDetection): EnhancedYOLODetection {
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
 * Map database row to SAM3TrainingMask
 */
export function mapRowToSAM3Mask(row: Record<string, unknown>): SAM3TrainingMask {
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
