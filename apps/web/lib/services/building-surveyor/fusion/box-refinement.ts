/**
 * Bounding-box refinement using SAM3 masks.
 * Finds the best-matching SAM3 box for each YOLO detection and replaces the
 * original box if IoU > 0.3.
 *
 * Extracted from EnhancedBayesianFusionService.
 */
import type { EnhancedFusionInput } from '../EnhancedBayesianFusionService';
import type { RoboflowDetection } from '../types';

/**
 * Intersection over Union for two bounding boxes in [x, y, width, height] form.
 */
export function calculateIoU(box1: number[], box2: number[]): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  const xLeft = Math.max(x1, x2);
  const yTop = Math.max(y1, y2);
  const xRight = Math.min(x1 + w1, x2 + w2);
  const yBottom = Math.min(y1 + h1, y2 + h2);

  if (xRight < xLeft || yBottom < yTop) {
    return 0;
  }

  const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
  const box1Area = w1 * h1;
  const box2Area = w2 * h2;
  const unionArea = box1Area + box2Area - intersectionArea;

  return intersectionArea / unionArea;
}

/**
 * Refine YOLO bounding boxes using SAM3 segmentation masks.
 * For each YOLO detection, finds the SAM3 box for the same damage type with
 * the highest IoU and uses the SAM3 box if IoU > 0.3.
 */
export function refineBoxesWithMasks(
  yoloDetections?: RoboflowDetection[],
  sam3Evidence?: EnhancedFusionInput['sam3Evidence'],
): Array<{ original: number[]; refined: number[]; iou: number }> | undefined {
  if (!yoloDetections || !sam3Evidence) {
    return undefined;
  }

  const refinedBoxes: Array<{
    original: number[];
    refined: number[];
    iou: number;
  }> = [];

  for (const detection of yoloDetections) {
    const damageType = detection.className;
    const sam3Data = sam3Evidence.damageTypes[damageType];

    if (sam3Data && sam3Data.boxes && sam3Data.boxes.length > 0) {
      let bestBox = sam3Data.boxes[0];
      let bestIoU = 0;

      const bb = detection.boundingBox;
      for (const sam3Box of sam3Data.boxes) {
        const iou = calculateIoU(
          [bb.x, bb.y, bb.width, bb.height],
          sam3Box,
        );
        if (iou > bestIoU) {
          bestIoU = iou;
          bestBox = sam3Box;
        }
      }

      if (bestIoU > 0.3) {
        refinedBoxes.push({
          original: [bb.x, bb.y, bb.width, bb.height],
          refined: bestBox,
          iou: bestIoU,
        });
      }
    }
  }

  return refinedBoxes.length > 0 ? refinedBoxes : undefined;
}
