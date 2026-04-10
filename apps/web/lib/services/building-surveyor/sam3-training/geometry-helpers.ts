/**
 * Pure geometry helpers for SAM3 training data processing.
 * IoU calculation and best-match finding between YOLO and SAM3 boxes.
 */

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 */
function calculateIoU(
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

/**
 * Find best matching SAM3 instance for a YOLO bounding box
 */
export function findBestSAM3Match(
  yoloBox: { x: number; y: number; width: number; height: number },
  sam3Boxes: number[][]
): { index: number; iou: number } {
  let bestIoU = 0;
  let bestIndex = -1;

  for (let i = 0; i < sam3Boxes.length; i++) {
    const [x, y, w, h] = sam3Boxes[i];
    const iou = calculateIoU(yoloBox, { x, y, width: w, height: h });

    if (iou > bestIoU) {
      bestIoU = iou;
      bestIndex = i;
    }
  }

  // Only accept matches with IoU > 0.3
  return bestIoU > 0.3
    ? { index: bestIndex, iou: bestIoU }
    : { index: -1, iou: 0 };
}
