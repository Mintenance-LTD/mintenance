import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';

/**
 * Get contractors near a job location
 * GET /api/jobs/[id]/nearby-contractors?lat=...&lng=...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the job
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.homeowner_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch contractors who viewed this job
    const { data: views, error: viewsError } = await serverSupabase
      .from('job_views')
      .select(`
        contractor:users!job_views_contractor_id_fkey (
          id,
          first_name,
          last_name,
          email,
          location,
          profile_image_url
        )
      `)
      .eq('job_id', jobId);

    if (viewsError) {
      logger.error('Error fetching contractors', viewsError, {
        service: 'jobs',
        jobId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to fetch contractors' },
        { status: 500 }
      );
    }

    // Extract unique contractors and geocode their locations
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
      latitude?: number | null;
      longitude?: number | null;
      name?: string;
      distance?: number;
      [key: string]: unknown;
    }

    const contractorMap = new Map<string, ContractorRecord>();
    (views || []).forEach((view: ViewRecord) => {
      const contractor = Array.isArray(view.contractor) ? view.contractor[0] : view.contractor;
      if (contractor && contractor.id && !contractorMap.has(contractor.id)) {
        contractorMap.set(contractor.id, contractor as ContractorRecord);
      }
    });

    const contractors = Array.from(contractorMap.values());

    // Geocode contractor locations
    const contractorsWithCoords = await Promise.all(
      contractors.map(async (contractor: ContractorRecord) => {
        const location = typeof contractor.location === 'string' ? contractor.location : undefined;
        if (!location) {
          return { ...contractor, latitude: null, longitude: null };
        }

        try {
          const geocodeResponse = await fetch(
            `${request.nextUrl.origin}/api/geocode?address=${encodeURIComponent(location)}`
          );
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json() as { latitude?: number; longitude?: number };
            const firstName = typeof contractor.first_name === 'string' ? contractor.first_name : '';
            const lastName = typeof contractor.last_name === 'string' ? contractor.last_name : '';
            return {
              ...contractor,
              latitude: geocodeData.latitude ?? null,
              longitude: geocodeData.longitude ?? null,
              name: `${firstName} ${lastName}`.trim(),
            };
          }
        } catch (err) {
          logger.error('Error geocoding contractor location', err, {
            service: 'jobs',
            jobId,
            contractorId: contractor.id,
            location,
          });
        }

        const firstName = typeof contractor.first_name === 'string' ? contractor.first_name : '';
        const lastName = typeof contractor.last_name === 'string' ? contractor.last_name : '';
        return { ...contractor, latitude: null, longitude: null, name: `${firstName} ${lastName}`.trim() };
      })
    );

    // Filter contractors with valid coordinates and calculate distances
    const contractorsWithDistance = contractorsWithCoords
      .filter((c: ContractorRecord) => typeof c.latitude === 'number' && typeof c.longitude === 'number')
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

    return NextResponse.json({
      contractors: contractorsWithDistance,
    });
  } catch (error) {
    logger.error('Error in nearby-contractors route', error, {
      service: 'jobs',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

