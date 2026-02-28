import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkApiRateLimit } from '@/lib/rate-limiter';
import { getIdempotencyKeyFromRequest, checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';
import { ForbiddenError, NotFoundError, RateLimitError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { refundRequestSchema } from '@/lib/validation/schemas';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/payments/refund
 * Process a refund for an escrow transaction with MFA and anomaly detection
 */
export const POST = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Custom rate limiting - key on userId + IP to prevent both enumeration and per-user abuse
    const ip = request.headers.get('x-real-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]
      || 'unknown';
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

    // Idempotency check - prevent duplicate refunds (with distributed locking)
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'refund_payment',
      user.id,
      escrowTransactionId
    );

    // Use distributed locking for idempotency check
    const idempotencyCheck = await checkIdempotency(idempotencyKey, 'refund_payment', true);
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info('Duplicate refund request detected, returning cached result', {
        service: 'payments',
        idempotencyKey,
        userId: user.id,
        escrowTransactionId,
      });
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    // Check if lock contention occurred
    if (idempotencyCheck === null) {
      logger.warn('Lock contention detected for refund', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
      });
      return NextResponse.json(
        { error: 'Request is being processed. Please wait and try again.' },
        { status: 409 }
      );
    }

    // Verify job ownership
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // SECURITY: Enhanced refund authorization logic
    const isHomeowner = job.homeowner_id === user.id;
    const isContractor = job.contractor_id === user.id;

    if (!isHomeowner && !isContractor) {
      throw new ForbiddenError('Unauthorized');
    }

    // Get escrow transaction (query both column names for payment intent ID)
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, amount, status, payment_intent_id, stripe_payment_intent_id, created_at, released_at, refunded_at')
      .eq('id', escrowTransactionId)
      .eq('job_id', jobId)
      .single();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow transaction not found');
    }

    // SECURITY: Only allow refunds in specific scenarios
    if (!isHomeowner) {
      logger.warn('Non-homeowner attempted refund', {
        service: 'payments',
        userId: user.id,
        role: user.role,
        jobId
      });
      return NextResponse.json(
        { error: 'Only the homeowner who paid can request a refund' },
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
        { error: `Cannot refund payment with status: ${escrow.status}. Only held payments can be refunded.` },
        { status: 400 }
      );
    }

    // Use whichever column has the payment intent ID
    const paymentIntentId = escrow.payment_intent_id || escrow.stripe_payment_intent_id;
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment intent ID found' },
        { status: 400 }
      );
    }

    // Calculate refund amount (full or partial) — use toFixed(0) to avoid float drift
    const refundAmount = amount
      ? Math.min(Math.round(Number((amount * 100).toFixed(0))), Math.round(Number((escrow.amount * 100).toFixed(0))))
      : Math.round(Number((escrow.amount * 100).toFixed(0)));

    const refundAmountDollars = refundAmount / 100;

    // MFA requirement check for high-risk refunds
    const { requiresMFA, HighRiskOperation } = await import('@/lib/payments/high-risk-checks');
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

      const { validateMFAForPayment } = await import('@/lib/payments/high-risk-checks');
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
    const { PaymentMonitoringService } = await import('@/lib/monitoring/payment-monitor');
    const anomalyCheck = await PaymentMonitoringService.detectAnomalies(user.id, {
      userId: user.id,
      amount: refundAmountDollars,
      currency: 'gbp',
      type: 'refund',
      metadata: {
        jobId,
        escrowTransactionId,
        ip: request.headers.get('x-forwarded-for') || undefined,
      },
    });

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

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: reason ? 'requested_by_customer' : undefined,
      metadata: {
        jobId,
        escrowTransactionId,
        requestedBy: user.id,
        reason: reason || 'No reason provided',
      },
    });

    // Update escrow transaction with retry logic
    // CRITICAL: Stripe refund already succeeded, so DB must reflect this
    let updatedEscrow: Record<string, unknown> | null = null;
    let updateError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowTransactionId)
        .select()
        .single();

      if (!result.error) {
        updatedEscrow = result.data;
        updateError = null;
        break;
      }

      updateError = result.error;
      logger.error(`Escrow DB update failed (attempt ${attempt}/3)`, result.error, {
        service: 'payments',
        userId: user.id,
        jobId,
        escrowTransactionId,
        refundId: refund.id,
      });

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    if (updateError) {
      logger.error('CRITICAL: Stripe refund succeeded but escrow DB update failed after 3 retries', updateError, {
        service: 'payments',
        userId: user.id,
        jobId,
        escrowTransactionId,
        refundId: refund.id,
        stripeRefundStatus: refund.status,
      });

      // Attempt to create a reconciliation record
      await serverSupabase
        .from('escrow_transactions')
        .update({
          admin_hold_status: 'needs_reconciliation',
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowTransactionId);
    }

    // Update job status if needed
    await serverSupabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);

    logger.info('Refund processed successfully', {
      service: 'payments',
      userId: user.id,
      jobId,
      refundId: refund.id,
      amount: refundAmount / 100
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
  }
);
