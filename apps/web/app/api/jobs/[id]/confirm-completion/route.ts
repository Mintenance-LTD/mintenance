import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { getIdempotencyKeyFromRequest, checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';

/**
 * POST /api/jobs/[id]/confirm-completion
 * Homeowner confirms job completion, triggering escrow release
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let jobId: string | undefined;

  try {
    // CSRF protection
    await requireCSRF(request);

    const paramsResolved = await params;
    jobId = paramsResolved.id;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Idempotency check - prevent duplicate confirmations
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'confirm_completion',
      user.id,
      jobId
    );

    const idempotencyCheck = await checkIdempotency(idempotencyKey, 'confirm_completion');
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info('Duplicate completion confirmation detected, returning cached result', {
        service: 'jobs',
        idempotencyKey,
        userId: user.id,
        jobId,
      });
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    if (user.role !== 'homeowner') {
      return NextResponse.json({ error: 'Only homeowners can confirm completion' }, { status: 403 });
    }

    // Fetch the job
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status, amount, title, completion_confirmed_by_homeowner')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.error('Failed to fetch job', jobError, {
        service: 'jobs',
        jobId,
      });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user is the homeowner
    if (job.homeowner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the job owner can confirm completion' },
        { status: 403 }
      );
    }

    // Verify job is in completed status
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: `Cannot confirm completion - job status is ${job.status}. Contractor must mark the job as completed first.` },
        { status: 400 }
      );
    }

    // Check if already confirmed
    if (job.completion_confirmed_by_homeowner) {
      return NextResponse.json(
        { error: 'Job completion has already been confirmed' },
        { status: 400 }
      );
    }

    // Verify contractor exists
    if (!job.contractor_id) {
      return NextResponse.json(
        { error: 'No contractor assigned to this job' },
        { status: 400 }
      );
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
      logger.error('Failed to update job confirmation status', updateError, {
        service: 'jobs',
        jobId,
      });
      return NextResponse.json({ error: 'Failed to confirm completion' }, { status: 500 });
    }

    // Notify contractor that homeowner confirmed completion
    if (job.contractor_id) {
      try {
        const { notifyJobConfirmed } = await import('@/lib/services/notifications/NotificationHelper');
        await notifyJobConfirmed(jobId, job.title, job.contractor_id);
      } catch (notificationError) {
        logger.error('Failed to create job confirmed notification', notificationError, {
          service: 'jobs',
          jobId,
          contractorId: job.contractor_id,
        });
        // Don't fail the request if notification fails
      }
    }

    // Trigger escrow release workflow
    try {
      // Check if there's an active escrow transaction for this job
      const { data: escrowTransaction, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .select('id, status, amount')
        .eq('job_id', jobId)
        .eq('status', 'held')
        .single();

      if (escrowError && escrowError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is acceptable
        logger.error('Failed to fetch escrow transaction', escrowError, {
          service: 'jobs',
          jobId,
        });
      }

      if (escrowTransaction) {
        // Update escrow status to release_pending
        // The actual Stripe transfer will be handled by a background job/cron
        const { error: releaseError } = await serverSupabase
          .from('escrow_transactions')
          .update({
            status: 'release_pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowTransaction.id);

        if (releaseError) {
          logger.error('Failed to update escrow status', releaseError, {
            service: 'jobs',
            jobId,
            escrowId: escrowTransaction.id,
          });
          // Don't fail the request, but log the issue
        } else {
          logger.info('Escrow release initiated', {
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
      logger.error('Unexpected error handling escrow release', escrowError, {
        service: 'jobs',
        jobId,
      });
      // Don't fail the request
    }

    // Create notification for contractor
    try {
      const { error: notificationError } = await serverSupabase
        .from('notifications')
        .insert({
          user_id: job.contractor_id,
          title: 'Job Completion Confirmed!',
          message: `The homeowner has confirmed completion of "${job.title}". Payment release is being processed.`,
          type: 'completion_confirmed',
          read: false,
          action_url: `/contractor/jobs/${jobId}`,
          created_at: new Date().toISOString(),
        });

      if (notificationError) {
        logger.error('Failed to create completion notification', notificationError, {
          service: 'jobs',
          jobId,
          contractorId: job.contractor_id,
        });
      }
    } catch (notificationError) {
      logger.error('Unexpected error creating completion notification', notificationError, {
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
      message: 'Job completion confirmed successfully. Payment is being processed.',
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
  } catch (error) {
    logger.error('Unexpected error in confirm completion', error, {
      jobId,
    });
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
