import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { POST as createIntent } from '@/app/api/payments/create-intent/route';

const bodySchema = z.object({
  amount: z.number().int().positive(),
  jobId: z.string().uuid(),
  contractorId: z.string().uuid(),
  currency: z.string().trim().min(3).max(10).optional().default('gbp'),
});

/**
 * POST /api/payments/checkout-session
 * Create a payment intent through the canonical payment flow.
 * Kept as a response-compatible adapter for older clients.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, bodySchema);
    if ('headers' in validation) {
      return validation;
    }

    const { amount, jobId, contractorId, currency } = validation.data;

    // SECURITY: Fix IDOR - check ownership in query, not after fetch
    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', jobId)
      .eq('homeowner_id', user.id) // Only fetch if user is homeowner
      .single();

    if (jobError || !jobData) {
      logger.warn('Job access denied or not found', {
        service: 'payments',
        jobId,
        userId: user.id,
        error: jobError?.message,
      });
      throw new NotFoundError('Job not found or access denied');
    }

    const isAdmin = user.role === 'admin';
    if (!isAdmin && jobData.homeowner_id !== user.id) {
      throw new ForbiddenError(
        'Only the homeowner can initiate payment checkout'
      );
    }

    if (!jobData.contractor_id) {
      throw new BadRequestError('Job does not have an assigned contractor');
    }

    if (jobData.contractor_id !== contractorId) {
      throw new BadRequestError('Contractor does not match job assignment');
    }

    if (amount <= 0) {
      throw new BadRequestError('Amount must be greater than zero');
    }

    // Compatibility adapter for older clients. The former implementation
    // invoked a `create-payment-intent` Supabase Edge Function that is not
    // shipped in this repository and bypassed the canonical contract/bid,
    // idempotency, Stripe and escrow state machine. `amount` is retained in
    // minor units for the legacy wire contract, then converted to pounds for
    // the canonical route (which treats the accepted bid as authoritative).
    const canonicalRequest = new NextRequest(
      new URL('/api/payments/create-intent', request.url),
      {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({
          amount: amount / 100,
          currency,
          jobId,
          contractorId,
        }),
      }
    );
    const paymentResponse = await createIntent(canonicalRequest, {
      params: Promise.resolve({}),
    });

    if (!paymentResponse.ok) {
      return paymentResponse;
    }

    const paymentIntent = (await paymentResponse.json()) as {
      paymentIntentId?: string;
      clientSecret?: string;
      amount?: number;
      currency?: string;
      status?: string;
    };

    if (!paymentIntent.paymentIntentId || !paymentIntent.clientSecret) {
      logger.error('Canonical payment intent response was incomplete', {
        service: 'payments',
        jobId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to create payment intent');
    }

    return NextResponse.json({
      payment_intent_id: paymentIntent.paymentIntentId,
      client_secret: paymentIntent.clientSecret,
      amount: paymentIntent.amount ?? amount / 100,
      currency: paymentIntent.currency ?? currency,
      status: paymentIntent.status,
    });
  }
);
