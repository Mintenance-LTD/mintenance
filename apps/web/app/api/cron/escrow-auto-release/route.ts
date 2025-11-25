import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';
import { FeeCalculationService, type PaymentType } from '@/lib/services/payment/FeeCalculationService';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';
import Stripe from 'stripe';
import { env } from '@/lib/env';
import { requireCronAuth } from '@/lib/cron-auth';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

/**
 * Cron endpoint for processing automatic escrow releases
 * Should be called every hour
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    logger.info('Starting escrow auto-release processing cycle', {
      service: 'escrow-auto-release',
    });

    const results = {
      evaluated: 0,
      released: 0,
      errors: 0,
      delayed: 0,
    };

    // Get escrows eligible for auto-release
    const now = new Date();
    const { data: eligibleEscrows, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id,
        job_id,
        payer_id,
        payee_id,
        amount,
        status,
        payment_type,
        payment_intent_id,
        metadata,
        auto_release_enabled,
        auto_release_date,
        admin_hold_status,
        homeowner_approval,
        cooling_off_ends_at,
        jobs (
          id,
          status,
          contractor_id,
          homeowner_id,
          title
        )
      `
      )
      .eq('status', 'held')
      .eq('auto_release_enabled', true)
      .in('admin_hold_status', ['none', 'admin_approved']) // Skip admin holds
      .lte('auto_release_date', now.toISOString())
      .limit(50); // Process up to 50 at a time

    if (fetchError) {
      logger.error('Error fetching eligible escrows', {
        service: 'escrow-auto-release',
        error: fetchError.message,
      });
      return NextResponse.json({ error: 'Failed to fetch eligible escrows' }, { status: 500 });
    }

    if (!eligibleEscrows || eligibleEscrows.length === 0) {
      return NextResponse.json({
        success: true,
        results: { evaluated: 0, released: 0, errors: 0, delayed: 0 },
      });
    }

    // Process each escrow
    for (const escrow of eligibleEscrows) {
      try {
        results.evaluated++;

        const job = escrow.jobs as any;
        if (!job || job.status !== 'completed') {
          continue; // Skip if job not completed
        }

        // Skip if on admin hold
        if (escrow.admin_hold_status === 'admin_hold' || escrow.admin_hold_status === 'pending_review') {
          continue; // Skip admin-held escrows
        }

        // Skip if cooling-off period not passed
        if (escrow.cooling_off_ends_at) {
          const coolingOffEnds = new Date(escrow.cooling_off_ends_at);
          if (coolingOffEnds > now) {
            continue; // Still in cooling-off period
          }
        }

        // Evaluate auto-release (this checks all conditions including homeowner approval, photo verification, etc.)
        const evaluation = await EscrowReleaseAgent.evaluateAutoRelease(escrow.id);

        if (!evaluation || !evaluation.success) {
          if (evaluation?.message?.includes('delayed')) {
            results.delayed++;
          }
          continue; // Not approved for auto-release
        }

        // Auto-release approved - proceed with release
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
            escrow.id,
            job.title,
            escrow.amount || 0
          ).catch((error) => {
            logger.error('Failed to send payment setup notification', error);
          });

          logger.error('Contractor missing Stripe Connect account', {
            service: 'escrow-auto-release',
            contractorId: job.contractor_id,
            escrowId: escrow.id,
          });
          results.errors++;
          continue;
        }

        // Determine payment type
        const paymentType = (escrow.payment_type as PaymentType) || 'final';

        // Calculate fees using FeeCalculationService
        const feeBreakdown = FeeCalculationService.calculateFees(escrow.amount || 0, {
          paymentType,
        });

        // Calculate contractor payout amount (after platform fee deduction)
        const contractorAmountCents = Math.round(feeBreakdown.contractorAmount * 100);

        // Create transfer to contractor (amount after platform fee)
        const transfer = await stripe.transfers.create({
          amount: contractorAmountCents,
          currency: 'usd',
          destination: contractor.stripe_connect_account_id,
          description: `Auto-release: ${job.title}`,
          metadata: {
            jobId: job.id,
            escrowId: escrow.id,
            homeownerId: job.homeowner_id,
            contractorId: job.contractor_id,
            releaseReason: 'auto_release',
            platformFee: feeBreakdown.platformFee.toString(),
            contractorAmount: feeBreakdown.contractorAmount.toString(),
          },
        });

        // Get payment intent and charge ID for fee tracking
        let chargeId: string | undefined;
        if (escrow.payment_intent_id) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              escrow.payment_intent_id
            );
            chargeId = typeof paymentIntent.latest_charge === 'string' 
              ? paymentIntent.latest_charge 
              : paymentIntent.latest_charge?.id;
          } catch (error) {
            logger.warn('Failed to retrieve payment intent for fee tracking', {
              service: 'escrow-auto-release',
              paymentIntentId: escrow.payment_intent_id,
            });
          }
        }

        // Create platform fee transfer record
        let feeTransferResult;
        try {
          feeTransferResult = await FeeTransferService.transferPlatformFee({
            escrowTransactionId: escrow.id,
            jobId: job.id,
            contractorId: job.contractor_id,
            amount: escrow.amount || 0,
            paymentIntentId: escrow.payment_intent_id || '',
            chargeId,
            paymentType,
          });
        } catch (error) {
          logger.error('Failed to create fee transfer record in auto-release', error, {
            service: 'escrow-auto-release',
            escrowId: escrow.id,
          });
          // Don't fail the release if fee tracking fails
        }

        // Update escrow transaction
        const updateData: Record<string, any> = {
          status: 'completed',
          released_at: new Date().toISOString(),
          release_reason: 'auto_release',
          updated_at: new Date().toISOString(),
          transfer_id: transfer.id,
          platform_fee: feeBreakdown.platformFee,
          contractor_payout: feeBreakdown.contractorAmount,
          stripe_processing_fee: feeBreakdown.stripeFee,
          fee_transfer_status: feeTransferResult?.status || 'pending',
          fee_transfer_id: feeTransferResult?.feeTransferId || null,
        };

        // Store auto-release metadata
        if (escrow.metadata) {
          updateData.metadata = {
            ...(typeof escrow.metadata === 'object' ? escrow.metadata : {}),
            auto_released: true,
            auto_released_at: new Date().toISOString(),
          };
        } else {
          updateData.metadata = {
            auto_released: true,
            auto_released_at: new Date().toISOString(),
          };
        }

        const { error: updateError } = await serverSupabase
          .from('escrow_transactions')
          .update(updateData)
          .eq('id', escrow.id);

        if (updateError) {
          logger.error('Failed to update escrow after auto-release', {
            service: 'escrow-auto-release',
            escrowId: escrow.id,
            error: updateError.message,
          });

          // Try to reverse transfer
          await stripe.transfers.createReversal(transfer.id).catch((err) => {
            logger.error('Failed to reverse transfer after DB error', err, {
              service: 'escrow-auto-release',
              transferId: transfer.id,
            });
          });

          results.errors++;
          continue;
        }

        results.released++;

        logger.info('Escrow auto-released successfully', {
          service: 'escrow-auto-release',
          escrowId: escrow.id,
          transferId: transfer.id,
          originalAmount: escrow.amount,
          platformFee: feeBreakdown.platformFee,
          contractorAmount: feeBreakdown.contractorAmount,
          feeTransferId: feeTransferResult?.feeTransferId,
        });
      } catch (error) {
        logger.error('Error processing escrow auto-release', error, {
          service: 'escrow-auto-release',
          escrowId: escrow.id,
        });
        results.errors++;
      }
    }

    logger.info('Escrow auto-release processing cycle completed', {
      service: 'escrow-auto-release',
      results,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Error in escrow auto-release cron', error, {
      service: 'escrow-auto-release',
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

