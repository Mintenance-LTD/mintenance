/**
 * AR/VR Visualization Module
 *
 * Provides consolidated access to AR/VR visualization functionality
 */

export { ARVRVisualizationService } from './core/ARVRVisualizationService';
export { ARManager } from './managers/ARManager';
export { VRManager } from './managers/VRManager';
export { SessionManager } from './managers/SessionManager';

export type {
  ARCapabilities,
  VRCapabilities,
  AR3DModel,
  ARJobVisualization,
  ARPlacedModel,
  ARAnnotation,
  ARMeasurement,
  ARPhotoReference,
  ARLightingSetup,
  ARMaterialDefinition,
  ARTimelineStep,
  ARAnimation
} from './types/ARTypes';

export type {
  VRJobWalkthrough,
  VRWaypoint,
  VRHotspot,
  VRNarration,
  VRInteractiveElement
} from './types/VRTypes';

export type {
  ARVRSession,
  ARVRInteraction,
  ARVRPerformanceMetrics
} from './types/SessionTypes';

// Create and export singleton instance
import { ARVRVisualizationService } from './core/ARVRVisualizationService';
export const arvrVisualizationService = new ARVRVisualizationService();
export default arvrVisualizationService;