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
 *
 * This file is a facade that re-exports types and delegates to the
 * implementation modules in ./scene_graph/.
 */

import { logger } from '@mintenance/shared';
import type { RoboflowDetection, VisionAnalysisSummary } from './types';
import type { DamageTypeSegmentation } from './SAM3Service';
import {
  createNodesFromDetections,
  createNodesFromSAM3,
  createNodesFromVisionAnalysis,
  mergeNodes,
} from './scene_graph/nodes';
import {
  createNLPEdges,
  createSpatialEdges,
  mergeEdges,
  validateGraph,
} from './scene_graph/edges';
import type { SceneGraph } from './scene_graph/types';

// Re-export public types for backward compatibility
export type {
  SceneNodeAttributes,
  SceneNode,
  SceneEdge,
  NodeType,
  EdgeRelation,
  SceneGraph,
} from './scene_graph/types';

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
        ? createNodesFromSAM3(sam3Segmentation)
        : createNodesFromDetections(roboflowDetections);

      // 2. Create nodes from vision analysis (NLP extraction)
      const visionNodes = createNodesFromVisionAnalysis(visionAnalysis);

      // 3. Merge and deduplicate nodes (SAM 3 nodes take priority)
      const mergedNodes = mergeNodes([...detectionNodes, ...visionNodes]);

      // 4. Create edges from spatial overlap
      const spatialEdges = createSpatialEdges(mergedNodes);

      // 5. Create edges from NLP relationships
      const nlpEdges = createNLPEdges(mergedNodes, visionAnalysis);

      // 6. Merge and deduplicate edges
      const mergedEdges = mergeEdges([...spatialEdges, ...nlpEdges]);

      // 7. Validate graph structure
      const validated = validateGraph(mergedNodes, mergedEdges);

      const graph: SceneGraph = {
        nodes: validated.nodes,
        edges: validated.edges,
        metadata: {
          imageCount: 1,
          detectionCount: validated.nodes.length,
          createdAt: new Date().toISOString(),
        },
      };

      logger.debug('Scene graph built successfully', {
        service: 'SceneGraphBuilder',
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        imageCount,
      });

      return graph;
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
}
