import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
import { logger } from '@mintenance/shared';
import {
  APIError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';

/**
 * GET /api/jobs/[id]/payment-details
 * Get payment details including platform fees calculated server-side
 * SECURITY: Prevents client-side fee manipulation
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const { id: jobId } = params as { id: string };

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(
        'id, title, budget, homeowner_id, payer_user_id, contractor_id, status'
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.error('Failed to fetch job for payment details', {
        error: jobError,
        jobId,
        userId: user.id,
      });
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id && job.payer_user_id !== user.id) {
      logger.warn('[SECURITY] Unauthorized payment details access attempt', {
        jobId,
        userId: user.id,
        homeownerId: job.homeowner_id,
        payerUserId: job.payer_user_id,
      });
      throw new ForbiddenError(
        'Only the homeowner or designated payer can view payment details'
      );
    }

    // Match intent creation: only the assigned contractor's accepted bid is payable.
    // A budget is an estimate, never an agreed payment amount.
    const bidResult = job.contractor_id
      ? await serverSupabase
          .from('bids')
          .select('amount')
          .eq('job_id', jobId)
          .eq('contractor_id', job.contractor_id)
          .eq('status', 'accepted')
          .maybeSingle()
      : { data: null, error: null };
    if (bidResult.error) {
      throw new APIError(
        'PAYMENT_QUOTE_UNAVAILABLE',
        'Could not verify the accepted bid. Please retry.',
        503
      );
    }
    const acceptedBid = bidResult.data;
    const acceptedBidAmount = Number(acceptedBid?.amount);
    const paymentAmount =
      acceptedBid && Number.isFinite(acceptedBidAmount) && acceptedBidAmount > 0
        ? acceptedBidAmount
        : null;

    if (paymentAmount === null) {
      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          title: job.title,
          budget: job.budget ?? null,
          status: job.status,
        },
        fees: null,
        breakdown: {
          acceptedBidAmount: null,
          jobBudget: job.budget ?? null,
          platformFee: 0,
          stripeFee: 0,
          totalToPay: 0,
          contractorReceives: 0,
        },
        reason: 'no_payment_amount_yet',
      });
    }

    const contractorTier = await FeeCalculationService.resolveContractorTier(
      job.contractor_id!
    );
    const feeBreakdown = FeeCalculationService.calculateFees(paymentAmount, {
      paymentType: 'final',
      contractorTier,
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        budget: job.budget,
        status: job.status,
      },
      fees: {
        platformFee: feeBreakdown.platformFee,
        platformFeeRate: feeBreakdown.platformFeeRate,
        stripeFee: feeBreakdown.stripeFee,
        totalFees: feeBreakdown.totalFees,
        totalAmount: feeBreakdown.originalAmount,
        contractorPayout: feeBreakdown.contractorAmount,
      },
      breakdown: {
        acceptedBidAmount: Number.isFinite(acceptedBidAmount)
          ? acceptedBidAmount
          : null,
        jobBudget: job.budget,
        platformFee: feeBreakdown.platformFee,
        stripeFee: feeBreakdown.stripeFee,
        totalToPay: feeBreakdown.originalAmount,
        contractorReceives: feeBreakdown.contractorAmount,
      },
    });
  }
);
