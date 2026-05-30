/**
 * Shared UK-biased forward-geocode helper for server routes.
 *
 * 2026-05-28 audit-91 P1: extracted so the properties POST/PUT
 * handlers can authoritatively resolve lat/lng from an address +
 * postcode the same way `JobCreationService.resolveJobCoordinates`
 * already does for jobs. Without this, mobile `AddPropertyScreen`'s
 * `expo-location.geocodeAsync()` (which has no UK-bias option, only
 * device-locale) could persist coordinates that point at the wrong
 * country — and since audit-90's resolveJobCoordinates reads
 * `properties.latitude/longitude` first, a wrong-coords property
 * propagates the bug to every job posted against it.
 *
 * Resolution rules (`resolveAddressCoordinates`):
 *   1. If the caller supplied lat/lng AND they sit inside the UK
 *      bounding box → trust them (user may have manually dropped a
 *      pin on a map; don't override).
 *   2. Otherwise, build the full address string from the parts the
 *      caller has and forward-geocode with `region=uk` +
 *      `components=country:GB`.
 *   3. Returns `null` when nothing usable can be resolved (e.g. no
 *      address parts and no UK-bounded client coords) so the caller
 *      can decide whether to persist null vs reject the request.
 *
 * The Google Maps key (`GOOGLE_MAPS_API_KEY`) is the same secret used
 * by JobCreationService — when unset the helper logs once and
 * returns null without throwing, so missing-key in dev/CI doesn't
 * break property creation.
 */

import { logger } from '@mintenance/shared';

/**
 * UK bounding box.
 *   - South: Channel Islands (~49.18)
 *   - North: Unst, Shetland (~60.84)
 *   - West: St Kilda (~-8.65)
 *   - East: Felixstowe area (~1.77)
 * Padded a touch to absorb GPS jitter on legitimate edge cases.
 */
const UK_BOUNDS = {
  latMin: 49.0,
  latMax: 61.0,
  lngMin: -9.0,
  lngMax: 2.0,
} as const;

export function isInsideUkBounds(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= UK_BOUNDS.latMin &&
    lat <= UK_BOUNDS.latMax &&
    lng >= UK_BOUNDS.lngMin &&
    lng <= UK_BOUNDS.lngMax
  );
}

interface AddressParts {
  /** Street line — required. */
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  /** Optional client-supplied coordinates (e.g. from expo-location or
   *  a map-picker). Trusted iff they sit inside the UK bounding box. */
  clientLatitude?: number | null;
  clientLongitude?: number | null;
}

export interface ResolvedCoordinates {
  latitude: number;
  longitude: number;
  /** 'client' if we trusted what the caller supplied, 'server' if we
   *  re-geocoded. Useful for logging/observability. */
  source: 'client' | 'server';
}

/**
 * Forward-geocode an address string via Google Maps with explicit UK
 * region + country bias. Returns null on missing key, no results,
 * or fetch failure. Always non-throwing — property creation must not
 * 500 because Google rate-limited us.
 */
export async function forwardGeocodeUk(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    logger.warn(
      'GOOGLE_MAPS_API_KEY not configured — skipping forward geocode',
      { service: 'geocoding' }
    );
    return null;
  }

  const trimmed = address.trim();
  if (!trimmed) return null;

  const encoded = encodeURIComponent(trimmed);
  // `region=uk` is a ccTLD hint; `components=country:GB` is a hard
  // filter that limits results to the United Kingdom. Combined, an
  // ambiguous street like "Gloucester Road" can no longer resolve
  // to South Kensington over Cheltenham.
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&region=uk&components=country:GB&key=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logger.warn('forwardGeocodeUk: non-OK response', {
        service: 'geocoding',
        status: response.status,
      });
      return null;
    }
    const data = (await response.json()) as {
      status?: string;
      results?: Array<{
        geometry?: { location?: { lat: number; lng: number } };
      }>;
    };
    const loc = data.results?.[0]?.geometry?.location;
    if (data.status === 'OK' && loc) {
      return { latitude: loc.lat, longitude: loc.lng };
    }
    logger.warn('forwardGeocodeUk: no results', {
      service: 'geocoding',
      status: data.status,
    });
    return null;
  } catch (err) {
    logger.warn('forwardGeocodeUk: fetch failed', {
      service: 'geocoding',
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Resolve coordinates for a UK property given any combination of
 * address parts + optional client-supplied coordinates.
 *
 * Trusts client coords iff they're inside the UK bounding box.
 * Otherwise re-geocodes the full address string with UK bias.
 */
export async function resolveAddressCoordinates(
  parts: AddressParts
): Promise<ResolvedCoordinates | null> {
  // Trust client coords when they look like UK — preserves manually-
  // dropped map pins. Outside-UK coords get silently re-resolved.
  if (
    typeof parts.clientLatitude === 'number' &&
    typeof parts.clientLongitude === 'number' &&
    isInsideUkBounds(parts.clientLatitude, parts.clientLongitude)
  ) {
    return {
      latitude: parts.clientLatitude,
      longitude: parts.clientLongitude,
      source: 'client',
    };
  }

  const fullAddress = [
    parts.address,
    parts.city,
    parts.postcode,
    parts.country ?? 'UK',
  ]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(', ');

  if (!fullAddress) return null;

  const coords = await forwardGeocodeUk(fullAddress);
  if (!coords) return null;
  return { ...coords, source: 'server' };
}
