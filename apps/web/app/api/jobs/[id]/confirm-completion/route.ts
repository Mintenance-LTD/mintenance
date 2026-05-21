import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  logger,
  JOB_STATUS,
  ESCROW_STATUS,
  validateEscrowTransition,
  type EscrowStatusValue,
} from '@mintenance/shared';
import {
  getIdempotencyKeyFromRequest,
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
 * Homeowner confirms job completion, triggering escrow release
 */
export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Idempotency check - prevent duplicate confirmations
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'confirm_completion',
      user.id,
      jobId
    );

    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'confirm_completion'
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info(
        'Duplicate completion confirmation detected, returning cached result',
        {
          service: 'jobs',
          idempotencyKey,
          userId: user.id,
          jobId,
        }
      );
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    return await releaseOnError(
      idempotencyKey,
      'confirm_completion',
      async () => {
        // Fetch the job
        const { data: job, error: jobError } = await serverSupabase
          .from('jobs')
          .select(
            'id, homeowner_id, contractor_id, status, title, completion_confirmed_by_homeowner'
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

        // Verify user is the homeowner
        if (job.homeowner_id !== user.id) {
          throw new ForbiddenError('Only the job owner can confirm completion');
        }

        // Verify job is in completed status
        if (job.status !== JOB_STATUS.COMPLETED) {
          throw new BadRequestError(
            `Cannot confirm completion - job status is ${job.status}. Contractor must mark the job as completed first`
          );
        }

        // Check if already confirmed
        if (job.completion_confirmed_by_homeowner) {
          throw new BadRequestError(
            'Job completion has already been confirmed'
          );
        }

        // Verify contractor exists
        if (!job.contractor_id) {
          throw new BadRequestError('No contractor assigned to this job');
        }

        // Update job to mark completion as confirmed
        const { error: updateError } = await serverSupabase
          .from('jobs')
          .update({
            completion_confirmed_by_homeowner: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        if (updateError) {
          logger.error(
            'Failed to update job confirmation status',
            updateError,
            {
              service: 'jobs',
              jobId,
            }
          );
          throw updateError;
        }

        // Notify contractor that homeowner confirmed completion.
        // Audit P2 (2026-05-10): capture the notification id so the
        // sendWorkApprovedEmail call below can flip `email_sent = true`.
        let contractorNotifId: string | null = null;
        if (job.contractor_id) {
          try {
            const { notifyJobConfirmed } =
              await import('@/lib/services/notifications/NotificationHelper');
            contractorNotifId = await notifyJobConfirmed(
              jobId,
              job.title,
              job.contractor_id
            );
          } catch (notificationError) {
            logger.error(
              'Failed to create job confirmed notification',
              notificationError,
              {
                service: 'jobs',
                jobId,
                contractorId: job.contractor_id,
              }
            );
            // Don't fail the request if notification fails
          }
        }

        // Send email to contractor about work approval and payment release
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

          // Get escrow amount for the email
          const { data: escrowForEmail } = await serverSupabase
            .from('escrow_transactions')
            .select('amount')
            .eq('job_id', jobId)
            .in('status', [ESCROW_STATUS.HELD, ESCROW_STATUS.RELEASE_PENDING])
            .limit(1)
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

            // Audit P3 (2026-05-10): `escrow_transactions.amount` is stored in
            // pounds (not pence) — `payments/create-intent` writes it via
            // `acceptedBid.amount` and `payments/confirm-intent` passes it
            // directly as `Number(amount)` to the email service. The previous
            // `/100` here was a 100x-too-small bug that would render e.g. £350
            // as £3.50 in the homeowner-approved email.
            const emailOk = await EmailService.sendWorkApprovedEmail(
              contractorProfile.email,
              {
                contractorName,
                homeownerName,
                jobTitle: job.title || 'Job',
                amount: escrowForEmail ? Number(escrowForEmail.amount) : 0,
                viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/contractor/jobs/${jobId}`,
              }
            );
            // Audit P2 (2026-05-10): paired with notifyJobConfirmed above so
            // the contractor's notifications row reflects multi-channel
            // delivery (push from createNotification + email_sent here).
            if (emailOk && contractorNotifId) {
              await NotificationService.markEmailSent(contractorNotifId);
            }
          }
        } catch (emailError) {
          logger.error('Failed to send work approved email', emailError, {
            service: 'jobs',
            jobId,
          });
        }

        // Verify after-photos exist before releasing escrow (completion evidence)
        const { count: afterPhotoCount } = await serverSupabase
          .from('job_photos_metadata')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', jobId)
          .eq('photo_type', 'after');

        if (!afterPhotoCount || afterPhotoCount === 0) {
          throw new BadRequestError(
            'Cannot confirm completion without after-photos. The contractor must upload completion photos first.'
          );
        }

        // Trigger escrow release workflow.
        //
        // 2026-05-13 funds-stuck-in-limbo audit fix: this route previously
        // flipped escrow.status `held` -> `release_pending` and exited.
        // Nothing on the platform processes `release_pending` automatically
        // — /api/cron/escrow-auto-release filters strictly on
        // `status='held'`, and /api/payments/release-escrow only runs when
        // the homeowner explicitly visits the /payments page and clicks
        // "Release Payment". Most homeowners assumed approving from the
        // job detail page completed the transfer (the in-app notification
        // and email both say "Payment is being processed"), and funds
        // stayed in limbo until admin intervention.
        //
        // The fix keeps status='held' so the existing daily auto-release
        // cron is the canonical processor, and stamps the homeowner-
        // approval fields + `auto_release_date=now()` so the cron picks
        // this escrow up on the next run (max ~24h, plus the existing
        // dispute-risk / cooling-off / Stripe-Connect checks).
        //
        // request-changes resets these fields symmetrically so a homeowner
        // who approves then changes their mind doesn't accidentally trip
        // the cron during the rework cycle.
        try {
          // Check if there's an active escrow transaction for this job
          const { data: escrowTransaction, error: escrowError } =
            await serverSupabase
              .from('escrow_transactions')
              .select('id, status, amount')
              .eq('job_id', jobId)
              .eq('status', ESCROW_STATUS.HELD)
              .single();

          if (escrowError && escrowError.code !== 'PGRST116') {
            // PGRST116 is "no rows returned", which is acceptable
            logger.error('Failed to fetch escrow transaction', escrowError, {
              service: 'jobs',
              jobId,
            });
          }

          if (escrowTransaction) {
            // Sanity-check the transition is still valid; we don't actually
            // flip status (the cron will), but the assertion guards against
            // race conditions where the escrow is already released or
            // disputed by the time we get here.
            validateEscrowTransition(
              escrowTransaction.status as EscrowStatusValue,
              ESCROW_STATUS.RELEASE_PENDING as EscrowStatusValue
            );

            const nowIso = new Date().toISOString();
            const { error: releaseError } = await serverSupabase
              .from('escrow_transactions')
              .update({
                homeowner_approval: true,
                homeowner_approval_at: nowIso,
                homeowner_inspection_completed: true,
                homeowner_inspection_at: nowIso,
                auto_release_enabled: true,
                auto_release_date: nowIso,
                release_reason: 'homeowner_approved',
                updated_at: nowIso,
              })
              .eq('id', escrowTransaction.id);

            if (releaseError) {
              logger.error(
                'Failed to mark escrow for auto-release',
                releaseError,
                {
                  service: 'jobs',
                  jobId,
                  escrowId: escrowTransaction.id,
                }
              );
              // Don't fail the request, but log the issue. Next cron pass
              // would have picked it up via the existing auto_release_date
              // field if it was previously set by the complete-job hook.
            } else {
              logger.info('Escrow marked for next auto-release cron run', {
                service: 'jobs',
                jobId,
                escrowId: escrowTransaction.id,
                amount: escrowTransaction.amount,
              });
            }
          } else {
            logger.warn('No active escrow transaction found for job', {
              service: 'jobs',
              jobId,
            });
          }
        } catch (escrowError) {
          logger.error(
            'Unexpected error handling escrow release',
            escrowError,
            {
              service: 'jobs',
              jobId,
            }
          );
          // Don't fail the request
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
            'Job completion confirmed successfully. Payment is being processed.',
        };

        // Store idempotency result
        await storeIdempotencyResult(
          idempotencyKey,
          'confirm_completion',
          responseData,
          user.id,
          { jobId, contractorId: job.contractor_id }
        );

        return NextResponse.json(responseData);
      }
    );
  }
);
