/**
 * Edge builders for the scene graph.
 *
 * Constructs spatial edges from bounding-box geometry and NLP/semantic edges
 * from vision analysis captions and domain heuristics.
 */

import type { VisionAnalysisSummary } from '../types';
import { calculateSpatialRelationship } from './spatial';
import type { EdgeRelation, NodeType, SceneEdge, SceneNode } from './types';

/**
 * Create edges from spatial overlap (bounding box relationships)
 */
export function createSpatialEdges(nodes: SceneNode[]): SceneEdge[] {
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
      const relationship = calculateSpatialRelationship(
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
 * Create edges from NLP relationships (GPT-4 Vision captions)
 */
export function createNLPEdges(
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
 * Merge and deduplicate edges
 */
export function mergeEdges(edges: SceneEdge[]): SceneEdge[] {
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
export function validateGraph(
  nodes: SceneNode[],
  edges: SceneEdge[]
): { nodes: SceneNode[]; edges: SceneEdge[] } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return {
    nodes,
    edges: validEdges,
  };
}
