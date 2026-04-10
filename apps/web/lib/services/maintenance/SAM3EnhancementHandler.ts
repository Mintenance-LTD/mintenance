/**
 * SAM3 Enhancement Handler
 * Handles SAM3 precision enhancement logic for maintenance detections
 */

import { SAM3Service } from '../building-surveyor/SAM3Service';
import { logger } from '@/lib/logger';
import type {
  MaintenanceDetection,
  EnhancedMaintenanceDetection,
} from './MaintenanceDetectionService';

/**
 * Extract bounding coordinates from a binary mask
 */
export function extractBoundaries(mask: number[][]): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  let top = mask.length;
  let bottom = 0;
  let left = mask[0]?.length || 0;
  let right = 0;

  for (let y = 0; y < mask.length; y++) {
    for (let x = 0; x < mask[y].length; x++) {
      if (mask[y][x] === 1) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }

  return { top, bottom, left, right };
}

/**
 * Calculate severity from SAM3 segmentation data using issue-type-specific thresholds
 */
export function calculateSeverityFromSegmentation(
  detection: EnhancedMaintenanceDetection
): 'minor' | 'moderate' | 'major' | 'critical' {
  if (!detection.affected_area_percentage) {
    return detection.severity;
  }

  const thresholds: Record<
    string,
    { minor: number; moderate: number; major: number }
  > = {
    pipe_leak: { minor: 2, moderate: 5, major: 10 },
    wall_crack: { minor: 1, moderate: 3, major: 5 },
    ceiling_stain: { minor: 5, moderate: 10, major: 20 },
    outlet_damage: { minor: 0.5, moderate: 1, major: 2 },
    default: { minor: 3, moderate: 7, major: 15 },
  };

  const threshold = thresholds[detection.issue_type] || thresholds.default;
  const percentage = detection.affected_area_percentage;

  if (percentage < threshold.minor) return 'minor';
  if (percentage < threshold.moderate) return 'moderate';
  if (percentage < threshold.major) return 'major';
  return 'critical';
}

/**
 * Get a human-readable confidence explanation
 */
export function getConfidenceExplanation(confidence: number): {
  level: 'high' | 'medium' | 'low';
  message: string;
  shouldRequestMorePhotos: boolean;
} {
  if (confidence >= 0.85) {
    return {
      level: 'high',
      message: 'High confidence detection',
      shouldRequestMorePhotos: false,
    };
  } else if (confidence >= 0.6) {
    return {
      level: 'medium',
      message: 'Moderate confidence - verification recommended',
      shouldRequestMorePhotos: false,
    };
  } else {
    return {
      level: 'low',
      message: 'Low confidence - better photos needed',
      shouldRequestMorePhotos: true,
    };
  }
}

/**
 * Enhance YOLO detections with SAM3 segmentation masks
 */
export async function enhanceWithSAM3(
  imageUrl: string,
  yoloDetections: MaintenanceDetection[]
): Promise<EnhancedMaintenanceDetection[]> {
  try {
    const sam3Available = await SAM3Service.healthCheck();

    if (!sam3Available) {
      logger.info('SAM3 service unavailable, returning YOLO-only results', {
        service: 'MaintenanceDetectionService',
      });
      return yoloDetections.map((detection) => ({
        ...detection,
        mask_confidence: detection.confidence,
      }));
    }

    const enhanced: EnhancedMaintenanceDetection[] = [];

    for (const detection of yoloDetections) {
      try {
        const textPrompt = detection.issue_type.replace(/_/g, ' ');
        const segResult = await SAM3Service.segment(imageUrl, textPrompt, 0.4);

        if (segResult && segResult.success && segResult.masks.length > 0) {
          const bestIdx = segResult.scores.indexOf(
            Math.max(...segResult.scores)
          );
          const mask = segResult.masks[bestIdx];
          const boundaries = extractBoundaries(mask);

          let pixelCount = 0;
          for (let y = 0; y < mask.length; y++) {
            for (let x = 0; x < mask[y].length; x++) {
              if (mask[y][x] === 1) pixelCount++;
            }
          }
          const totalPixels = mask.length * (mask[0]?.length || 1);
          const affectedAreaPercentage = (pixelCount / totalPixels) * 100;

          enhanced.push({
            ...detection,
            precise_mask: mask,
            mask_confidence: segResult.scores[bestIdx],
            pixel_count: pixelCount,
            affected_area_percentage: affectedAreaPercentage,
            boundaries,
          });
        } else {
          enhanced.push({
            ...detection,
            mask_confidence: detection.confidence,
          });
        }
      } catch (segError) {
        logger.warn('SAM3 segmentation failed for detection, using YOLO-only', {
          service: 'MaintenanceDetectionService',
          issueType: detection.issue_type,
          error:
            segError instanceof Error ? segError.message : String(segError),
        });
        enhanced.push({
          ...detection,
          mask_confidence: detection.confidence,
        });
      }
    }

    return enhanced;
  } catch (error) {
    logger.error('SAM3 enhancement failed, returning YOLO-only results', {
      service: 'MaintenanceDetectionService',
      error,
    });
    return yoloDetections;
  }
}
