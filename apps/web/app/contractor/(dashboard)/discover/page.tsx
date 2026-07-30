import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorDiscoverClient } from './components/ContractorDiscoverClient';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
import { logger } from '@mintenance/shared';
import { calculateDiscoverMatchScore } from '@/lib/services/matching/discover-match';

// Largest radius chip the client offers (DiscoverFilters: 5/10/20/50).
// The server resolves the candidate set at this radius; the chips only
// narrow it down client-side.
const MAX_DISCOVER_CHIP_RADIUS_KM = 50;

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

interface Job {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget: number;
  priority: string | null;
  photos: string[] | null;
  created_at: string;
  bidCount?: number;
  homeowner: {
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
    rating: number | null;
  } | null;
  property: {
    address: string;
    postcode: string;
  } | null;
  matchScore: number;
  /** Km from the contractor's stored location (PostGIS, 2026-07-17);
   * null on the legacy newest-50 fallback path. */
  serverDistanceKm?: number | null;
}

export const metadata = {
  title: 'Discover Jobs | Mintenance',
  description: 'Browse and save available jobs that match your skills',
};

// Match badge lives in @/lib/services/matching/discover-match
// (extracted 2026-07-17 so there is exactly one contractor-side
// scoring implementation, unit-tested).

export default async function ContractorDiscoverPage2025() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch contractor's skills, location and active coverage in parallel
  const [
    contractorSkillsResponse,
    contractorProfileResponse,
    coverageResponse,
  ] = await Promise.all([
    serverSupabase
      .from('contractor_skills')
      .select('skill_name')
      .eq('contractor_id', user.id),
    serverSupabase
      .from('profiles')
      .select('city, address, postcode, latitude, longitude')
      .eq('id', user.id)
      .single(),
    serverSupabase
      .from('service_areas')
      .select(
        'id, center_latitude, center_longitude, radius_km, max_distance_km, is_primary_area'
      )
      .eq('contractor_id', user.id)
      .eq('is_active', true),
  ]);

  const contractorSkills =
    contractorSkillsResponse.data?.map((s) => s.skill_name) || [];
  const contractorCity = contractorProfileResponse.data?.city || null;
  const contractorLocation = contractorProfileResponse.data || null;

  // Coverage overlay (2026-07-17): active service areas, primary first,
  // radius mirroring the notify-audience gating (max_distance_km over
  // radius_km). Rows without usable center/radius are skipped.
  const coverageAreas = (coverageResponse.data ?? [])
    .map((row) => {
      const lat = toNum(row.center_latitude);
      const lng = toNum(row.center_longitude);
      const radiusKm = toNum(row.max_distance_km) ?? toNum(row.radius_km);
      if (lat === null || lng === null || radiusKm === null || radiusKm <= 0) {
        return null;
      }
      return {
        id: String(row.id),
        lat,
        lng,
        radiusKm,
        isPrimary: row.is_primary_area === true,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  // 2026-07-17 discover geo fix: previously this page fetched the 50
  // NEWEST posted jobs anywhere in the country and the browser
  // filtered by radius — so a nearby-but-older job silently fell out
  // of "within 10km" whenever 50 fresher jobs existed elsewhere.
  // Resolve the candidate set via the GIST-indexed find_jobs_near_point
  // RPC at the largest chip radius when the contractor has stored
  // coordinates; the legacy newest-50 query survives as graceful
  // degradation (no coords, or RPC not yet deployed).
  const contractorLat = toNum(contractorLocation?.latitude);
  const contractorLng = toNum(contractorLocation?.longitude);
  let geoJobIds: string[] | null = null;
  const geoDistanceById = new Map<string, number | null>();
  if (contractorLat !== null && contractorLng !== null) {
    const { data: geoRows, error: geoError } = await serverSupabase.rpc(
      'find_jobs_near_point',
      {
        p_latitude: contractorLat,
        p_longitude: contractorLng,
        p_radius_km: MAX_DISCOVER_CHIP_RADIUS_KM,
        p_limit: 200,
      }
    );
    if (!geoError && geoRows) {
      const rows = geoRows as Array<{
        job_id: string;
        distance_km: number | string | null;
      }>;
      geoJobIds = rows.map((r) => r.job_id);
      for (const r of rows) {
        geoDistanceById.set(r.job_id, toNum(r.distance_km));
      }
    } else {
      logger.warn(
        '[DISCOVER] find_jobs_near_point unavailable — newest-50 fallback',
        { service: 'app', error: geoError?.message }
      );
    }
  }

  // Fetch available jobs that contractor hasn't already bid on, including AI assessments
  let jobsQuery = serverSupabase
    .from('jobs')
    .select(
      `
      id,
      title,
      description,
      budget,
      status,
      created_at,
      homeowner_id,
      contractor_id,
      location,
      category,
      priority,
      photos,
      latitude,
      longitude,
      job_attachments(file_url, file_type),
      bids(count),
      building_assessments!building_assessments_job_id_fkey(
        id,
        severity,
        damage_type,
        confidence,
        urgency,
        assessment_data,
        created_at
      )
    `
    )
    .in('status', ['posted'])
    .is('contractor_id', null);

  if (geoJobIds !== null && geoJobIds.length > 0) {
    jobsQuery = jobsQuery.in('id', geoJobIds);
  }

  const { data: jobs, error } =
    geoJobIds !== null && geoJobIds.length === 0
      ? { data: [], error: null }
      : await jobsQuery.order('created_at', { ascending: false }).limit(50);

  if (error) {
    logger.error('[DISCOVER] Query Error', error, { service: 'app' });
  }

  // Fetch homeowner data separately for better error handling
  const jobsWithDetails = await Promise.all(
    (jobs || []).map(async (job) => {
      const homeownerResponse = await serverSupabase
        .from('profiles')
        .select('first_name, last_name, profile_image_url, rating')
        .eq('id', job.homeowner_id)
        .single();

      // Resolve photo URLs: prefer jobs.photos (legacy), fall back to
      // job_attachments. Re-sign every URL through resignJobStorageUrls
      // so stale `public` URLs become fresh signed URLs post the
      // 2026-04-17 Job-storage bucket flip. External CDN URLs (legacy
      // seed data) pass through unchanged.
      const attachmentPhotos =
        (
          job.job_attachments as
            | { file_url: string; file_type: string }[]
            | null
        )
          ?.filter((a) => a.file_type === 'image')
          .map((a) => a.file_url) ?? [];
      const rawPhotos =
        job.photos && job.photos.length > 0
          ? job.photos
          : attachmentPhotos.length > 0
            ? attachmentPhotos
            : null;
      const resolvedPhotos = rawPhotos
        ? await resignJobStorageUrls(rawPhotos)
        : null;

      // Extract bid count from embedded aggregate
      const bidCount =
        (job.bids as { count: number }[] | null)?.[0]?.count ?? 0;

      return {
        ...job,
        category: job.category || null,
        priority: job.priority || null,
        photos: resolvedPhotos,
        bidCount,
        homeowner: homeownerResponse.data
          ? {
              ...homeownerResponse.data,
              rating: homeownerResponse.data.rating || null,
            }
          : null,
        property: job.location
          ? {
              address: job.location,
              postcode:
                job.location.match(
                  /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/gi
                )?.[0] || '',
            }
          : null,
        serverDistanceKm: geoDistanceById.get(job.id) ?? null,
      };
    })
  );

  // Filter out jobs that contractor has already bid on (with 48h cooldown after rejection)
  // BID FILTERING LOGIC:
  // - Hide jobs with active bids (pending, accepted)
  // - Hide recently rejected bids (< 48 hours ago)
  // - Show rejected bids after 48 hours cooldown
  const { data: existingBids } = await serverSupabase
    .from('bids')
    .select('job_id, status, updated_at, created_at')
    .eq('contractor_id', user.id);

  // Server component (no 'use client') — `Date.now()` is fine here
  // because this whole function runs on the server per request, not in
  // a render commit. The React Compiler linter still flags it under
  // `react-hooks/purity`; suppressing the line is correct because the
  // rule's invariant doesn't apply to async server pages.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const REJECTION_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

  const bidJobIds = new Set(
    existingBids
      ?.filter((bid) => {
        // Always hide jobs with active bids
        if (bid.status === 'pending' || bid.status === 'accepted') {
          return true;
        }

        // For rejected bids, only hide if within 48h cooldown period
        if (bid.status === 'rejected') {
          const rejectionTime = new Date(
            bid.updated_at || bid.created_at
          ).getTime();
          const timeSinceRejection = now - rejectionTime;
          return timeSinceRejection < REJECTION_COOLDOWN_MS; // Hide if within 48h
        }

        // Don't filter out other statuses (withdrawn, expired, etc.)
        return false;
      })
      .map((b) => b.job_id) || []
  );

  // Calculate match scores and filter
  const availableJobs: Job[] = jobsWithDetails
    .filter((job) => !bidJobIds.has(job.id))
    .map((job) => ({
      ...job,
      matchScore: calculateDiscoverMatchScore(
        job,
        contractorSkills,
        contractorCity,
        now
      ),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <ContractorDiscoverClient
      jobs={availableJobs}
      contractorId={user.id}
      contractorLocation={contractorLocation}
      coverageAreas={coverageAreas}
    />
  );
}
