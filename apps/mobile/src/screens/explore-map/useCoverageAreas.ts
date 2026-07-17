import { useEffect, useState } from 'react';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';

/**
 * Quiet coverage fetch for the Find Jobs map (2026-07-17): the
 * contractor's ACTIVE service areas, so the map can draw their
 * configured coverage and fall back its viewport to the primary area.
 * Unlike useServiceAreas (the CRUD hook), this never alerts — a
 * failure just renders no overlay.
 */
export interface CoverageArea {
  id: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  isPrimary: boolean;
}

interface ServiceAreaRow {
  id?: string;
  center_latitude?: number | string | null;
  center_longitude?: number | string | null;
  radius_km?: number | string | null;
  max_distance_km?: number | string | null;
  is_active?: boolean;
  is_primary_area?: boolean;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function mapCoverageAreas(rows: ServiceAreaRow[]): CoverageArea[] {
  const areas: CoverageArea[] = [];
  for (const row of rows) {
    if (row.is_active === false || !row.id) continue;
    const lat = toNum(row.center_latitude);
    const lng = toNum(row.center_longitude);
    // Coverage radius mirrors the matching RPC's precedence:
    // max_distance_km wins over radius_km when both are set.
    const radius = toNum(row.max_distance_km) ?? toNum(row.radius_km);
    if (lat === null || lng === null || radius === null || radius <= 0) {
      continue;
    }
    areas.push({
      id: row.id,
      centerLatitude: lat,
      centerLongitude: lng,
      radiusKm: radius,
      isPrimary: row.is_primary_area === true,
    });
  }
  // Primary first so viewport fallback can just take areas[0].
  areas.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return areas;
}

export function useCoverageAreas(enabled: boolean): CoverageArea[] {
  const [areas, setAreas] = useState<CoverageArea[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await mobileApiClient.get<{
          success: boolean;
          data: ServiceAreaRow[];
        }>('/api/contractor/service-areas');
        if (!cancelled && Array.isArray(res?.data)) {
          setAreas(mapCoverageAreas(res.data));
        }
      } catch (err) {
        // Overlay is decorative — log and render nothing.
        logger.info('Coverage overlay fetch failed (non-fatal)', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return areas;
}
