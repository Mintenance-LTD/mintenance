/**
 * AR/VR Visualization Service
 *
 * DEPRECATED: This file has been refactored into modular components.
 * Use the new AR/VR module: src/services/arvr/
 *
 * @deprecated Use ARVRVisualizationService from src/services/arvr/ instead
 */

// Re-export from the new modular structure
export {
  arvrVisualizationService,
  ARVRVisualizationService,
  ARManager,
  VRManager,
  SessionManager,
  type ARCapabilities,
  type VRCapabilities,
  type AR3DModel,
  type ARJobVisualization,
  type ARPlacedModel,
  type ARAnnotation,
  type ARMeasurement,
  type ARPhotoReference,
  type ARLightingSetup,
  type ARMaterialDefinition,
  type ARTimelineStep,
  type ARAnimation,
  type VRJobWalkthrough,
  type VRWaypoint,
  type VRHotspot,
  type VRNarration,
  type VRInteractiveElement,
  type ARVRSession,
  type ARVRInteraction,
  type ARVRPerformanceMetrics
} from './arvr';

// Legacy export for backward compatibility
export default arvrVisualizationService;