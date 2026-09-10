/**
 * POST /api/jobs/:id/request-changes
 * Homeowner requests changes instead of approving completed work.
 * Notifies contractor with comments.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { EmailService } from '@/lib/email-service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
} from '@/lib/errors/api-error';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseOnError,
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
    }>(idempotencyKey, 'request_changes', true, {
      userId: user.id,
      request: { jobId, comments },
    });
    if (idem?.isDuplicate && idem.cachedResult) {
      logger.info('Duplicate request_changes — returning cached result', {
        service: 'jobs',
        idempotencyKey,
        userId: user.id,
        jobId,
      });
      return NextResponse.json(idem.cachedResult);
    }

    return await releaseOnError(idempotencyKey, 'request_changes', async () => {
      // 1. Fetch job and verify designated-payer access
      const { data: job, error } = await serverSupabase
        .from('jobs')
        .select('id, homeowner_id, payer_user_id, contractor_id, title, status')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        throw new NotFoundError('Job not found');
      }

      const isDesignatedPayer =
        job.payer_user_id === user.id ||
        (!job.payer_user_id && job.homeowner_id === user.id);
      if (!isDesignatedPayer) {
        throw new ForbiddenError(
          'Only the homeowner or designated payer can request changes'
        );
      }

      const { error: reworkError } = await serverSupabase.rpc(
        'request_job_rework',
        {
          p_job_id: jobId,
          p_actor_id: user.id,
          p_request_key: idempotencyKey,
          p_comments: comments,
        }
      );
      if (reworkError) {
        if (reworkError.code === '23514') {
          throw new ConflictError(
            'The job or payment state changed. Refresh and try again.'
          );
        }
        if (reworkError.code === '42501')
          throw new ForbiddenError('Not authorized to request changes');
        if (reworkError.code === 'P0002')
          throw new NotFoundError('Job not found');
        logger.error('Atomic rework request failed', reworkError, {
          service: 'jobs',
          jobId,
        });
        throw new InternalServerError('Failed to process change request');
      }

      // 4. Notify contractor.
      //
      // Audit P2 (2026-05-10): capture the notification id so we can flip
      // `email_sent = true` after the email provider accepts the message.
      // Same pattern as /api/payments/confirm-intent and /api/jobs/[id]/start.
      // 2026-05-21 Mint Editorial voice: name the homeowner's ask, not a
      // bureaucratic "Changes Requested". The actual comment is the
      // message — it's the only thing the contractor needs to read.
      const contractorNotifId = await NotificationService.createNotification({
        userId: job.contractor_id,
        title: `${job.title} — homeowner asked for a tweak`,
        message: comments,
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

          const emailOk = await EmailService.sendChangesRequestedEmail(
            contractorProfile.email,
            {
              contractorName,
              homeownerName,
              jobTitle: job.title || 'Job',
              comments,
              viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/contractor/jobs/${jobId}`,
            }
          );
          if (emailOk) {
            await NotificationService.markEmailSent(contractorNotifId);
          }
        }
      } catch (emailError) {
        logger.error('Failed to send changes requested email', emailError, {
          service: 'jobs',
          jobId,
        });
      }

      logger.info(
        'Homeowner requested changes, job rolled back to in_progress',
        {
          service: 'jobs',
          jobId,
          homeownerId: user.id,
          contractorId: job.contractor_id,
        }
      );

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
    });
  }
);
