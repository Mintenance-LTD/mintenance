/**
 * Submit Bid API Route
 * 
 * Handles bid submission from contractors.
 * Refactored to use extracted modules for better maintainability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { checkApiRateLimit } from '@/lib/rate-limiter';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { requireCSRF } from '@/lib/csrf';
import { getIdempotencyKeyFromRequest, checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';
import { submitBidSchema, type SubmitBidInput } from './validation';
import { processBid, getDatabaseErrorMessage } from './bid-processor';
import { prepareQuoteData, processQuote } from './quote-processor';
import { sendBidNotifications } from './notifications';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await checkApiRateLimit(`submit-bid:${ip}`);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized bid submission attempt', { service: 'contractor' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to submit bid', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      return NextResponse.json({ error: 'Only contractors can submit bids' }, { status: 403 });
    }

    // Check subscription requirement
    const { requireSubscriptionForAction } = await import('@/lib/middleware/subscription-check');
    const subscriptionCheck = await requireSubscriptionForAction(request, 'submit_bid');
    if (subscriptionCheck) {
      return subscriptionCheck;
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('Invalid JSON in bid submission request', {
        service: 'contractor',
        error: parseError instanceof Error ? parseError.message : 'Unknown error'
      });
      return NextResponse.json(
        { error: 'Invalid request format. Please ensure the request body is valid JSON.' },
        { status: 400 }
      );
    }

    // Idempotency check - prevent duplicate bid submissions
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'submit_bid',
      user.id,
      typeof body === 'object' && body !== null && 'jobId' in body ? String(body.jobId) : ''
    );

    const idempotencyCheck = await checkIdempotency(idempotencyKey, 'submit_bid');
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info('Duplicate bid submission detected, returning cached result', {
        service: 'contractor',
        idempotencyKey,
        userId: user.id,
        jobId: typeof body === 'object' && body !== null && 'jobId' in body ? String(body.jobId) : '',
      });
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    // Validate request body
    let validatedData: SubmitBidInput;
    try {
      validatedData = submitBidSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn('Invalid bid submission data', {
          service: 'contractor',
          errors: validationError.issues
        });
        return NextResponse.json({
          error: 'Invalid bid data',
          details: validationError.issues
        }, { status: 400 });
      }
      throw validationError;
    }

    // Check if job exists and is accepting bids (include homeowner details for email)
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        budget,
        homeowner_id,
        homeowner:homeowner_id (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', validatedData.jobId)
      .single();

    if (jobError || !job) {
      logger.warn('Bid submitted for non-existent job', {
        service: 'contractor',
        jobId: validatedData.jobId,
        contractorId: user.id
      });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if job is open for bids
    if (job.status !== 'posted' && job.status !== 'open') {
      logger.warn('Bid submitted for closed job', {
        service: 'contractor',
        jobId: validatedData.jobId,
        jobStatus: job.status
      });
      return NextResponse.json({ error: 'This job is no longer accepting bids' }, { status: 400 });
    }

    // Validate bid amount doesn't exceed job budget
    if (job.budget) {
      const bidAmountCents = Math.round(validatedData.bidAmount * 100);
      const budgetCents = Math.round(job.budget * 100);

      if (bidAmountCents > budgetCents) {
        logger.warn('Bid amount exceeds job budget', {
          service: 'contractor',
          jobId: validatedData.jobId,
          bidAmount: validatedData.bidAmount,
          jobBudget: job.budget,
          contractorId: user.id
        });
        return NextResponse.json({
          error: `Bid amount ($${validatedData.bidAmount.toFixed(2)}) cannot exceed job budget ($${job.budget.toFixed(2)})`
        }, { status: 400 });
      }

      // Check if budget might have been reduced after bids were submitted
      const { count: existingBidCount } = await serverSupabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', validatedData.jobId)
        .neq('status', 'withdrawn');

      if (existingBidCount && existingBidCount > 0) {
        const { data: existingBids } = await serverSupabase
          .from('bids')
          .select('amount, contractor_id, status')
          .eq('job_id', validatedData.jobId)
          .neq('status', 'withdrawn');

        const budgetReduced = existingBids?.some(bid => {
          const bidAmountCents = Math.round(bid.amount * 100);
          return bidAmountCents > budgetCents;
        });

        if (budgetReduced) {
          logger.warn('Budget appears to have been reduced after bids were submitted', {
            service: 'contractor',
            jobId: validatedData.jobId,
            currentBudget: job.budget,
            existingBidCount,
          });
        }
      }
    }

    // Get pricing recommendation (async, don't block)
    const pricingRecommendation = await PricingAgent.generateRecommendation(
      validatedData.jobId,
      user.id,
      validatedData.bidAmount
    ).catch((error) => {
      logger.error('Error generating pricing recommendation', error, {
        service: 'contractor',
        jobId: validatedData.jobId,
      });
      return null;
    });

    // Calculate competitiveness score if recommendation exists
    let competitivenessScore: number | undefined;
    let pricingRecommendationId: string | undefined;
    let suggestedPriceRange: Record<string, number> | undefined;

    if (pricingRecommendation) {
      competitivenessScore = pricingRecommendation.competitivenessScore;
      pricingRecommendationId = pricingRecommendation.id || undefined;
      suggestedPriceRange = {
        min: pricingRecommendation.recommendedMinPrice,
        max: pricingRecommendation.recommendedMaxPrice,
        optimal: pricingRecommendation.recommendedOptimalPrice,
      };
    }

    // Prepare the bid payload
    const bidPayload = {
      job_id: validatedData.jobId,
      contractor_id: user.id,
      amount: validatedData.bidAmount,
      description: (validatedData.proposalText || '').trim(),
      status: 'pending' as const,
      competitiveness_score: competitivenessScore,
      pricing_recommendation_id: pricingRecommendationId,
      suggested_price_range: suggestedPriceRange,
      was_price_recommended: pricingRecommendation
        ? Math.abs(validatedData.bidAmount - pricingRecommendation.recommendedOptimalPrice) < 0.01
        : false,
      updated_at: new Date().toISOString(),
    };

    // Process bid creation or update
    let bid: unknown;
    let isUpdate: boolean;
    try {
      const result = await processBid(validatedData, user.id, bidPayload);
      bid = result.bid;
      isUpdate = result.isUpdate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const dbError = error as { code?: string; message?: string };
      
      // Check if it's a database error we can handle
      if (dbError.code || dbError.message) {
        const userMessage = getDatabaseErrorMessage(dbError);
        return NextResponse.json({ error: userMessage }, { status: 400 });
      }

      // Re-throw if it's not a database error
      throw error;
    }

    if (!bid || typeof bid !== 'object' || !('id' in bid)) {
      logger.error('Bid creation/update failed but no error was thrown', {
        service: 'contractor',
        contractorId: user.id,
        jobId: validatedData.jobId,
      });
      return NextResponse.json({ error: 'Failed to submit bid' }, { status: 500 });
    }

    // Process quote creation or update
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    const homeownerName = homeowner
      ? `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() || 'Client'
      : 'Client';
    const homeownerEmail = homeowner?.email || '';

    const quotePayload = prepareQuoteData(
      validatedData,
      user.id,
      job.title,
      homeownerName,
      homeownerEmail
    );

    // Get existing quote ID from bid
    const { data: bidWithQuote } = await serverSupabase
      .from('bids')
      .select('quote_id')
      .eq('id', (bid as { id: string }).id)
      .single();

    const existingQuoteId = bidWithQuote?.quote_id || null;

    await processQuote(quotePayload, existingQuoteId, (bid as { id: string }).id);

    // Send notifications (only for new bids, not updates)
    await sendBidNotifications(
      job.homeowner,
      user,
      job,
      validatedData,
      isUpdate
    );

    logger.info('Bid submitted successfully', {
      service: 'contractor',
      bidId: (bid as { id: string }).id,
      contractorId: user.id,
      jobId: validatedData.jobId,
      bidAmount: validatedData.bidAmount
    });

    // Trigger auto-accept evaluation asynchronously (fire-and-forget)
    if (!isUpdate && (bid as { status?: string }).status === 'pending') {
      BidAcceptanceAgent.evaluateAutoAccept(
        (bid as { id: string }).id,
        validatedData.jobId,
        homeowner?.id || '',
        {
          jobId: validatedData.jobId,
          userId: homeowner?.id,
          contractorId: user.id,
        }
      ).catch((error) => {
        logger.error('Error in auto-accept evaluation', {
          service: 'contractor',
          jobId: validatedData.jobId,
          bidId: (bid as { id: string }).id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }

    const responseData = {
      success: true,
      updated: isUpdate,
      message: isUpdate
        ? 'Your bid has been updated successfully.'
        : 'Your bid has been submitted successfully.',
      bid: {
        id: (bid as { id: string }).id,
        jobId: validatedData.jobId,
        bidAmount: validatedData.bidAmount,
        status: (bid as { status?: string }).status || 'pending',
        createdAt: (bid as { created_at?: string }).created_at
      }
    };

    // Store idempotency result for future duplicate requests
    await storeIdempotencyResult(
      idempotencyKey,
      'submit_bid',
      responseData,
      user.id,
      { jobId: validatedData.jobId, bidId: (bid as { id: string }).id }
    );

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid bid submission data', {
        service: 'contractor',
        errors: error.issues
      });
      return NextResponse.json({
        error: 'Invalid bid data',
        details: error.issues
      }, { status: 400 });
    }

    // Log complete error details
    logger.error('Unexpected error in submit-bid', {
      service: 'contractor',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });

    const devInfo = process.env.NODE_ENV !== 'production' && error && typeof error === 'object'
      ? {
          devError: {
            type: error instanceof Error ? error.constructor.name : typeof error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }
        }
      : {};

    return NextResponse.json({
      error: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
      ...devInfo,
    }, { status: 500 });
  }
}
