import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const bodySchema = z.object({
  amount: z.number().int().positive(),
  jobId: z.string().uuid(),
  contractorId: z.string().uuid(),
  currency: z.string().trim().min(3).max(10).optional().default('gbp'),
});

/**
 * POST /api/payments/checkout-session
 * Create a checkout session via Supabase Edge Function
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
      .select('id, title, budget, homeowner_id, contractor_id')
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
      throw new ForbiddenError('Only the homeowner can initiate payment checkout');
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

    const metadata = {
      jobId,
      jobTitle: jobData.title ?? 'Untitled Job',
      contractorId,
      payerId: user.id,
    };

    const { data: paymentIntent, error: functionError } = await serverSupabase
      .functions
      .invoke('create-payment-intent', {
        body: {
          amount,
          currency,
          metadata,
          jobId,
          contractorId,
        },
      });

    if (functionError) {
      logger.error('Failed to create payment intent', functionError, {
        service: 'payments',
        jobId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to create payment intent');
    }

    if (!paymentIntent?.client_secret) {
      throw new InternalServerError('Payment provider did not return a client secret');
    }

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount ?? amount,
      currency: paymentIntent.currency ?? currency,
      status: paymentIntent.status,
    });
  }
);
