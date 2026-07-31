/**
 * radiusModel — pure geometry + clamping for the service-area radius
 * editor. Kept free of React so the rules can be tested directly.
 *
 * 2026-07-22: extracted while making the Standard/Extended pills
 * actually save. Before this, `RadiusRingsCard` drew both rings at
 * hardcoded pixel radii (38 / 70), so a 2-mile area and a 40-mile area
 * rendered an identical picture and the pills were local state that
 * never reached the API.
 *
 * Two thresholds, both persisted:
 *   - standard  -> `service_areas.radius_km`       (travel included)
 *   - extended  -> `service_areas.max_distance_km` (travel surcharged)
 * The API enforces extended >= standard on the merged row; these
 * helpers keep the UI from ever proposing an invalid pair.
 */
import { KM_PER_MILE, kmToMiles } from '@mintenance/shared';

export type RadiusMode = 'standard' | 'extended';

/** Bounds in miles. The API validates km (1..200); 100 mi = 161 km, and
 *  1 mi = 1.61 km, so both ends stay inside that window after
 *  conversion. Keep them in sync if the API schema changes. */
export const MIN_RADIUS_MILES = 1;
export const MAX_RADIUS_MILES = 100;

/** Outer ring is pinned here so the drawing always fills the card. */
const MAX_RING_PX = 74;
/** Floor so a small standard radius stays visible against the pin. */
const MIN_RING_PX = 14;
/** Gap kept between the rings when the two values are equal. */
const RING_GAP_PX = 6;

export const kmToWholeMiles = (km: number | null | undefined): number =>
  !km ? 0 : Math.round(kmToMiles(km));

/** Miles -> km for the API. Rounded to 2dp: `radius_km` is numeric, and
 *  an unrounded float would make the value round-trip to a different
 *  whole mile on the way back out. */
export const milesToKmForApi = (miles: number): number =>
  Math.round(miles * KM_PER_MILE * 100) / 100;

/**
 * Clamp a proposed value for one threshold against the other, so the
 * pair is always valid before it reaches the API.
 * `standard` may not exceed `extended`; `extended` may not fall below
 * `standard`.
 */
export function clampRadiusMiles(
  mode: RadiusMode,
  proposed: number,
  counterpart: number
): number {
  const floor =
    mode === 'extended'
      ? Math.max(MIN_RADIUS_MILES, counterpart)
      : MIN_RADIUS_MILES;
  const ceiling =
    mode === 'standard'
      ? Math.min(MAX_RADIUS_MILES, counterpart)
      : MAX_RADIUS_MILES;
  // A counterpart outside the bounds could invert floor/ceiling; the
  // outer clamp keeps the result inside the absolute range regardless.
  const bounded = Math.min(Math.max(proposed, floor), Math.max(floor, ceiling));
  return Math.min(Math.max(bounded, MIN_RADIUS_MILES), MAX_RADIUS_MILES);
}

/**
 * Pixel radii for the two rings.
 *
 * Deliberately RATIO-based, not absolute: without map tiles there is no
 * scale bar to read an absolute size against, and pinning the outer ring
 * to the card keeps the drawing legible at 3 miles and at 90. The
 * absolute figures live on the pills. What the picture conveys — and now
 * conveys truthfully — is how much further the extended reach goes.
 */
export function ringRadiiPx(
  standardMiles: number,
  extendedMiles: number
): { standardPx: number; extendedPx: number } {
  if (!extendedMiles || extendedMiles <= 0) {
    return { standardPx: MIN_RING_PX, extendedPx: MAX_RING_PX };
  }
  const ratio = Math.min(standardMiles / extendedMiles, 1);
  const standardPx = Math.min(
    Math.max(MAX_RING_PX * ratio, MIN_RING_PX),
    MAX_RING_PX - RING_GAP_PX
  );
  return { standardPx: Math.round(standardPx), extendedPx: MAX_RING_PX };
}

/**
 * Default extended reach for an area that has never had one saved.
 * `max_distance_km` is nullable and was NULL on every live row before
 * this editor existed, so the screen needs a sensible starting point
 * rather than showing a blank.
 */
export function defaultExtendedMiles(standardMiles: number): number {
  return clampRadiusMiles(
    'extended',
    Math.max(standardMiles + 4, Math.round(standardMiles * 1.6)),
    standardMiles
  );
}
