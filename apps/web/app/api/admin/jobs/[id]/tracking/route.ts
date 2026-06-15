import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/admin/jobs/[id]/tracking
 *
 * Admin oversight read of a contractor's live position for a job, plus the
 * job destination, so an admin can watch "contractor on the way" the same
 * way the homeowner does. Uses the service role — the `contractor_locations`
 * SELECT RLS policy only admits the contractor and that job's homeowner, so
 * an admin reading the table client-side gets nothing. The location-write
 * route already exposes admin reads (2026-05-09); this is the job-scoped,
 * map-ready shape for the admin jobs table.
 *
 * Returns `tracking: null` (not 404) when the contractor isn't sharing yet,
 * so the modal can show a "not sharing" state and keep polling.
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 60 } },
  async (_request, { params }) => {
    const { id: jobId } = params;

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(
        `id, status, latitude, longitude, contractor_id,
         contractor:profiles!jobs_contractor_id_fkey ( id, first_name, last_name )`
      )
      .eq('id', jobId)
      .maybeSingle();

    if (jobError) {
      logger.error('admin tracking: job read failed', {
        service: 'admin-tracking',
        jobId,
        error: jobError.message,
      });
      throw new InternalServerError('Failed to load job');
    }
    if (!job) throw new NotFoundError('Job not found');

    const toNum = (v: unknown): number | null => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const destLat = toNum(job.latitude);
    const destLng = toNum(job.longitude);

    let tracking: {
      latitude: number;
      longitude: number;
      heading: number | null;
      speed: number | null;
      eta_minutes: number | null;
      context: string | null;
      is_sharing_location: boolean | null;
      is_active: boolean | null;
      location_timestamp: string | null;
    } | null = null;

    if (job.contractor_id) {
      const { data: loc, error: locError } = await serverSupabase
        .from('contractor_locations')
        .select(
          'latitude, longitude, heading, speed, eta_minutes, context, is_sharing_location, is_active, location_timestamp, updated_at'
        )
        .eq('job_id', jobId)
        .eq('contractor_id', job.contractor_id)
        .eq('is_active', true)
        .order('location_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (locError) {
        // Non-fatal — the modal still renders the destination + a
        // "couldn't load position" state and retries on the next poll.
        logger.warn('admin tracking: location read failed', {
          service: 'admin-tracking',
          jobId,
          error: locError.message,
        });
      } else if (loc) {
        const lat = toNum(loc.latitude);
        const lng = toNum(loc.longitude);
        if (lat != null && lng != null) {
          tracking = {
            latitude: lat,
            longitude: lng,
            heading: toNum(loc.heading),
            speed: toNum(loc.speed),
            eta_minutes:
              typeof loc.eta_minutes === 'number' ? loc.eta_minutes : null,
            context: loc.context ?? null,
            is_sharing_location: loc.is_sharing_location ?? null,
            is_active: loc.is_active ?? null,
            location_timestamp:
              loc.location_timestamp ?? loc.updated_at ?? null,
          };
        }
      }
    }

    const profile = (
      Array.isArray(job.contractor) ? job.contractor[0] : job.contractor
    ) as
      | { id: string; first_name: string | null; last_name: string | null }
      | null
      | undefined;
    const contractor = profile
      ? {
          id: profile.id,
          name:
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
            'Contractor',
        }
      : null;

    return NextResponse.json({
      job: { id: job.id, status: job.status },
      destination:
        destLat != null && destLng != null
          ? { lat: destLat, lng: destLng }
          : null,
      contractor,
      tracking,
    });
  }
);
