import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger, JOB_STATUS } from '@mintenance/shared';
import { commitCompletionApproval } from '@/lib/services/escrow/homeowner-approval/commit-approval';
import {
  getDeterministicIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseOnError,
} from '@/lib/idempotency';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/**
 * POST /api/jobs/[id]/confirm-completion
 * Confirm the current completion and record approval for later release checks.
 */
export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;
    let body: unknown;
    try {
      const raw = await request.text();
      body = raw ? JSON.parse(raw) : {};
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = z
      .object({
        completedAt: z.string().datetime({ offset: true }),
      })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      throw new BadRequestError('Invalid completion version');

    // Fetch the job
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(
        'id, homeowner_id, payer_user_id, contractor_id, status, title, completed_at, completion_confirmed_by_homeowner'
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.error('Failed to fetch job', jobError, {
        service: 'jobs',
        jobId,
      });
      throw new NotFoundError('Job not found');
    }

    // Verify user is the homeowner or designated payer
    const isDesignatedPayer =
      job.payer_user_id === user.id ||
      (!job.payer_user_id && job.homeowner_id === user.id);
    if (!isDesignatedPayer) {
      throw new ForbiddenError(
        'Only the job owner or designated payer can confirm completion'
      );
    }

    // Never return an old cached approval while the job is reopened for rework.
    if (job.status !== JOB_STATUS.COMPLETED) {
      throw new BadRequestError(
        'Contractor must complete the current work before approval'
      );
    }
    const completedAt = parsed.data.completedAt;

    // Scope cached decisions to the completion cycle, not just the job.
    const idempotencyKey = getDeterministicIdempotencyKeyFromRequest(
      request,
      'confirm_completion',
      user.id,
      JSON.stringify([jobId, completedAt])
    );

    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'confirm_completion',
      true,
      {
        userId: user.id,
        request: { jobId, completedAt },
      }
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info(
        'Duplicate completion confirmation detected, revalidating current decision',
        {
          service: 'jobs',
          idempotencyKey,
          userId: user.id,
          jobId,
        }
      );
      // Still validate the current cycle under the database lock. Rework may
      // have won after the read above; a cached success must not hide it.
    }

    return await releaseOnError(
      idempotencyKey,
      'confirm_completion',
      async () => {
        const approval = await commitCompletionApproval({
          jobId,
          actorId: user.id,
          completedAt,
        });

        // Send email to contractor about work approval and payment release.
        if (approval.applied)
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
              const emailOk = await EmailService.sendWorkApprovedEmail(
                contractorProfile.email,
                {
                  contractorName,
                  homeownerName,
                  jobTitle: job.title || 'Job',
                  amount: approval.amount,
                  viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/contractor/jobs/${jobId}`,
                }
              );
              if (emailOk && approval.notificationId) {
                await NotificationService.markEmailSent(
                  approval.notificationId
                );
              }
            }
          } catch (emailError) {
            logger.error('Failed to send work approved email', emailError, {
              service: 'jobs',
              jobId,
            });
          }

        logger.info('Job completion confirmed successfully', {
          service: 'jobs',
          jobId,
          contractorId: job.contractor_id,
          homeownerId: user.id,
        });

        const responseData = {
          success: true,
          message:
            'Work approved. Payment release remains subject to the cooling-off period and final checks.',
          coolingOffEndsAt: approval.coolingOffEndsAt,
        };

        // Store idempotency result
        if (!idempotencyCheck?.isDuplicate)
          await storeIdempotencyResult(
            idempotencyKey,
            'confirm_completion',
            responseData,
            user.id,
            { jobId, contractorId: job.contractor_id },
            idempotencyCheck?.ownership
          );

        return NextResponse.json(responseData);
      },
      idempotencyCheck?.ownership
    );
  }
);
