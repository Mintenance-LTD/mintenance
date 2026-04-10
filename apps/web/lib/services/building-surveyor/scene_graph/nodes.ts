/**
 * Node builders for the scene graph.
 *
 * Creates scene nodes from Roboflow detections, SAM 3 segmentation, and
 * GPT-4 Vision analysis, and handles NodeType mapping + deduplication.
 */

import type { RoboflowDetection, VisionAnalysisSummary } from '../types';
import type { DamageTypeSegmentation } from '../SAM3Service';
import type { NodeType, SceneNode } from './types';

/**
 * Map detection class name to node type
 */
function mapClassNameToNodeType(className: string): NodeType {
  const normalized = className.toLowerCase();

  // Structural elements
  if (normalized.includes('wall')) return 'wall';
  if (normalized.includes('foundation')) return 'foundation';
  if (normalized.includes('roof')) return 'roof';
  if (normalized.includes('floor')) return 'floor';
  if (normalized.includes('ceiling')) return 'ceiling';
  if (normalized.includes('window')) return 'window';
  if (normalized.includes('door')) return 'door';
  if (normalized.includes('beam')) return 'structural_beam';

  // Damage types
  if (normalized.includes('crack')) return 'crack';
  if (normalized.includes('stain')) return 'stain';
  if (normalized.includes('moisture') || normalized.includes('water'))
    return 'moisture';
  if (normalized.includes('mold')) return 'mold';
  if (normalized.includes('electrical') || normalized.includes('wire'))
    return 'electrical';
  if (normalized.includes('plumbing') || normalized.includes('pipe'))
    return 'plumbing';
  if (normalized.includes('pest') || normalized.includes('termite'))
    return 'pest_damage';
  if (normalized.includes('fire') || normalized.includes('smoke'))
    return 'fire_damage';
  if (normalized.includes('insulation')) return 'insulation';

  return 'unknown';
}

/**
 * Extract node type from natural language text (NLP)
 */
function extractNodeTypeFromText(text: string): NodeType | null {
  const normalized = text.toLowerCase();

  // Check for structural elements
  if (/\bwall\b/.test(normalized)) return 'wall';
  if (/\bfoundation\b/.test(normalized)) return 'foundation';
  if (/\broof\b/.test(normalized)) return 'roof';
  if (/\bfloor\b/.test(normalized)) return 'floor';
  if (/\bceiling\b/.test(normalized)) return 'ceiling';
  if (/\bwindow\b/.test(normalized)) return 'window';
  if (/\bdoor\b/.test(normalized)) return 'door';

  // Check for damage types
  if (/\bcrack\b/.test(normalized)) return 'crack';
  if (/\bstain\b/.test(normalized)) return 'stain';
  if (/\bmoisture\b|\bwater\b/.test(normalized)) return 'moisture';
  if (/\bmold\b/.test(normalized)) return 'mold';
  if (/\belectrical\b|\bwiring\b/.test(normalized)) return 'electrical';
  if (/\bplumbing\b|\bpipe\b/.test(normalized)) return 'plumbing';
  if (/\bpest\b|\btermite\b/.test(normalized)) return 'pest_damage';
  if (/\bfire\b|\bsmoke\b/.test(normalized)) return 'fire_damage';

  return null;
}

/**
 * Create nodes from Roboflow detections (bounding boxes)
 */
export function createNodesFromDetections(
  detections: RoboflowDetection[]
): SceneNode[] {
  const nodes: SceneNode[] = [];

  for (const detection of detections) {
    const nodeType = mapClassNameToNodeType(detection.className);
    const nodeId = `det_${detection.id}`;

    nodes.push({
      id: nodeId,
      type: nodeType,
      label: detection.className,
      confidence: detection.confidence / 100,
      boundingBox: {
        x: detection.boundingBox.x,
        y: detection.boundingBox.y,
        width: detection.boundingBox.width,
        height: detection.boundingBox.height,
      },
      attributes: {
        source: 'roboflow',
        imageUrl: detection.imageUrl,
      },
    });
  }

  return nodes;
}

