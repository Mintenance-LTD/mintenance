/**
 * Shared formatting utilities
 */
/**
 * Format date to user-friendly string
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}
/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Check if it's a US phone number (10 digits)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  // Check if it's a US phone number with country code (11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const withoutCountryCode = cleaned.slice(1);
    return `+1 (${withoutCountryCode.slice(0, 3)}) ${withoutCountryCode.slice(3, 6)}-${withoutCountryCode.slice(6)}`;
  }
  // Return original if not a recognized format
  return phone;
}

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------
//
// The platform stores and queries distance in KILOMETRES (PostGIS,
// `radius_km`, `max_distance_km`, the discover API's `radiusKm` param) but
// presents it in MILES, because the audience is UK trades.
//
// Added 2026-07-20 to end a three-way inconsistency: Service Areas showed
// miles, contractor Discover showed km, and live travel tracking showed
// miles — the same radius wearing two units depending on the screen. Convert
// at the UI edge only; never persist or query in miles.

/** Exact conversion factor. */
export const KM_PER_MILE = 1.609344;

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

/**
 * Format a KILOMETRE value as miles for display.
 *
 * Under a tenth of a mile "0.0 mi" reads as broken, so anything closer is
 * reported as "<0.1 mi". Values of 10 miles or more drop the decimal — a
 * contractor scanning a list does not need "12.4 mi" precision.
 */
export function formatMilesFromKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '';
  const miles = kmToMiles(km);
  if (miles < 0.1) return '<0.1 mi';
  if (miles >= 10) return `${Math.round(miles)} mi`;
  return `${miles.toFixed(1)} mi`;
}
