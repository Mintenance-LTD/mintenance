/**
 * Scene Graph Builder
 * 
 * Constructs a structural scene graph from visual detections and semantic analysis.
 * Implements spatial overlap detection and NLP-based relationship extraction.
 * 
 * Based on paper methodology:
 * - Nodes (V): Entities such as Wall, Foundation, Crack
 * - Edges (E): Spatial or semantic relations, e.g., Foundation → has → Crack
 * - Logic: Spatial Overlap + NLP Rules
 */

import { logger } from '@mintenance/shared';
import type { RoboflowDetection, VisionAnalysisSummary } from './types';
import type { DamageTypeSegmentation } from './SAM3Service';

/**
 * Scene graph node representing an entity in the scene
 */
export interface SceneNode {
  id: string;
  type: NodeType;
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, any>;
}

/**
 * Scene graph edge representing a relationship between nodes
 */
export interface SceneEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  relation: EdgeRelation;
  confidence: number;
  evidence: 'spatial' | 'nlp' | 'both';
}

/**
 * Node types (entities) in building assessment
 */
export type NodeType =
  | 'wall'
  | 'foundation'
  | 'roof'
  | 'floor'
  | 'ceiling'
  | 'window'
  | 'door'
  | 'crack'
  | 'stain'
  | 'moisture'
  | 'mold'
  | 'electrical'
  | 'plumbing'
  | 'insulation'
  | 'structural_beam'
  | 'pest_damage'
  | 'fire_damage'
  | 'unknown';

/**
 * Edge relations (relationships) between entities
 */
export type EdgeRelation =
  | 'has'
  | 'on_surface'
  | 'adjacent_to'
  | 'contains'
  | 'near'
  | 'above'
  | 'below'
  | 'left_of'
  | 'right_of'
  | 'overlaps'
  | 'indicates'
  | 'caused_by';

/**
 * Complete scene graph structure
 */
export interface SceneGraph {
  nodes: SceneNode[];
  edges: SceneEdge[];
  metadata: {
    imageCount: number;
    detectionCount: number;
    createdAt: string;
  };
}

/**
 * Scene Graph Builder
 * 
 * Combines Roboflow detections (bounding boxes) with GPT-4 captions (semantic)
 * to build a structured scene graph with spatial and semantic relationships.
 */
