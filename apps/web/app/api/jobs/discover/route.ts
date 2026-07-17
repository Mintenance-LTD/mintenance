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
 *                DEFAULT_MATCH_RADIUS_KM (25). Only applied when both
 *                lat AND lng are present. Audit follow-up (2026-04-29):
 *                added so the mobile explore-map's "Search this area"
 *                button actually filters by the visible map area
 *                instead of returning the newest 50 jobs anywhere.
 *
 * 2026-07-17 PostGIS cutover: the radius filter now runs in SQL via the
 * GIST-indexed `find_jobs_near_point` RPC; the JS Haversine path in
 * helpers.ts remains only as graceful degradation until the migration
 * applies at deploy time.
 *
 * Auth: contractors + admin only. 2026-05-26 audit-58 P1: previously
 * any authenticated user could call this — homeowners and tenants
 * received open job titles, coordinates, budgets, categories, and
 * the posting homeowner's first name. The mobile UI only exposes
 * Find Jobs to contractors, so locking the API down matches the
 * intended access surface. Admin is allowed for support/diagnostic
 * use. Contractors get their own pending / accepted / rejected bid
 * job_ids excluded server-side so the client doesn't have to
 * round-trip a second list.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { JOB_CATEGORIES } from '@mintenance/api-contracts';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import { DEFAULT_MATCH_RADIUS_KM } from '@/lib/services/matching/constants';
import { fetchGeoJobs, haversineKm, toNum, type JobRow } from './helpers';

// Constrain `category` to the canonical enum so the downstream
// PostgREST filter is an exact match instead of an `.ilike()` against
// arbitrary user input. Removes the `%`/`_` wildcard surface entirely.
const queryParamsSchema = z
  .object({
    category: z.enum(JOB_CATEGORIES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce
      .number()
      .positive()
      .max(500)
      .default(DEFAULT_MATCH_RADIUS_KM),
  })
  .strict();

export const GET = withApiHandler(
  {
    roles: ['contractor', 'admin'],
    rateLimit: { maxRequests: 60 },
    csrf: false,
  },
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

    // 2026-05-26 audit-63 P1: pending contractors must not see open
    // jobs in Find Jobs. Mobile onboarding tells them "Finish
    // verification to start bidding" — surfacing the discoverable
    // feed first lets a not-yet-approved contractor build a bid plan
    // they then can't submit. Verified contractors and admin always
    // pass. Treat admin_verified=true as verified too (legacy
    // boolean used by some admin tools alongside the modern
    // verification_status='verified' enum). For admin (platform-
    // support) callers the check is skipped entirely.
    if (user.role === 'contractor') {
      const { data: vRow } = await serverSupabase
        .from('profiles')
        .select('verification_status, admin_verified')
        .eq('id', user.id)
        .single();
      const verified =
        vRow?.verification_status === 'verified' ||
        vRow?.admin_verified === true;
      if (!verified) {
        return NextResponse.json({
          jobs: [],
          code: 'CONTRACTOR_NOT_VERIFIED',
        });
      }
    }

    // 2026-05-27 audit-79 P1: exclude pending/accepted/rejected bids
    // only — NOT withdrawn. The bid-processor's submit-bid path
    // revives withdrawn bids back to pending (see bid-processor.ts
    // line ~196), and JobDetailsCTA explicitly supports the
    // withdrawn → "Submit a New Bid" affordance (line ~87). The
    // previous "any status" exclusion meant a contractor who
    // withdrew a bid never saw the job in Find Jobs again, even
    // though the detail screen + API both supported resubmission.
    // Rejected stays excluded — the homeowner already turned this
    // contractor down, surfacing the job again is noise.
    let excludedJobIds: string[] = [];
    if (user.role === 'contractor') {
      const { data: bidRows, error: bidError } = await serverSupabase
        .from('bids')
        .select('job_id')
        .eq('contractor_id', user.id)
        .in('status', ['pending', 'accepted', 'rejected']);
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

    const hasGeoFilter =
      typeof latitude === 'number' && typeof longitude === 'number';

    // PostGIS-first: resolve the in-radius set via the GIST index.
    // `null` means the RPC isn't deployed yet → JS Haversine fallback.
    // distanceById carries km-from-search-center into the response.
    let geoJobIds: string[] | null = null;
    const distanceById = new Map<string, number | null>();
    if (hasGeoFilter) {
      const geoJobs = await fetchGeoJobs(latitude, longitude, radiusKm);
      if (geoJobs !== null) {
        if (geoJobs.length === 0) {
          return NextResponse.json({ jobs: [] });
        }
        geoJobIds = geoJobs.map((g) => g.jobId);
        for (const g of geoJobs) distanceById.set(g.jobId, g.distanceKm);
      }
    }
    const usePostgis = geoJobIds !== null;

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
    if (usePostgis && geoJobIds) {
      query = query.in('id', geoJobIds);
    }

    // Fallback path only: fetch a wider candidate pool than `limit` so
    // rows remain after the JS radius filter trims the ones outside the
    // visible area. With PostGIS the id set is already radius-exact.
    const fetchLimit =
      hasGeoFilter && !usePostgis ? Math.min(limit * 5, 500) : limit;
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

    // JS Haversine radius filter — fallback path only (see helpers.ts).
    // Stash the computed distance so the response carries it in this
    // path too.
    if (hasGeoFilter && !usePostgis) {
      rows = rows.filter((row) => {
        const rowLat = toNum(row.latitude);
        const rowLng = toNum(row.longitude);
        if (rowLat === null || rowLng === null) return false;
        const distance = haversineKm(latitude, longitude, rowLat, rowLng);
        if (distance <= radiusKm) {
          distanceById.set(row.id, distance);
          return true;
        }
        return false;
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
        // 2026-07-17: km from the SEARCH CENTER (map origin), null when
        // no geo filter was applied. Additive — clients that show
        // distance-from-me (mobile pans away from the user) should keep
        // their own reference-point math.
        distance_km: distanceById.get(row.id) ?? null,
      };
    });

    return NextResponse.json({ jobs });
  }
);
