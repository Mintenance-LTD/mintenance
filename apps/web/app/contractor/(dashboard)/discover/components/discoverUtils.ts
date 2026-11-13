/**
 * Utility functions for the Contractor Discover feature.
 *
 * calculateDistance is re-exported from the shared location utility so that
 * every consumer in this feature uses the same implementation.
 */

export { calculateDistance } from '@/lib/utils/location';
import { calculateDistance as haversineDistance } from '@/lib/utils/location';

/**
 * Resolve a job's map coordinates + distance (2026-07-17): prefer the
 * PostGIS-computed serverDistanceKm (km from the contractor's stored
 * location) and only fall back to the client-side Haversine for legacy
 * responses without it.
 */
export function resolveJobCoordsAndDistance(
  job: {
    latitude?: number;
    longitude?: number;
    serverDistanceKm?: number | null;
  },
  contractorLocation?: {
    latitude?: number | null;
    longitude?: number | null;
  } | null
): { lat?: number; lng?: number; distance?: number } {
  const lat = job.latitude ?? undefined;
  const lng = job.longitude ?? undefined;
  const distance =
    typeof job.serverDistanceKm === 'number'
      ? job.serverDistanceKm
      : contractorLocation?.latitude &&
          contractorLocation?.longitude &&
          lat &&
          lng
        ? haversineDistance(
            contractorLocation.latitude,
            contractorLocation.longitude,
            lat,
            lng
          )
        : undefined;
  return { lat, lng, distance };
}

/** Return a short, human-readable location from a property object. */
export function formatLocation(
  property: { address: string; postcode: string } | null
): string {
  if (!property) return 'Location not specified';
  return property.address.split(',')[0] || property.postcode || 'UK';
}
