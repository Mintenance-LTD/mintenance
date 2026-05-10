/**
 * POST /api/jobs/:id/request-changes
 * Homeowner requests changes instead of approving completed work.
 * Notifies contractor with comments.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger, JOB_STATUS } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { EmailService } from '@/lib/email-service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@/lib/errors/api-error';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
} from '@/lib/idempotency';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// replaces the inline cast.
const requestChangesSchema = z
  .object({
    comments: z
      .string()
      .min(1, 'Please provide details about what changes are needed')
      .max(5000),
  })
  .strict();

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user, params }) => {
    const jobId = params.id;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = requestChangesSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ??
          'Please provide details about what changes are needed'
      );
    }
    const comments = parsed.data.comments.trim();
    if (!comments) {
      throw new BadRequestError(
        'Please provide details about what changes are needed'
      );
    }

    // Idempotency — without it, a network retry would re-fire the
    // contractor notification + the change-request email even though
    // the status flip is already done. Status is checked below
    // (`if (job.status !== COMPLETED)`) so the second call would
    // throw 400 anyway, but only after the side-effects ran on the
    // first call's tail. AUDIT_PUNCH_LIST P2 #75.
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'request_changes',
      user.id,
      jobId
    );
    const idem = await checkIdempotency<{
      success: boolean;
      message: string;
    }>(idempotencyKey, 'request_changes');
    if (idem?.isDuplicate && idem.cachedResult) {
      logger.info('Duplicate request_changes — returning cached result', {
        service: 'jobs',
        idempotencyKey,
        userId: user.id,
        jobId,
      });
      return NextResponse.json(idem.cachedResult);
    }

    // 1. Fetch job and verify ownership
    const { data: job, error } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title, status')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Only the homeowner can request changes');
    }

    if (job.status !== JOB_STATUS.COMPLETED) {
      throw new BadRequestError('Can only request changes on completed jobs');
    }

    // 2. Roll back job status to in_progress so contractor can re-do work
    // Note: This is a special business rule — homeowner requesting changes bypasses
    // the normal terminal state restriction on 'completed' jobs.
    const { error: updateError } = await serverSupabase
      .from('jobs')
      .update({
        status: JOB_STATUS.IN_PROGRESS,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      logger.error('Failed to roll back job status', {
        service: 'jobs',
        jobId,
        error: updateError.message,
      });
      throw new Error('Failed to process change request');
    }

    // 3. Notify contractor
    await NotificationService.createNotification({
      userId: job.contractor_id,
      title: 'Changes Requested',
      message: `The homeowner has requested changes on "${job.title}": ${comments}`,
      type: 'changes_requested',
      actionUrl: `/contractor/jobs/${jobId}`,
    });

    // Send email to contractor about changes requested
    try {
      const { data: contractorProfile } = await serverSupabase
        .from('profiles')
        .select('email, first_name, last_name, company_name')
        .eq('id', job.contractor_id)
        .single();

      const { data: homeownerProfile } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (contractorProfile?.email) {
        const contractorName =
          contractorProfile.first_name && contractorProfile.last_name
            ? `${contractorProfile.first_name} ${contractorProfile.last_name}`
            : contractorProfile.company_name || 'Contractor';
        const homeownerName = homeownerProfile
          ? `${homeownerProfile.first_name || ''} ${homeownerProfile.last_name || ''}`.trim() ||
            'The homeowner'
          : 'The homeowner';

        await EmailService.sendChangesRequestedEmail(contractorProfile.email, {
          contractorName,
          homeownerName,
          jobTitle: job.title || 'Job',
          comments,
          viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/contractor/jobs/${jobId}`,
        });
      }
    } catch (emailError) {
      logger.error('Failed to send changes requested email', emailError, {
        service: 'jobs',
        jobId,
      });
    }

    logger.info('Homeowner requested changes, job rolled back to in_progress', {
      service: 'jobs',
      jobId,
      homeownerId: user.id,
      contractorId: job.contractor_id,
    });

    const responseData = {
      success: true,
      message:
        'Change request sent to contractor. Job has been reopened for rework.',
    };

    await storeIdempotencyResult(
      idempotencyKey,
      'request_changes',
      responseData,
      user.id,
      { jobId, contractorId: job.contractor_id }
    );

    return NextResponse.json(responseData);
  }
);
