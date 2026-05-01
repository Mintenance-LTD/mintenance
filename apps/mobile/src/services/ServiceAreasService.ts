/**
 * ServiceAreasService — type definitions + geo helper re-exports
 *
 * 2026-04-30 audit P0-1 follow-up: this file used to expose static
 * methods (`createServiceArea`, `updateServiceArea`,
 * `deleteServiceArea`, `getServiceAreas`, `recordCoverage`,
 * `createRoute`, `getRoutes`, `getAreaPerformance`) that all hit
 * Supabase directly. None of them had production UI consumers — the
 * real production CRUD path is `apps/mobile/src/hooks/useServiceAreas.ts`,
 * which goes through `/api/contractor/service-areas`. The dead
 * methods have been removed so a future call site can't accidentally
 * bypass the API surface.
 *
 * The exported `ServiceArea` interface is still imported by the
 * service-areas UI components (`ServiceAreasScreen`, `ServiceAreaCard`,
 * `ServiceAreasList`, etc.) so it's retained as the canonical client
 * shape. Geo utilities re-export through this file too — kept for
 * import-stability with existing tests.
 */
import {
  haversineDistance,
  calculateDistance,
  calculateTravelCharge,
  isLocationInServiceArea,
  findContractorsForLocation,
} from './ServiceAreasGeo';

// Re-export geo utilities so existing imports from this module still work
export {
  haversineDistance,
  calculateDistance,
  calculateTravelCharge,
  isLocationInServiceArea,
  findContractorsForLocation,
};

// =====================================================
// SERVICE AREAS INTERFACES
// =====================================================

export interface ServiceArea {
  id: string;
  contractor_id: string;
  area_name: string;
  description?: string;
  area_type: 'radius' | 'polygon' | 'postal_codes' | 'cities';
  center_latitude?: number;
  center_longitude?: number;
  radius_km?: number;
  boundary_coordinates?: unknown; // GeoJSON
  postal_codes?: string[];
  cities?: string[];
  base_travel_charge: number;
  per_km_rate: number;
  minimum_job_value: number;
  priority_level: number;
  is_primary_area: boolean;
  is_active: boolean;
  max_distance_km?: number;
  response_time_hours: number;
  weekend_surcharge: number;
  evening_surcharge: number;
  emergency_available: boolean;
  emergency_surcharge: number;
  preferred_days: string[];
  preferred_hours: {
    start: string;
    end: string;
  };
  created_at: string;
  updated_at: string;
}

// =====================================================
// SERVICE AREAS HELPER CLASS (validation + formatting only)
// =====================================================

export class ServiceAreasService {
  // Geo utilities delegated to ServiceAreasGeo.ts
  static calculateDistance = calculateDistance;
  static haversineDistance = haversineDistance;
  static isLocationInServiceArea = isLocationInServiceArea;
  static findContractorsForLocation = findContractorsForLocation;
  static calculateTravelCharge = calculateTravelCharge;

  static async validateServiceArea(areaData: Partial<ServiceArea>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!areaData.area_name || areaData.area_name.trim().length === 0) {
      errors.push('Area name is required');
    }

    if (areaData.area_type === 'radius') {
      if (!areaData.center_latitude || !areaData.center_longitude) {
        errors.push('Center coordinates are required for radius areas');
      }
      if (!areaData.radius_km || areaData.radius_km <= 0) {
        errors.push('Radius must be greater than 0');
      }
    }

    if (areaData.area_type === 'postal_codes') {
      if (!areaData.postal_codes || areaData.postal_codes.length === 0) {
        errors.push('At least one postal code is required');
      }
    }

    if (areaData.area_type === 'cities') {
      if (!areaData.cities || areaData.cities.length === 0) {
        errors.push('At least one city is required');
      }
    }

    if (areaData.per_km_rate && areaData.per_km_rate < 0) {
      errors.push('Per-km rate cannot be negative');
    }

    if (
      areaData.priority_level &&
      (areaData.priority_level < 1 || areaData.priority_level > 5)
    ) {
      errors.push('Priority level must be between 1 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static formatServiceArea(data: unknown): ServiceArea {
    if (!data) {
      throw new Error('Service area data cannot be null or undefined');
    }

    return data as ServiceArea;
  }
}
