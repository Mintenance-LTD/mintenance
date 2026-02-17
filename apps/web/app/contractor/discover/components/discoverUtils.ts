/**
 * Utility functions for the Contractor Discover feature.
 *
 * calculateDistance is re-exported from the shared location utility so that
 * every consumer in this feature uses the same implementation.
 */

export { calculateDistance } from '@/lib/utils/location';

/** Map a job priority string to Tailwind colour classes. */
export function getUrgencyColor(priority: string | null): string {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-rose-100 text-rose-700 border-rose-600';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-600';
    case 'low':
      return 'bg-emerald-100 text-emerald-700 border-emerald-600';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-600';
  }
}

/** Return a short, human-readable location from a property object. */
export function formatLocation(
  property: { address: string; postcode: string } | null,
): string {
  if (!property) return 'Location not specified';
  return property.address.split(',')[0] || property.postcode || 'UK';
}

/** Full name of a homeowner, falling back to "Homeowner". */
export function getHomeownerName(
  homeowner: { first_name: string; last_name: string } | null,
): string {
  if (!homeowner) return 'Homeowner';
  return `${homeowner.first_name} ${homeowner.last_name}`;
}

/** First letter of the homeowner's first name, for avatar fallback. */
export function getHomeownerInitial(
  homeowner: { first_name: string } | null,
): string {
  if (!homeowner || !homeowner.first_name) return 'H';
  return homeowner.first_name.charAt(0).toUpperCase();
}
