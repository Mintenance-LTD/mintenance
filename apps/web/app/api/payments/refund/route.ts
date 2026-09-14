import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkApiRateLimit } from '@/lib/rate-limiter';
import { getDeterministicIdempotencyKeyFromRequest } from '@/lib/idempotency';
import { createHash } from 'node:crypto';
import {
  readRefundContext,
  reserveRefund,
  recoverRefund,
} from '@/lib/services/payment/RefundService';
import {
  ForbiddenError,
  NotFoundError,
  RateLimitError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { refundRequestSchema } from '@/lib/validation/schemas';
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

    // Revalidate current resource authority before returning cached financial data.
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, payer_user_id, contractor_id, status')
      .eq('id', jobId)
      .single();
    if (jobError || !job) throw new NotFoundError('Job not found');
    const payerId = job.payer_user_id || job.homeowner_id;
    if (payerId !== user.id)
      throw new ForbiddenError(
        'Only the designated payer can request a refund'
      );

    // Get escrow transaction. NOTE: the live table only has
    // `payment_intent_id` — there is no `stripe_payment_intent_id`
    // column. Listing it made PostgREST reject the whole SELECT, so
    // `escrowError` was always set and every refund 500'd with
    // "Escrow transaction not found".
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        'id, job_id, payer_id, amount, status, payment_intent_id, created_at, released_at, refunded_at'
      )
      .eq('id', escrowTransactionId)
      .eq('job_id', jobId)
      .single();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow transaction not found');
    }

    if (escrow.payer_id !== user.id) {
      throw new ForbiddenError(
        'This payment belongs to another payer. Contact support for reconciliation.'
      );
    }

    // Get MFA token from header if present
    const mfaToken = request.headers.get('x-mfa-token');

    const clientRequestKey = getDeterministicIdempotencyKeyFromRequest(
      request,
      'refund_payment',
      user.id,
      escrowTransactionId,
      `${escrowTransactionId}:${typeof amount === 'number' ? amount : 'full'}`
    );

    const idempotencyKey = `refund:${createHash('sha256')
      .update(JSON.stringify([user.id, escrowTransactionId, clientRequestKey]))
      .digest('hex')}`;
    const context = await readRefundContext({
      escrowId: escrowTransactionId,
      actorId: user.id,
      requestKey: idempotencyKey,
      originalAmount: escrow.amount,
    });
    // Only allow refunds for jobs that are cancelled, disputed, or pending
    const refundableStatuses = ['cancelled', 'disputed', 'pending', 'posted'];
    if (!context.existing && !refundableStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot refund payment for job with status: ${job.status}` },
        { status: 400 }
      );
    }

    // Can only refund held payments (not released to contractor)
    if (!context.existing && escrow.status !== 'held') {
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

    // Omitted amount means the remaining principal, except that a retry
    // retains the original operation amount after settlement.
    const refundAmount =
      amount === undefined
        ? (context.existing?.gross_minor ?? context.remainingMinor)
        : Math.round(Number(amount) * 100);
    if (
      !Number.isSafeInteger(refundAmount) ||
      refundAmount <= 0 ||
      (!context.existing && refundAmount > context.remainingMinor)
    ) {
      return NextResponse.json(
        { error: 'Refund amount exceeds the available balance or is invalid' },
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

    const operation = await reserveRefund({
      actorId: user.id,
      jobId,
      escrowId: escrowTransactionId,
      requestKey: idempotencyKey,
      grossMinor: refundAmount,
      reason: reason || 'No reason provided',
    });
    const result = await recoverRefund(operation);
    const current = await readRefundContext({
      escrowId: escrowTransactionId,
      actorId: user.id,
      requestKey: idempotencyKey,
      originalAmount: escrow.amount,
    });
    const response = {
      success: result.state === 'succeeded',
      refundId: result.provider_refund_id || result.id,
      operationId: result.id,
      amount: result.gross_minor / 100,
      cashAmount: result.cash_minor / 100,
      creditReturned:
        result.state === 'succeeded' ? result.credit_minor / 100 : 0,
      remainingAmount: current.remainingMinor / 100,
      status: result.state,
      escrowTransactionId,
    };
    if (!response.success)
      return NextResponse.json(
        {
          ...response,
          error:
            result.state === 'failed' || result.state === 'canceled'
              ? 'The refund did not complete. Check its status before starting another request.'
              : 'The refund is still processing. Its funds remain reserved.',
        },
        { status: 503 }
      );
    return NextResponse.json(response);
  }
);
