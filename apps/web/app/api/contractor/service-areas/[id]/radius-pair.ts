/**
 * The two coverage thresholds must stay ordered: `max_distance_km` (the
 * furthest a contractor will travel, billed at `per_km_rate`) cannot be
 * smaller than `radius_km` (the reach included in the price).
 *
 * Validated against the MERGED row rather than the request body, because
 * a PATCH may legitimately send either field on its own — checking the
 * body alone would wave through a request that lowers max_distance_km
 * below an unchanged radius_km.
 *
 * Lives in its own module (not route.ts) because Next.js route files may
 * only export HTTP handlers + route config — the extra export failed the
 * build's route type-check ("Property 'radiusPairError' is incompatible
 * with index signature"). The handler and its test both import from here.
 */
export function radiusPairError(
  patch: { radius_km?: number; max_distance_km?: number },
  existing: { radius_km?: number | null; max_distance_km?: number | null }
): string | null {
  // Only judge a patch that actually moves one of the thresholds. A row
  // that is already inconsistent must not become uneditable — blocking
  // an unrelated rename because of stored data the caller isn't touching
  // would strand the area with no way to fix it from the app.
  if (patch.radius_km == null && patch.max_distance_km == null) return null;

  const nextRadius = patch.radius_km ?? existing.radius_km;
  const nextMax = patch.max_distance_km ?? existing.max_distance_km;
  if (nextRadius == null || nextMax == null) return null;
  if (nextMax < nextRadius) {
    return 'max_distance_km must be greater than or equal to radius_km — the extended reach cannot be smaller than the standard radius';
  }
  return null;
}
