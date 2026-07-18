import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Postgres NUMERIC columns arrive as strings via supabase-js; coerce to
// real numbers (or null) so the distance math below stays honest.
function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Get contractors near a job location
 * GET /api/jobs/[id]/nearby-contractors?lat=...&lng=...
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    // Verify user owns the job
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError(
        'Not authorized to view contractors for this job'
      );
    }

    // Fetch contractors who viewed this job
    const { data: views, error: viewsError } = await serverSupabase
      .from('job_views')
      .select(
        `
      contractor:profiles!job_views_contractor_id_fkey (
        id,
        first_name,
        last_name,
        email,
        location,
        latitude,
        longitude,
        profile_image_url
      )
    `
      )
      .eq('job_id', jobId);

    if (viewsError) {
      logger.error('Error fetching contractors', viewsError, {
        service: 'jobs',
        jobId,
        userId: user.id,
      });
      throw viewsError;
    }

    // Extract unique contractors (coords come from profiles directly)
    interface ContractorData {
      id: string;
      location?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      profile_image_url?: string;
      [key: string]: unknown;
    }

    interface ViewRecord {
      contractor?: ContractorData | ContractorData[] | null;
    }

    interface ContractorRecord {
      id: string;
      location?: string;
      first_name?: string;
      last_name?: string;
      // NUMERIC over supabase-js may arrive as string; toNum() coerces.
      latitude?: number | string | null;
      longitude?: number | string | null;
      name?: string;
      distance?: number;
      [key: string]: unknown;
    }

    const contractorMap = new Map<string, ContractorRecord>();
    (views || []).forEach((view: ViewRecord) => {
      const contractor = Array.isArray(view.contractor)
        ? view.contractor[0]
        : view.contractor;
      if (contractor && contractor.id && !contractorMap.has(contractor.id)) {
        contractorMap.set(contractor.id, contractor as ContractorRecord);
      }
    });

    const contractors = Array.from(contractorMap.values());

    // 2026-07-17 PostGIS cutover follow-up: contractor coordinates now
    // come straight from `profiles.latitude/longitude` (kept in sync with
    // the indexed `location_point` geography column by trigger). The old
    // implementation geocoded each viewer's free-text address through an
    // internal HTTP fetch to /api/geocode per contractor — an N+1 HTTP
    // loop that was slower and lossier than the columns we already store.
    const contractorsWithCoords = contractors.map(
      (contractor: ContractorRecord) => {
        const firstName =
          typeof contractor.first_name === 'string'
            ? contractor.first_name
            : '';
        const lastName =
          typeof contractor.last_name === 'string' ? contractor.last_name : '';
        const latitude =
          typeof contractor.latitude === 'number'
            ? contractor.latitude
            : toNum(contractor.latitude);
        const longitude =
          typeof contractor.longitude === 'number'
            ? contractor.longitude
            : toNum(contractor.longitude);
        return {
          ...contractor,
          latitude,
          longitude,
          name: `${firstName} ${lastName}`.trim(),
        };
      }
    );

    // Filter contractors with valid coordinates and calculate distances
    const contractorsWithDistance = contractorsWithCoords
      .filter(
        (c: ContractorRecord) =>
          typeof c.latitude === 'number' && typeof c.longitude === 'number'
      )
      .map((contractor: ContractorRecord) => {
        const distance = calculateDistance(
          lat,
          lng,
          contractor.latitude as number,
          contractor.longitude as number
        );
        return { ...contractor, distance };
      })
      .sort((a: ContractorRecord, b: ContractorRecord) => {
        const distA = typeof a.distance === 'number' ? a.distance : Infinity;
        const distB = typeof b.distance === 'number' ? b.distance : Infinity;
        return distA - distB;
      })
      .slice(0, 20); // Limit to 20 nearest contractors

    return NextResponse.json({ contractors: contractorsWithDistance });
  }
);

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}
