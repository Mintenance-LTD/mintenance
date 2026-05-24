import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import {
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

// 2026-05-23 audit: added eta_minutes + context so the web ping
// shape matches mobile JobContextLocationService. The homeowner
// travel tracker (ContractorTravelTracking.tsx) reads both fields
// to render the "on the way" / "arrived" pill + the live ETA.
// Without them every web-side ping landed without the context the
// UI expected, so homeowners watching a web-only contractor saw a
// dot but never the travel status.
const LOCATION_CONTEXT_VALUES = [
  'idle',
  'traveling',
  'arrived',
  'on_site',
] as const;

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  altitude: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().nonnegative().optional(),
  job_id: z.string().uuid().optional(),
  /** Minutes-until-arrival hint surfaced to the homeowner. Caller
   * can omit when not in transit. */
  eta_minutes: z.number().int().nonnegative().max(10080).optional(),
  /** Travel state for the homeowner-facing pill. */
  context: z.enum(LOCATION_CONTEXT_VALUES).optional(),
});

/**
 * POST /api/contractors/[id]/location
 * Update contractor location. Restricted to the contractor themselves —
 * admins should not write GPS coordinates on behalf of contractors.
 *
 * 2026-05-09: removed the dead admin escape on line 32 of the prior
 * version. Line 32 admitted admins past the ownership check, but the
 * follow-up `user.role !== 'contractor'` check immediately rejected
 * them, so the admin path was unreachable. Tightened to contractor
 * self-only, matching actual behaviour.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id: contractorId } = params;

    if (user.id !== contractorId) {
      throw new ForbiddenError('Not authorized to update this location');
    }

    const body = await request.json();
    const parsed = updateLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      heading,
      speed,
      job_id,
      eta_minutes,
      context,
    } = parsed.data;

    // Verify the contractor is assigned to this job before accepting a
    // job-scoped location ping. The first ping creates the sharing row, so
    // checking contractor_locations here would block the initial write.
    if (job_id) {
      const { data: assignedJob } = await serverSupabase
        .from('jobs')
        .select('id')
        .eq('id', job_id)
        .eq('contractor_id', contractorId)
        .in('status', ['assigned', 'in_progress'])
        .maybeSingle();

      if (!assignedJob) {
        throw new ForbiddenError(
          'Not authorized to share location for this job'
        );
      }
    }

    const locationPayload = {
      contractor_id: contractorId,
      job_id: job_id || null,
      latitude,
      longitude,
      accuracy: accuracy || null,
      altitude: altitude || null,
      heading: heading || null,
      speed: speed || null,
      // 2026-05-23 audit: persist the mobile-parity fields so the
      // homeowner travel-tracking UI lights up regardless of whether
      // the contractor is sharing from web or mobile.
      eta_minutes: typeof eta_minutes === 'number' ? eta_minutes : null,
      context: context ?? (job_id ? 'traveling' : 'idle'),
      is_active: true,
      is_sharing_location: true,
      location_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 2026-05-24 audit-36 P0: replaced upsert with select-then-
    // update-or-insert. Live DB has only a PARTIAL unique index on
    // (contractor_id, job_id) WHERE is_active = true, not a plain
    // unique constraint. PostgREST's ON CONFLICT (cols) doesn't
    // include the WHERE predicate, so the upsert could fail (42P10)
    // or insert duplicate rows. Now: for job-scoped writes, look up
    // the active row first and UPDATE by id; INSERT only when no
    // active row exists. Non-job availability pings still INSERT a
    // fresh row (no uniqueness expected — the index intentionally
    // excludes NULL job_id).
    let activeId: string | null = null;
    if (job_id) {
      const { data: existing } = await serverSupabase
        .from('contractor_locations')
        .select('id')
        .eq('contractor_id', contractorId)
        .eq('job_id', job_id)
        .eq('is_active', true)
        .maybeSingle();
      activeId = existing?.id ?? null;
    }

    const locationWrite = activeId
      ? serverSupabase
          .from('contractor_locations')
          .update(locationPayload)
          .eq('id', activeId)
      : serverSupabase.from('contractor_locations').insert(locationPayload);

    const { data: location, error: locationError } = await locationWrite
      .select()
      .single();

    if (locationError) {
      logger.error('Error updating location', locationError, {
        service: 'contractor_locations',
        contractorId,
        job_id,
      });
      throw new InternalServerError('Failed to update location');
    }

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.location_timestamp,
      },
    });
  }
);

/**
 * GET /api/contractors/[id]/location
 * Get contractor's latest location (contractor self, homeowner with job, or admin)
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id: contractorId } = params;
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');

    // Verify user has permission to view this location.
    // 2026-05-09: added admin branch — the route doc string already
    // promised admin oversight read access, but the prior code never
    // matched it, so admins always 403'd.
    let hasPermission = false;

    if (user.id === contractorId) {
      hasPermission = true;
    } else if (user.role === 'admin') {
      hasPermission = true;
    } else if (user.role === 'homeowner' && jobId) {
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('id, homeowner_id, contractor_id')
        .eq('id', jobId)
        .eq('homeowner_id', user.id)
        .eq('contractor_id', contractorId)
        .single();

      hasPermission = !!job;
    }

    if (!hasPermission) {
      throw new ForbiddenError('Not authorized to view this location');
    }

    // Get latest location
    let query = serverSupabase
      .from('contractor_locations')
      .select(
        'id, latitude, longitude, accuracy, location_timestamp, is_sharing_location'
      )
      .eq('contractor_id', contractorId)
      .eq('is_active', true)
      .eq('is_sharing_location', true)
      .order('location_timestamp', { ascending: false })
      .limit(1);

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data: locations, error } = await query;

    if (error) {
      logger.error('Error fetching location', error, {
        service: 'contractor_locations',
        contractorId,
        jobId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch location');
    }

    if (!locations || locations.length === 0) {
      throw new NotFoundError('Location not found or sharing not enabled');
    }

    return NextResponse.json({
      location: locations[0],
    });
  }
);
