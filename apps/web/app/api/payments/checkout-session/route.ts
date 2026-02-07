import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';

const bodySchema = z.object({
  amount: z.number().int().positive(),
  jobId: z.string().uuid(),
  contractorId: z.string().uuid(),
  currency: z.string().trim().min(3).max(10).optional().default('usd'),
});

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 20
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
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

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
      // Don't reveal if job exists or not - return generic error
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
  } catch (err) {
    logger.error('Failed to create checkout session', err, { service: 'payments' });
    // SECURITY: Don't expose error details to client
    throw new InternalServerError('Failed to create checkout session');
  }
}
