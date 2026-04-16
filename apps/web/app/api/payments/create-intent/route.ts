import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { paymentIntentSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
} from '@/lib/idempotency';
import { NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 20 } },
  async (request: NextRequest, { user }) => {
    try {
      // Validate and sanitize input using Zod schema
      const validation = await validateRequest(request, paymentIntentSchema);
      if ('headers' in validation) {
        // Validation failed - return error response
        return validation;
      }

      const { amount, currency, jobId, contractorId, metadata } =
        validation.data;

      // Monitor transaction for anomalies (non-blocking: payment proceeds even if monitoring fails)
      try {
        const { PaymentMonitoringService } =
          await import('@/lib/monitoring/payment-monitor');
        const anomalyCheck = await PaymentMonitoringService.detectAnomalies(
          user.id,
          {
            userId: user.id,
            amount,
            currency: currency || 'gbp',
            type: 'payment',
            metadata: {
              jobId,
              contractorId,
              ip: request.headers.get('x-forwarded-for') || undefined,
            },
          }
        );

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
        logger.error(
          'Anomaly detection failed, proceeding with payment',
          monitoringError,
          {
            service: 'payments',
            userId: user.id,
            jobId,
          }
        );
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
          jobId,
        });
        throw new NotFoundError('Job not found');
      }

      if (job.homeowner_id !== user.id) {
        logger.warn('Unauthorized payment intent creation attempt', {
          service: 'payments',
          userId: user.id,
          jobId,
          homeownerId: job.homeowner_id,
        });
        return NextResponse.json(
          { error: 'Only the homeowner can create payments' },
          { status: 403 }
        );
      }

      if (!job.contractor_id) {
        logger.warn('Payment intent creation for job without contractor', {
          service: 'payments',
          userId: user.id,
          jobId,
        });
        throw new BadRequestError('Job has no assigned contractor');
      }

      // Verify contract is signed by both parties before allowing payment
      const { data: contract, error: contractError } = await serverSupabase
        .from('contracts')
        .select('id, status')
        .eq('job_id', jobId)
        .eq('status', 'accepted')
        .single();

      if (contractError || !contract) {
        logger.warn('Payment attempted without accepted contract', {
          service: 'payments',
          userId: user.id,
          jobId,
          contractError: contractError?.message,
        });
        throw new BadRequestError(
          'Contract must be signed by both parties before payment can be created'
        );
      }

      // P0-2 FIX: Server-authoritative payment amount.
      //
      // Previously this route accepted a client-supplied `amount` and only
      // capped it against the accepted bid — which still let homeowners
      // UNDERPAY (e.g. submit £1 against a £500 bid). We now require an
      // accepted bid and use its amount as the single source of truth for
      // what goes to Stripe + escrow. The client-supplied amount is only
      // used to detect tampering (logged, warning, but not trusted).
      const { data: acceptedBid } = await serverSupabase
        .from('bids')
        .select('amount, status')
        .eq('job_id', jobId)
        .eq('contractor_id', contractorId)
        .eq('status', 'accepted')
        .single();

      if (!acceptedBid || typeof acceptedBid.amount !== 'number') {
        logger.warn('Payment intent attempted without accepted bid', {
          service: 'payments',
          userId: user.id,
          jobId,
          contractorId,
        });
        throw new BadRequestError(
          'Cannot create payment: no accepted bid exists for this job and contractor.'
        );
      }

      if (acceptedBid.amount <= 0) {
        logger.error(
          'Accepted bid has non-positive amount — data integrity issue',
          {
            service: 'payments',
            userId: user.id,
            jobId,
            contractorId,
            bidAmount: acceptedBid.amount,
          }
        );
        throw new BadRequestError('Accepted bid has an invalid amount.');
      }

      // Absolute hard cap to guard against a data-entry error on the bid.
      const ABSOLUTE_MAX_PAYMENT = 100000; // £100,000 hard cap
      if (acceptedBid.amount > ABSOLUTE_MAX_PAYMENT) {
        logger.error('Accepted bid exceeds absolute platform maximum', {
          service: 'payments',
          userId: user.id,
          jobId,
          bidAmount: acceptedBid.amount,
          absoluteMax: ABSOLUTE_MAX_PAYMENT,
        });
        throw new BadRequestError('Bid amount exceeds platform maximum.');
      }

      // If the client supplied a different amount, record it for forensics
      // but use the server-authoritative amount from the accepted bid.
      if (Math.round(amount * 100) !== Math.round(acceptedBid.amount * 100)) {
        logger.warn(
          'Client-supplied payment amount diverged from accepted bid; using server amount',
          {
            service: 'payments',
            userId: user.id,
            jobId,
            clientAmount: amount,
            bidAmount: acceptedBid.amount,
          }
        );
      }

      // From here on, this is THE amount — do not trust `amount` further.
      const authoritativeAmount = acceptedBid.amount;

      // Idempotency check - prevent duplicate payment intent creation
      const idempotencyKey = getIdempotencyKeyFromRequest(
        request,
        'create_payment_intent',
        user.id,
        jobId
      );

      // Sprint 5.1: checkIdempotency now throws IdempotencyStoreUnavailableError
      // (a ServiceUnavailableError subclass) on store errors instead of
      // silently returning null. That error propagates through withApiHandler
      // → handleAPIError which returns a clean 503. No explicit try/catch
      // needed here — the failure path is fail-CLOSED by construction.
      const idempotencyCheck = await checkIdempotency(
        idempotencyKey,
        'create_payment_intent'
      );
      if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
        logger.info(
          'Duplicate payment intent creation detected, returning cached result',
          {
            service: 'payments',
            idempotencyKey,
            userId: user.id,
            jobId,
          }
        );
        return NextResponse.json(idempotencyCheck.cachedResult);
      }

      // Record payment attempt using the server-authoritative amount
      await serverSupabase.from('payment_attempts').insert({
        user_id: user.id,
        amount: authoritativeAmount,
        currency: currency || 'gbp',
        status: 'pending',
        ip_address:
          request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        user_agent: request.headers.get('user-agent') || null,
        metadata: { jobId, contractorId, clientAmount: amount },
        created_at: new Date().toISOString(),
      });

      // Deterministic idempotency key: same job + homeowner + contractor always
      // produces the same key. Including contractor_id (WBE-P1-2) prevents a
      // retry from landing on the wrong contractor if the job was reassigned
      // between the first attempt and the retry. Our internal idempotency
      // check prevents duplicates reaching Stripe; this is a second layer.
      const stripeIdempotencyKey = `payment_intent_${jobId}_${user.id}_${job.contractor_id}`;

      // Create Stripe PaymentIntent with timeout to prevent hanging requests.
      // Amount is derived server-side from the accepted bid, NOT the client payload.
      const paymentIntent = await stripeWithTimeout(
        () =>
          stripe.paymentIntents.create(
            {
              amount: Math.round(authoritativeAmount * 100), // Convert to cents
              currency: (currency || 'gbp').toLowerCase(),
              description:
                metadata?.description || `Payment for job: ${job.title}`,
              metadata: {
                jobId,
                homeownerId: user.id,
                contractorId: job.contractor_id,
                bidAmount: authoritativeAmount.toString(),
              },
              // Enable automatic payment methods
              automatic_payment_methods: {
                enabled: true,
              },
            },
            {
              idempotencyKey: stripeIdempotencyKey,
            }
          ),
        'create-payment-intent',
        10000 // 10 second timeout
      );

      // Check for existing escrow record to prevent duplicates
      // (e.g. user refreshes payment page, or idempotency cache expired)
      const { data: existingEscrow } = await serverSupabase
        .from('escrow_transactions')
        .select(
          'id, job_id, payer_id, payee_id, amount, status, payment_intent_id, created_at'
        )
        .eq('job_id', jobId)
        .eq('payment_intent_id', paymentIntent.id)
        .single();

      let escrowTransaction = existingEscrow;
      let escrowError = null;

      if (!existingEscrow) {
        // Create escrow transaction record. Amount is the server-authoritative
        // bid amount — the source of truth for later release to contractor.
        const { data: newEscrow, error: insertError } = await serverSupabase
          .from('escrow_transactions')
          .insert({
            job_id: jobId,
            payer_id: user.id, // Homeowner who pays
            payee_id: job.contractor_id, // Contractor who receives
            amount: authoritativeAmount,
            status: 'pending',
            payment_intent_id: paymentIntent.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select(
            'id, job_id, payer_id, payee_id, amount, status, payment_intent_id, created_at'
          )
          .single();
        escrowTransaction = newEscrow;
        escrowError = insertError;
      } else {
        logger.info('Reusing existing escrow record for payment intent', {
          service: 'payments',
          userId: user.id,
          jobId,
          escrowId: existingEscrow.id,
          paymentIntentId: paymentIntent.id,
        });
      }

      if (escrowError || !escrowTransaction) {
        logger.error('Error creating escrow transaction', escrowError, {
          service: 'payments',
          userId: user.id,
          jobId,
          paymentIntentId: paymentIntent.id,
        });
        // Try to cancel the payment intent if DB insert fails
        await stripe.paymentIntents.cancel(paymentIntent.id).catch((err) =>
          logger.error(
            'Failed to cancel payment intent after escrow error',
            err,
            {
              service: 'payments',
              paymentIntentId: paymentIntent.id,
            }
          )
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
        amount: authoritativeAmount,
        currency,
        escrowTransactionId: escrowTransaction.id,
      });

      // Payment notification moved to confirm-intent (only notify after payment actually succeeds)

      const responseData = {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        escrowTransactionId: escrowTransaction.id,
        amount: authoritativeAmount,
        currency,
      };

      // Store idempotency result
      await storeIdempotencyResult(
        idempotencyKey,
        'create_payment_intent',
        responseData,
        user.id,
        {
          jobId,
          paymentIntentId: paymentIntent.id,
          escrowTransactionId: escrowTransaction.id,
        }
      );

      return NextResponse.json(responseData);
    } catch (error) {
      // Use sanitized error handling for payment-specific errors
      const { createPaymentErrorResponse } =
        await import('@/lib/errors/payment-errors');

      const errorResponse = createPaymentErrorResponse(error, {
        operation: 'create_payment_intent',
        userId: user.id,
        ip: request.headers.get('x-forwarded-for') || undefined,
      });

      return NextResponse.json(
        {
          error: errorResponse.error,
          code: errorResponse.code,
          retryable: errorResponse.retryable,
        },
        { status: errorResponse.status }
      );
    }
  }
);
