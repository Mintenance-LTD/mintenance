import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * GET /api/jobs/[id]/payment-details
 * Get payment details including platform fees calculated server-side
 * SECURITY: Prevents client-side fee manipulation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Get authenticated user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view payment details');
    }

    const { id: jobId } = await params;

    // Get job details
    const supabase = serverSupabase;
    const { data: job, error: jobError } = await supabase
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

    // Authorization: Only homeowner can get payment details
    if (job.homeowner_id !== user.id) {
      logger.warn('[SECURITY] Unauthorized payment details access attempt', {
        jobId,
        userId: user.id,
        homeownerId: job.homeowner_id,
      });
      throw new ForbiddenError('Only the job homeowner can view payment details');
    }

    // SECURITY: Calculate fees server-side to prevent client-side manipulation
    const feeBreakdown = FeeCalculationService.calculateFees(job.budget, {
      paymentType: 'final',
    });

    // Return payment details with server-calculated fees
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
  } catch (error) {
    return handleAPIError(error);
  }
}
