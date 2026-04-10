/**
 * Map Utilities Index
 *
 * Centralized exports for all map-related utilities
 */

// Map utilities
export {
  calculateBounds,
  createServiceAreaCircle,
  createServiceAreaMarker,
  fitMapToBounds,
  clearMarkers,
  clearCircles,
} from './map-utils';

// Overlap detection
export {
  findOverlappingAreas,
  getOverlapWarningMessage,
  type ServiceArea,
} from './overlap-detection';
