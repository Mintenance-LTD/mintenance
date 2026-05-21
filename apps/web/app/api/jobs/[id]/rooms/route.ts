/**
 * /api/jobs/[id]/rooms
 *
 * GET — list the rooms a job targets (snapshot of property_rooms
 *       captured at post time).
 *
 * Read-visibility mirrors the parent jobs table: homeowner, assigned
 * contractor, or any authenticated user if the job is in
 * 'posted'/'published' state. RLS on `job_rooms` already enforces this;
 * the route uses a request-scoped client so RLS does the gating.
 *
 * Returns: { rooms: Array<{ id, property_room_id, name, room_type, size_sqm_at_post, created_at }> }
 */

import { NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { isValidUUID } from '@/lib/validation/uuid';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (request, { params }) => {
    if (!isValidUUID(params.id)) {
      throw new NotFoundError('Job not found');
    }

    const userDb = createRequestScopedClient(request) ?? serverSupabase;

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
