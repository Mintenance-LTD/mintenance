import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

const processPaymentSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  amount: z.number().positive('Amount must be positive').max(10000, 'Amount exceeds maximum (£10,000)'),
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
  saveForFuture: z.boolean().optional().default(false),
});

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
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, processPaymentSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { jobId, amount, paymentMethodId, saveForFuture } = validation.data;

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Only the homeowner can pay for this job');
    }

    if (!job.contractor_id) {
      throw new BadRequestError('Job has no assigned contractor');
    }

    // Use NEXT_PUBLIC_APP_URL for internal call — never forward cookies to prevent SSRF
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const createIntentResponse = await fetch(`${appUrl}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization') as string } : {}),
      },
      body: JSON.stringify({
        amount,
        currency: 'gbp',
        jobId,
        contractorId: job.contractor_id,
      }),
    });

    const createIntentData = await createIntentResponse.json() as CreateIntentResponse;
    if (!createIntentResponse.ok || !createIntentData.paymentIntentId) {
      return NextResponse.json(
        { error: createIntentData.error || 'Failed to create payment intent' },
        { status: createIntentResponse.status || 400 }
      );
    }

    let confirmedIntent: Stripe.PaymentIntent;
    try {
      confirmedIntent = await stripe.paymentIntents.confirm(createIntentData.paymentIntentId, {
        payment_method: paymentMethodId,
        setup_future_usage: saveForFuture ? 'off_session' : undefined,
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        logger.error('Stripe process payment error', error, { service: 'payments' });
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    if (confirmedIntent.status === 'requires_action' || confirmedIntent.status === 'requires_confirmation') {
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

    await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', confirmedIntent.id);

    return NextResponse.json({
      success: true,
      paymentIntentId: confirmedIntent.id,
      escrowTransactionId: createIntentData.escrowTransactionId,
    });
  }
);
