import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRFFromCookieAuth } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/payments/create-setup-intent
 * Creates a SetupIntent so mobile/web clients can save cards for future payments.
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

    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('id, email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.email) {
      throw new NotFoundError('User not found');
    }

    let stripeCustomerId = (profile as Record<string, unknown>).stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      const existing = await stripe.customers.list({ email: profile.email, limit: 1 });
      stripeCustomerId = existing.data[0]?.id || null;
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
    }

    await serverSupabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',
      payment_method_types: ['card'],
    });

    return NextResponse.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      logger.error('Stripe setup intent error', error, { service: 'payments' });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return handleAPIError(error);
  }
}
