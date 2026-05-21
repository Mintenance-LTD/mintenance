/**
 * POST /api/jobs/:id/dispute
 * Homeowner disputes the job completion (disagrees with quality of work).
 * Transitions job: completed|in_progress → disputed
 * Escrow remains held until dispute is resolved.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  logger,
  JOB_STATUS,
  validateStatusTransition,
  type JobStatus,
} from '@mintenance/shared';
import { requireJobOwnership } from '@/lib/security/ownership-validators';
import { notifyJobStatusChange } from '@/lib/services/notifications/NotificationHelper';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
} from '@/lib/idempotency';

const disputeSchema = z.object({
  reason: z
    .string()
    .min(20, 'Please describe the dispute in detail (at least 20 characters)')
    .max(2000),
  category: z.enum([
    'quality',
    'incomplete',
    'damage',
    'different_from_agreed',
    'other',
  ]),
});

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Validate input
    const validation = await validateRequest(request, disputeSchema);
    if ('headers' in validation) return validation;
    const { reason, category } = validation.data;

    // Idempotency — without it, a network retry would create
    // duplicate `disputes` rows (no unique constraint by job_id +
    // raised_by) and re-fan out two notifications to the contractor.
    // Status flip itself is guarded by validateStatusTransition but
    // the side-effects below can still double-fire on retry.
    // AUDIT_PUNCH_LIST P2 #75.
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'job_dispute',
      user.id,
      jobId
    );
    const idem = await checkIdempotency<{
      success: boolean;
      message: string;
    }>(idempotencyKey, 'job_dispute');
    if (idem?.isDuplicate && idem.cachedResult) {
      logger.info('Duplicate job_dispute — returning cached result', {
        service: 'jobs',
        idempotencyKey,
        userId: user.id,
        jobId,
      });
      return NextResponse.json(idem.cachedResult);
    }

    // Verify homeowner owns this job
    const job = await requireJobOwnership(jobId, user.id, 'homeowner');

    // Validate state machine transition
    validateStatusTransition(
      job.status as JobStatus,
      JOB_STATUS.DISPUTED as JobStatus
    );

    if (!job.contractor_id) {
      throw new BadRequestError('No contractor assigned to this job');
    }

    const contractorId = job.contractor_id;

    // Update job status to disputed
    const { error: updateError } = await serverSupabase
      .from('jobs')
      .update({
        status: JOB_STATUS.DISPUTED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      logger.error('Failed to update job to disputed', updateError, {
        service: 'jobs',
        jobId,
      });
      throw new BadRequestError('Failed to file dispute. Please try again.');
    }

    // Create a dispute record for tracking.
    // 2026-05-09: corrected column names to match the live `disputes`
    // schema (raised_by/against/description). Prior insert silently
    // failed for every dispute because it referenced non-existent
    // columns (homeowner_id/contractor_id/category) and the catch
    // block swallowed the error.
    try {
      await serverSupabase.from('disputes').insert({
        job_id: jobId,
        raised_by: user.id,
        against: contractorId,
        reason,
        description: `Category: ${category}`,
        status: 'open',
      });
    } catch (disputeInsertError) {
      // Non-fatal — the job status is already updated
      logger.error('Failed to create dispute record', disputeInsertError, {
        service: 'jobs',
        jobId,
      });
    }

    // Notify both parties
    await notifyJobStatusChange({
      jobId,
      jobTitle: job.title || 'Job',
      oldStatus: job.status,
      newStatus: JOB_STATUS.DISPUTED,
      homeownerId: user.id,
      contractorId,
    });

    // Specific notification to contractor about the dispute
    try {
      // 2026-05-21 Mint Editorial voice — dispute is a heavy moment;
      // calm, factual, action-led. Funds-held line reassures the
      // contractor that payment isn't gone, just paused.
      await NotificationService.createNotification({
        userId: contractorId,
        title: `${job.title || 'A job'} — dispute opened`,
        message: `Funds stay held while we mediate (48-hour SLA). Open the job to read the issue and respond.`,
        type: 'job_disputed',
        actionUrl: `/contractor/jobs/${jobId}`,
      });
    } catch (notificationError) {
      logger.error('Failed to send dispute notification', notificationError, {
        service: 'jobs',
        jobId,
      });
    }

    logger.info('Job disputed by homeowner', {
      service: 'jobs',
      jobId,
      homeownerId: user.id,
      contractorId,
      category,
      previousStatus: job.status,
    });

    const responseData = {
      success: true,
      message:
        'Dispute filed. The contractor has been notified and escrow funds remain held until resolution.',
    };

    await storeIdempotencyResult(
      idempotencyKey,
      'job_dispute',
      responseData,
      user.id,
      { jobId, contractorId, category }
    );

    return NextResponse.json(responseData);
  }
);
