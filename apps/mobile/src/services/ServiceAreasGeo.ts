import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// =====================================================
// GEO TYPES
// =====================================================

export interface ContractorLocation {
  contractor_id: string;
  area_name: string;
  distance_km: number;
  travel_charge: number;
  priority_level: number;
}

// =====================================================
// GEO-UTILITY FUNCTIONS
// =====================================================

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number> {
  // Use local haversine calculation — no need for a DB round-trip
  return haversineDistance(lat1, lng1, lat2, lng2);
}

export function calculateTravelCharge(
  baseCharge: number,
  perKmRate: number,
  distance: number,
  isWeekend: boolean = false,
  isEvening: boolean = false,
  isEmergency: boolean = false,
  weekendSurcharge: number = 0,
  eveningSurcharge: number = 0,
  emergencySurcharge: number = 0
): number {
  let charge = baseCharge + perKmRate * distance;

  if (isWeekend) {
    charge += charge * (weekendSurcharge / 100);
  }

  if (isEvening) {
    charge += charge * (eveningSurcharge / 100);
  }

  if (isEmergency) {
    charge += charge * (emergencySurcharge / 100);
  }

  return Math.round(charge * 100) / 100; // Round to 2 decimal places
}

// =====================================================
// LOCATION LOOKUP FUNCTIONS
// =====================================================

export async function isLocationInServiceArea(
  areaId: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  try {
    const { data: area, error } = await supabase
      .from('service_areas')
      .select('center_latitude, center_longitude, radius_km')
      .eq('id', areaId)
      .single();
    if (error || !area) return false;
    const distance = await calculateDistance(
      latitude,
      longitude,
      area.center_latitude,
      area.center_longitude
    );
    return distance <= area.radius_km;
  } catch (error) {
    logger.error('Error checking location in service area:', error);
    return false;
  }
}

export async function findContractorsForLocation(
  latitude: number,
  longitude: number,
  maxDistance: number = 50
): Promise<ContractorLocation[]> {
  try {
    const { data, error } = await supabase
      .from('service_areas')
      .select(
        'contractor_id, center_latitude, center_longitude, radius_km, area_name'
      )
      .eq('is_active', true);
    if (error || !data) return [];
    const results: ContractorLocation[] = [];
    for (const area of data) {
      const dist = await calculateDistance(
        latitude,
        longitude,
        (area as Record<string, unknown>).center_latitude as number,
        (area as Record<string, unknown>).center_longitude as number
      );
      if (
        dist <=
        Math.max(
          (area as Record<string, unknown>).radius_km as number,
          maxDistance
        )
      ) {
        results.push({
          contractor_id: (area as Record<string, unknown>)
            .contractor_id as string,
          area_name: (area as Record<string, unknown>).area_name as string,
          distance_km: dist,
          travel_charge: 0,
          priority_level: dist < 10 ? 1 : dist < 25 ? 2 : 3,
        });
      }
    }
    return results;
  } catch (error) {
    logger.error('Error finding contractors for location:', error);
    return [];
  }
}
