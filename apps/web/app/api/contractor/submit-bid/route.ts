/**
 * Submit Bid API Route
 *
 * Handles bid submission from contractors.
 * Refactored to use extracted modules for better maintainability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger, JOB_STATUS } from '@mintenance/shared';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseOnError,
} from '@/lib/idempotency';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@/lib/errors/api-error';
import { submitBidSchema, type SubmitBidInput } from './validation';
import { processBid, getDatabaseErrorMessage } from './bid-processor';
import { prepareQuoteData, processQuote } from './quote-processor';
import { sendBidNotifications } from './notifications';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }): Promise<NextResponse> => {
    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // 2026-05-26 audit-63 P1: enforce the "verified before bidding"
    // product rule. The mobile onboarding banner already promises
    // "Finish verification to start bidding" — without this gate a
    // contractor with verification_status='pending' could submit
    // bids freely (live DB had one pending contractor with 8 bids
    // already). admin_verified is the legacy boolean some admin
    // tools still set; verification_status='verified' is the modern
    // value flipped by the admin-review approval flow. Accept either
    // to avoid blocking contractors mid-migration.
    const { data: verificationRow } = await serverSupabase
      .from('profiles')
      .select('verification_status, admin_verified')
      .eq('id', user.id)
      .single();
    const isVerified =
      verificationRow?.verification_status === 'verified' ||
      verificationRow?.admin_verified === true;
    if (!isVerified) {
      logger.info('Bid submission blocked: contractor not yet verified', {
        service: 'contractor',
        userId: user.id,
        verificationStatus: verificationRow?.verification_status ?? null,
        adminVerified: verificationRow?.admin_verified ?? null,
      });
      return NextResponse.json(
        {
          error:
            'Your contractor profile is still being verified. You can submit bids once an admin reviews your account.',
          code: 'CONTRACTOR_NOT_VERIFIED',
        },
        { status: 403 }
      );
    }

    // Check subscription requirement
    const { requireSubscriptionForAction, checkSubscriptionLimits } =
      await import('@/lib/middleware/subscription-check');
    const subscriptionCheck = await requireSubscriptionForAction(
      request,
      'submit_bid'
    );
    if (subscriptionCheck) {
      return subscriptionCheck;
    }

    // Enforce monthly bid limit by plan (Basic 10, Professional 50, Business unlimited)
    const limitResult = await checkSubscriptionLimits(user.id, 'submit_bid');
    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Bid limit reached',
          message:
            limitResult.reason ||
            'You have reached your monthly bid limit. Upgrade to submit more bids.',
        },
        { status: 402 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('Invalid JSON in bid submission request', {
        service: 'contractor',
        error:
          parseError instanceof Error ? parseError.message : 'Unknown error',
      });
      return NextResponse.json(
        {
          error:
            'Invalid request format. Please ensure the request body is valid JSON.',
        },
        { status: 400 }
      );
    }

    // Idempotency check - prevent duplicate bid submissions
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'submit_bid',
      user.id,
      typeof body === 'object' && body !== null && 'jobId' in body
        ? String(body.jobId)
        : ''
    );

    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'submit_bid'
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info(
        'Duplicate bid submission detected, returning cached result',
        {
          service: 'contractor',
          idempotencyKey,
          userId: user.id,
          jobId:
            typeof body === 'object' && body !== null && 'jobId' in body
              ? String(body.jobId)
              : '',
        }
      );
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    return await releaseOnError(idempotencyKey, 'submit_bid', async () => {
      // Validate request body
      const bodyData = body as Record<string, unknown>;
      logger.debug('[BID_SUBMIT] Raw request body', {
        service: 'contractor',
        bodyEstimatedDuration: bodyData.estimatedDuration,
        bodyProposedStartDate: bodyData.proposedStartDate,
        bodyEstimatedDurationType: typeof bodyData.estimatedDuration,
        jobId: bodyData.jobId,
        bidAmount: bodyData.bidAmount,
        proposalTextLength:
          typeof bodyData.proposalText === 'string'
            ? bodyData.proposalText.length
            : 0,
      });

      let validatedData: SubmitBidInput;
      try {
        validatedData = submitBidSchema.parse(body);
        logger.debug('[BID_SUBMIT] Validation passed', {
          service: 'contractor',
          estimatedDuration: validatedData.estimatedDuration,
          proposedStartDate: validatedData.proposedStartDate,
          estimatedDurationType: typeof validatedData.estimatedDuration,
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          // Format validation errors for better client feedback
          const errorMessages = validationError.issues.map((issue) => {
            const path = issue.path.join('.');
            return `${path}: ${issue.message}`;
          });

          logger.warn('[BID_SUBMIT] Validation failed', {
            service: 'contractor',
            errors: validationError.issues,
            errorMessages,
            bodyEstimatedDuration: bodyData.estimatedDuration,
            bodyProposedStartDate: bodyData.proposedStartDate,
            bodyEstimatedDurationType: typeof bodyData.estimatedDuration,
            jobId: bodyData.jobId,
            bidAmount: bodyData.bidAmount,
            proposalTextLength:
              typeof bodyData.proposalText === 'string'
                ? bodyData.proposalText.length
                : 0,
          });

          // Return first error message in a user-friendly format
          const firstError = validationError.issues[0];
          let userMessage = 'Invalid bid data';
          if (firstError) {
            if (firstError.path.includes('proposalText')) {
              if (firstError.code === 'too_small') {
                userMessage =
                  'Proposal description must be at least 50 characters';
              } else if (firstError.code === 'too_big') {
                userMessage =
                  'Proposal description cannot exceed 5000 characters';
              }
            } else if (firstError.path.includes('bidAmount')) {
              userMessage = 'Bid amount must be a positive number';
            } else if (firstError.path.includes('jobId')) {
              userMessage = 'Invalid job ID';
            } else if (firstError.path.includes('estimatedDuration')) {
              userMessage =
                'Estimated duration must be a positive number (in days)';
            } else if (firstError.path.includes('proposedStartDate')) {
              userMessage = 'Proposed start date must be in YYYY-MM-DD format';
            } else {
              userMessage = firstError.message;
            }
          }

          return NextResponse.json(
            {
              error: userMessage,
              details: validationError.issues,
              errorMessages,
            },
            { status: 400 }
          );
        }
        throw validationError;
      }

      // Check if job exists and is accepting bids (include homeowner details for email)
      const { data: job, error: jobError } = await userDb
        .from('jobs')
        .select(
          `
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
      `
        )
        .eq('id', validatedData.jobId)
        .single();

      if (jobError || !job) {
        logger.warn('Bid submitted for non-existent job', {
          service: 'contractor',
          jobId: validatedData.jobId,
          contractorId: user.id,
        });
        throw new NotFoundError('Job not found');
      }

      // Check if job is open for bids AND not already assigned
      if (job.status !== JOB_STATUS.POSTED && job.status !== 'open') {
        logger.warn('Bid submitted for closed job', {
          service: 'contractor',
          jobId: validatedData.jobId,
          jobStatus: job.status,
        });
        throw new BadRequestError('This job is no longer accepting bids');
      }

      // SECURITY: Prevent homeowners from bidding on their own jobs
      if (job.homeowner_id === user.id) {
        logger.warn('Self-bid attempt blocked', {
          service: 'contractor',
          jobId: validatedData.jobId,
          userId: user.id,
        });
        throw new ForbiddenError('You cannot bid on your own job');
      }

      // SECURITY FIX: Verify job is not already assigned to a contractor
      const { data: jobWithContractor } = await userDb
        .from('jobs')
        .select('contractor_id')
        .eq('id', validatedData.jobId)
        .single();

      if (jobWithContractor?.contractor_id) {
        logger.warn('Bid submitted for already assigned job', {
          service: 'contractor',
          jobId: validatedData.jobId,
          assignedContractor: jobWithContractor.contractor_id,
          attemptingContractor: user.id,
        });
        return NextResponse.json(
          {
            error: 'This job has already been assigned to a contractor',
          },
          { status: 400 }
        );
      }

      // 2026-05-23 audit: the budget cap was the last enforcement point
      // that contradicted the 2026-05-22 open-bidding rollout. The homeowner
      // no longer sets a budget; contractors set their own price with a
      // required justification. Keeping the server cap meant:
      //   * Mobile UI says "homeowners no longer set the budget" while the
      //     server still rejects bids above any legacy budget value.
      //   * `job.budget.toFixed(2)` (line 290 pre-fix) threw a TypeError
      //     when supabase-js returned NUMERIC as a string — turning a
      //     soft 400 into a 500 for any legacy job with a populated budget.
      //   * The "budget appears to have been reduced" warning was dead
      //     observability — it only fired when the cap fired.
      //
      // Cap removed. Bid amount validation now sits with the homeowner
      // (they pick the bid that fits) + the AI pricing recommendation
      // (which already informs contractors when their price is too low
      // or too high).

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
      const proposalText = (validatedData.proposalText || '').trim();
      const bidPayload = {
        job_id: validatedData.jobId,
        contractor_id: user.id,
        amount: validatedData.bidAmount,
        description: proposalText,
        message: proposalText, // Keep both columns in sync (canonical column is 'message')
        status: 'pending' as const,
        competitiveness_score: competitivenessScore,
        pricing_recommendation_id: pricingRecommendationId,
        suggested_price_range: suggestedPriceRange,
        was_price_recommended: pricingRecommendation
          ? Math.abs(
              validatedData.bidAmount -
                pricingRecommendation.recommendedOptimalPrice
            ) < 0.01
          : false,
        // Columns confirmed to exist via migration 20260320000001
        ...(validatedData.estimatedDuration !== undefined && {
          estimated_duration_days: validatedData.estimatedDuration,
        }),
        ...(validatedData.proposedStartDate && {
          proposed_start_date: validatedData.proposedStartDate,
        }),
        updated_at: new Date().toISOString(),
      };

      logger.debug('[BID_SUBMIT] Bid payload created', {
        service: 'contractor',
        hasEstimatedDuration: validatedData.estimatedDuration !== undefined,
        hasProposedStartDate: !!validatedData.proposedStartDate,
        estimatedDuration: validatedData.estimatedDuration,
        proposedStartDate: validatedData.proposedStartDate,
        // Note: estimated_duration and proposed_start_date are not included in payload
        // due to potential schema variations - see TODO above
      });

      // Process bid creation or update
      let bid: unknown;
      let isUpdate: boolean;
      try {
        logger.debug('[BID_SUBMIT] Calling processBid', {
          service: 'contractor',
          jobId: validatedData.jobId,
          contractorId: user.id,
          bidPayloadKeys: Object.keys(bidPayload),
          hasEstimatedDuration: 'estimated_duration' in bidPayload,
          hasProposedStartDate: 'proposed_start_date' in bidPayload,
        });

        const result = await processBid(validatedData, user.id, bidPayload);
        bid = result.bid;
        isUpdate = result.isUpdate;

        logger.debug('[BID_SUBMIT] processBid succeeded', {
          service: 'contractor',
          isUpdate,
          hasBidId: bid && typeof bid === 'object' && 'id' in bid,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const dbError = error as {
          code?: string;
          message?: string;
          details?: string;
          hint?: string;
        };

        // Log the actual database error details
        logger.error('[BID_SUBMIT] processBid failed', {
          service: 'contractor',
          errorMessage,
          errorCode: dbError.code,
          errorMessageFromDb: dbError.message,
          errorDetails: dbError.details,
          errorHint: dbError.hint,
          errorStack: error instanceof Error ? error.stack : undefined,
          jobId: validatedData.jobId,
          contractorId: user.id,
        });

        // Check if it's a database error we can handle
        if (dbError.code || dbError.message) {
          const userMessage = getDatabaseErrorMessage(dbError);
          logger.warn('[BID_SUBMIT] Returning database error to client', {
            service: 'contractor',
            userMessage,
            actualErrorCode: dbError.code,
            actualErrorMessage: dbError.message,
          });
          return NextResponse.json(
            {
              error: userMessage,
              // Include actual error details in development for debugging
              ...(process.env.NODE_ENV === 'development' && {
                debug: {
                  code: dbError.code,
                  message: dbError.message,
                  details: dbError.details,
                  hint: dbError.hint,
                },
              }),
            },
            { status: 400 }
          );
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
        throw new Error('Failed to submit bid');
      }

      // Process quote creation or update
      const homeowner = Array.isArray(job.homeowner)
        ? job.homeowner[0]
        : job.homeowner;
      const homeownerName = homeowner
        ? `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() ||
          'Client'
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
      const { data: bidWithQuote } = await userDb
        .from('bids')
        .select('quote_id')
        .eq('id', (bid as { id: string }).id)
        .single();

      const existingQuoteId = bidWithQuote?.quote_id || null;

      await processQuote(
        quotePayload,
        existingQuoteId,
        (bid as { id: string }).id
      );

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
        bidAmount: validatedData.bidAmount,
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
          createdAt: (bid as { created_at?: string }).created_at,
        },
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
    });
  }
);
