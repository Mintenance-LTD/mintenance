import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import {
  MAX_JOB_PAYMENT_GBP,
  MAX_JOB_PAYMENT_GBP_LABEL,
} from '@mintenance/api-contracts';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { createPaymentErrorResponse } from '@/lib/errors/payment-errors';

// Audit P2 (2026-05-10): `.strict()` ensures clients can't sneak
// `userId`/`escrowId`/`status` overrides past the server-authoritative
// payment flow.
const processPaymentSchema = z
  .object({
    jobId: z.string().uuid('Invalid job ID'),
    amount: z
      .number()
      .positive('Amount must be positive')
      .max(
        MAX_JOB_PAYMENT_GBP,
        `Amount exceeds maximum (${MAX_JOB_PAYMENT_GBP_LABEL})`
      ),
    paymentMethodId: z
      .string()
      .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
    saveForFuture: z.boolean().optional().default(false),
  })
  .strict();

type CreateIntentResponse = {
  clientSecret?: string;
  paymentIntentId?: string;
  escrowTransactionId?: string;
  error?: string;
};

/**
 * POST /api/payments/process-job-payment
 * Reuses the create-intent pipeline, then confirms the PaymentIntent
 * with a selected saved payment method.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20, criticality: 'payment' } },
  async (request, { user }) => {
    const validation = await validateRequest(request, processPaymentSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { jobId, amount, paymentMethodId, saveForFuture } = validation.data;

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, payer_user_id, contractor_id, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id && job.payer_user_id !== user.id) {
      throw new ForbiddenError(
        'Only the homeowner or designated payer can pay for this job'
      );
    }

    if (!job.contractor_id) {
      throw new BadRequestError('Job has no assigned contractor');
    }

    // Use NEXT_PUBLIC_APP_URL for the internal call. Browser sessions are
    // cookie-authenticated, so a same-origin call must carry the session
    // cookie; forwarding only Authorization made this route fail for normal
    // web users. Never forward cookies to a separately configured origin.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const appOrigin = new URL(appUrl).origin;
    const internalAuthHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authorization = request.headers.get('authorization');
    const cookie = request.headers.get('cookie');
    if (authorization) {
      internalAuthHeaders.Authorization = authorization;
    } else if (cookie && appOrigin === request.nextUrl.origin) {
      internalAuthHeaders.Cookie = cookie;
    }
    const createIntentResponse = await fetch(
      `${appUrl}/api/payments/create-intent`,
      {
        method: 'POST',
        headers: internalAuthHeaders,
        body: JSON.stringify({
          amount,
          currency: 'gbp',
          jobId,
          contractorId: job.contractor_id,
        }),
      }
    );

    const createIntentData =
      (await createIntentResponse.json()) as CreateIntentResponse;
    if (!createIntentResponse.ok || !createIntentData.paymentIntentId) {
      return NextResponse.json(
        { error: createIntentData.error || 'Failed to create payment intent' },
        { status: createIntentResponse.status || 400 }
      );
    }

    let confirmedIntent: Stripe.PaymentIntent;
    try {
      confirmedIntent = await stripe.paymentIntents.confirm(
        createIntentData.paymentIntentId,
        {
          payment_method: paymentMethodId,
          setup_future_usage: saveForFuture ? 'off_session' : undefined,
        }
      );
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        logger.error('Stripe process payment error', error, {
          service: 'payments',
        });
        const response = createPaymentErrorResponse(error, {
          operation: 'process_job_payment',
          userId: user.id,
          jobId,
        });
        return NextResponse.json(
          {
            error: response.error,
            code: response.code,
            retryable: response.retryable,
          },
          { status: response.status }
        );
      }
      throw error;
    }

    if (
      confirmedIntent.status === 'requires_action' ||
      confirmedIntent.status === 'requires_confirmation'
    ) {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: confirmedIntent.client_secret,
        paymentIntentId: confirmedIntent.id,
      });
    }

    if (confirmedIntent.status !== 'succeeded') {
      return NextResponse.json(
        {
          success: false,
          error: `Payment status: ${confirmedIntent.status}`,
          paymentIntentId: confirmedIntent.id,
        },
        { status: 400 }
      );
    }

    const { data: heldRows, error: escrowUpdateError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', confirmedIntent.id)
      .eq('status', 'pending')
      .select('id');

    if (escrowUpdateError) {
      logger.error(
        'Payment succeeded but escrow could not be held',
        escrowUpdateError,
        {
          service: 'payments',
          jobId,
          paymentIntentId: confirmedIntent.id,
        }
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'Payment succeeded but could not be recorded. Support has been notified.',
          paymentIntentId: confirmedIntent.id,
        },
        { status: 500 }
      );
    }

    if (!heldRows || heldRows.length === 0) {
      // A Stripe webhook may have completed this transition first. Accept
      // that state, but never report success for a missing or incompatible
      // escrow row.
      const { data: existingEscrow, error: existingEscrowError } = await serverSupabase
        .from('escrow_transactions')
        .select('id, status')
        .eq('payment_intent_id', confirmedIntent.id)
        .maybeSingle();

      if (existingEscrowError) {
        logger.error('Failed to verify escrow after payment confirmation', existingEscrowError, {
          service: 'payments',
          jobId,
          paymentIntentId: confirmedIntent.id,
        });
        return NextResponse.json(
          {
            success: false,
            error:
              'Payment succeeded but its recorded state could not be verified. Support has been notified.',
            paymentIntentId: confirmedIntent.id,
          },
          { status: 500 }
        );
      }

      if (!existingEscrow || existingEscrow.status !== 'held') {
        logger.error('Payment succeeded but escrow state is not held', {
          service: 'payments',
          jobId,
          paymentIntentId: confirmedIntent.id,
          escrowStatus: existingEscrow?.status ?? 'missing',
        });
        return NextResponse.json(
          {
            success: false,
            error:
              'Payment succeeded but could not be recorded. Support has been notified.',
            paymentIntentId: confirmedIntent.id,
          },
          { status: 500 }
        );
      }
    }

    // Keep the job-level payment flag aligned with the escrow transition.
    // The Stripe webhook normally performs this write, but this endpoint is
    // also the synchronous fallback when the client receives confirmation
    // first. Do not return success while the job still appears unpaid.
    const { error: jobPaymentError } = await serverSupabase
      .from('jobs')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (jobPaymentError) {
      logger.error(
        'Payment succeeded and escrow was held, but job payment status could not be updated',
        jobPaymentError,
        {
          service: 'payments',
          jobId,
          paymentIntentId: confirmedIntent.id,
        }
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'Payment succeeded but could not be fully recorded. Support has been notified.',
          paymentIntentId: confirmedIntent.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: confirmedIntent.id,
      escrowTransactionId: createIntentData.escrowTransactionId,
    });
  }
);
