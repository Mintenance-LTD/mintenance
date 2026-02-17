import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getUserFromRequest } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRFFromCookieAuth } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';

const setDefaultSchema = z.object({
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
});

/**
 * POST /api/payments/set-default
 * Set a payment method as the default for the user
 */
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
    await requireCSRFFromCookieAuth(request);

    // Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, setDefaultSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentMethodId } = validation.data;

    // Get user's Stripe customer ID (column may not exist in DB schema)
    let stripeCustomerId: string | null = null;
    const { data: stripeData } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (stripeData) {
      stripeCustomerId = (stripeData as Record<string, unknown>).stripe_customer_id as string | null;
    }

    // Fallback: search Stripe by email
    if (!stripeCustomerId) {
      const { data: profileData } = await serverSupabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
      if (profileData?.email) {
        const existing = await stripe.customers.list({ email: profileData.email, limit: 1 });
        stripeCustomerId = existing.data[0]?.id || null;
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'User or Stripe customer not found' },
        { status: 404 }
      );
    }

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== stripeCustomerId) {
      return NextResponse.json(
        { error: 'Payment method does not belong to this user' },
        { status: 403 }
      );
    }

    // Set as default payment method
    await stripe.customers.update(stripeCustomerId!, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    logger.info('Default payment method set successfully', {
      service: 'payments',
      userId: user.id,
      paymentMethodId,
    });

    return NextResponse.json({
      success: true,
      paymentMethodId,
    });
  } catch (error) {
    logger.error('Error setting default payment method', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to set default payment method' },
      { status: 500 }
    );
  }
}

