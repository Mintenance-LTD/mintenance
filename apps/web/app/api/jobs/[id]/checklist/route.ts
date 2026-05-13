import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * /api/jobs/[id]/checklist
 *
 * Pre-arrival checklist items for an assigned job. Both homeowner
 * (CRUD) and contractor (read + tick) reach the same endpoint with
 * different permissions:
 *
 *   GET    — homeowner OR assigned contractor reads the full list
 *   POST   — homeowner-only: add a new item
 *
 * Per-item operations (toggle / edit / delete) live on
 * /api/jobs/[id]/checklist/[itemId]/route.ts.
 *
 * Backed by `job_checklist_items` (migration 20260520000004).
 */

const createSchema = z.object({
  label: z
    .string()
    .min(1, 'Label is required')
    .max(200, 'Label must be 200 characters or fewer'),
  position: z.number().int().min(0).optional(),
});

async function assertJobAccess(
  request: NextRequest,
  jobId: string,
  userId: string
): Promise<'homeowner' | 'contractor'> {
  const db = createRequestScopedClient(request) ?? serverSupabase;
  const { data: job, error } = await db
    .from('jobs')
    .select('id, homeowner_id, contractor_id')
    .eq('id', jobId)
    .single();
  if (error || !job) {
    throw new NotFoundError('Job not found');
  }
  if (job.homeowner_id === userId) return 'homeowner';
  if (job.contractor_id === userId) return 'contractor';
  throw new ForbiddenError('Not a participant on this job');
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (request, { user, params }) => {
    await assertJobAccess(request, params.id, user.id);

    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const { data, error } = await userDb
      .from('job_checklist_items')
      .select(
        'id, label, position, completed_at, completed_by, created_at, created_by'
      )
      .eq('job_id', params.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching job checklist', error, {
        service: 'job-checklist',
        jobId: params.id,
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ items: data || [] });
  }
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const role = await assertJobAccess(request, params.id, user.id);
    if (role !== 'homeowner') {
      throw new ForbiddenError('Only the homeowner can add checklist items');
    }

    const validation = await validateRequest(request, createSchema);
    if ('headers' in validation) {
      return validation;
    }
    const { label, position } = validation.data;

    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // If position not provided, append to the end of the list.
    let nextPosition = position;
    if (nextPosition === undefined) {
      const { data: existing } = await userDb
        .from('job_checklist_items')
        .select('position')
        .eq('job_id', params.id)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      nextPosition = existing ? (existing.position ?? 0) + 1 : 0;
    }

    const { data, error } = await userDb
      .from('job_checklist_items')
      .insert({
        job_id: params.id,
        label: label.trim(),
        position: nextPosition,
        created_by: user.id,
      })
      .select(
        'id, label, position, completed_at, completed_by, created_at, created_by'
      )
      .single();

    if (error) {
      logger.error('Error inserting job checklist item', error, {
        service: 'job-checklist',
        jobId: params.id,
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ item: data });
  }
);
