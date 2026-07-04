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
 * /api/jobs/[id]/checklist/[itemId]
 *
 *   PATCH  — homeowner: edit label/position; contractor: tick/untick
 *            via { completed: true|false }
 *   DELETE — homeowner-only: remove the item
 *
 * Backed by `job_checklist_items` (migration 20260520000004).
 */

const patchSchema = z
  .object({
    label: z
      .string()
      .min(1, 'Label is required')
      .max(200, 'Label must be 200 characters or fewer')
      .optional(),
    position: z.number().int().min(0).optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.label !== undefined ||
      v.position !== undefined ||
      v.completed !== undefined,
    { message: 'At least one of label / position / completed is required' }
  );

async function loadItemAndJob(
  request: NextRequest,
  jobId: string,
  itemId: string
): Promise<{
  item: {
    id: string;
    job_id: string;
    label: string;
    position: number;
    completed_at: string | null;
  };
  job: { id: string; homeowner_id: string; contractor_id: string | null };
}> {
  const db = createRequestScopedClient(request) ?? serverSupabase;
  const { data: item, error: itemError } = await db
    .from('job_checklist_items')
    .select('id, job_id, label, position, completed_at')
    .eq('id', itemId)
    .eq('job_id', jobId)
    .single();
  if (itemError || !item) {
    throw new NotFoundError('Checklist item not found');
  }
  const { data: job, error: jobError } = await db
    .from('jobs')
    .select('id, homeowner_id, contractor_id')
    .eq('id', jobId)
    .single();
  if (jobError || !job) {
    throw new NotFoundError('Job not found');
  }
  return { item, job };
}

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id: jobId, itemId } = params as {
      id: string;
      itemId: string;
    };
    const { job } = await loadItemAndJob(request, jobId, itemId);

    const isHomeowner = job.homeowner_id === user.id;
    const isContractor = job.contractor_id === user.id;
    if (!isHomeowner && !isContractor) {
      throw new ForbiddenError('Not a participant on this job');
    }

    const validation = await validateRequest(request, patchSchema);
    if ('headers' in validation) {
      return validation;
    }
    const { label, position, completed } = validation.data;

    // Permission gate: contractor can ONLY toggle `completed`.
    if (isContractor && !isHomeowner) {
      if (label !== undefined || position !== undefined) {
        throw new ForbiddenError(
          'Contractor can only mark items complete or incomplete'
        );
      }
      if (completed === undefined) {
        throw new ForbiddenError('Contractor must pass { completed: boolean }');
      }
    }

    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = label.trim();
    if (position !== undefined) updates.position = position;
    if (completed !== undefined) {
      updates.completed_at = completed ? new Date().toISOString() : null;
      updates.completed_by = completed ? user.id : null;
    }

    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const { data, error } = await userDb
      .from('job_checklist_items')
      .update(updates)
      .eq('id', itemId)
      .eq('job_id', jobId)
      .select(
        'id, label, position, completed_at, completed_by, created_at, created_by'
      )
      .single();

    if (error) {
      logger.error('Error updating job checklist item', error, {
        service: 'job-checklist',
        jobId,
        itemId,
        userId: user.id,
        role: isHomeowner ? 'homeowner' : 'contractor',
      });
      throw error;
    }

    return NextResponse.json({ item: data });
  }
);

export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id: jobId, itemId } = params as {
      id: string;
      itemId: string;
    };
    const { job } = await loadItemAndJob(request, jobId, itemId);

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Only the homeowner can delete checklist items');
    }

    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const { error } = await userDb
      .from('job_checklist_items')
      .delete()
      .eq('id', itemId)
      .eq('job_id', jobId);

    if (error) {
      logger.error('Error deleting job checklist item', error, {
        service: 'job-checklist',
        jobId,
        itemId,
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ success: true });
  }
);
