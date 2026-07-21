/**
 * Helpers for GET /api/jobs/discover — geo filtering + row mapping.
 *
 * 2026-07-17 PostGIS cutover: `fetchGeoJobIds` asks the indexed
 * `find_jobs_near_point` RPC (migration 20260717120000) for the ids of
 * open jobs inside the map radius. The JS Haversine below survives ONLY
 * as the graceful-degradation path for environments where the migration
 * hasn't applied yet (the RPC/geography column ship at deploy time) —
 * mirror of the resolveCoordinates fallback pattern.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface JobRow {
  id: string;
  title: string | null;
  category: string | null;
  urgency: string | null;
  budget: number | string | null;
  budget_min: number | null;
  budget_max: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  /** Free-text address; feeds the discover match score's city check. */
  location: string | null;
  // Supabase types FK joins as an array even on many-to-one
  // relationships, so accept both shapes and normalise in the route.
  homeowner:
    | { first_name: string | null }
    | Array<{ first_name: string | null }>
    | null;
  /** Existence only — drives the "AI Assessed" badge on the client. */
  building_assessments: { id: string }[] | null;
}

/**
 * Haversine distance between two (lat, lng) points in kilometres.
 * Fallback-only — see module docblock.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Postgres NUMERIC columns are serialised by supabase-js as strings to
 * preserve arbitrary precision; the mobile map and the Haversine filter
 * both need real JS numbers. Returning `null` for anything that doesn't
 * parse keeps downstream `typeof === 'number'` checks honest.
 */
export function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

interface GeoJobIdRow {
  job_id: string;
  distance_km: number | string | null;
}

export interface GeoJobMatch {
  jobId: string;
  /** Kilometres from the supplied search center (map/search origin). */
  distanceKm: number | null;
}

/**
 * Indexed radius filter via PostGIS. Returns the matching open jobs
 * (newest first, capped at 500 like the legacy 5× candidate pool) with
 * their distance from the search center, or `null` when the RPC isn't
 * available yet so the caller falls back to the JS Haversine path.
 */
export async function fetchGeoJobs(
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<GeoJobMatch[] | null> {
  const { data, error } = await serverSupabase.rpc('find_jobs_near_point', {
    p_latitude: latitude,
    p_longitude: longitude,
    p_radius_km: radiusKm,
    p_limit: 500,
  });

  if (error) {
    logger.warn(
      'jobs/discover: find_jobs_near_point RPC unavailable, using JS fallback',
      { service: 'jobs.discover', error: error.message }
    );
    return null;
  }

  return ((data ?? []) as GeoJobIdRow[]).map((row) => ({
    jobId: row.job_id,
    distanceKm: toNum(row.distance_km),
  }));
}
