import { NextRequest, NextResponse } from 'next/server';
import { POST as createIntent } from '@/app/api/payments/create-intent/route';
import { POST as confirmIntent } from '@/app/api/payments/confirm-intent/route';
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

    if ((job.payer_user_id || job.homeowner_id) !== user.id) {
      throw new ForbiddenError(
        'Only the homeowner or designated payer can pay for this job'
      );
    }

    if (!job.contractor_id) {
      throw new BadRequestError('Job has no assigned contractor');
    }

    // Preserve browser CSRF/session and mobile bearer authentication without
    // making an HTTP request to a separately configured deployment origin.
    const createIntentResponse = await createIntent(
      new NextRequest(new URL('/api/payments/create-intent', request.url), {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({
          amount,
          currency: 'gbp',
          jobId,
          contractorId: job.contractor_id,
        }),
      }),
      { params: Promise.resolve({}) }
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
          return_url: new URL(`/jobs/${jobId}`, request.url).toString(),
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

    const confirmation = await confirmIntent(
      new NextRequest(new URL('/api/payments/confirm-intent', request.url), {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({ paymentIntentId: confirmedIntent.id, jobId }),
      }),
      { params: Promise.resolve({}) }
    );
    if (!confirmation.ok) return confirmation;
    return NextResponse.json({
      success: true,
      paymentIntentId: confirmedIntent.id,
      escrowTransactionId: createIntentData.escrowTransactionId,
    });
  }
);
