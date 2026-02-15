import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { paymentIntentSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { getIdempotencyKeyFromRequest, checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, InternalServerError, BadRequestError } from '@/lib/errors/api-error';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { rateLimiter } from '@/lib/rate-limiter';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 20
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(20),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection - requireCSRF throws on failure, catch block handles it
    await requireCSRF(request);

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to create payment');
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, paymentIntentSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { amount, currency, jobId, contractorId, metadata } = validation.data;

    // Monitor transaction for anomalies (non-blocking: payment proceeds even if monitoring fails)
    try {
      const { PaymentMonitoringService } = await import('@/lib/monitoring/payment-monitor');
      const anomalyCheck = await PaymentMonitoringService.detectAnomalies(user.id, {
        userId: user.id,
        amount,
        currency: currency || 'gbp',
        type: 'payment',
        metadata: {
          jobId,
          contractorId,
          ip: request.headers.get('x-forwarded-for') || undefined,
        },
      });

      // Block if high risk
      if (anomalyCheck.blockedReasons.length > 0) {
        logger.warn('Payment blocked due to security concerns', {
          service: 'payments',
          userId: user.id,
          jobId,
          amount,
          riskScore: anomalyCheck.riskScore,
          blockedReasons: anomalyCheck.blockedReasons,
        });

        return NextResponse.json(
          {
            error: 'Payment blocked for security reasons',
            reasons: anomalyCheck.blockedReasons,
            riskScore: anomalyCheck.riskScore,
          },
          { status: 403 }
        );
      }

      // Log warnings if anomalous but not blocked
      if (anomalyCheck.isAnomalous) {
        logger.warn('Anomalous payment detected but allowed', {
          service: 'payments',
          userId: user.id,
          jobId,
          amount,
          riskScore: anomalyCheck.riskScore,
          reasons: anomalyCheck.reasons,
        });
      }
    } catch (monitoringError) {
      logger.error('Anomaly detection failed, proceeding with payment', monitoringError, {
        service: 'payments',
        userId: user.id,
        jobId,
      });
    }

    // Verify job exists and user is the homeowner
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, title, contractor_id, budget, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.warn('Payment intent creation for non-existent job', {
        service: 'payments',
        userId: user.id,
        jobId
      });
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      logger.warn('Unauthorized payment intent creation attempt', {
        service: 'payments',
        userId: user.id,
        jobId,
        homeownerId: job.homeowner_id
      });
      throw new ForbiddenError('Only the homeowner can create payments');
    }

    if (!job.contractor_id) {
      logger.warn('Payment intent creation for job without contractor', {
        service: 'payments',
        userId: user.id,
        jobId
      });
      throw new BadRequestError('Job has no assigned contractor');
    }

    // Validate payment amount against job budget or accepted bid
    // First check if there's an accepted bid
    const { data: acceptedBid } = await serverSupabase
      .from('bids')
      .select('amount, status')
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .eq('status', 'accepted')
      .single();

    // SECURITY FIX: Always set a maximum, even if no bid or budget exists
    const DEFAULT_MAX_PAYMENT = 50000; // £50,000 fail-safe maximum
    let maxAllowedAmount: number = DEFAULT_MAX_PAYMENT;

    if (acceptedBid) {
      // Use accepted bid amount as the maximum
      maxAllowedAmount = acceptedBid.amount;
    } else if (job.budget) {
      // Fall back to job budget if no accepted bid
      maxAllowedAmount = job.budget;
    } else {
      // No bid or budget - log warning and use fail-safe
      logger.warn('Payment intent with no bid or budget - using fail-safe maximum', {
        service: 'payments',
        userId: user.id,
        jobId,
        requestedAmount: amount,
        failSafeMax: DEFAULT_MAX_PAYMENT,
      });
    }

    // Validate amount doesn't exceed maximum allowed
    if (maxAllowedAmount) {
      const amountCents = Math.round(amount * 100);
      const maxAllowedCents = Math.round(maxAllowedAmount * 100);
      
      if (amountCents > maxAllowedCents) {
        logger.warn('Payment intent amount exceeds allowed maximum', {
          service: 'payments',
          userId: user.id,
          jobId,
          requestedAmount: amount,
          maxAllowedAmount,
          hasAcceptedBid: !!acceptedBid,
        });
        return NextResponse.json({
          error: `Payment amount (£${amount.toFixed(2)}) cannot exceed ${acceptedBid ? 'accepted bid' : 'job budget'} (£${maxAllowedAmount.toFixed(2)})`,
          maxAllowedAmount,
        }, { status: 400 });
      }
    }

    // Validate amount is positive and reasonable
    if (amount <= 0) {
      return NextResponse.json({
        error: 'Payment amount must be greater than zero',
      }, { status: 400 });
    }

    if (amount > 100000) {
      return NextResponse.json({
        error: 'Payment amount exceeds maximum allowed (£100,000)',
      }, { status: 400 });
    }

    // Idempotency check - prevent duplicate payment intent creation
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'create_payment_intent',
      user.id,
      jobId
    );

    const idempotencyCheck = await checkIdempotency(idempotencyKey, 'create_payment_intent');
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info('Duplicate payment intent creation detected, returning cached result', {
        service: 'payments',
        idempotencyKey,
        userId: user.id,
        jobId,
      });
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    // Record payment attempt
    await serverSupabase.from('payment_attempts').insert({
      user_id: user.id,
      amount,
      currency: currency || 'gbp',
      status: 'pending',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: request.headers.get('user-agent') || null,
      metadata: { jobId, contractorId },
      created_at: new Date().toISOString(),
    });

    // Generate idempotency key for Stripe (separate from our internal idempotency)
    // Using UUID for better collision resistance than timestamp
    const stripeIdempotencyKey = `payment_intent_${jobId}_${user.id}_${crypto.randomUUID()}`;

    // Create Stripe PaymentIntent with timeout to prevent hanging requests
    const paymentIntent = await stripeWithTimeout(
      () => stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: (currency || 'gbp').toLowerCase(),
        description: metadata?.description || `Payment for job: ${job.title}`,
        metadata: {
          jobId,
          homeownerId: user.id,
          contractorId: job.contractor_id,
        },
        // Enable automatic payment methods
        automatic_payment_methods: {
          enabled: true,
        },
      }, {
        idempotencyKey: stripeIdempotencyKey,
      }),
      'create-payment-intent',
      10000 // 10 second timeout
    );

    // Create escrow transaction record
    // CRITICAL FIX: Include payer_id (homeowner) and payee_id (contractor) so payment history queries work
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .insert({
        job_id: jobId,
        payer_id: user.id, // Homeowner who pays
        payee_id: job.contractor_id, // Contractor who receives
        amount,
        status: 'pending',
        payment_intent_id: paymentIntent.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (escrowError) {
      logger.error('Error creating escrow transaction', escrowError, {
        service: 'payments',
        userId: user.id,
        jobId,
        paymentIntentId: paymentIntent.id
      });
      // Try to cancel the payment intent if DB insert fails
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(err => 
        logger.error('Failed to cancel payment intent after escrow error', err, {
          service: 'payments',
          paymentIntentId: paymentIntent.id
        })
      );
      return NextResponse.json(
        { error: 'Failed to create escrow transaction' },
        { status: 500 }
      );
    }

    logger.info('Payment intent created successfully', {
      service: 'payments',
      userId: user.id,
      jobId,
      amount,
      currency,
      escrowTransactionId: escrowTransaction.id
    });

    // Payment notification moved to confirm-intent (only notify after payment actually succeeds)

    const responseData = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      escrowTransactionId: escrowTransaction.id,
      amount,
      currency,
    };

    // Store idempotency result
    await storeIdempotencyResult(
      idempotencyKey,
      'create_payment_intent',
      responseData,
      user.id,
      { jobId, paymentIntentId: paymentIntent.id, escrowTransactionId: escrowTransaction.id }
    );

    return NextResponse.json(responseData);
  } catch (error) {
    // Use sanitized error handling
    const { createPaymentErrorResponse } = await import('@/lib/errors/payment-errors');

    // Safely access user from getCurrentUserFromCookies if not in scope
    let userId: string | undefined;
    try {
      const userFromCookies = await getCurrentUserFromCookies();
      userId = userFromCookies?.id;
    } catch {
      userId = undefined;
    }

    const errorResponse = createPaymentErrorResponse(error, {
      operation: 'create_payment_intent',
      userId,
      ip: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json(
      {
        error: errorResponse.error,
        code: errorResponse.code,
        retryable: errorResponse.retryable
      },
      { status: errorResponse.status }
    );
  }
}
