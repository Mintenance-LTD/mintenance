/**
 * POST /api/subscriptions/home-health/payment-sheet
 *
 * Deferred follow-up #6 from R5. Mobile counterpart of the web
 * "Start Home Health" button: creates the subscription (same call the
 * web endpoint makes) AND returns the extra bits Stripe's mobile
 * PaymentSheet needs — an ephemeral key scoped to the customer, plus
 * the customer id itself.
 *
 * Web only needs `clientSecret` (Stripe Elements fetch the customer
 * from the intent metadata). PaymentSheet on iOS / Android needs all
 * three up-front or the sheet won't render.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { HomeHealthSubscriptionService } from '@/lib/services/subscription/HomeHealthSubscriptionService';
import { stripe } from '@/lib/stripe';
import { logger } from '@mintenance/shared';

const bodySchema = z.object({
  propertyId: z.string().uuid(),
});

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('propertyId is required');
    }

    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();
    const email = (profile?.email as string | null) || user.email;
    if (!email) {
      throw new BadRequestError('A verified email is required to subscribe');
    }

    const sub = await HomeHealthSubscriptionService.createSubscription({
      homeownerId: user.id,
      email,
      propertyId: parsed.data.propertyId,
    });

    if (!sub.clientSecret) {
      // Happens when the subscription was created without a required
      // payment intent (e.g. free-trial price). Mobile PaymentSheet
      // can't open without a client_secret — surface the subscription
      // but tell the caller there's nothing to confirm.
      return NextResponse.json({
        subscriptionId: sub.subscriptionId,
        requiresPayment: false,
        recurringScheduleIds: sub.recurringScheduleIds,
      });
    }

    // Look up the customer id we just mirrored into the DB — cheaper
    // than re-resolving via HomeownerSubscriptionService.
    const { data: row } = await serverSupabase
      .from('homeowner_subscriptions')
      .select('stripe_customer_id')
      .eq('stripe_subscription_id', sub.subscriptionId)
      .maybeSingle();

    const customerId = row?.stripe_customer_id as string | undefined;
    if (!customerId) {
      logger.error(
        'home-health/payment-sheet: could not locate stripe_customer_id after subscribe',
        { subscriptionId: sub.subscriptionId, userId: user.id }
      );
      throw new InternalServerError('Subscription state inconsistent');
    }

    // `apiVersion` must match what the mobile SDK expects. Stripe's
    // mobile SDK advertises 2024-04-10 as its supported version on
    // the 0.57 line of @stripe/stripe-react-native.
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2024-04-10' }
    );

    return NextResponse.json({
      subscriptionId: sub.subscriptionId,
      recurringScheduleIds: sub.recurringScheduleIds,
      paymentSheet: {
        clientSecret: sub.clientSecret,
        ephemeralKeySecret: ephemeralKey.secret,
        customerId,
      },
      requiresPayment: true,
    });
  }
);
