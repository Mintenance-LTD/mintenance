import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkApiRateLimit } from '@/lib/rate-limiter';
import {
  getDeterministicIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseIdempotencyClaim,
} from '@/lib/idempotency';
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  RateLimitError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { refundRequestSchema } from '@/lib/validation/schemas';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';

/**
 * POST /api/payments/refund
 * Process a refund for an escrow transaction with MFA and anomaly
 * detection.
 *
 * 2026-05-09: added an explicit `roles` lock at the framework
 * boundary. The downstream code already restricts refunds to the
 * designated payer (lines below), but the absent route-level lock
 * meant any authenticated role could enter the handler before being
 * rejected by the inner check — adds defense-in-depth and surfaces the
 * intent at the perimeter. Admin can hit the dedicated `/api/admin/refunds` endpoints.
 */
export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: false },
  async (request, { user }) => {
    // Custom rate limiting - key on userId + IP to prevent both enumeration and per-user abuse
    const ip = getClientIp(request);
    const rateLimitResult = await checkApiRateLimit(`refund:${user.id}:${ip}`);

    if (!rateLimitResult.allowed) {
      throw new RateLimitError();
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, refundRequestSchema);
    if (validation instanceof NextResponse) return validation;
    const { data } = validation;

    const { jobId, escrowTransactionId, amount, reason } = data;

    // Get MFA token from header if present
    const mfaToken = request.headers.get('x-mfa-token');

    // Idempotency check - prevent duplicate refunds (with distributed locking).
    // Audit 2026-07-27: deterministic header-less fallback so double-taps
    // dedupe without client cooperation. The requested amount is part of the
    // identity so a legitimately distinct second PARTIAL refund (different
    // amount, same escrow) within the 24h TTL is not swallowed by the cache.
    const idempotencyKey = getDeterministicIdempotencyKeyFromRequest(
      request,
      'refund_payment',
      user.id,
      `${escrowTransactionId}:${typeof amount === 'number' ? amount : 'full'}`
    );

    // Use distributed locking for idempotency check
    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'refund_payment',
      true
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info(
        'Duplicate refund request detected, returning cached result',
        {
          service: 'payments',
          idempotencyKey,
          userId: user.id,
          escrowTransactionId,
        }
      );
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    // Past the duplicate path. We own the claim — release it on failure
    // so the user can retry immediately rather than wait 60s for stale
    // takeover. (Note: checkIdempotency now THROWS on real contention, so
    // a `null` return from it would only mean "new request, proceed".)
    let escrowClaimed = false;
    let refundId: string | null = null;
    try {
      // Verify job access
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, homeowner_id, payer_user_id, contractor_id, status')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new NotFoundError('Job not found');
      }

      // SECURITY: Enhanced refund authorization logic
      const isHomeowner = job.homeowner_id === user.id;
      const isDesignatedPayer = job.payer_user_id === user.id;
      const isContractor = job.contractor_id === user.id;

      if (!isHomeowner && !isDesignatedPayer && !isContractor) {
        throw new ForbiddenError('Unauthorized');
      }

      // Get escrow transaction. NOTE: the live table only has
      // `payment_intent_id` — there is no `stripe_payment_intent_id`
      // column. Listing it made PostgREST reject the whole SELECT, so
      // `escrowError` was always set and every refund 500'd with
      // "Escrow transaction not found".
      const { data: escrow, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .select(
          'id, job_id, amount, status, payment_intent_id, created_at, released_at, refunded_at'
        )
        .eq('id', escrowTransactionId)
        .eq('job_id', jobId)
        .single();

      if (escrowError || !escrow) {
        throw new NotFoundError('Escrow transaction not found');
      }

      // SECURITY: Only allow refunds in specific scenarios
      if (!isHomeowner && !isDesignatedPayer) {
        logger.warn('Non-homeowner attempted refund', {
          service: 'payments',
          userId: user.id,
          role: user.role,
          jobId,
        });
        return NextResponse.json(
          { error: 'Only the designated payer can request a refund' },
          { status: 403 }
        );
      }

      // Only allow refunds for jobs that are cancelled, disputed, or pending
      const refundableStatuses = ['cancelled', 'disputed', 'pending', 'posted'];
      if (!refundableStatuses.includes(job.status)) {
        return NextResponse.json(
          { error: `Cannot refund payment for job with status: ${job.status}` },
          { status: 400 }
        );
      }

      // Can only refund held payments (not released to contractor)
      if (escrow.status !== 'held') {
        return NextResponse.json(
          {
            error: `Cannot refund payment with status: ${escrow.status}. Only held payments can be refunded.`,
          },
          { status: 400 }
        );
      }

      const paymentIntentId = escrow.payment_intent_id;
      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'No payment intent ID found' },
          { status: 400 }
        );
      }

      // Calculate refund amount (full or partial).
      // Guard against negative / zero / NaN client input — fall back to full
      // refund. Cap at escrow.amount so client can never inflate the refund.
      const escrowAmountCents = Math.round(
        Number((escrow.amount * 100).toFixed(0))
      );
      let refundAmount: number;
      if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
        const requestedCents = Math.round(Number((amount * 100).toFixed(0)));
        refundAmount = Math.min(requestedCents, escrowAmountCents);
      } else {
        // No amount supplied, non-positive, or NaN → default to full refund
        refundAmount = escrowAmountCents;
      }

      if (refundAmount <= 0) {
        logger.error(
          'Refund amount computed as non-positive — data integrity',
          {
            service: 'payments',
            userId: user.id,
            escrowTransactionId,
            escrowAmount: escrow.amount,
            requestedAmount: amount,
          }
        );
        return NextResponse.json(
          { error: 'Invalid refund amount' },
          { status: 400 }
        );
      }

      const refundAmountDollars = refundAmount / 100;

      // MFA requirement check for high-risk refunds
      const { requiresMFA, HighRiskOperation } =
        await import('@/lib/payments/high-risk-checks');
      const mfaCheck = await requiresMFA(
        HighRiskOperation.REFUND,
        refundAmountDollars,
        user.id
      );

      if (mfaCheck.required) {
        if (!mfaToken) {
          logger.warn('MFA required for refund but no token provided', {
            service: 'payments',
            userId: user.id,
            escrowTransactionId,
            amount: refundAmountDollars,
            riskScore: mfaCheck.riskScore,
          });

          return NextResponse.json(
            {
              error: 'MFA verification required',
              reason: mfaCheck.reason,
              riskScore: mfaCheck.riskScore,
              mfaRequired: true,
            },
            { status: 403 }
          );
        }

        const { validateMFAForPayment } =
          await import('@/lib/payments/high-risk-checks');
        const mfaValidation = await validateMFAForPayment(
          user.id,
          mfaToken,
          HighRiskOperation.REFUND
        );

        if (!mfaValidation.valid) {
          logger.warn('Invalid MFA token for refund', {
            service: 'payments',
            userId: user.id,
            escrowTransactionId,
            amount: refundAmountDollars,
          });

          return NextResponse.json(
            {
              error: 'MFA verification failed',
              reason: mfaValidation.reason,
              mfaRequired: true,
            },
            { status: 403 }
          );
        }

        logger.info('MFA validated successfully for refund', {
          service: 'payments',
          userId: user.id,
          escrowTransactionId,
          amount: refundAmountDollars,
        });
      }

      // Monitor refund for anomalies
      const { PaymentMonitoringService } =
        await import('@/lib/monitoring/payment-monitor');
      const anomalyCheck = await PaymentMonitoringService.detectAnomalies(
        user.id,
        {
          userId: user.id,
          amount: refundAmountDollars,
          currency: 'gbp',
          type: 'refund',
          metadata: {
            jobId,
            escrowTransactionId,
            ip: getClientIp(request),
          },
        }
      );

      // Block if high risk
      if (anomalyCheck.blockedReasons.length > 0) {
        logger.warn('Refund blocked due to security concerns', {
          service: 'payments',
          userId: user.id,
          escrowTransactionId,
          amount: refundAmountDollars,
          riskScore: anomalyCheck.riskScore,
          blockedReasons: anomalyCheck.blockedReasons,
        });

        return NextResponse.json(
          {
            error: 'Refund blocked for security reasons',
            reasons: anomalyCheck.blockedReasons,
            riskScore: anomalyCheck.riskScore,
          },
          { status: 403 }
        );
      }

      // Claim the held escrow before calling Stripe. The request idempotency
      // key protects retries of one request, but cannot serialize different
      // partial-refund amounts submitted concurrently.
      const { data: refundClaim, error: refundClaimError } =
        await serverSupabase
          .from('escrow_transactions')
          .update({
            status: 'release_pending',
            release_reason: 'refund_pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowTransactionId)
          .eq('status', 'held')
          .select('id')
          .maybeSingle();

      if (refundClaimError || !refundClaim) {
        throw new ConflictError(
          'This escrow was modified by another request. Refresh and try again.'
        );
      }
      escrowClaimed = true;

      // Create Stripe refund. Idempotency key keyed on escrow+amount+intent so
      // retries against the same protected operation don't issue a second refund.
      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: refundAmount,
          reason: reason ? 'requested_by_customer' : undefined,
          metadata: {
            jobId,
            escrowTransactionId,
            requestedBy: user.id,
            reason: reason || 'No reason provided',
          },
        },
        {
          idempotencyKey: `refund_${escrowTransactionId}_${paymentIntentId}_${refundAmount}`,
        }
      );
      refundId = refund.id;

      // Update escrow transaction with retry logic
      // CRITICAL: Stripe refund already succeeded, so DB must reflect this
      // A partial refund leaves the escrow held so the remaining balance can
      // be refunded later. Only a full refund is terminal.
      const isFullRefund = refundAmount >= escrowAmountCents;
      let updatedEscrow: Record<string, unknown> | null = null;
      let updateError: Error | null = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await serverSupabase
          .from('escrow_transactions')
          .update({
            status: isFullRefund ? 'refunded' : 'held',
            refunded_at: isFullRefund ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowTransactionId)
          .eq('status', 'release_pending')
          .select()
          .single();

        if (!result.error) {
          updatedEscrow = result.data;
          updateError = null;
          break;
        }

        updateError = result.error;
        logger.error(
          `Escrow DB update failed (attempt ${attempt}/3)`,
          result.error,
          {
            service: 'payments',
            userId: user.id,
            jobId,
            escrowTransactionId,
            refundId: refund.id,
          }
        );

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (updateError) {
        logger.error(
          'CRITICAL: Stripe refund succeeded but escrow DB update failed after 3 retries',
          updateError,
          {
            service: 'payments',
            userId: user.id,
            jobId,
            escrowTransactionId,
            refundId: refund.id,
            stripeRefundStatus: refund.status,
          }
        );

        // Record a reconciliation trail in escrow_audit_log — the canonical
        // recovery table, same pattern the release path uses for its twin
        // "money moved but DB stuck" failure.
        //
        // The previous code wrote admin_hold_status:'needs_reconciliation',
        // which (a) is not a permitted CHECK value, so the UPDATE always failed
        // with 23514 and the error was never inspected — the recovery trail was
        // silently dropped — and (b) even had it been valid, 'pending_review'-
        // style hold statuses are ACTIONABLE in the admin escrow queue: an
        // admin could "release" an escrow whose homeowner was already refunded,
        // paying the contractor as well (double loss). So we leave the escrow
        // status untouched and only append an audit row for operators to find.
        try {
          await serverSupabase.from('escrow_audit_log').insert({
            escrow_transaction_id: escrowTransactionId,
            // 'refunded' is the accurate CHECK-permitted action (the money was
            // refunded at Stripe). The reconciliation nuance — that the escrow
            // row didn't get its status flipped — lives in release_reason +
            // metadata. NOTE: escrow_audit_log.action's CHECK only allows
            // released/held/refunded/disputed/admin_override, so an out-of-set
            // value like 'reconciliation_needed' silently 23514s.
            action: 'refunded',
            actor_id: user.id,
            actor_role: user.role,
            job_id: jobId,
            amount: refundAmount / 100,
            release_reason: 'refund_succeeded_db_update_failed',
            is_admin_action: user.role === 'admin',
            metadata: {
              issue_type: 'refund_succeeded_db_update_failed',
              status: 'pending_review',
              refund_id: refund.id,
              stripe_refund_status: refund.status,
              update_error_message: updateError?.message,
            },
          });
        } catch (reconciliationErr: unknown) {
          logger.error(
            'Failed to create refund reconciliation record',
            reconciliationErr as Error,
            { service: 'payments', escrowTransactionId, refundId: refund.id }
          );
        }

        throw new InternalServerError(
          'Refund succeeded but recording it failed. Support must reconcile this payment.'
        );
      }

      // Update job status if needed. Stripe and escrow are already settled at
      // this point, so a failed job update must not be reported as a clean
      // success: it leaves the UI and downstream workflow inconsistent with
      // the refunded payment and requires reconciliation.
      const { data: cancelledJob, error: jobStatusError } = await serverSupabase
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .select('id')
        .maybeSingle();

      if (jobStatusError || !cancelledJob) {
        const effectiveError =
          jobStatusError ?? new Error('Job cancellation matched no rows');
        logger.error(
          'Refund succeeded but failed to cancel the associated job',
          effectiveError,
          {
            service: 'payments',
            userId: user.id,
            jobId,
            escrowTransactionId,
            refundId: refund.id,
          }
        );
        throw new InternalServerError(
          'Refund succeeded but the job status could not be updated. Support must reconcile this payment.'
        );
      }

      logger.info('Refund processed successfully', {
        service: 'payments',
        userId: user.id,
        jobId,
        refundId: refund.id,
        amount: refundAmount / 100,
      });

      const responseData = {
        success: true,
        refundId: refund.id,
        amount: refundAmount / 100,
        status: refund.status,
        escrowTransactionId: updatedEscrow?.id || escrowTransactionId,
      };

      // Store idempotency result
      await storeIdempotencyResult(
        idempotencyKey,
        'refund_payment',
        responseData,
        user.id,
        { jobId, escrowTransactionId, refundId: refund.id }
      );

      return NextResponse.json(responseData);
    } catch (err) {
      if (escrowClaimed && !refundId) {
        // Stripe did not create a refund, so release the payment claim and
        // allow a safe retry. Never do this after Stripe has returned a refund.
        await serverSupabase
          .from('escrow_transactions')
          .update({
            status: 'held',
            release_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowTransactionId)
          .eq('status', 'release_pending');
      }

      // Release the claim so the user can retry now instead of waiting
      // 60s for the stale-claim takeover. Swallow release failures — the
      // 60s backstop will still kick in.
      try {
        await releaseIdempotencyClaim(idempotencyKey, 'refund_payment');
      } catch {
        // intentional: don't let release failure mask the original error
      }
      throw err;
    }
  }
);