/**
 * Create nodes from SAM 3 segmentation data
 */
export function createNodesFromSAM3(
  sam3Segmentation: DamageTypeSegmentation
): SceneNode[] {
  const nodes: SceneNode[] = [];

  if (!sam3Segmentation.success || !sam3Segmentation.damage_types) {
    return nodes;
  }

  let nodeIndex = 0;
  for (const [damageType, segmentation] of Object.entries(
    sam3Segmentation.damage_types
  )) {
    if (segmentation.error) {
      continue; // Skip damaged types with errors
    }

    const nodeType = mapClassNameToNodeType(damageType);

    // Create a node for each instance (box) of this damage type
    for (let i = 0; i < segmentation.boxes.length; i++) {
      const box = segmentation.boxes[i];
      const score = segmentation.scores[i] || 0.5; // Default to 0.5 if score missing

      // Box format: [x, y, width, height] or [x1, y1, x2, y2]
      // Normalize to [x, y, width, height] format
      let x: number, y: number, width: number, height: number;
      if (box.length === 4) {
        // Assume [x, y, width, height] format
        [x, y, width, height] = box;
      } else {
        // Fallback: treat as [x1, y1, x2, y2] and convert
        x = box[0] || 0;
        y = box[1] || 0;
        width = (box[2] || 0) - x;
        height = (box[3] || 0) - y;
      }

      nodes.push({
        id: `sam3_${damageType}_${nodeIndex++}`,
        type: nodeType,
        label: damageType,
        confidence: Math.min(1, Math.max(0, score / 100)), // Normalize score to [0, 1]
        boundingBox: {
          x,
          y,
          width: Math.max(0, width),
          height: Math.max(0, height),
        },
        attributes: {
          source: 'sam3',
          numInstances: segmentation.num_instances,
          damageType,
        },
      });
    }
  }

  return nodes;
}

/**
 * Create nodes from GPT-4 Vision analysis (semantic extraction)
 */
export function createNodesFromVisionAnalysis(
  visionAnalysis: VisionAnalysisSummary | null
): SceneNode[] {
  if (!visionAnalysis) {
    return [];
  }

  const nodes: SceneNode[] = [];
  const seenTypes = new Set<string>();

  // Extract nodes from detected items
  for (const item of visionAnalysis.detectedFeatures || []) {
    const nodeType = extractNodeTypeFromText(item);
    if (nodeType && !seenTypes.has(nodeType)) {
      seenTypes.add(nodeType);
      nodes.push({
        id: `vision_${nodes.length}`,
        type: nodeType,
        label: item,
        confidence: 0.8, // Default confidence for vision analysis
        attributes: {
          source: 'gpt4_vision',
        },
      });
    }
  }

  // Extract nodes from labels
  for (const label of visionAnalysis.labels || []) {
    const nodeType = extractNodeTypeFromText(label.description);
    if (nodeType && !seenTypes.has(nodeType)) {
      seenTypes.add(nodeType);
      nodes.push({
        id: `vision_label_${nodes.length}`,
        type: nodeType,
        label: label.description,
        confidence: label.score,
        attributes: {
          source: 'gpt4_vision',
        },
      });
    }
  }

  return nodes;
}

/**
 * Merge and deduplicate nodes
 */
export function mergeNodes(nodes: SceneNode[]): SceneNode[] {
  const merged = new Map<string, SceneNode>();

  for (const node of nodes) {
    const key = `${node.type}_${node.label}`.toLowerCase();

    if (merged.has(key)) {
      // Merge: take higher confidence, combine attributes
      const existing = merged.get(key)!;
      if (node.confidence > existing.confidence) {
        existing.confidence = node.confidence;
      }
      if (node.boundingBox && !existing.boundingBox) {
        existing.boundingBox = node.boundingBox;
      }
      existing.attributes = {
        ...existing.attributes,
        ...node.attributes,
      };
    } else {
      merged.set(key, { ...node });
    }
  }

  return Array.from(merged.values());
}
