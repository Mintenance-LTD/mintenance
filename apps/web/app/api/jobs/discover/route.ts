/**
 * GET /api/jobs/discover
 *
 * Discoverable-jobs feed used by the contractor explore-map screen.
 * Returns posted, unassigned, geo-located jobs sorted by created_at,
 * already excluding ones the requesting contractor has bid on. Replaces
 * the direct `supabase.from('jobs')` + `supabase.from('bids')` call
 * pair the mobile `ExploreMapViewModel` previously made.
 *
 * Distinct from the existing `GET /api/jobs` (which lists the calling
 * user's own jobs through `JobQueryService`). This endpoint is
 * read-only and intentionally narrow — only the columns the map markers
 * need, with the homeowner's first_name nested for the marker label.
 *
 * Query params:
 *   category   — optional, exact category match (case-insensitive)
 *   limit      — optional, 1..100, defaults to 50
 *   latitude   — optional, current map center lat (-90..90)
 *   longitude  — optional, current map center lng (-180..180)
 *   radiusKm   — optional, max distance from (lat, lng) in km. Default
 *                25. Only applied when both lat AND lng are present.
 *                Audit follow-up (2026-04-29): added so the mobile
 *                explore-map's "Search this area" button actually
 *                filters by the visible map area instead of returning
 *                the newest 50 jobs anywhere.
 *
 * Auth: any authenticated user. Contractors get their own pending /
 * accepted / rejected bid job_ids excluded server-side so the client
 * doesn't have to round-trip a second list.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { JOB_CATEGORIES } from '@mintenance/api-contracts';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

// Constrain `category` to the canonical enum so the downstream
// PostgREST filter is an exact match instead of an `.ilike()` against
// arbitrary user input. Removes the `%`/`_` wildcard surface entirely.
const queryParamsSchema = z
  .object({
    category: z.enum(JOB_CATEGORIES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(500).default(25),
  })
  .strict();

/**
 * Haversine distance between two (lat, lng) points in kilometres.
 * Same formula the mobile `explore-map` viewmodel uses client-side,
 * promoted here so the route can pre-filter the result set instead
 * of shipping all-jobs-anywhere down the wire.
 */
