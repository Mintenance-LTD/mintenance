/**
 * Scene Graph Types
 *
 * Type definitions for the scene graph: nodes, edges, node types, edge relations.
 */

/**
 * Scene graph node attributes
 */
export interface SceneNodeAttributes {
  source?: 'roboflow' | 'sam3' | 'gpt4_vision';
  imageUrl?: string;
  numInstances?: number;
  damageType?: string;
  [key: string]: unknown; // Allow additional attributes
}

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
  attributes?: SceneNodeAttributes;
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
 * Node types (entities) in building assessment.
 * Includes residential, industrial, and rail domain types.
 * The active DomainConfig.nodeTypes controls which are valid at runtime.
 */
export type NodeType =
  // Residential
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
  // Industrial
  | 'beam'
  | 'girder'
  | 'column'
  | 'slab'
  | 'weld'
  | 'bolt'
  | 'pipe'
  | 'duct'
  | 'cladding'
  | 'corrosion'
  | 'spalling'
  | 'deformation'
  | 'coating'
  | 'joint'
  | 'rebar'
  // Rail
  | 'rail'
  | 'tie'
  | 'ballast'
  | 'signal'
  | 'switch'
  | 'bridge'
  | 'tunnel'
  | 'catenary'
  | 'fastener'
  | 'sleeper'
  | 'wear'
  | 'misalignment'
  | 'fouling'
  | 'vegetation'
  | 'drainage'
  // Catch-all
  | 'unknown';

/**
 * Edge relations (relationships) between entities.
 * Includes shared + industrial + rail domain relations.
 */
export type EdgeRelation =
  // Shared
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
  | 'caused_by'
  // Industrial & Rail
  | 'supports'
  | 'connected_to'
  | 'welded_to'
  | 'bolted_to'
  | 'runs_along'
  | 'crosses';

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
 * Axis-aligned bounding box used in spatial calculations
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
