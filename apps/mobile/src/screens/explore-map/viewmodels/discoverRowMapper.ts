/**
 * Pure mapping layer between the `/api/jobs/discover` payload and the
 * explore-map's `JobMapItem`.
 *
 * Split out of `ExploreMapViewModel.ts` on 2026-07-20 (adding the match
 * score + AI flag pushed that file past the 500-line pre-commit gate).
 * Being free of hooks and network calls, this is also the part that is
 * actually worth unit-testing.
 */

export interface JobMapItem {
  id: string;
  title: string;
  category: string;
  urgency: string;
  budget: number | null;
  budget_min: number | null;
  budget_max: number | null;
  latitude: number;
  longitude: number;
  distance: number;
  homeowner_name: string;
  created_at: string;
  /**
   * 0–100 discover match badge from /api/jobs/discover (2026-07-20), computed
   * server-side with the same `calculateDiscoverMatchScore` the web feed uses.
   * Null when the API predates the field, so the card can hide the ring
   * rather than render a misleading 0%.
   */
  matchScore: number | null;
  /** True when the job has at least one building_assessment (AI Assessed). */
  hasAiAssessment: boolean;
}

/**
 * Numeric columns may arrive as strings if the server forgets to coerce —
 * accept both so a server regression can't crash the native Marker render.
 */
export interface DiscoverRow {
  id: string;
  title: string;
  category: string;
  urgency: string;
  budget: number | string | null;
  budget_min: number | string | null;
  budget_max: number | string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  created_at: string | null;
  homeowner_first_name: string | null;
  // Optional: added 2026-07-20. Absent on an older deployed API.
  match_score?: number | string | null;
  has_ai_assessment?: boolean | null;
}

export function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Haversine distance in km, rounded to 1dp for display. */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Coerce + validate every row, drop ones without usable coordinates, and
 * sort by proximity to the reference point.
 *
 * The server already excludes jobs the contractor bid on, drops
 * missing-coords rows and applies the category filter — but we still
 * coerce client-side because Postgres NUMERIC columns are JSON-serialised
 * as strings by supabase-js, and passing a string to react-native-maps
 * `<Marker coordinate={{...}}>` crashes the native module on Android.
 */
export function mapDiscoverRows(
  rows: DiscoverRow[],
  refLat: number,
  refLng: number
): JobMapItem[] {
  const mapped: JobMapItem[] = rows
    .map((row) => {
      const lat = toNum(row.latitude);
      const lng = toNum(row.longitude);
      if (lat === null || lng === null) return null;
      return {
        id: row.id,
        title: row.title,
        category: row.category || 'general',
        urgency: row.urgency || 'medium',
        budget: toNum(row.budget),
        budget_min: toNum(row.budget_min),
        budget_max: toNum(row.budget_max),
        latitude: lat,
        longitude: lng,
        distance: calculateDistance(refLat, refLng, lat, lng),
        homeowner_name: row.homeowner_first_name || 'Homeowner',
        created_at: row.created_at ?? '',
        matchScore: toNum(row.match_score),
        hasAiAssessment: row.has_ai_assessment === true,
      };
    })
    .filter((j): j is JobMapItem => j !== null);

  mapped.sort((a, b) => a.distance - b.distance);
  return mapped;
}
