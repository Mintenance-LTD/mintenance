import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/payments/methods
 * Retrieve all payment methods for the authenticated user.
 *
 * 2026-04-30 audit P1: this used to be a "read" that created a Stripe
 * customer (`stripe.customers.create`) AND wrote `stripe_customer_id`
 * back to `profiles` whenever the user didn't have one yet. A GET
 * should not mutate state. The mutation paths
 * (`/api/payments/add-method`, `/api/payments/create-setup-intent`,
 * `/api/subscriptions/create`) all create the Stripe customer lazily
 * the first time the user actually intends to save a method or
 * subscribe — so this GET can safely return an empty list when no
 * `stripe_customer_id` exists. Side benefit: a misconfigured Stripe
 * key no longer causes screen-load failures for users who have no
 * methods to display anyway.
 */
export const GET = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Custom payment rate limiting
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMIT_CONFIGS.payment
    );
    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    // Get user profile + stripe_customer_id in a single query.
    const { data: userData, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      logger.error('Payment methods: profiles query failed', {
        service: 'payments',
        userId: user.id,
        errorCode: userError?.code,
        errorMessage: userError?.message,
      });
      throw new NotFoundError('User');
    }

    const stripeCustomerId =
      ((userData as Record<string, unknown>).stripe_customer_id as
        | string
        | null
        | undefined) ?? null;

    // No Stripe customer yet → user has no saved methods. Return an
    // empty list instead of provisioning a customer on a read.
    if (!stripeCustomerId) {
      const emptyResponse = NextResponse.json({
        paymentMethods: [],
        defaultPaymentMethodId: null,
      });
      emptyResponse.headers.set(
        'X-RateLimit-Limit',
        RATE_LIMIT_CONFIGS.payment.uniqueTokenPerInterval.toString()
      );
      emptyResponse.headers.set(
        'X-RateLimit-Remaining',
        rateLimitResult.remaining.toString()
      );
      emptyResponse.headers.set(
        'X-RateLimit-Reset',
        rateLimitResult.resetTime.toString()
      );
      return emptyResponse;
    }

    // Get customer default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if ((customer as Stripe.DeletedCustomer).deleted) {
      throw new BadRequestError('Stripe customer deleted');
    }

    const stripeCustomer = customer as Stripe.Customer;
    const defaultPaymentMethodId = stripeCustomer.invoice_settings
      ?.default_payment_method
      ? typeof stripeCustomer.invoice_settings.default_payment_method ===
        'string'
        ? stripeCustomer.invoice_settings.default_payment_method
        : stripeCustomer.invoice_settings.default_payment_method.id
      : null;

    // Retrieve payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      isDefault: pm.id === defaultPaymentMethodId,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : null,
      created: pm.created,
    }));

    logger.info('Payment methods retrieved', {
      service: 'payments',
      userId: user.id,
      methodCount: formattedMethods.length,
      defaultPaymentMethodId,
    });

    const response = NextResponse.json({
      paymentMethods: formattedMethods,
      defaultPaymentMethodId,
    });

    response.headers.set(
      'X-RateLimit-Limit',
      RATE_LIMIT_CONFIGS.payment.uniqueTokenPerInterval.toString()
    );
    response.headers.set(
      'X-RateLimit-Remaining',
      rateLimitResult.remaining.toString()
    );
    response.headers.set(
      'X-RateLimit-Reset',
      rateLimitResult.resetTime.toString()
    );

    return response;
  }
);
