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
import { FeeCalculationService, type PaymentType } from '@/lib/services/payment/FeeCalculationService';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { env } from '@/lib/env';

// Initialize Stripe with validated secret key (server-side only)
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
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

    // Get escrow transaction with job details and all new fields
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

    // Check all new release conditions (unless admin is forcing release)
    if (user.role !== 'admin' || releaseReason !== 'dispute_resolved') {
      // 1. Check admin approval
      if (escrowTransaction.admin_hold_status === 'admin_hold' || escrowTransaction.admin_hold_status === 'pending_review') {
        const blockingReasons = await EscrowStatusService.getBlockingReasons(escrowTransactionId);
        return NextResponse.json({
          error: 'Escrow is on admin hold',
          blockingReasons,
        }, { status: 403 });
      }

      // 2. Check homeowner approval or auto-approval eligibility
      if (!escrowTransaction.homeowner_approval) {
        const autoApprovalEligible = await HomeownerApprovalService.checkAutoApprovalEligibility(escrowTransactionId);
        if (!autoApprovalEligible) {
          const blockingReasons = await EscrowStatusService.getBlockingReasons(escrowTransactionId);
          return NextResponse.json({
            error: 'Waiting for homeowner approval',
            blockingReasons,
          }, { status: 403 });
        }
        // Process auto-approval
        await HomeownerApprovalService.processAutoApproval(escrowTransactionId);
        // Re-fetch escrow to get updated fields
        const { data: updatedEscrow } = await serverSupabase
          .from('escrow_transactions')
          .select('homeowner_approval, cooling_off_ends_at')
          .eq('id', escrowTransactionId)
          .single();
        if (!updatedEscrow?.homeowner_approval) {
          return NextResponse.json({
            error: 'Auto-approval failed',
          }, { status: 403 });
        }
        escrowTransaction.homeowner_approval = updatedEscrow.homeowner_approval;
        escrowTransaction.cooling_off_ends_at = updatedEscrow.cooling_off_ends_at;
      }

      // 3. Check photo verification
      if (escrowTransaction.photo_verification_status !== 'verified') {
        const blockingReasons = await EscrowStatusService.getBlockingReasons(escrowTransactionId);
        return NextResponse.json({
          error: 'Photo verification not completed',
          blockingReasons,
        }, { status: 403 });
      }

      if (!escrowTransaction.photo_quality_passed) {
        return NextResponse.json({
          error: 'Photo quality check failed',
        }, { status: 403 });
      }

      if (!escrowTransaction.geolocation_verified) {
        return NextResponse.json({
          error: 'Geolocation verification pending',
        }, { status: 403 });
      }

      if (!escrowTransaction.timestamp_verified) {
        return NextResponse.json({
          error: 'Timestamp verification pending',
        }, { status: 403 });
      }

      // 4. Check cooling-off period
      if (escrowTransaction.cooling_off_ends_at) {
        const coolingOffEnds = new Date(escrowTransaction.cooling_off_ends_at);
        if (coolingOffEnds > new Date()) {
          return NextResponse.json({
            error: `Cooling-off period active until ${coolingOffEnds.toISOString()}`,
            coolingOffEndsAt: coolingOffEnds.toISOString(),
          }, { status: 403 });
        }
      }

      // 5. Check for active disputes
      const { count: disputeCount } = await serverSupabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', job.id)
        .in('status', ['open', 'pending']);

      if ((disputeCount || 0) > 0) {
        return NextResponse.json({
          error: 'Active dispute exists - cannot release escrow',
        }, { status: 403 });
      }
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
      // Send notification to contractor
      const { PaymentSetupNotificationService } = await import('@/lib/services/contractor/PaymentSetupNotificationService');
      await PaymentSetupNotificationService.notifyPaymentSetupRequired(
        job.contractor_id,
        escrowTransactionId,
        job.title,
        escrowTransaction.amount
      ).catch((error) => {
        logger.error('Failed to send payment setup notification', error);
      });

      logger.error('Contractor missing Stripe Connect account', {
        service: 'payments',
        userId: user.id,
        contractorId: job.contractor_id,
        escrowTransactionId
      });
      
      return NextResponse.json({ 
        error: 'Contractor not set up for payments',
        message: 'The contractor has been notified to complete payment setup.',
        requiresPaymentSetup: true
      }, { status: 400 });
    }

    // Determine payment type from escrow transaction or default to 'final'
    const paymentType = (escrowTransaction.payment_type as PaymentType) || 'final';

    // Calculate fees using FeeCalculationService
    const feeBreakdown = FeeCalculationService.calculateFees(escrowTransaction.amount, {
      paymentType,
    });

    // Calculate contractor payout amount (after platform fee deduction)
    // Note: Stripe processing fee is charged separately, not deducted from contractor payout
    const contractorAmountCents = Math.round(feeBreakdown.contractorAmount * 100);

    // Create transfer to contractor using Stripe Connect (amount after platform fee)
    const transfer = await stripe.transfers.create({
      amount: contractorAmountCents,
      currency: 'usd',
      destination: contractor.stripe_connect_account_id,
      description: `Payment for job: ${job.title}`,
      metadata: {
        jobId: job.id,
        escrowTransactionId,
        homeownerId: job.homeowner_id,
        contractorId: job.contractor_id,
        releaseReason,
        platformFee: feeBreakdown.platformFee.toString(),
        contractorAmount: feeBreakdown.contractorAmount.toString(),
      },
    });

    // Get payment intent and charge ID for fee tracking
    let chargeId: string | undefined;
    if (escrowTransaction.payment_intent_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          escrowTransaction.payment_intent_id
        );
        chargeId = typeof paymentIntent.latest_charge === 'string' 
          ? paymentIntent.latest_charge 
          : paymentIntent.latest_charge?.id;
      } catch (error) {
        logger.warn('Failed to retrieve payment intent for fee tracking', {
          service: 'payments',
          paymentIntentId: escrowTransaction.payment_intent_id,
        });
      }
    }

    // Create platform fee transfer record
    let feeTransferResult;
    try {
      feeTransferResult = await FeeTransferService.transferPlatformFee({
        escrowTransactionId,
        jobId: job.id,
        contractorId: job.contractor_id,
        amount: escrowTransaction.amount,
        paymentIntentId: escrowTransaction.payment_intent_id || '',
        chargeId,
        paymentType,
      });
    } catch (error) {
      logger.error('Failed to create fee transfer record', error, {
        service: 'payments',
        escrowTransactionId,
      });
      // Don't fail the release if fee tracking fails, but log it
    }

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
        platform_fee: feeBreakdown.platformFee,
        contractor_payout: feeBreakdown.contractorAmount,
        stripe_processing_fee: feeBreakdown.stripeFee,
        fee_transfer_status: feeTransferResult?.status || 'pending',
        fee_transfer_id: feeTransferResult?.feeTransferId || null,
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
      originalAmount: escrowTransaction.amount,
      platformFee: feeBreakdown.platformFee,
      contractorAmount: feeBreakdown.contractorAmount,
      contractorId: job.contractor_id,
      releaseReason,
      feeTransferId: feeTransferResult?.feeTransferId,
    });

    return NextResponse.json({
      success: true,
      transferId: transfer.id,
      originalAmount: escrowTransaction.amount,
      platformFee: feeBreakdown.platformFee,
      contractorAmount: feeBreakdown.contractorAmount,
      contractorId: job.contractor_id,
      releasedAt: new Date().toISOString(),
      feeTransferId: feeTransferResult?.feeTransferId,
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