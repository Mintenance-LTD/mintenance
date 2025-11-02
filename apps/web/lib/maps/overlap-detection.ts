/**
 * Overlap Detection Utilities
 * 
 * Calculate overlapping service areas and provide warnings
 * Used in Service Areas management to help contractors optimize coverage
 */

import { calculateDistance } from './map-utils';

export interface ServiceArea {
  id: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  city?: string;
  state?: string;
  is_active?: boolean;
}

export interface OverlapResult {
  area1: ServiceArea;
  area2: ServiceArea;
  overlapPercentage: number;
  distance: number;
}

/**
 * Check if two service areas overlap
 * @param area1 First service area
 * @param area2 Second service area
 * @returns True if areas overlap
 */
export function areasOverlap(area1: ServiceArea, area2: ServiceArea): boolean {
  const distance = calculateDistance(
    area1.latitude,
    area1.longitude,
    area2.latitude,
    area2.longitude
  );

  return distance < area1.radius_km + area2.radius_km;
}

/**
 * Calculate overlap percentage between two service areas
 * Uses lens-shaped intersection area formula
 * @param area1 First service area
 * @param area2 Second service area
 * @returns Overlap percentage (0-100)
 */
export function calculateOverlapPercentage(
  area1: ServiceArea,
  area2: ServiceArea
): number {
  if (!areasOverlap(area1, area2)) return 0;

  const distance = calculateDistance(
    area1.latitude,
    area1.longitude,
    area2.latitude,
    area2.longitude
  );

  const r1 = area1.radius_km;
  const r2 = area2.radius_km;

  // If one circle is completely inside the other
  if (distance + Math.min(r1, r2) <= Math.max(r1, r2)) {
    const smallerArea = Math.PI * Math.min(r1, r2) ** 2;
    const totalArea = Math.PI * r1 ** 2 + Math.PI * r2 ** 2;
    return (smallerArea / totalArea) * 100;
  }

  // Calculate lens-shaped intersection area
  try {
    const part1 = r1 * r1 * Math.acos((distance * distance + r1 * r1 - r2 * r2) / (2 * distance * r1));
    const part2 = r2 * r2 * Math.acos((distance * distance + r2 * r2 - r1 * r1) / (2 * distance * r2));
    const part3 = 0.5 * Math.sqrt(
      (-distance + r1 + r2) *
      (distance + r1 - r2) *
      (distance - r1 + r2) *
      (distance + r1 + r2)
    );

    const overlapArea = part1 + part2 - part3;
    const totalArea = Math.PI * r1 * r1 + Math.PI * r2 * r2 - overlapArea;

    return Math.max(0, Math.min(100, (overlapArea / totalArea) * 100));
  } catch (error) {
    console.error('Error calculating overlap percentage:', error);
    return 0;
  }
}

/**
 * Find all overlapping areas in a list
 * @param areas Array of service areas
 * @returns Array of overlap results
 */
export function findOverlappingAreas(
  areas: ServiceArea[]
): OverlapResult[] {
  const overlaps: OverlapResult[] = [];

  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      if (areasOverlap(areas[i], areas[j])) {
        const distance = calculateDistance(
          areas[i].latitude,
          areas[i].longitude,
          areas[j].latitude,
          areas[j].longitude
        );

        overlaps.push({
          area1: areas[i],
          area2: areas[j],
          overlapPercentage: calculateOverlapPercentage(areas[i], areas[j]),
          distance,
        });
      }
    }
  }

  return overlaps;
}

/**
 * Calculate total unique coverage area (accounting for overlaps)
 * This is an approximation using grid sampling
 * @param areas Array of service areas
 * @param gridSize Grid resolution (higher = more accurate but slower)
 * @returns Approximate coverage area in km²
 */
export function calculateTotalCoverageArea(
  areas: ServiceArea[],
  gridSize: number = 100
): number {
  if (areas.length === 0) return 0;
  if (areas.length === 1) return Math.PI * areas[0].radius_km ** 2;

  // Find bounds
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  areas.forEach((area) => {
    const latOffset = (area.radius_km / 111); // ~111 km per degree latitude
    const lngOffset = (area.radius_km / (111 * Math.cos(area.latitude * Math.PI / 180)));

    minLat = Math.min(minLat, area.latitude - latOffset);
    maxLat = Math.max(maxLat, area.latitude + latOffset);
    minLng = Math.min(minLng, area.longitude - lngOffset);
    maxLng = Math.max(maxLng, area.longitude + lngOffset);
  });

  // Sample grid
  const latStep = (maxLat - minLat) / gridSize;
  const lngStep = (maxLng - minLng) / gridSize;
  let coveredPoints = 0;

  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    for (let lng = minLng; lng <= maxLng; lng += lngStep) {
      // Check if point is in any area
      const isInAnyArea = areas.some((area) => {
        const distance = calculateDistance(lat, lng, area.latitude, area.longitude);
        return distance <= area.radius_km;
      });

      if (isInAnyArea) {
        coveredPoints++;
      }
    }
  }

  // Calculate area of each grid cell
  const cellArea = (latStep * 111) * (lngStep * 111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
  return coveredPoints * cellArea;
}

