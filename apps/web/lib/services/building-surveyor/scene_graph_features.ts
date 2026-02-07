/**
 * Scene Graph Feature Extraction
 * 
 * Flattens scene graph into feature vector for Bayesian fusion.
 * Based on paper: Scene Graph → Vector (Counts, Booleans, Spatial)
 */

import { logger } from '@mintenance/shared';
import type { SceneGraph, SceneNode, SceneEdge, NodeType, EdgeRelation } from './scene_graph';
import { getActiveDomain } from './config/BuildingSurveyorConfig';

/**
 * Feature vector extracted from scene graph
 * 
 * Structure:
 * - Node counts (by type): 17 features
 * - Edge counts (by relation): 12 features
 * - Node-edge pattern counts: Variable
 * - Spatial features: 5 features
 * - Total: ~40 features (compatible with existing feature extractors)
 */
export interface SceneGraphFeatures {
  nodeCounts: Record<NodeType, number>;
  edgeCounts: Record<EdgeRelation, number>;
  nodeEdgePatterns: Map<string, number>; // Pattern: "nodeType_relation_nodeType"
  spatialFeatures: {
    avgNodeConfidence: number;
    avgEdgeConfidence: number;
    maxNodeDegree: number;
    avgNodeDegree: number;
    connectivityScore: number;
  };
  featureVector: number[]; // Flattened vector for Bayesian fusion (40-dim)
  compactFeatureVector?: number[]; // Compact vector for critic (12-dim, d_eff = 12)
}

/**
 * Scene Graph Feature Extractor
 * 
 * Converts scene graph structure into numerical feature vector
 * for use in Bayesian fusion and downstream models.
 */
export class SceneGraphFeatureExtractor {
  /**
   * Extract features from scene graph
   * 
   * @param sceneGraph - Scene graph structure
   * @returns Feature vector and structured features
   */
  static extractFeatures(sceneGraph: SceneGraph): SceneGraphFeatures {
    try {
      // 1. Count nodes by type
      const nodeCounts = this.countNodesByType(sceneGraph.nodes);

      // 2. Count edges by relation
      const edgeCounts = this.countEdgesByRelation(sceneGraph.edges);

      // 3. Count node-edge patterns
      const nodeEdgePatterns = this.countNodeEdgePatterns(
        sceneGraph.nodes,
        sceneGraph.edges
      );

      // 4. Calculate spatial features
      const spatialFeatures = this.calculateSpatialFeatures(
        sceneGraph.nodes,
        sceneGraph.edges
      );

      // 5. Flatten to vector (40-dim)
      const featureVector = this.flattenToVector(
        nodeCounts,
        edgeCounts,
        nodeEdgePatterns,
        spatialFeatures
      );

      // 6. Extract compact features (12-dim for critic)
      const compactFeatureVector = this.extractCompactFeatures(
        nodeCounts,
        edgeCounts,
        spatialFeatures,
        sceneGraph
      );

      return {
        nodeCounts,
        edgeCounts,
        nodeEdgePatterns,
        spatialFeatures,
        featureVector,
        compactFeatureVector,
      };
    } catch (error) {
      logger.error('Failed to extract scene graph features, returning zero vector', {
        service: 'SceneGraphFeatureExtractor',
        error,
      });

      // Return zero vector as fallback
      return {
        nodeCounts: this.initializeNodeCounts(),
        edgeCounts: this.initializeEdgeCounts(),
        nodeEdgePatterns: new Map(),
        spatialFeatures: {
          avgNodeConfidence: 0,
          avgEdgeConfidence: 0,
          maxNodeDegree: 0,
          avgNodeDegree: 0,
          connectivityScore: 0,
        },
        featureVector: new Array(40).fill(0),
        compactFeatureVector: new Array(12).fill(0),
      };
    }
  }

