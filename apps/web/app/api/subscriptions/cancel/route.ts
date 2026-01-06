import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf-validator';
import { z } from 'zod';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Validate CSRF
    if (!(await requireCSRF(request))) {
      throw new ForbiddenError('CSRF token validation failed');
    }

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await request.json();
    const validation = cancelSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { cancelAtPeriodEnd } = validation.data;

    // Get user's subscription
    const subscription = await SubscriptionService.getContractorSubscription(user.id);

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundError('No active subscription found');
    }

    // Cancel subscription
    const success = await SubscriptionService.cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelAtPeriodEnd
    );

    if (!success) {
      throw new InternalServerError('Failed to cancel subscription');
    }

    logger.info('Subscription canceled', {
      service: 'subscriptions',
      contractorId: user.id,
      subscriptionId: subscription.stripeSubscriptionId,
      cancelAtPeriodEnd,
    });

    return NextResponse.json({
      success: true,
      message: cancelAtPeriodEnd
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled immediately',
    });
  } catch (err) {
    logger.error('Error canceling subscription', {
      service: 'subscriptions',
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

