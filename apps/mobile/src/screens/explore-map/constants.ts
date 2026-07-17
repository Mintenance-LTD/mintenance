/**
 * Default discover radius — mirrors DEFAULT_MATCH_RADIUS_KM on the web
 * side (apps/web/lib/services/matching/constants.ts). The server treats
 * this as its fallback too; keep the two in sync.
 */
export const DEFAULT_MATCH_RADIUS_KM = 25;

/** /api/jobs/discover rejects radiusKm above this (zod max). */
export const MAX_DISCOVER_RADIUS_KM = 500;

const KM_PER_DEGREE_LAT = 111.32;

/**
 * Radius that actually covers the visible map region (2026-07-17):
 * previously "Search this area" always sent the fixed 25km default, so
 * a zoomed-out search silently missed jobs that were visibly on
 * screen. Returns the half-extent of the larger visible axis, floored
 * at DEFAULT_MATCH_RADIUS_KM (zooming IN never shrinks the feed below
 * the platform default) and capped at the server's schema max.
 */
export function radiusKmForRegion(region: {
  latitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}): number {
  const latDelta = region.latitudeDelta;
  const lngDelta = region.longitudeDelta;
  if (
    typeof latDelta !== 'number' ||
    typeof lngDelta !== 'number' ||
    !Number.isFinite(latDelta) ||
    !Number.isFinite(lngDelta)
  ) {
    return DEFAULT_MATCH_RADIUS_KM;
  }
  const halfHeightKm = (Math.abs(latDelta) * KM_PER_DEGREE_LAT) / 2;
  const halfWidthKm =
    (Math.abs(lngDelta) *
      KM_PER_DEGREE_LAT *
      Math.cos((region.latitude * Math.PI) / 180)) /
    2;
  const visible = Math.ceil(Math.max(halfHeightKm, halfWidthKm));
  return Math.min(
    Math.max(visible, DEFAULT_MATCH_RADIUS_KM),
    MAX_DISCOVER_RADIUS_KM
  );
}
