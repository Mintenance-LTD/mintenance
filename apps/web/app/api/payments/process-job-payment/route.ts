import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRFFromCookieAuth } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';

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
 * Reuses the create-intent pipeline (validation/idempotency/escrow creation),
 * then confirms the PaymentIntent with a selected saved payment method.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 20,
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
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    await requireCSRFFromCookieAuth(request);

    const user = await getUserFromRequest(request);
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

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

    const createIntentResponse = await fetch(`${request.nextUrl.origin}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization') as string } : {}),
        ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie') as string } : {}),
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

    const confirmedIntent = await stripe.paymentIntents.confirm(createIntentData.paymentIntentId, {
      payment_method: paymentMethodId,
      setup_future_usage: saveForFuture ? 'off_session' : undefined,
    });

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
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      logger.error('Stripe process payment error', error, { service: 'payments' });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return handleAPIError(error);
  }
}
