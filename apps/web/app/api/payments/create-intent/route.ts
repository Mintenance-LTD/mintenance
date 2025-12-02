import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { paymentIntentSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { getIdempotencyKeyFromRequest, checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';

// Initialize Stripe with secret key (server-side only)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured. Payment processing is disabled.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

export async function POST(request: NextRequest) {
  try {
    // CSRF protection - requireCSRF throws on failure, catch block handles it
    await requireCSRF(request);

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      logger.warn('Unauthorized payment intent creation attempt', {
        service: 'payments',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, paymentIntentSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { amount, currency, jobId, contractorId, metadata } = validation.data;

    // Monitor transaction for anomalies
    const { PaymentMonitoringService } = await import('@/lib/monitoring/payment-monitor');
    const anomalyCheck = await PaymentMonitoringService.detectAnomalies(user.id, {
      userId: user.id,
      amount,
      currency: currency || 'usd',
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
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.homeowner_id !== user.id) {
      logger.warn('Unauthorized payment intent creation attempt', {
        service: 'payments',
        userId: user.id,
        jobId,
        homeownerId: job.homeowner_id
      });
      return NextResponse.json({ error: 'Only the homeowner can create payments' }, { status: 403 });
    }

    if (!job.contractor_id) {
      logger.warn('Payment intent creation for job without contractor', {
        service: 'payments',
        userId: user.id,
        jobId
      });
      return NextResponse.json({ error: 'Job has no assigned contractor' }, { status: 400 });
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

    let maxAllowedAmount: number | null = null;
    
    if (acceptedBid) {
      // Use accepted bid amount as the maximum
      maxAllowedAmount = acceptedBid.amount;
    } else if (job.budget) {
      // Fall back to job budget if no accepted bid
      maxAllowedAmount = job.budget;
    }

    // Validate amount doesn't exceed maximum allowed
    if (maxAllowedAmount !== null) {
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
          error: `Payment amount ($${amount.toFixed(2)}) cannot exceed ${acceptedBid ? 'accepted bid' : 'job budget'} ($${maxAllowedAmount.toFixed(2)})`,
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
        error: 'Payment amount exceeds maximum allowed ($100,000)',
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
      currency: currency || 'usd',
      status: 'pending',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: request.headers.get('user-agent') || null,
      metadata: { jobId, contractorId },
      created_at: new Date().toISOString(),
    });

    // Generate idempotency key for Stripe (separate from our internal idempotency)
    // Using UUID for better collision resistance than timestamp
    const stripeIdempotencyKey = `payment_intent_${jobId}_${user.id}_${crypto.randomUUID()}`;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: (currency || 'usd').toLowerCase(),
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
    });

    // Create escrow transaction record
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .insert({
        job_id: jobId,
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
    const errorResponse = createPaymentErrorResponse(error, {
      operation: 'create_payment_intent',
      userId: user?.id,
      jobId: validation.data?.jobId,
      amount: validation.data?.amount,
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
