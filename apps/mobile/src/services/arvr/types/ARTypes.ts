/**
 * Augmented Reality Types
 *
 * Type definitions for AR functionality
 */

export interface ARCapabilities {
  worldTracking: boolean;
  planeDetection: boolean;
  faceTracking: boolean;
  imageTracking: boolean;
  objectDetection: boolean;
  lightEstimation: boolean;
  occlusionSupport: boolean;
  persistentAnchors: boolean;
}

export interface AR3DModel {
  id: string;
  name: string;
  category: 'furniture' | 'appliance' | 'fixture' | 'structure' | 'material';
  fileUrl: string;
  thumbnailUrl: string;
  dimensions: { width: number; height: number; depth: number };
  scale: { x: number; y: number; z: number };
  materials: string[];
  price?: number;
  metadata: Record<string, any>;
}

export interface ARJobVisualization {
  id: string;
  jobId: string;
  title: string;
  description: string;
  placedModels: ARPlacedModel[];
  annotations: ARAnnotation[];
  measurements: ARMeasurement[];
  photoReferences: ARPhotoReference[];
  lighting: ARLightingSetup;
  timeline: ARTimelineStep[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
}

export interface ARPlacedModel {
  id: string;
  modelId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
  anchorId?: string;
  isLocked: boolean;
  visibility: boolean;
  metadata: Record<string, any>;
}

export interface ARAnnotation {
  id: string;
  position: { x: number; y: number; z: number };
  text: string;
  category: 'note' | 'warning' | 'measurement' | 'instruction';
  color: string;
  size: number;
  visibility: boolean;
  timestamp: number;
  author: string;
}

export interface ARMeasurement {
  id: string;
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  distance: number;
  unit: 'cm' | 'm' | 'in' | 'ft';
  label: string;
  accuracy: number;
  timestamp: number;
}

export interface ARPhotoReference {
  id: string;
  position: { x: number; y: number; z: number };
  photoUrl: string;
  thumbnailUrl: string;
  description: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface ARLightingSetup {
  ambientLight: {
    color: { r: number; g: number; b: number };
    intensity: number;
  };
  directionalLights: Array<{
    direction: { x: number; y: number; z: number };
    color: { r: number; g: number; b: number };
    intensity: number;
    castShadows: boolean;
  }>;
  pointLights: Array<{
    position: { x: number; y: number; z: number };
    color: { r: number; g: number; b: number };
    intensity: number;
    range: number;
    castShadows: boolean;
  }>;
  environmentMap?: string;
  shadowSettings: {
    enabled: boolean;
    quality: 'low' | 'medium' | 'high';
    cascades: number;
    distance: number;
  };
}

export interface ARMaterialDefinition {
  id: string;
  name: string;
  type: 'pbr' | 'standard' | 'unlit';
  baseColor: { r: number; g: number; b: number; a: number };
  metallicFactor: number;
  roughnessFactor: number;
  normalScale: number;
  occlusionStrength: number;
  emissiveFactor: { r: number; g: number; b: number };
  textures: {
    baseColor?: string;
    metallic?: string;
    roughness?: string;
    normal?: string;
    occlusion?: string;
    emissive?: string;
  };
  properties: Record<string, any>;
}

export interface ARTimelineStep {
  id: string;
  order: number;
  title: string;
  description: string;
  duration: number;
  startTime: number;
  animations: ARAnimation[];
  visibility: Record<string, boolean>;
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
}

export interface ARAnimation {
  id: string;
  targetId: string;
  type: 'position' | 'rotation' | 'scale' | 'material' | 'visibility';
  fromValue: any;
  toValue: any;
  duration: number;
  delay: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  loop: boolean;
}