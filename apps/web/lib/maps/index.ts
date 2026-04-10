/**
 * Map Utilities Index
 *
 * Centralized exports for all map-related utilities
 */

// Map utilities
export {
  calculateBounds,
  createContractorMarker,
  createContractorInfoWindow,
  createServiceAreaCircle,
  createServiceAreaMarker,
  fitMapToBounds,
  calculateDistance,
  isPointInServiceArea,
  createRecenterControl,
  getOptimalZoom,
  clearMarkers,
  clearCircles,
} from './map-utils';

// Overlap detection
export {
  areasOverlap,
  calculateOverlapPercentage,
  findOverlappingAreas,
  calculateTotalCoverageArea,
  getOverlapSeverity,
  getOverlapWarningMessage,
  suggestOptimalRadius,
  validateNewArea,
  type ServiceArea,
} from './overlap-detection';