  /**
   * Extract compact 12-dimensional feature vector for critic (d_eff = 12)
   * 
   * Maps 40-dim features to 12-dim using manual selection:
   * 1. has_critical_hazard (binary) - from crack/structural_damage counts
   * 2. crack_density (0-1) - normalized crack count
   * 3. water_damage_area_ratio (0-1) - moisture + stain normalized
   * 4. structural_elements_count (normalized) - wall + foundation + roof + floor
   * 5. safety_hazard_count (normalized) - electrical + fire_damage + pest_damage
   * 6. damage_severity_score (0-1) - weighted combination of damage types
   * 7. property_age_normalized (0-1) - requires external context (passed separately)
   * 8. region_risk_factor (0-1) - requires external context (passed separately)
   * 9. image_quality_score (0-1) - avgNodeConfidence
   * 10. detection_confidence_avg (0-1) - avgNodeConfidence + avgEdgeConfidence
   * 11. scene_complexity (0-1) - connectivityScore + node count normalized
   * 12. uncertainty_estimate (0-1) - inverse of avgNodeConfidence
   * 
   * Note: Features 7-8 (property_age, region_risk) require external context
   * and should be provided separately when calling this method.
   */
  static extractCompactFeatures(
    nodeCounts: Record<NodeType, number>,
    edgeCounts: Record<EdgeRelation, number>,
    spatialFeatures: {
      avgNodeConfidence: number;
      avgEdgeConfidence: number;
      maxNodeDegree: number;
      avgNodeDegree: number;
      connectivityScore: number;
    },
    sceneGraph: SceneGraph,
    propertyAge?: number,
    regionRiskFactor?: number
  ): number[] {
    const totalNodes = sceneGraph.nodes.length;
    const totalEdges = sceneGraph.edges.length;
    const domain = getActiveDomain();

    // 1. has_critical_hazard (binary) - uses domain safety-critical classes
    const criticalCount = domain.safetyCriticalClasses.reduce(
      (sum, cls) => sum + (nodeCounts[cls as NodeType] || 0), 0
    );
    const hasCriticalHazard = criticalCount > 0 ? 1 : 0;

    // 2. crack_density (0-1) - normalized crack count
    const crackDensity = totalNodes > 0 ? Math.min(1, nodeCounts.crack / totalNodes) : 0;

    // 3. water_damage_area_ratio (0-1) - moisture + stain normalized
    const waterDamageCount = (nodeCounts.moisture || 0) + (nodeCounts.stain || 0);
    const waterDamageAreaRatio = totalNodes > 0 ? Math.min(1, waterDamageCount / totalNodes) : 0;

    // 4. structural_elements_count (normalized) - domain-aware structural elements
    const structuralNodeTypes: NodeType[] = domain.id === 'rail'
      ? ['rail', 'tie', 'bridge', 'tunnel']
      : domain.id === 'industrial'
        ? ['beam', 'girder', 'column', 'slab']
        : ['wall', 'foundation', 'roof', 'floor'];
    const structuralElements = structuralNodeTypes.reduce(
      (sum, t) => sum + (nodeCounts[t] || 0), 0
    );
    const structuralElementsCount = totalNodes > 0 ? Math.min(1, structuralElements / totalNodes) : 0;

    // 5. safety_hazard_count (normalized) - uses domain safety classes
    const safetyHazardCount = totalNodes > 0 ? Math.min(1, criticalCount / totalNodes) : 0;

    // 6. damage_severity_score (0-1) - weighted combination
    const criticalWeight = criticalCount * 1.0;
    const highWeight = ((nodeCounts.mold || 0) + (nodeCounts.electrical || 0) + (nodeCounts.corrosion || 0)) * 0.7;
    const mediumWeight = ((nodeCounts.moisture || 0) + (nodeCounts.stain || 0) + (nodeCounts.wear || 0)) * 0.4;
    const lowWeight = ((nodeCounts.insulation || 0) + (nodeCounts.vegetation || 0)) * 0.1;
    const totalWeight = criticalWeight + highWeight + mediumWeight + lowWeight;
    const damageSeverityScore = totalNodes > 0 ? Math.min(1, totalWeight / totalNodes) : 0;

    // 7. property_age_normalized (0-1) - requires external context, default to 0.5
    const propertyAgeNormalized = propertyAge !== undefined
      ? Math.min(1, propertyAge / 200) // Normalize to 200 years max
      : 0.5;

    // 8. region_risk_factor (0-1) - requires external context, default to 0.5
    const regionRiskValue = regionRiskFactor !== undefined ? regionRiskFactor : 0.5;

    // 9. image_quality_score (0-1) - avgNodeConfidence
    const imageQualityScore = spatialFeatures.avgNodeConfidence;

    // 10. detection_confidence_avg (0-1) - avgNodeConfidence + avgEdgeConfidence
    const detectionConfidenceAvg = (spatialFeatures.avgNodeConfidence +
      spatialFeatures.avgEdgeConfidence) / 2;

    // 11. scene_complexity (0-1) - connectivityScore + node count normalized
    const nodeComplexity = Math.min(1, totalNodes / 50); // Normalize to 50 nodes max
    const sceneComplexity = (spatialFeatures.connectivityScore + nodeComplexity) / 2;

    // 12. uncertainty_estimate (0-1) - inverse of avgNodeConfidence
    const uncertaintyEstimate = 1 - spatialFeatures.avgNodeConfidence;

    return [
      hasCriticalHazard,
      crackDensity,
      waterDamageAreaRatio,
      structuralElementsCount,
      safetyHazardCount,
      damageSeverityScore,
      propertyAgeNormalized,
      regionRiskValue,
      imageQualityScore,
      detectionConfidenceAvg,
      sceneComplexity,
      uncertaintyEstimate,
    ];
  }

