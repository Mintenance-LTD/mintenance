import { logger } from '@mintenance/shared';

/**
 * Convert detections to YOLO format
 *
 * YOLO format: "class_id x_center y_center width height" (normalized 0-1)
 * Each line represents one detection
 */
export function convertDetectionsToYOLO(
  detections: Array<{
    class: string;
    bbox: { x: number; y: number; width: number; height: number };
  }>,
  imageWidth: number,
  imageHeight: number,
  classNames: string[]
): string {
  const lines: string[] = [];

  for (const detection of detections) {
    // Find class ID
    const classIndex = classNames.indexOf(detection.class);
    if (classIndex === -1) {
      logger.warn('Class not found in class names', {
        class: detection.class,
        availableClasses: classNames.slice(0, 10),
      });
      continue;
    }

    // Normalize bounding box to 0-1
    const xCenter = (detection.bbox.x + detection.bbox.width / 2) / imageWidth;
    const yCenter =
      (detection.bbox.y + detection.bbox.height / 2) / imageHeight;
    const width = detection.bbox.width / imageWidth;
    const height = detection.bbox.height / imageHeight;

    // Ensure values are in valid range
    const normalizedX = Math.max(0, Math.min(1, xCenter));
    const normalizedY = Math.max(0, Math.min(1, yCenter));
    const normalizedW = Math.max(0, Math.min(1, width));
    const normalizedH = Math.max(0, Math.min(1, height));

    // YOLO format: "class_id x_center y_center width height"
    lines.push(
      `${classIndex} ${normalizedX.toFixed(6)} ${normalizedY.toFixed(6)} ${normalizedW.toFixed(6)} ${normalizedH.toFixed(6)}`
    );
  }

  return lines.join('\n');
}
