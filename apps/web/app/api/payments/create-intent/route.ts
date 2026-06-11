import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { paymentIntentSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseIdempotencyClaim,
} from '@/lib/idempotency';
import { NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 20 } },
  async (request: NextRequest, { user }) => {
    // Declared outside the try so the catch can release the claim if any
    // post-claim step throws. Stays undefined when the throw happens
    // before the claim was made — guarded in the catch.
    let claimedIdempotencyKey: string | undefined;
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
              ip: getClientIp(request),
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

      // Verify job exists and user is the designated payer
      // R6 #19: when payer_user_id is set on the job (landlord / agency
      // flow), only THAT user can fund escrow. When NULL, fall back to
      // homeowner_id (the poster).
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select(
          'id, homeowner_id, payer_user_id, is_rental_property, title, contractor_id, budget, status'
        )
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

      const authorizedPayerId =
        (job.payer_user_id as string | null) || job.homeowner_id;

      if (authorizedPayerId !== user.id) {
        logger.warn('Unauthorized payment intent creation attempt', {
          service: 'payments',
          userId: user.id,
          jobId,
          homeownerId: job.homeowner_id,
          payerUserId: job.payer_user_id,
        });
        return NextResponse.json(
          { error: 'Only the designated payer can fund this job' },
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

      // Verify contract is signed by both parties before allowing payment.
      // 2026-05-13 audit: also pull the contract id so the escrow row can
      // carry it in metadata for later reconciliation / dispute analysis.
      const { data: contract, error: contractError } = await serverSupabase
        .from('contracts')
        .select('id, status, quote_id')
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
        .select('id, amount, status, quote_id')
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

      // 2026-05-26 audit-60 P2: removed the legacy `acceptedBid > job.budget`
      // 400 gate. The open-bidding model (see /api/contractor/submit-bid)
      // already dropped the symmetric cap on the contractor side — bids
      // are free-form prices the homeowner can knowingly accept above
      // any budget hint. Keeping the cap here meant a legacy-budget job
      // where the homeowner accepted a higher bid would fail at the
      // payment step with no recourse short of editing the job row.
      // The absolute platform hard cap below stays in place as the
      // data-integrity backstop.

      // 2026-05-26 audit-60 P1: block a second payment intent for a
      // job that already has a non-terminal escrow row. Previously
      // the dedup check ran AFTER Stripe PaymentIntent creation and
      // matched on (job_id, payment_intent_id) — so a second intent
      // (different id) for the same job sailed through and inserted
      // a new escrow row. Live DB observation: one job already has
      // both `pending` and `failed` escrow rows. Held / pending /
      // release_pending / completed all mean the job's escrow life-
      // cycle is in progress — refuse the new attempt. `failed`,
      // `cancelled`, and `refunded` are terminal and don't block a
      // retry. Use serverSupabase (RLS-bypass) so the check sees
      // every row, not just the caller's-visible ones.
      const BLOCKING_ESCROW_STATUSES = [
        'pending',
        'held',
        'release_pending',
        'completed',
      ];
      const { data: blockingEscrowRows, error: blockingEscrowErr } =
        await serverSupabase
          .from('escrow_transactions')
          .select('id, status, payment_intent_id, created_at')
          .eq('job_id', jobId)
          .in('status', BLOCKING_ESCROW_STATUSES);

      if (blockingEscrowErr) {
        logger.error(
          'Failed to check existing escrow before payment intent',
          blockingEscrowErr,
          { service: 'payments', userId: user.id, jobId }
        );
        // Fail closed — better to ask the user to retry than to risk
        // a duplicate escrow row.
        throw new BadRequestError(
          'Could not verify escrow state. Please try again in a moment.'
        );
      }

      if (blockingEscrowRows && blockingEscrowRows.length > 0) {
        const existing = blockingEscrowRows[0];
        logger.warn('Payment intent attempted with non-terminal escrow', {
          service: 'payments',
          userId: user.id,
          jobId,
          existingEscrowId: existing?.id,
          existingStatus: existing?.status,
        });
        const message =
          existing?.status === 'held' ||
          existing?.status === 'release_pending' ||
          existing?.status === 'completed'
            ? 'Payment has already been received for this job.'
            : 'A payment is already in progress for this job. Please wait a moment and refresh.';
        throw new BadRequestError(message);
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
      let authoritativeAmount = acceptedBid.amount;

      // 2026-05-25 audit-45 P0: idempotency check moved BEFORE the
      // referral credit spend. Previously the order was:
      //   1. spendCredit() — debits user_credits  ← side effect
      //   2. checkIdempotency() — returns cached on duplicate
      // A duplicate request returned the cached PaymentIntent but had
      // ALREADY spent the credit a second time, so a user with £20
      // credit who double-tapped Pay could end up at £0 credit while
      // only one real payment landed. spendCredit is not idempotent
      // by itself (it inserts a credit_ledger debit row each call).
      // The new order is: idempotency claim FIRST, credit spend INSIDE
      // the "not a duplicate" branch.

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
      // We own the claim from this point onward. Track so the outer catch
      // can release it if any later step fails.
      if (!idempotencyCheck?.isDuplicate) {
        claimedIdempotencyKey = idempotencyKey;
      }
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

      // R7 #8 neighbour referral: spend any accrued credit before the
      // Stripe charge. Amounts on this route are in pounds — convert to
      // pence, cap at the amount due, then translate back. A tiny
      // minimum of £1 is left on the card so Stripe always has a
      // reserve to hold escrow against.
      //
      // 2026-05-25 audit-45 P0: moved here from above the idempotency
      // claim so duplicate requests can't double-debit user_credits.
      let creditAppliedPence = 0;
      try {
        const { NeighbourhoodReferralService } =
          await import('@/lib/services/referrals/NeighbourhoodReferralService');
        const amountPence = Math.round(authoritativeAmount * 100);
        const maxSpendPence = Math.max(0, amountPence - 100); // keep £1 floor
        if (maxSpendPence > 0) {
          creditAppliedPence = await NeighbourhoodReferralService.spendCredit(
            user.id,
            maxSpendPence,
            'escrow_payment',
            jobId
          );
          if (creditAppliedPence > 0) {
            authoritativeAmount = (amountPence - creditAppliedPence) / 100;
          }
        }
      } catch (creditErr) {
        logger.warn('Credit spend hook failed, continuing at full price', {
          service: 'payments',
          userId: user.id,
          jobId,
          err:
            creditErr instanceof Error ? creditErr.message : String(creditErr),
        });
      }

      // Record payment attempt using the server-authoritative amount
      await serverSupabase.from('payment_attempts').insert({
        user_id: user.id,
        amount: authoritativeAmount,
        currency: currency || 'gbp',
        status: 'pending',
        ip_address: getClientIp(request),
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

      // 2026-06-11 P1: attach the payer's Stripe customer to the
      // PaymentIntent. When the homeowner pays with a SAVED card, that
      // payment method is attached to their customer, and Stripe rejects
      // confirmation unless the PaymentIntent also carries that customer
      // ("The payment_method ... belongs to the Customer ... Please
      // include the Customer in the customer parameter"). Without this,
      // every escrow funding via a saved card failed at confirm time.
      // Read via service-role (stripe_customer_id is grant-locked). Omit
      // when absent (first-time payer entering a fresh card still works).
      const { data: payerProfile } = await serverSupabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();
      const payerCustomerId = payerProfile?.stripe_customer_id ?? undefined;

      // Create Stripe PaymentIntent with timeout to prevent hanging requests.
      // Amount is derived server-side from the accepted bid, NOT the client payload.
      const paymentIntent = await stripeWithTimeout(
        () =>
          stripe.paymentIntents.create(
            {
              amount: Math.round(authoritativeAmount * 100), // Convert to cents
              currency: (currency || 'gbp').toLowerCase(),
              ...(payerCustomerId ? { customer: payerCustomerId } : {}),
              description:
                metadata?.description || `Payment for job: ${job.title}`,
              metadata: {
                jobId,
                homeownerId: job.homeowner_id,
                payerId: user.id,
                contractorId: job.contractor_id,
                bidId: acceptedBid.id,
                contractId: contract.id,
                // The contractor_quotes row that produced the bid. Stays
                // null on legacy bids without a quote; lets reconciliation
                // tie a refunded escrow back to the original itemised
                // breakdown without a join.
                quoteId: contract.quote_id || acceptedBid.quote_id || '',
                bidAmount: authoritativeAmount.toString(),
                isRentalProperty: String(Boolean(job.is_rental_property)),
                creditAppliedPence: String(creditAppliedPence),
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
        //
        // 2026-05-13 traceability audit: the schema has no `bid_id` /
        // `contract_id` FK columns on `escrow_transactions`, but does
        // have a flexible `metadata` JSONB. Stash the references there
        // so dispute analysis + reconciliation can walk back to the
        // exact bid + contract + quote without re-deriving from
        // `job_id` (which would be ambiguous if a job ever cycled
        // through multiple acceptances after a rollback).
        const { data: newEscrow, error: insertError } = await serverSupabase
          .from('escrow_transactions')
          .insert({
            job_id: jobId,
            payer_id: user.id, // Homeowner who pays
            payee_id: job.contractor_id, // Contractor who receives
            amount: authoritativeAmount,
            status: 'pending',
            payment_intent_id: paymentIntent.id,
            metadata: {
              bid_id: acceptedBid.id,
              contract_id: contract.id,
              quote_id: contract.quote_id || acceptedBid.quote_id || null,
              credit_applied_pence: creditAppliedPence,
              source: 'create-intent',
            },
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
      // Release the pending idempotency claim so the user can retry
      // immediately rather than wait for the 60s stale-takeover window.
      // Only released if the claim was actually acquired in this request
      // (claimedIdempotencyKey is set after a successful checkIdempotency
      // returned non-duplicate). Wrapped so a release failure can't
      // suppress the user-facing error response below.
      if (claimedIdempotencyKey) {
        try {
          await releaseIdempotencyClaim(
            claimedIdempotencyKey,
            'create_payment_intent'
          );
        } catch {
          // Swallow: the 60s stale-takeover is the backstop.
        }
      }

      // Use sanitized error handling for payment-specific errors
      const { createPaymentErrorResponse } =
        await import('@/lib/errors/payment-errors');

      const errorResponse = createPaymentErrorResponse(error, {
        operation: 'create_payment_intent',
        userId: user.id,
        ip: getClientIp(request),
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
