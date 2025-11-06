import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { PaymentStateMachine, PaymentAction, PaymentState } from '@/lib/payment-state-machine';
import { requireCSRF } from '@/lib/csrf';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';

// Initialize Stripe with secret key (server-side only)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured. Payment processing is disabled.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

const releaseEscrowSchema = z.object({
  escrowTransactionId: z.string().uuid('Invalid escrow transaction ID'),
  releaseReason: z.enum(['job_completed', 'dispute_resolved', 'timeout']),
});

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      logger.warn('Unauthorized escrow release attempt', {
        service: 'payments',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, releaseEscrowSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { escrowTransactionId, releaseReason } = validation.data;

    // Get escrow transaction with job details
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(`
        *,
        jobs!inner (
          id,
          title,
          homeowner_id,
          contractor_id,
          status
        )
      `)
      .eq('id', escrowTransactionId)
      .single();

    if (escrowError || !escrowTransaction) {
      logger.warn('Escrow release for non-existent transaction', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId
      });
      return NextResponse.json({ error: 'Escrow transaction not found' }, { status: 404 });
    }

    const job = escrowTransaction.jobs;

    // Verify user has permission to release escrow
    const canRelease = 
      user.role === 'admin' || // Admin can release any escrow
      (user.role === 'homeowner' && job.homeowner_id === user.id) || // Homeowner can release their escrow
      (user.role === 'contractor' && job.contractor_id === user.id && releaseReason === 'job_completed'); // Contractor can request release when job completed

    if (!canRelease) {
      logger.warn('Unauthorized escrow release attempt', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
        homeownerId: job.homeowner_id,
        contractorId: job.contractor_id,
        userRole: user.role
      });
      return NextResponse.json({ error: 'Unauthorized to release this escrow' }, { status: 403 });
    }

    // Validate current state allows release
    const stateValidation = PaymentStateMachine.validateTransition(
      escrowTransaction.status as PaymentState,
      PaymentState.COMPLETED,
      PaymentAction.COMPLETE
    );

    if (!stateValidation.valid) {
      logger.warn('Invalid state transition for escrow release', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
        currentStatus: escrowTransaction.status,
        error: stateValidation.error
      });
      return NextResponse.json({ error: stateValidation.error }, { status: 400 });
    }

    // If auto-release is enabled and job is completed, evaluate auto-release conditions
    if (releaseReason === 'job_completed' && job.status === 'completed') {
      const autoReleaseEval = await EscrowReleaseAgent.evaluateAutoRelease(escrowTransactionId);
      
      // If auto-release evaluation delayed the release due to risk, inform the user
      if (autoReleaseEval && autoReleaseEval.message?.includes('delayed')) {
        return NextResponse.json({
          success: false,
          message: 'Auto-release delayed due to risk assessment. Escrow will be held longer.',
          metadata: autoReleaseEval.metadata,
        }, { status: 200 }); // 200 because it's not an error, just information
      }
    }

    // Calculate auto-release date if not set (for future reference)
    if (releaseReason === 'job_completed' && job.status === 'completed') {
      await EscrowReleaseAgent.calculateAutoReleaseDate(
        escrowTransactionId,
        job.id,
        job.contractor_id
      ).catch((error) => {
        // Don't fail the release if auto-release date calculation fails
        logger.error('Failed to calculate auto-release date', error, {
          service: 'payments',
          escrowTransactionId,
        });
      });
    }

    // Get contractor's Stripe Connect account
    const { data: contractor, error: contractorError } = await serverSupabase
      .from('users')
      .select('stripe_connect_account_id')
      .eq('id', job.contractor_id)
      .single();

    if (contractorError || !contractor?.stripe_connect_account_id) {
      logger.error('Contractor missing Stripe Connect account', {
        service: 'payments',
        userId: user.id,
        contractorId: job.contractor_id,
        escrowTransactionId
      });
      return NextResponse.json({ error: 'Contractor not set up for payments' }, { status: 400 });
    }

    // Create transfer to contractor using Stripe Connect
    const transfer = await stripe.transfers.create({
      amount: Math.round(escrowTransaction.amount * 100), // Convert to cents
      currency: 'usd',
      destination: contractor.stripe_connect_account_id,
      description: `Payment for job: ${job.title}`,
      metadata: {
        jobId: job.id,
        escrowTransactionId,
        homeownerId: job.homeowner_id,
        contractorId: job.contractor_id,
        releaseReason,
      },
    });

    // Update escrow transaction status with optimistic locking
    // Use updated_at timestamp to prevent race conditions
    const originalUpdatedAt = escrowTransaction.updated_at;
    const { data: updatedEscrow, error: updateError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'completed',
        transfer_id: transfer.id,
        released_at: new Date().toISOString(),
        release_reason: releaseReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransactionId)
      .eq('updated_at', originalUpdatedAt) // Optimistic lock: only update if not modified
      .select();

    if (updateError) {
      logger.error('Failed to update escrow transaction status', updateError, {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
        transferId: transfer.id
      });

      // Try to reverse the transfer if DB update fails
      await stripe.transfers.createReversal(transfer.id).catch(err =>
        logger.error('Failed to reverse transfer after DB error', err, {
          service: 'payments',
          transferId: transfer.id
        })
      );

      return NextResponse.json(
        { error: 'Failed to update escrow transaction' },
        { status: 500 }
      );
    }

    // Check if update succeeded (optimistic lock check)
    if (!updatedEscrow || updatedEscrow.length === 0) {
      logger.warn('Escrow release failed - transaction was modified by another request (race condition)', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
        transferId: transfer.id
      });

      // Try to reverse the transfer due to race condition
      await stripe.transfers.createReversal(transfer.id).catch(err =>
        logger.error('Failed to reverse transfer after race condition', err, {
          service: 'payments',
          transferId: transfer.id
        })
      );

      return NextResponse.json(
        { error: 'This escrow transaction was modified by another request. Please try again.' },
        { status: 409 }
      );
    }

    // Update job status to completed if release reason is job_completed
    if (releaseReason === 'job_completed') {
      await serverSupabase
        .from('jobs')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', job.id);
    }

    logger.info('Escrow released successfully', {
      service: 'payments',
      userId: user.id,
      escrowTransactionId,
      transferId: transfer.id,
      amount: escrowTransaction.amount,
      contractorId: job.contractor_id,
      releaseReason
    });

    return NextResponse.json({
      success: true,
      transferId: transfer.id,
      amount: escrowTransaction.amount,
      contractorId: job.contractor_id,
      releasedAt: new Date().toISOString(),
    });

  } catch (error) {
    // Handle CSRF validation errors specifically
    if (error instanceof Error && error.message === 'CSRF validation failed') {
      logger.warn('CSRF validation failed', {
        service: 'payments',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    logger.error('Error releasing escrow', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to release escrow' },
      { status: 500 }
    );
  }
}