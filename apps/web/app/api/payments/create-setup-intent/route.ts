import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotFoundError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';
import { createPaymentErrorResponse } from '@/lib/errors/payment-errors';
import {
  isMissingCustomerError,
  clearStaleStripeCustomerId,
} from '@/lib/stripe/stale-customer';

/**
 * POST /api/payments/create-setup-intent
 * Creates a SetupIntent so mobile/web clients can save cards for future payments.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user }) => {
    try {
      const { data: profile, error: profileError } = await serverSupabase
        .from('profiles')
        .select('id, email, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.email) {
        throw new NotFoundError('User not found');
      }

      let stripeCustomerId = (profile as Record<string, unknown>)
        .stripe_customer_id as string | null;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: profile.email,
          metadata: { userId: user.id },
        }, {
          idempotencyKey: `stripe_customer_${user.id}`,
        });
        stripeCustomerId = customer.id;
      }

      await serverSupabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);

      let setupIntent;
      try {
        setupIntent = await stripe.setupIntents.create({
          customer: stripeCustomerId,
          usage: 'off_session',
          payment_method_types: ['card'],
        });
      } catch (error) {
        // Stored customer belongs to another Stripe mode/account (e.g. a
        // test-mode id after a live-key promotion) — Stripe 400s with
        // resource_missing. Clear it, provision a fresh customer, retry once.
        if (!isMissingCustomerError(error)) throw error;
        await clearStaleStripeCustomerId(user.id, stripeCustomerId, {
          service: 'payments',
          operation: 'create_setup_intent',
        });
        const fresh = await stripe.customers.create({
          email: profile.email,
          metadata: { userId: user.id },
        }, {
          idempotencyKey: `stripe_customer_recovery_${user.id}`,
        });
        stripeCustomerId = fresh.id;
        await serverSupabase
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id);
        setupIntent = await stripe.setupIntents.create({
          customer: stripeCustomerId,
          usage: 'off_session',
          payment_method_types: ['card'],
        });
      }

      return NextResponse.json({
        success: true,
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        logger.error('Stripe setup intent error', error, {
          service: 'payments',
        });
        const response = createPaymentErrorResponse(error, {
          operation: 'create_setup_intent',
          userId: user.id,
        });
        return NextResponse.json(
          {
            error: response.error,
            code: response.code,
            retryable: response.retryable,
          },
          { status: response.status }
        );
      }
      throw error;
    }
  }
);
