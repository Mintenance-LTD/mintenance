/**
 * Spatial utilities for scene graph edge construction.
 *
 * Pure geometry helpers: IoU, containment, adjacency, and directional
 * relationship inference between axis-aligned bounding boxes.
 */

import type { BoundingBox, EdgeRelation } from './types';

/**
 * Calculate IoU (Intersection over Union) between two bounding boxes
 */
function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const x1 = Math.max(boxA.x, boxB.x);
  const y1 = Math.max(boxA.y, boxB.y);
  const x2 = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const y2 = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  if (x2 <= x1 || y2 <= y1) {
    return 0;
  }

  const intersection = (x2 - x1) * (y2 - y1);
  const areaA = boxA.width * boxA.height;
  const areaB = boxB.width * boxB.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}

/**
 * Check if boxA contains boxB
 */
function contains(boxA: BoundingBox, boxB: BoundingBox): boolean {
  return (
    boxA.x <= boxB.x &&
    boxA.y <= boxB.y &&
    boxA.x + boxA.width >= boxB.x + boxB.width &&
    boxA.y + boxA.height >= boxB.y + boxB.height
  );
}

/**
 * Check if two boxes are adjacent (touching or very close)
 */
function isAdjacent(boxA: BoundingBox, boxB: BoundingBox): boolean {
  const threshold = 10; // pixels

  // Check horizontal adjacency
  const horizontalAdjacent =
    (Math.abs(boxA.x + boxA.width - boxB.x) < threshold ||
      Math.abs(boxB.x + boxB.width - boxA.x) < threshold) &&
    !(boxA.y + boxA.height < boxB.y || boxB.y + boxB.height < boxA.y);

  // Check vertical adjacency
  const verticalAdjacent =
    (Math.abs(boxA.y + boxA.height - boxB.y) < threshold ||
      Math.abs(boxB.y + boxB.height - boxA.y) < threshold) &&
    !(boxA.x + boxA.width < boxB.x || boxB.x + boxB.width < boxA.x);

  return horizontalAdjacent || verticalAdjacent;
}

/**
 * Calculate spatial relationship between two bounding boxes
 */
export function calculateSpatialRelationship(
  boxA: BoundingBox,
  boxB: BoundingBox
): { relation: EdgeRelation; confidence: number } | null {
  // Calculate IoU (Intersection over Union)
  const iou = calculateIoU(boxA, boxB);

  // Overlap threshold for "on_surface" or "contains"
  if (iou > 0.3) {
    // Determine if one contains the other
    const aContainsB = contains(boxA, boxB);
    const bContainsA = contains(boxB, boxA);

    if (aContainsB) {
      return { relation: 'contains', confidence: iou };
    }
    if (bContainsA) {
      return { relation: 'contains', confidence: iou };
    }

    return { relation: 'on_surface', confidence: iou };
  }

  // Calculate center distances for directional relationships
  const centerA = {
    x: boxA.x + boxA.width / 2,
    y: boxA.y + boxA.height / 2,
  };
  const centerB = {
    x: boxB.x + boxB.width / 2,
    y: boxB.y + boxB.height / 2,
  };

  const dx = centerB.x - centerA.x;
  const dy = centerB.y - centerA.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Proximity threshold
  const maxDistance =
    Math.max(
      Math.sqrt(boxA.width ** 2 + boxA.height ** 2),
      Math.sqrt(boxB.width ** 2 + boxB.height ** 2)
    ) * 1.5;

  if (distance < maxDistance) {
    // Determine direction
    if (Math.abs(dy) > Math.abs(dx)) {
      // Vertical relationship
      if (dy < 0) {
        return { relation: 'above', confidence: 0.6 };
      }
      return { relation: 'below', confidence: 0.6 };
    } else {
      // Horizontal relationship
      if (dx < 0) {
        return { relation: 'left_of', confidence: 0.6 };
      }
      return { relation: 'right_of', confidence: 0.6 };
    }
  }

  // Check for "adjacent_to" (touching or very close)
  if (isAdjacent(boxA, boxB)) {
    return { relation: 'adjacent_to', confidence: 0.7 };
  }

  // Check for "near" (within reasonable distance)
  if (distance < maxDistance * 2) {
    return { relation: 'near', confidence: 0.5 };
  }

  return null;
}