function haversineKm(
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

interface JobRow {
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
  // Supabase types FK joins as an array even on many-to-one
  // relationships, so accept both shapes and normalise below.
  homeowner:
    | { first_name: string | null }
    | Array<{ first_name: string | null }>
    | null;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 }, csrf: false },
  async (request, { user }) => {
    const url = new URL(request.url);
    const parsed = queryParamsSchema.safeParse({
      category: url.searchParams.get('category') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      latitude: url.searchParams.get('latitude') ?? undefined,
      longitude: url.searchParams.get('longitude') ?? undefined,
      radiusKm: url.searchParams.get('radiusKm') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }
    const { category, limit, latitude, longitude, radiusKm } = parsed.data;

    // Pull the contractor's bid job_ids (any status) so we can exclude
    // them. Homeowners have no bids, so the IN list is empty — the
    // .not('id', 'in', ...) call short-circuits below for non-contractors.
    let excludedJobIds: string[] = [];
    if (user.role === 'contractor') {
      const { data: bidRows, error: bidError } = await serverSupabase
        .from('bids')
        .select('job_id')
        .eq('contractor_id', user.id);
      if (bidError) {
        logger.warn('jobs/discover: bid exclusion read failed', {
          service: 'jobs.discover',
          userId: user.id,
          error: bidError.message,
        });
      } else if (bidRows) {
        excludedJobIds = (bidRows as Array<{ job_id: string }>).map(
          (r) => r.job_id
        );
      }
    }

    let query = serverSupabase
      .from('jobs')
      .select(
        `
        id, title, category, urgency, budget, budget_min, budget_max,
        latitude, longitude, created_at,
        homeowner:homeowner_id ( first_name )
      `
      )
      .eq('status', 'posted')
      .is('contractor_id', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (category) {
      query = query.eq('category', category);
    }
    if (excludedJobIds.length > 0) {
      query = query.not(
        'id',
        'in',
        `(${excludedJobIds.map((id) => `"${id}"`).join(',')})`
      );
    }

    // When the caller passes a map center, fetch a wider candidate
    // pool than `limit` so we have rows left after the radius filter
    // trims out the ones outside the visible area. A 5x multiplier
    // keeps the SQL roundtrip bounded while giving the post-filter
    // enough headroom for sparse-job regions.
    const hasGeoFilter =
      typeof latitude === 'number' && typeof longitude === 'number';
    const fetchLimit = hasGeoFilter ? Math.min(limit * 5, 500) : limit;
    query = query.order('created_at', { ascending: false }).limit(fetchLimit);

    const { data, error } = await query;

    if (error) {
      // 2026-05-24 audit-38 P2: previously logged and returned 200
      // with { jobs: [] }. On mobile that rendered identically to
      // "no jobs in this area" — masking RLS drift, malformed
      // exclusion subqueries, query timeouts, etc., behind a benign-
      // looking empty map. Operationally invisible failures meant a
      // crashing/unstable Find Jobs report couldn't tell whether the
      // problem was "no jobs" or "the route is broken". Fail with
      // 500 + an error code so the mobile client can distinguish the
      // two and surface a real retry banner.
      logger.error('jobs/discover query failed', error, {
        service: 'jobs.discover',
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: 'Failed to load nearby jobs',
          code: 'DISCOVER_QUERY_FAILED',
        },
        { status: 500 }
      );
    }

    let rows = (data ?? []) as JobRow[];

    // Postgres NUMERIC columns are serialised by supabase-js as strings
    // to preserve arbitrary precision. The mobile map and the haversine
    // filter below both need real JS numbers, so coerce here. Returning
    // `null` for anything that doesn't parse keeps downstream
    // `typeof === 'number'` checks honest.
    //
    // 2026-05-22 Find-Jobs-crash audit: before this coercion, the route
    // returned lat/lng as strings, which made the haversine filter
    // below reject every row (`typeof "51.9" !== 'number'`) so the
    // contractor map showed zero pins; and any pin that did render
    // passed strings to native `react-native-maps` Markers, which
    // crashed the Find Jobs tab on Android.
    const toNum = (v: unknown): number | null => {
      if (v == null) return null;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // Apply Haversine radius filter when both coords are supplied.
    // Done in JS because the live DB doesn't have PostGIS in
    // public schema yet (the `extension_in_public` advisor blocked
    // moving postgis there). For the typical 50-row candidate pool
    // this is sub-millisecond — switch to a PostGIS `<-> ` operator
    // once the schema move lands.
    if (
      hasGeoFilter &&
      typeof latitude === 'number' &&
      typeof longitude === 'number'
    ) {
      rows = rows.filter((row) => {
        const rowLat = toNum(row.latitude);
        const rowLng = toNum(row.longitude);
        if (rowLat === null || rowLng === null) return false;
        const distance = haversineKm(latitude, longitude, rowLat, rowLng);
        return distance <= radiusKm;
      });
      // Re-apply the caller's `limit` on the post-filter set.
      rows = rows.slice(0, limit);
    }

    const jobs = rows.map((row) => {
      const firstName = Array.isArray(row.homeowner)
        ? (row.homeowner[0]?.first_name ?? null)
        : (row.homeowner?.first_name ?? null);
      return {
        id: row.id,
        title: row.title ?? '',
        category: row.category ?? 'general',
        urgency: row.urgency ?? 'medium',
        budget: toNum(row.budget),
        budget_min: toNum(row.budget_min),
        budget_max: toNum(row.budget_max),
        latitude: toNum(row.latitude),
        longitude: toNum(row.longitude),
        created_at: row.created_at,
        homeowner_first_name: firstName,
      };
    });

    return NextResponse.json({ jobs });
  }
);