export class SceneGraphBuilder {
  /**
   * Build scene graph from detections and vision analysis
   * 
   * @param roboflowDetections - Bounding box detections from Roboflow/YOLO
   * @param visionAnalysis - Semantic analysis from GPT-4 Vision
   * @param imageCount - Number of images processed
   * @param sam3Segmentation - SAM 3 segmentation data (optional, prioritized over Roboflow)
   * @returns Complete scene graph with nodes and edges
   */
  static buildSceneGraph(
    roboflowDetections: RoboflowDetection[],
    visionAnalysis: VisionAnalysisSummary | null,
    imageCount: number = 1,
    sam3Segmentation?: DamageTypeSegmentation | null
  ): SceneGraph {
    try {
      // 1. Create nodes from SAM 3 (prioritized) or Roboflow detections
      const detectionNodes = sam3Segmentation && sam3Segmentation.success
        ? this.createNodesFromSAM3(sam3Segmentation)
        : this.createNodesFromDetections(roboflowDetections);

      // 2. Create nodes from vision analysis (NLP extraction)
      const visionNodes = this.createNodesFromVisionAnalysis(visionAnalysis);

      // 3. Merge and deduplicate nodes (SAM 3 nodes take priority)
      const mergedNodes = this.mergeNodes([...detectionNodes, ...visionNodes]);

      // 4. Create edges from spatial overlap
      const spatialEdges = this.createSpatialEdges(mergedNodes);

      // 5. Create edges from NLP relationships
      const nlpEdges = this.createNLPEdges(mergedNodes, visionAnalysis);

      // 6. Merge and deduplicate edges
      const mergedEdges = this.mergeEdges([...spatialEdges, ...nlpEdges]);

      // 7. Validate graph structure
      const validatedGraph = this.validateGraph(mergedNodes, mergedEdges);

      logger.debug('Scene graph built successfully', {
        service: 'SceneGraphBuilder',
        nodeCount: validatedGraph.nodes.length,
        edgeCount: validatedGraph.edges.length,
        imageCount,
      });

      return validatedGraph;
    } catch (error) {
      logger.error('Failed to build scene graph, returning empty graph', {
        service: 'SceneGraphBuilder',
        error,
      });

      // Return empty graph as fallback (ensures system continues)
      return {
        nodes: [],
        edges: [],
        metadata: {
          imageCount,
          detectionCount: 0,
          createdAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Create nodes from Roboflow detections (bounding boxes)
   */
  private static createNodesFromDetections(
    detections: RoboflowDetection[]
  ): SceneNode[] {
    const nodes: SceneNode[] = [];

    for (const detection of detections) {
      const nodeType = this.mapClassNameToNodeType(detection.className);
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
  private static createNodesFromSAM3(
    sam3Segmentation: DamageTypeSegmentation
  ): SceneNode[] {
    const nodes: SceneNode[] = [];

    if (!sam3Segmentation.success || !sam3Segmentation.damage_types) {
      return nodes;
    }

    let nodeIndex = 0;
    for (const [damageType, segmentation] of Object.entries(sam3Segmentation.damage_types)) {
      if (segmentation.error) {
        continue; // Skip damaged types with errors
      }

      const nodeType = this.mapClassNameToNodeType(damageType);
      
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
  private static createNodesFromVisionAnalysis(
    visionAnalysis: VisionAnalysisSummary | null
  ): SceneNode[] {
    if (!visionAnalysis) {
      return [];
    }

    const nodes: SceneNode[] = [];
    const seenTypes = new Set<string>();

    // Extract nodes from detected items
    for (const item of visionAnalysis.detectedFeatures || []) {
      const nodeType = this.extractNodeTypeFromText(item);
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
      const nodeType = this.extractNodeTypeFromText(label.description);
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
   * Map detection class name to node type
   */
  private static mapClassNameToNodeType(className: string): NodeType {
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
    if (normalized.includes('moisture') || normalized.includes('water')) return 'moisture';
    if (normalized.includes('mold')) return 'mold';
    if (normalized.includes('electrical') || normalized.includes('wire')) return 'electrical';
    if (normalized.includes('plumbing') || normalized.includes('pipe')) return 'plumbing';
    if (normalized.includes('pest') || normalized.includes('termite')) return 'pest_damage';
    if (normalized.includes('fire') || normalized.includes('smoke')) return 'fire_damage';
    if (normalized.includes('insulation')) return 'insulation';

    return 'unknown';
  }

  /**
   * Extract node type from natural language text (NLP)
   */
  private static extractNodeTypeFromText(text: string): NodeType | null {
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
   * Create edges from spatial overlap (bounding box relationships)
   */
  private static createSpatialEdges(nodes: SceneNode[]): SceneEdge[] {
    const edges: SceneEdge[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        // Skip if either node lacks bounding box
        if (!nodeA.boundingBox || !nodeB.boundingBox) {
          continue;
        }

        // Calculate spatial relationships
        const relationship = this.calculateSpatialRelationship(
          nodeA.boundingBox,
          nodeB.boundingBox
        );

        if (relationship) {
          edges.push({
            id: `spatial_${nodeA.id}_${nodeB.id}`,
            source: nodeA.id,
            target: nodeB.id,
            relation: relationship.relation,
            confidence: relationship.confidence,
            evidence: 'spatial',
          });
        }
      }
    }

    return edges;
  }

  /**
   * Calculate spatial relationship between two bounding boxes
   */
  private static calculateSpatialRelationship(
    boxA: { x: number; y: number; width: number; height: number },
    boxB: { x: number; y: number; width: number; height: number }
  ): { relation: EdgeRelation; confidence: number } | null {
    // Calculate IoU (Intersection over Union)
    const iou = this.calculateIoU(boxA, boxB);

    // Overlap threshold for "on_surface" or "contains"
    if (iou > 0.3) {
      // Determine if one contains the other
      const aContainsB = this.contains(boxA, boxB);
      const bContainsA = this.contains(boxB, boxA);

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
    const maxDistance = Math.max(
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
    if (this.isAdjacent(boxA, boxB)) {
      return { relation: 'adjacent_to', confidence: 0.7 };
    }

    // Check for "near" (within reasonable distance)
    if (distance < maxDistance * 2) {
      return { relation: 'near', confidence: 0.5 };
    }

    return null;
  }

  /**
   * Calculate IoU (Intersection over Union) between two bounding boxes
   */
  private static calculateIoU(
    boxA: { x: number; y: number; width: number; height: number },
    boxB: { x: number; y: number; width: number; height: number }
  ): number {
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
  private static contains(
    boxA: { x: number; y: number; width: number; height: number },
    boxB: { x: number; y: number; width: number; height: number }
  ): boolean {
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
  private static isAdjacent(
    boxA: { x: number; y: number; width: number; height: number },
    boxB: { x: number; y: number; width: number; height: number }
  ): boolean {
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
   * Create edges from NLP relationships (GPT-4 Vision captions)
   */
  private static createNLPEdges(
    nodes: SceneNode[],
    visionAnalysis: VisionAnalysisSummary | null
  ): SceneEdge[] {
    if (!visionAnalysis) {
      return [];
    }

    const edges: SceneEdge[] = [];
    const description = visionAnalysis.suggestedCategories
      ?.map((cat) => cat.reason)
      .join(' ') || '';

    // Extract relationships from description using pattern matching
    const relationshipPatterns: Array<{
      pattern: RegExp;
      relation: EdgeRelation;
    }> = [
      { pattern: /\b(has|contains|shows)\b/gi, relation: 'has' },
      { pattern: /\b(on|over|upon)\s+(?:the\s+)?(\w+)/gi, relation: 'on_surface' },
      { pattern: /\b(caused\s+by|due\s+to|result\s+of)\b/gi, relation: 'caused_by' },
      { pattern: /\b(indicates|suggests|shows)\b/gi, relation: 'indicates' },
      { pattern: /\b(adjacent\s+to|next\s+to|beside)\b/gi, relation: 'adjacent_to' },
      { pattern: /\b(above|over|on\s+top\s+of)\b/gi, relation: 'above' },
      { pattern: /\b(below|under|beneath)\b/gi, relation: 'below' },
    ];

    for (const { pattern, relation } of relationshipPatterns) {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        // Try to find nodes mentioned near the relationship
        for (const node of nodes) {
          const nodePattern = new RegExp(`\\b${node.label}\\b`, 'i');
          if (nodePattern.test(description)) {
            // Find other nodes mentioned in proximity
            const contextStart = Math.max(0, match.index! - 50);
            const contextEnd = Math.min(
              description.length,
              match.index! + match[0].length + 50
            );
            const context = description.substring(contextStart, contextEnd);

            for (const otherNode of nodes) {
              if (otherNode.id === node.id) continue;

              const otherPattern = new RegExp(`\\b${otherNode.label}\\b`, 'i');
              if (otherPattern.test(context)) {
                // Create edge (bidirectional check)
                edges.push({
                  id: `nlp_${node.id}_${otherNode.id}_${relation}`,
                  source: node.id,
                  target: otherNode.id,
                  relation,
                  confidence: 0.6, // Moderate confidence for NLP extraction
                  evidence: 'nlp',
                });
              }
            }
          }
        }
      }
    }

    // Add semantic relationships based on node types
    // Example: crack → on_surface → wall
    for (const nodeA of nodes) {
      for (const nodeB of nodes) {
        if (nodeA.id === nodeB.id) continue;

        // Damage entities typically relate to structural entities
        const damageTypes: NodeType[] = [
          'crack',
          'stain',
          'moisture',
          'mold',
          'pest_damage',
          'fire_damage',
        ];
        const structuralTypes: NodeType[] = [
          'wall',
          'foundation',
          'roof',
          'floor',
          'ceiling',
        ];

        if (
          damageTypes.includes(nodeA.type) &&
          structuralTypes.includes(nodeB.type)
        ) {
          edges.push({
            id: `semantic_${nodeA.id}_${nodeB.id}_onsurface`,
            source: nodeA.id,
            target: nodeB.id,
            relation: 'on_surface',
            confidence: 0.7,
            evidence: 'nlp',
          });
        }

        // Structural elements "has" damage
        if (
          structuralTypes.includes(nodeA.type) &&
          damageTypes.includes(nodeB.type)
        ) {
          edges.push({
            id: `semantic_${nodeA.id}_${nodeB.id}_has`,
            source: nodeA.id,
            target: nodeB.id,
            relation: 'has',
            confidence: 0.7,
            evidence: 'nlp',
          });
        }
      }
    }

    return edges;
  }

  /**
   * Merge and deduplicate nodes
   */
  private static mergeNodes(nodes: SceneNode[]): SceneNode[] {
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

  /**
   * Merge and deduplicate edges
   */
  private static mergeEdges(edges: SceneEdge[]): SceneEdge[] {
    const merged = new Map<string, SceneEdge>();

    for (const edge of edges) {
      const key = `${edge.source}_${edge.relation}_${edge.target}`;

      if (merged.has(key)) {
        // Merge: take higher confidence, combine evidence
        const existing = merged.get(key)!;
        if (edge.confidence > existing.confidence) {
          existing.confidence = edge.confidence;
        }
        if (edge.evidence !== existing.evidence) {
          existing.evidence = 'both';
        }
      } else {
        merged.set(key, { ...edge });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Validate graph structure (ensure all edges reference valid nodes)
   */
  private static validateGraph(
    nodes: SceneNode[],
    edges: SceneEdge[]
  ): SceneGraph {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const validEdges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    return {
      nodes,
      edges: validEdges,
      metadata: {
        imageCount: 1,
        detectionCount: nodes.length,
        createdAt: new Date().toISOString(),
      },
    };
  }
}