  /**
   * Count nodes by type
   */
  private static countNodesByType(
    nodes: SceneNode[]
  ): Record<NodeType, number> {
    const counts = this.initializeNodeCounts();

    for (const node of nodes) {
      counts[node.type] = (counts[node.type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Count edges by relation
   */
  private static countEdgesByRelation(
    edges: SceneEdge[]
  ): Record<EdgeRelation, number> {
    const counts = this.initializeEdgeCounts();

    for (const edge of edges) {
      counts[edge.relation] = (counts[edge.relation] || 0) + 1;
    }

    return counts;
  }

  /**
   * Count node-edge patterns (e.g., "wall_has_crack", "foundation_on_surface_crack")
   */
  private static countNodeEdgePatterns(
    nodes: SceneNode[],
    edges: SceneEdge[]
  ): Map<string, number> {
    const patterns = new Map<string, number>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode && targetNode) {
        // Pattern: "sourceType_relation_targetType"
        const pattern = `${sourceNode.type}_${edge.relation}_${targetNode.type}`;
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);

        // Also track reverse pattern for bidirectional relationships
        const reversePattern = `${targetNode.type}_${edge.relation}_${sourceNode.type}`;
        if (edge.relation === 'adjacent_to' || edge.relation === 'near') {
          patterns.set(reversePattern, (patterns.get(reversePattern) || 0) + 0.5);
        }
      }
    }

    return patterns;
  }

  /**
   * Calculate spatial features from graph structure
   */
  private static calculateSpatialFeatures(
    nodes: SceneNode[],
    edges: SceneEdge[]
  ): {
    avgNodeConfidence: number;
    avgEdgeConfidence: number;
    maxNodeDegree: number;
    avgNodeDegree: number;
    connectivityScore: number;
  } {
    // Average node confidence
    const avgNodeConfidence =
      nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length
        : 0;

    // Average edge confidence
    const avgEdgeConfidence =
      edges.length > 0
        ? edges.reduce((sum, e) => sum + e.confidence, 0) / edges.length
        : 0;

    // Node degrees (connectivity)
    const nodeDegrees = new Map<string, number>();
    for (const edge of edges) {
      nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
      nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
    }

    const degrees = Array.from(nodeDegrees.values());
    const maxNodeDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
    const avgNodeDegree =
      degrees.length > 0 ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0;

    // Connectivity score: ratio of edges to possible edges (normalized)
    const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
    const connectivityScore =
      maxPossibleEdges > 0 ? edges.length / maxPossibleEdges : 0;

    return {
      avgNodeConfidence,
      avgEdgeConfidence,
      maxNodeDegree,
      avgNodeDegree,
      connectivityScore,
    };
  }

  /**
   * Flatten features to vector (40-dim, domain-aware)
   *
   * Vector structure:
   * - [0-16]: Node type counts (first 17 domain node types)
   * - [17-28]: Edge relation counts (first 12 domain edge types)
   * - [29-33]: Spatial features (5 features)
   * - [34-39]: Top node-edge patterns (6 most common, pad to 40)
   */
  private static flattenToVector(
    nodeCounts: Record<NodeType, number>,
    edgeCounts: Record<EdgeRelation, number>,
    nodeEdgePatterns: Map<string, number>,
    spatialFeatures: {
      avgNodeConfidence: number;
      avgEdgeConfidence: number;
      maxNodeDegree: number;
      avgNodeDegree: number;
      connectivityScore: number;
    }
  ): number[] {
    const vector: number[] = [];
    const domain = getActiveDomain();

    // 1. Node type counts (first 17 from domain, padded if fewer)
    const domainNodeTypes = domain.nodeTypes.slice(0, 17) as NodeType[];
    for (let i = 0; i < 17; i++) {
      const type = domainNodeTypes[i];
      vector.push(type ? (nodeCounts[type] || 0) : 0);
    }

    // Normalize node counts
    const totalNodes = vector.slice(0, 17).reduce((a, b) => a + b, 0);
    if (totalNodes > 0) {
      for (let i = 0; i < 17; i++) {
        vector[i] = vector[i] / totalNodes;
      }
    }

    // 2. Edge relation counts (first 12 from domain)
    const domainEdgeTypes = domain.edgeTypes.slice(0, 12) as EdgeRelation[];
    for (let i = 0; i < 12; i++) {
      const relation = domainEdgeTypes[i];
      vector.push(relation ? (edgeCounts[relation] || 0) : 0);
    }

    // Normalize edge counts
    const totalEdges = vector.slice(17, 29).reduce((a, b) => a + b, 0);
    if (totalEdges > 0) {
      for (let i = 17; i < 29; i++) {
        vector[i] = vector[i] / totalEdges;
      }
    }

    // 3. Spatial features (5 features)
    vector.push(spatialFeatures.avgNodeConfidence);
    vector.push(spatialFeatures.avgEdgeConfidence);
    vector.push(spatialFeatures.maxNodeDegree / 10);
    vector.push(spatialFeatures.avgNodeDegree / 10);
    vector.push(spatialFeatures.connectivityScore);

    // 4. Top node-edge patterns (pad to 40)
    const sortedPatterns = Array.from(nodeEdgePatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    for (let i = 0; i < 6; i++) {
      vector.push(sortedPatterns[i]?.[1] || 0);
    }

    // Ensure vector length is exactly 40 (pad or truncate)
    const targetLength = 40;
    while (vector.length < targetLength) {
      vector.push(0);
    }
    if (vector.length > targetLength) {
      vector.splice(targetLength);
    }

    return vector;
  }

  /**
   * Initialize empty node counts (all domains)
   */
  private static initializeNodeCounts(): Record<NodeType, number> {
    return {
      // Residential
      wall: 0, foundation: 0, roof: 0, floor: 0, ceiling: 0,
      window: 0, door: 0, crack: 0, stain: 0, moisture: 0,
      mold: 0, electrical: 0, plumbing: 0, insulation: 0,
      structural_beam: 0, pest_damage: 0, fire_damage: 0,
      // Industrial
      beam: 0, girder: 0, column: 0, slab: 0, weld: 0,
      bolt: 0, pipe: 0, duct: 0, cladding: 0, corrosion: 0,
      spalling: 0, deformation: 0, coating: 0, joint: 0, rebar: 0,
      // Rail
      rail: 0, tie: 0, ballast: 0, signal: 0, switch: 0,
      bridge: 0, tunnel: 0, catenary: 0, fastener: 0, sleeper: 0,
      wear: 0, misalignment: 0, fouling: 0, vegetation: 0, drainage: 0,
      // Catch-all
      unknown: 0,
    };
  }

  /**
   * Initialize empty edge counts (all domains)
   */
  private static initializeEdgeCounts(): Record<EdgeRelation, number> {
    return {
      // Shared
      has: 0, on_surface: 0, adjacent_to: 0, contains: 0, near: 0,
      above: 0, below: 0, left_of: 0, right_of: 0, overlaps: 0,
      indicates: 0, caused_by: 0,
      // Industrial & Rail
      supports: 0, connected_to: 0, welded_to: 0, bolted_to: 0,
      runs_along: 0, crosses: 0,
    };
  }
}

