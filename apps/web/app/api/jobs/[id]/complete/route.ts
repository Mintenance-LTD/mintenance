import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PaymentEnforcement } from '@/lib/services/payment/PaymentEnforcement';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf-validator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate CSRF
    if (!(await requireCSRF(request))) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;

    // Get job details
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, contractor_id, homeowner_id, status, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user is the contractor assigned to this job
    if (job.contractor_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned contractor can complete this job' },
        { status: 403 }
      );
    }

    // Verify job is in a completable state
    if (job.status !== 'in_progress' && job.status !== 'assigned') {
      return NextResponse.json(
        { error: `Job cannot be completed from ${job.status} status` },
        { status: 400 }
      );
    }

    // Enforce platform payment - check if payment exists
    const paymentCheck = await PaymentEnforcement.canCompleteJob(jobId);

    if (!paymentCheck.allowed) {
      logger.warn('Job completion blocked - no platform payment', {
        service: 'jobs',
        jobId,
        contractorId: user.id,
        reason: paymentCheck.reason,
      });

      return NextResponse.json(
        {
          error: 'Payment required',
          message: paymentCheck.reason || 'All payments must be processed through the platform.',
          requiresPayment: true,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // Update job status to completed
    const { error: updateError } = await serverSupabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      logger.error('Failed to complete job', {
        service: 'jobs',
        jobId,
        error: updateError.message,
      });
      return NextResponse.json({ error: 'Failed to complete job' }, { status: 500 });
    }

    // Create notification for homeowner
    const { error: notificationError } = await serverSupabase
      .from('notifications')
      .insert({
        user_id: job.homeowner_id,
        title: 'Job Completed',
        message: `Your job "${job.title}" has been marked as completed. Please review and release payment.`,
        type: 'job_update',
        read: false,
        action_url: `/jobs/${jobId}`,
      });

    if (notificationError) {
      logger.error('Failed to create completion notification', {
        service: 'jobs',
        error: notificationError.message,
      });
    }

    // Calculate auto-release date for escrow (async, don't block)
    if (job.contractor_id) {
      const { EscrowReleaseAgent } = await import('@/lib/services/agents/EscrowReleaseAgent');
      
      // Get escrow transaction for this job
      const { data: escrow } = await serverSupabase
        .from('escrow_transactions')
        .select('id')
        .eq('job_id', jobId)
        .eq('status', 'held')
        .limit(1)
        .single();

      if (escrow) {
        EscrowReleaseAgent.calculateAutoReleaseDate(escrow.id, jobId, job.contractor_id).catch(
          (error) => {
            logger.error('Failed to calculate auto-release date', error, {
              service: 'jobs',
              jobId,
              escrowId: escrow.id,
            });
          }
        );
      }
    }

    logger.info('Job completed successfully', {
      service: 'jobs',
      jobId,
      contractorId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Job marked as completed',
    });
  } catch (err) {
    logger.error('Error completing job', {
      service: 'jobs',
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

