import { NextRequest, NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  validateStatusTransition,
  type JobStatus,
} from '@/lib/job-state-machine';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import {
  jobSelectFields,
  mapRowToJobDetail,
  updateJobSchema,
  type JobRow,
} from './shared';

export async function handlePatch(
  request: NextRequest,
  {
    user,
    params,
  }: {
    user: { id: string; [k: string]: unknown };
    params: Record<string, string>;
  }
): Promise<NextResponse> {
  const { id } = params;

  // Use RLS-enforced client for user-scoped operations; fall back to service role
  const userDb = createRequestScopedClient(request) ?? serverSupabase;

  // Validate and sanitize input using Zod schema
  const patchValidation = await validateRequest(request, updateJobSchema);
  if ('headers' in patchValidation) {
    return patchValidation;
  }

  const { data: existing, error: fetchError } = await userDb
    .from('jobs')
    .select(jobSelectFields)
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      logger.warn('Job not found for update', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
      });
      throw new NotFoundError('Job not found');
    }
    logger.error('Failed to fetch job for update', fetchError, {
      service: 'jobs',
      userId: user.id,
      jobId: id,
    });
    throw fetchError;
  }

  if (!existing || existing.homeowner_id !== user.id) {
    logger.warn('Unauthorized job update attempt', {
      service: 'jobs',
      userId: user.id,
      jobId: id,
      homeownerId: existing?.homeowner_id,
    });
    throw new ForbiddenError('You do not have permission to update this job');
  }

  const payload = patchValidation.data;
  const updatePayload: {
    title?: string;
    description?: string | null;
    status?: string;
    category?: string | null;
    budget?: number;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };
  if (typeof payload.title === 'string') {
    updatePayload.title = payload.title.trim();
  }
  if (payload.description !== undefined) {
    const trimmed = payload.description.trim();
    updatePayload.description = trimmed.length > 0 ? trimmed : null;
  }
  if (payload.status) {
    const newStatus = payload.status.trim() as JobStatus;
    const currentStatus = existing.status as JobStatus;

    try {
      validateStatusTransition(currentStatus, newStatus);
      updatePayload.status = newStatus;
    } catch (error) {
      logger.warn('Invalid job status transition attempt', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
        currentStatus,
        attemptedStatus: newStatus,
        error: (error as Error).message,
      });
      throw new BadRequestError((error as Error).message);
    }
  }
  if (payload.category !== undefined) {
    const trimmedCategory = payload.category.trim();
    updatePayload.category =
      trimmedCategory.length > 0 ? trimmedCategory : null;
  }

  // SECURITY: Prevent budget reduction if bids exist
  if (payload.budget !== undefined) {
    const newBudget = payload.budget;
    const currentBudget = existing.budget;

    if (currentBudget !== null && newBudget < currentBudget) {
      const { count: bidCount } = await userDb
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', id)
        .neq('status', 'withdrawn');

      if (bidCount && bidCount > 0) {
        const { data: existingBids } = await userDb
          .from('bids')
          .select('amount, contractor_id, status')
          .eq('job_id', id)
          .neq('status', 'withdrawn');

        const bidsExceedNewBudget = existingBids?.some(
          (bid: { amount: number; contractor_id: string; status: string }) => {
            const bidAmountCents = Math.round(bid.amount * 100);
            const newBudgetCents = Math.round(newBudget * 100);
            return bidAmountCents > newBudgetCents;
          }
        );

        if (bidsExceedNewBudget) {
          logger.warn(
            'Budget reduction blocked - existing bids exceed new budget',
            {
              service: 'jobs',
              userId: user.id,
              jobId: id,
              currentBudget,
              newBudget,
              bidCount,
            }
          );
          throw new BadRequestError(
            'Cannot reduce budget below existing bid amounts. Please reject or withdraw bids first'
          );
        }
      }
    }

    updatePayload.budget = payload.budget;
  }

  const { data, error } = await userDb
    .from('jobs')
    .update(updatePayload)
    .eq('id', id)
    .select(jobSelectFields)
    .single();

  if (error) {
    logger.error('Failed to update job', error, {
      service: 'jobs',
      userId: user.id,
      jobId: id,
    });
    throw error;
  }

  logger.info('Job updated successfully', {
    service: 'jobs',
    userId: user.id,
    jobId: id,
  });

  // Trigger agent analysis after job update (dynamic imports to avoid module resolution issues)
  (async () => {
    try {
      const [{ PredictiveAgent }, { JobStatusAgent }] = await Promise.all([
        import('@/lib/services/agents/PredictiveAgent'),
        import('@/lib/services/agents/JobStatusAgent'),
      ]);
      await Promise.allSettled([
        PredictiveAgent.analyzeJob(id, { jobId: id, userId: user.id }),
        JobStatusAgent.evaluateAutoCancel(id, { jobId: id, userId: user.id }),
      ]);
    } catch (error) {
      logger.error('Error in agent analysis', error, {
        service: 'jobs',
        jobId: id,
      });
    }
  })();

  return NextResponse.json({ job: mapRowToJobDetail(data as JobRow) });
}
