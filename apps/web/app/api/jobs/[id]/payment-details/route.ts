import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

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
      .select('id, title, budget, homeowner_id, contractor_id, status')
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

    if (job.homeowner_id !== user.id) {
      logger.warn('[SECURITY] Unauthorized payment details access attempt', {
        jobId,
        userId: user.id,
        homeownerId: job.homeowner_id,
      });
      throw new ForbiddenError(
        'Only the job homeowner can view payment details'
      );
    }

    // Use accepted bid amount as the payment base (not job budget)
    const { data: acceptedBid } = await serverSupabase
      .from('bids')
      .select('amount')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .maybeSingle();

    // 2026-05-23 audit P2: jobs.budget is now nullable (the 2026-05-22
    // budget-removal commit dropped homeowner budget collection). If no
    // bid has been accepted yet, there's no payment base at all — fall
    // back was throwing inside FeeCalculationService.calculateFees(null).
    // Return a "no_payment_amount_yet" shape so the caller can render an
    // empty-state instead of erroring.
    const paymentAmount: number | null =
      typeof acceptedBid?.amount === 'number'
        ? acceptedBid.amount
        : typeof job.budget === 'number'
          ? job.budget
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

    const feeBreakdown = FeeCalculationService.calculateFees(paymentAmount, {
      paymentType: 'final',
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
        acceptedBidAmount: acceptedBid?.amount ?? null,
        jobBudget: job.budget,
        platformFee: feeBreakdown.platformFee,
        stripeFee: feeBreakdown.stripeFee,
        totalToPay: feeBreakdown.originalAmount,
        contractorReceives: feeBreakdown.contractorAmount,
      },
    });
  }
);
