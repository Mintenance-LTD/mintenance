/**
 * /api/jobs/[id]/rooms
 *
 * GET — list the rooms a job targets (snapshot of property_rooms
 *       captured at post time).
 *
 * Read-visibility mirrors the parent jobs table: homeowner, assigned
 * contractor, or any authenticated user if the job is in
 * 'posted'/'published' state. RLS on `job_rooms` (job_rooms_select_via_job)
 * encodes this, but RLS does not run on web (custom JWT cookie, no Supabase
 * session), so the handler re-checks the same rule in code before reading.
 *
 * Returns: { rooms: Array<{ id, property_room_id, name, room_type, size_sqm_at_post, created_at }> }
 */

import { NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { isValidUUID } from '@/lib/validation/uuid';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (request, { user, params }) => {
    if (!isValidUUID(params.id)) {
      throw new NotFoundError('Job not found');
    }

    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // 2026-08-05 IDOR fix: web authenticates with a custom JWT cookie, so
    // there is no Supabase session and RLS never runs — this read executes
    // through the service-role fallback. Enforce the job_rooms_select_via_job
    // policy in code: the homeowner, the assigned contractor, or any
    // authenticated user while the job is still open ('posted'/'published')
    // may see the room snapshot; admins pass too.
    const { data: job, error: jobError } = await userDb
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status')
      .eq('id', params.id)
      .single();
    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }
    const canView =
      job.homeowner_id === user.id ||
      job.contractor_id === user.id ||
      job.status === 'posted' ||
      job.status === 'published' ||
      user.role === 'admin';
    if (!canView) {
      throw new ForbiddenError('You do not have access to this job');
    }

    const { data, error } = await userDb
      .from('job_rooms')
      .select(
        'id, property_room_id, name, room_type, size_sqm_at_post, created_at'
      )
      .eq('job_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch job rooms', {
        error: error.message,
        jobId: params.id,
      });
      throw new InternalServerError('Failed to fetch job rooms');
    }

    return NextResponse.json({ rooms: data ?? [] });
  }
);