/**
 * Get overlap severity level
 * @param overlapPercentage Overlap percentage
 * @returns Severity: 'none', 'low', 'medium', 'high'
 */
export function getOverlapSeverity(
  overlapPercentage: number
): 'none' | 'low' | 'medium' | 'high' {
  if (overlapPercentage === 0) return 'none';
  if (overlapPercentage < 10) return 'low';
  if (overlapPercentage < 30) return 'medium';
  return 'high';
}

/**
 * Generate overlap warning message
 * @param overlap Overlap result
 * @returns Human-readable warning message
 */
export function getOverlapWarningMessage(overlap: OverlapResult): string {
  const area1Name = overlap.area1.city || 'Area';
  const area2Name = overlap.area2.city || 'Area';
  const percentage = overlap.overlapPercentage.toFixed(1);
  const distance = overlap.distance.toFixed(1);

  const severity = getOverlapSeverity(overlap.overlapPercentage);

  switch (severity) {
    case 'high':
      return `⚠️ High overlap (${percentage}%) between ${area1Name} and ${area2Name} (${distance} km apart). Consider consolidating or adjusting radii.`;
    case 'medium':
      return `⚡ Medium overlap (${percentage}%) between ${area1Name} and ${area2Name} (${distance} km apart). Review for efficiency.`;
    case 'low':
      return `ℹ️ Minor overlap (${percentage}%) between ${area1Name} and ${area2Name} (${distance} km apart).`;
    default:
      return '';
  }
}

/**
 * Suggest optimal radius to minimize overlaps
 * @param area Target area
 * @param otherAreas Other service areas
 * @returns Suggested radius in km
 */
export function suggestOptimalRadius(
  area: ServiceArea,
  otherAreas: ServiceArea[]
): number {
  if (otherAreas.length === 0) return area.radius_km;

  // Find closest area
  let minDistance = Infinity;
  otherAreas.forEach((other) => {
    if (other.id === area.id) return;
    const distance = calculateDistance(
      area.latitude,
      area.longitude,
      other.latitude,
      other.longitude
    );
    minDistance = Math.min(minDistance, distance);
  });

  // Suggest radius that covers up to halfway to nearest area
  const suggestedRadius = Math.floor(minDistance / 2);

  // Keep within reasonable bounds (min 5km, max 75km)
  return Math.max(5, Math.min(75, suggestedRadius));
}

/**
 * Check if adding a new area would create problematic overlaps
 * @param newArea New area to add
 * @param existingAreas Existing service areas
 * @param thresholdPercentage Maximum acceptable overlap percentage
 * @returns Object with validation result and warnings
 */
export function validateNewArea(
  newArea: ServiceArea,
  existingAreas: ServiceArea[],
  thresholdPercentage: number = 30
): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  existingAreas.forEach((existing) => {
    if (areasOverlap(newArea, existing)) {
      const overlapPercent = calculateOverlapPercentage(newArea, existing);
      const distance = calculateDistance(
        newArea.latitude,
        newArea.longitude,
        existing.latitude,
        existing.longitude
      );

      if (overlapPercent > thresholdPercentage) {
        warnings.push(
          `High overlap (${overlapPercent.toFixed(1)}%) with ${existing.city || 'existing area'} (${distance.toFixed(1)} km away)`
        );
      } else if (overlapPercent > 10) {
        warnings.push(
          `Moderate overlap (${overlapPercent.toFixed(1)}%) with ${existing.city || 'existing area'}`
        );
      }

      if (overlapPercent > thresholdPercentage) {
        const suggestedRadius = Math.floor(distance / 2);
        suggestions.push(
          `Consider reducing radius to ${suggestedRadius} km to minimize overlap`
        );
      }
    }
  });

  return {
    isValid: warnings.length === 0 || warnings.every((w) => !w.includes('High overlap')),
    warnings,
    suggestions,
  };
}

