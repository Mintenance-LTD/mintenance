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
export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (_request, { user, params }) => {
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
    throw new ForbiddenError('Only the job homeowner can view payment details');
  }

  const feeBreakdown = FeeCalculationService.calculateFees(job.budget, {
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
      jobBudget: job.budget,
      platformFee: feeBreakdown.platformFee,
      stripeFee: feeBreakdown.stripeFee,
      totalToPay: feeBreakdown.originalAmount,
      contractorReceives: feeBreakdown.contractorAmount,
    },
  });
});
