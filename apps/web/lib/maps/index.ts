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
  type ContractorMarkerData,
  type ServiceAreaData,
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
  type OverlapResult,
} from './overlap-detection';

