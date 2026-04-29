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
import { jobSelectFields, updateJobSchema } from './shared';

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
  // Audit re-review (2026-04-29): the previous PATCH only persisted
  // `title / description / status / category / budget`, even though
  // the shared `updateJobSchema` accepted urgency, location, city,
  // postcode, access_info, requirements, etc. Any caller that sent
  // those richer fields via PATCH had them silently dropped.
  //
  // The payload-builder below writes every database column the
  // schema declares. AI/geocode side effects stay PUT-only because
  // they use heavier caching, analysis, and rate-limit pipelines.
  // Photo updates are handled below by validating URLs and
  // rebuilding `job_attachments` (see the photoUrls block after
  // the row update).
  //
  // `propertyType` is intentionally NOT persisted — the live `jobs`
  // table has no `property_type` column. The schema accepts it
  // only as context for PUT's AI/building-survey pipeline.
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
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

  // Coalesce the deprecated `priority` alias into the canonical
  // `urgency` column, matching the PUT handler's behaviour (commit
  // `37b8b4c5`). Writing `priority` directly would no-op since the
  // column doesn't exist on `jobs`.
  const urgency = payload.urgency ?? payload.priority;
  if (urgency) {
    updatePayload.urgency = urgency;
  }
  if (payload.location !== undefined) {
    updatePayload.location = payload.location;
  }
  if (payload.city !== undefined) {
    updatePayload.city = payload.city;
  }
  if (payload.postcode !== undefined) {
    updatePayload.postcode = payload.postcode;
  }
  if (payload.accessInfo !== undefined) {
    updatePayload.access_info = payload.accessInfo;
  }
  if (payload.requirements !== undefined) {
    updatePayload.requirements = payload.requirements;
  }

  // Persist additional lightweight fields. `budget_min` and
  // `budget_max` are saved as provided. The stricter
  // bid-protection check (refusing to lower a budget below an
  // existing accepted bid) currently only applies to the singular
  // `budget` field above; if a homeowner needs to be guarded from
  // also lowering `budget_max` below outstanding bids, lift the
  // existing check into a shared helper and apply it to both.
  if (payload.budgetMin !== undefined) {
    updatePayload.budget_min = payload.budgetMin;
  }
  if (payload.budgetMax !== undefined) {
    updatePayload.budget_max = payload.budgetMax;
  }
  if (payload.startDate !== undefined) {
    updatePayload.start_date = payload.startDate;
  }
  if (payload.endDate !== undefined) {
    updatePayload.end_date = payload.endDate;
  }
  if (payload.flexibleTimeline !== undefined) {
    updatePayload.flexible_timeline = payload.flexibleTimeline;
  }

  // Photos: validate + rebuild `job_attachments`. Same logic PUT
  // uses (commit `37b8b4c5`), minus the AI/geocode side effects
  // that stay PUT-only because they own a much heavier pipeline.
  // Coalesce the deprecated `images` alias into `photoUrls` first.
  const photoUrls = payload.photoUrls ?? payload.images;
  let validatedPhotoUrls: string[] | undefined;
  if (photoUrls !== undefined) {
    if (photoUrls.length === 0) {
      validatedPhotoUrls = [];
    } else {
      const { validateURLs } = await import('@/lib/security/url-validation');
      const urlValidation = await validateURLs(photoUrls, true);
      if (urlValidation.invalid.length > 0) {
        throw new BadRequestError(
          `Invalid image URLs: ${urlValidation.invalid.map((i) => i.error).join(', ')}`
        );
      }
      validatedPhotoUrls = urlValidation.valid;
    }
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

  // Rebuild job_attachments from validatedPhotoUrls. Mirror the
  // delete-then-insert pattern PUT uses so a homeowner who clears
  // their photo list ends up with no rows (not the previous set).
  // Done AFTER the row update so the client sees the fresh
  // updated_at timestamp regardless of attachment outcome.
  if (validatedPhotoUrls !== undefined) {
    // Re-audit follow-up: capture + throw on delete failure too.
    // Previously the delete was awaited without inspecting the
    // returned error, so a transient RLS/connectivity failure
    // would silently succeed-look while leaving the old rows in
    // place — and then the insert below would either duplicate
    // photos or fail on a unique constraint. The thrown error
    // surfaces to the caller before any insert fires.
    const { error: deleteAttachmentsError } = await userDb
      .from('job_attachments')
      .delete()
      .eq('job_id', id)
      .eq('file_type', 'image');
    if (deleteAttachmentsError) {
      logger.error(
        'Failed to delete job attachments before PATCH rebuild',
        deleteAttachmentsError,
        { service: 'jobs', userId: user.id, jobId: id }
      );
      throw deleteAttachmentsError;
    }
    if (validatedPhotoUrls.length > 0) {
      const attachments = validatedPhotoUrls.map((url) => ({
        job_id: id,
        file_url: url,
        file_type: 'image',
        uploaded_by: user.id,
      }));
      const { error: attachmentsError } = await userDb
        .from('job_attachments')
        .insert(attachments);
      if (attachmentsError) {
        // Re-audit: the previous handler swallowed this error and
        // returned a misleading "saved" response while the
        // user's photos had already been deleted by the line
        // above. That's a real product risk — the row's
        // `updated_at` is now stamped fresh but the gallery is
        // empty until they retry. Throw so the caller sees the
        // failure; a future improvement is to wrap the
        // delete-then-insert in a Postgres RPC for atomicity.
        logger.error(
          'Failed to insert job attachments after PATCH',
          attachmentsError,
          {
            service: 'jobs',
            userId: user.id,
            jobId: id,
          }
        );
        throw attachmentsError;
      }
    }
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

  // Return the full updated row (matching the column set GET
  // returns) so the caller can re-render every field they had on
  // screen — not just the trimmed `JobDetail` projection. The
  // explicit SELECT in `jobSelectFields` keeps this safe from
  // accidentally shipping new sensitive columns.
  return NextResponse.json({ job: data });
}
