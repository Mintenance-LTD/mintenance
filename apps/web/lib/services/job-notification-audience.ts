/**
 * Broadcast-audience selection for job_nearby notifications.
 *
 * 2026-07-17 PostGIS cutover (Phase 2): the audience now comes from the
 * `find_contractors_for_job` RPC (migration 20260717120000), which
 * respects each contractor's OWN active `service_areas` coverage —
 * their `COALESCE(max_distance_km, radius_km)` radius or a city match —
 * and only falls back to the global DEFAULT_MATCH_RADIUS_KM circle for
 * contractors with no evaluable coverage. `is_active = false` rows and
 * `is_available = false` contractors are excluded in SQL.
 *
 * The legacy full-table Haversine scan below survives ONLY as graceful
 * degradation for environments where the migration hasn't applied yet
 * (it ships at deploy time). Marketplace invariant: this picks who gets
 * NOTIFIED — homeowners still choose the winner from bids.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { DEFAULT_MATCH_RADIUS_KM } from '@/lib/services/matching/constants';

export interface AudienceContractor {
  id: string;
  distanceKm: number | null;
  matchedVia: 'service_area' | 'profile_radius' | 'legacy_scan';
}

interface RpcAudienceRow {
  contractor_id: string;
  distance_km: number | string | null;
  matched_via: string;
}

interface LegacyProfileRow {
  id: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve the contractors to notify for a job at `coordinates`.
 * `city` (jobs.city) enables `area_type='cities'` coverage matches; it
 * is optional and only widens the audience for contractors who chose
 * city-based coverage.
 */
export async function fetchNearbyContractors(
  coordinates: { lat: number; lng: number },
  city?: string | null
): Promise<AudienceContractor[]> {
  const { data, error } = await serverSupabase.rpc('find_contractors_for_job', {
    p_latitude: coordinates.lat,
    p_longitude: coordinates.lng,
    p_default_radius_km: DEFAULT_MATCH_RADIUS_KM,
    p_city: city ?? null,
  });

  if (!error && data) {
    return (data as RpcAudienceRow[]).map((row) => ({
      id: row.contractor_id,
      distanceKm: toNum(row.distance_km),
      matchedVia:
        row.matched_via === 'service_area' ? 'service_area' : 'profile_radius',
    }));
  }

  logger.warn(
    'find_contractors_for_job RPC unavailable, using legacy Haversine scan',
    {
      service: 'jobs',
      error: error?.message,
    }
  );
  return legacyHaversineScan(coordinates);
}

/**
 * Pre-cutover behavior, verbatim: scan every available contractor with
 * coordinates and keep the ones within DEFAULT_MATCH_RADIUS_KM. No
 * service-area awareness — fallback only.
 */
async function legacyHaversineScan(coordinates: {
  lat: number;
  lng: number;
}): Promise<AudienceContractor[]> {
  const { data, error } = await serverSupabase
    .from('profiles')
    .select('id, first_name, last_name, latitude, longitude, is_available')
    .eq('role', 'contractor')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .eq('is_available', true);

  if (error || !data) {
    return [];
  }

  const results: AudienceContractor[] = [];
  for (const contractor of data as LegacyProfileRow[]) {
    const lat = toNum(contractor.latitude);
    const lng = toNum(contractor.longitude);
    if (lat === null || lng === null) continue;
    const distanceKm = haversineKm(coordinates.lat, coordinates.lng, lat, lng);
    if (distanceKm <= DEFAULT_MATCH_RADIUS_KM) {
      results.push({
        id: contractor.id,
        distanceKm,
        matchedVia: 'legacy_scan',
      });
    }
  }
  return results;
}

function haversineKm(
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
  return R * c;
}
