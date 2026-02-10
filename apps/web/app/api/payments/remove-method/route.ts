import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';

const removeMethodSchema = z.object({
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
});

/**
 * DELETE /api/payments/remove-method
 * Detach a payment method from the user
 */
export async function DELETE(request: NextRequest) {
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

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, removeMethodSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentMethodId } = validation.data;

    // Retrieve payment method to verify ownership
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod.customer) {
      return NextResponse.json(
        { error: 'Payment method not attached to any customer' },
        { status: 400 }
      );
    }

    // Verify the payment method belongs to this user's customer
    // Use users table to match add-method route behavior
    const { data: userData, error: userError } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.stripe_customer_id) {
      logger.warn('User has no Stripe customer record', {
        service: 'payments',
        userId: user.id
      });
      return NextResponse.json(
        { error: 'Customer account not found. Please add a payment method first.' },
        { status: 404 }
      );
    }

    if (paymentMethod.customer !== userData.stripe_customer_id) {
      logger.warn('Payment method ownership verification failed', {
        service: 'payments',
        userId: user.id,
        paymentMethodId,
        expectedCustomerId: userData.stripe_customer_id,
        actualCustomerId: paymentMethod.customer
      });
      return NextResponse.json(
        { error: 'Payment method does not belong to user' },
        { status: 403 }
      );
    }

    // Detach payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    logger.info('Payment method removed successfully', {
      service: 'payments',
      userId: user.id,
      paymentMethodId
    });

    return NextResponse.json({
      success: true,
      paymentMethodId,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    logger.error('Error removing payment method', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}
