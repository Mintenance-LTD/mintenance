/**
 * YOLO Postprocessing Utilities
 *
 * Handles postprocessing of YOLO model outputs:
 * - Non-Maximum Suppression (NMS)
 * - Bounding box scaling to original image size
 * - Class name mapping
 * - Confidence filtering
 */

import { logger } from '@mintenance/shared';

export interface YOLODetection {
  /** Bounding box coordinates (x, y, width, height) in original image space */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Class index */
  classIndex: number;
  /** Class name */
  className: string;
}

export interface PostprocessingOptions {
  /** Confidence threshold (default: 0.25) */
  confidenceThreshold?: number;
  /** IoU threshold for NMS (default: 0.45) */
  iouThreshold?: number;
  /** Maximum detections per image (default: 300) */
  maxDetections?: number;
  /** Class names array (from data.yaml) */
  classNames: string[];
  /** Scale factors from preprocessing */
  scaleX: number;
  scaleY: number;
}

/**
 * Postprocess YOLO model outputs
 *
 * YOLO output format: [batch, num_detections, 85]
 * Where 85 = 4 (bbox) + 1 (objectness) + 80 (classes) or 71 for our model
 *
 * @param modelOutput - Raw model output tensor
 * @param options - Postprocessing options
 * @returns Array of detections
 */
export function postprocessYOLOOutput(
  modelOutput: Float32Array | number[][],
  options: PostprocessingOptions,
): YOLODetection[] {
  const {
    confidenceThreshold = 0.25,
    iouThreshold = 0.45,
    maxDetections = 300,
    classNames,
    scaleX,
    scaleY,
  } = options;

  try {
    // Convert to 2D array if needed
    const output = Array.isArray(modelOutput[0]) ? (modelOutput as number[][]) : reshapeOutput(modelOutput, classNames.length);

    const detections: YOLODetection[] = [];

    // Process each detection
    for (const detection of output) {
      // YOLO format: [x_center, y_center, width, height, objectness, class_scores...]
      const [xCenter, yCenter, width, height, objectness, ...classScores] = detection;

      // Filter by objectness (confidence)
      if (objectness < confidenceThreshold) {
        continue;
      }

      // Find best class
      let maxScore = 0;
      let bestClassIndex = 0;
      for (let i = 0; i < classScores.length; i++) {
        if (classScores[i] > maxScore) {
          maxScore = classScores[i];
          bestClassIndex = i;
        }
      }

      // Final confidence = objectness * class_score
      const finalConfidence = objectness * maxScore;
      if (finalConfidence < confidenceThreshold) {
        continue;
      }

      // Convert from center format to top-left format
      const x = (xCenter - width / 2) * scaleX;
      const y = (yCenter - height / 2) * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;

      detections.push({
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: scaledWidth,
        height: scaledHeight,
        confidence: finalConfidence,
        classIndex: bestClassIndex,
        className: classNames[bestClassIndex] || `class_${bestClassIndex}`,
      });
    }

    // Apply Non-Maximum Suppression (NMS)
    const nmsDetections = applyNMS(detections, iouThreshold, maxDetections);

    return nmsDetections;
  } catch (error) {
    logger.error('Failed to postprocess YOLO output', {
      service: 'YOLOPostprocessing',
      error,
    });
    return [];
  }
}

/**
 * Reshape 1D output array to 2D [num_detections, features]
 */
function reshapeOutput(output: Float32Array, numClasses: number): number[][] {
  const featuresPerDetection = 5 + numClasses; // 4 bbox + 1 objectness + num_classes
  const numDetections = output.length / featuresPerDetection;
  const reshaped: number[][] = [];

  for (let i = 0; i < numDetections; i++) {
    const start = i * featuresPerDetection;
    reshaped.push(Array.from(output.slice(start, start + featuresPerDetection)));
  }

  return reshaped;
}

/**
 * Apply Non-Maximum Suppression (NMS) to remove overlapping detections
 *
 * @param detections - Array of detections
 * @param iouThreshold - IoU threshold for suppression
 * @param maxDetections - Maximum number of detections to return
 * @returns Filtered detections
 */
function applyNMS(
  detections: YOLODetection[],
  iouThreshold: number,
  maxDetections: number,
): YOLODetection[] {
  // Sort by confidence (descending)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);

  const selected: YOLODetection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length && selected.length < maxDetections; i++) {
    if (suppressed.has(i)) {
      continue;
    }

    selected.push(sorted[i]);

    // Suppress overlapping detections
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) {
        continue;
      }

      const iou = calculateIoU(sorted[i], sorted[j]);
      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return selected;
}

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 */
function calculateIoU(box1: YOLODetection, box2: YOLODetection): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  if (x2 <= x1 || y2 <= y1) {
    return 0;
  }

  const intersection = (x2 - x1) * (y2 - y1);
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const union = area1 + area2 - intersection;

  return union > 0 ? intersection / union : 0;
}

