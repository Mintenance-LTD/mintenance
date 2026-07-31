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

/**
 * Map a job priority string to Mint Editorial token CSS values.
 * Returns an inline-style object (background / text / border tokens).
 */
function getUrgencyColor(priority: string | null): {
  background: string;
  color: string;
  borderColor: string;
} {
  switch (priority?.toLowerCase()) {
    case 'high':
      return {
        background: 'var(--me-err-bg)',
        color: 'var(--me-err-fg)',
        borderColor: 'var(--me-err-fg)',
      };
    case 'medium':
      return {
        background: 'var(--me-warn-bg)',
        color: 'var(--me-warn-fg)',
        borderColor: 'var(--me-warn-fg)',
      };
    case 'low':
      return {
        background: 'var(--me-ok-bg)',
        color: 'var(--me-ok-fg)',
        borderColor: 'var(--me-ok-fg)',
      };
    default:
      return {
        background: 'var(--me-bg-2)',
        color: 'var(--me-ink-2)',
        borderColor: 'var(--me-line)',
      };
  }
}

/** Return a short, human-readable location from a property object. */
export function formatLocation(
  property: { address: string; postcode: string } | null
): string {
  if (!property) return 'Location not specified';
  return property.address.split(',')[0] || property.postcode || 'UK';
}

/** Full name of a homeowner, falling back to "Homeowner". */
function getHomeownerName(
  homeowner: { first_name: string; last_name: string } | null
): string {
  if (!homeowner) return 'Homeowner';
  return `${homeowner.first_name} ${homeowner.last_name}`;
}

/** First letter of the homeowner's first name, for avatar fallback. */
function getHomeownerInitial(homeowner: { first_name: string } | null): string {
  if (!homeowner || !homeowner.first_name) return 'H';
  return homeowner.first_name.charAt(0).toUpperCase();
}
