import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import {
  HomeownerSubscriptionService,
  type HomeownerPlanType,
} from '@/lib/services/subscription/HomeownerSubscriptionService';
import { syncContractorProviderState } from '@/lib/services/subscription/contractor-provider-state';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { createSubscriptionSchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { stripe } from '@/lib/stripe';

// 2026-05-23 audit-18 P1: build the Stripe PaymentSheet bundle the
// mobile SDK needs (clientSecret + ephemeralKeySecret + customerId).
// Web Elements only need the clientSecret because the customer is
// resolved from the intent metadata, but the native PaymentSheet on
// iOS/Android refuses to render without all three. Extracted into a
// helper so the homeowner / contractor / upgrade paths can each
// surface the bundle when there's actually a payment to confirm.
// Failures here are NON-fatal — we still return the clientSecret so
// web continues to work; mobile just falls back to its current
// "Payment required" alert if the bundle is missing.
async function buildPaymentSheet(
  clientSecret: string | null | undefined,
  customerId: string | null | undefined
): Promise<{
  clientSecret: string;
  ephemeralKeySecret: string;
  customerId: string;
} | null> {
  if (!clientSecret || !customerId) return null;
  try {
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      // Matches the Stripe-mobile-SDK-supported version that the
      // 0.57 line of @stripe/stripe-react-native expects. Same value
      // the home-health payment-sheet route uses.
      { apiVersion: '2024-04-10' }
    );
    if (!ephemeralKey.secret) return null;
    return {
      clientSecret,
      ephemeralKeySecret: ephemeralKey.secret,
      customerId,
    };
  } catch (error) {
    logger.warn('subscriptions/create: ephemeralKey creation failed', {
      service: 'subscriptions',
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export const POST = withApiHandler(
  { roles: ['contractor', 'homeowner'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validationResult = await validateRequest(
      request as never,
      createSubscriptionSchema
    );
    if (validationResult instanceof NextResponse) return validationResult;
    const { data: validatedData } = validationResult;

    const { planType, billingCycle } = validatedData;

    // Homeowner subscription flow (landlord / agency tiers)
    if (user.role === 'homeowner') {
      if (planType !== 'landlord' && planType !== 'agency') {
        throw new BadRequestError(
          'Homeowners can subscribe to the landlord or agency plan'
        );
      }

      const customerId =
        await HomeownerSubscriptionService.getOrCreateStripeCustomer(
          user.id,
          user.email
        );

      const created = await HomeownerSubscriptionService.createSubscription(
        user.id,
        customerId,
        planType as HomeownerPlanType,
        billingCycle || 'monthly'
      );

      logger.info('Homeowner subscription created', {
        service: 'subscriptions',
        homeownerId: user.id,
        planType,
        stripeSubscriptionId: created.stripeSubscriptionId,
      });

      const homeownerPaymentSheet = await buildPaymentSheet(
        created.clientSecret,
        customerId
      );
      return NextResponse.json({
        success: true,
        subscriptionId: created.dbSubscriptionId,
        stripeSubscriptionId: created.stripeSubscriptionId,
        clientSecret: created.clientSecret,
        requiresPayment: !!created.clientSecret,
        checkoutPath: '/homeowner/subscription/checkout',
        paymentSheet: homeownerPaymentSheet,
      });
    }

    // Contractor flow
    if (planType === 'landlord' || planType === 'agency') {
      throw new BadRequestError('Invalid contractor plan type');
    }

    const contractorPlan = planType === 'basic' ? 'free' : planType;
    const cycle = billingCycle || 'monthly';
    const existing = await SubscriptionService.getContractorSubscription(
      user.id
    );
    if (contractorPlan === 'free') {
      if (
        existing &&
        !['free', 'basic'].includes(existing.planType) &&
        !existing.stripeSubscriptionId
      ) {
        throw new BadRequestError(
          'Resume the pending checkout before cancelling it'
        );
      }
      if (existing?.stripeSubscriptionId) {
        const canceled = await stripe.subscriptions.cancel(
          existing.stripeSubscriptionId
        );
        await syncContractorProviderState(canceled, user.id);
      }
      const id =
        existing?.planType === 'free' && existing.status === 'free'
          ? existing.id
          : await SubscriptionService.createFreeTierSubscription(user.id);
      return NextResponse.json({
        success: true,
        subscriptionId: id,
        stripeSubscriptionId: null,
        clientSecret: null,
        requiresPayment: false,
      });
    }

    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (profileError || !profile)
      throw new InternalServerError('Could not load billing profile');
    let customerId = profile.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: { userId: user.id, role: 'contractor' },
        },
        { idempotencyKey: 'stripe_customer_' + user.id }
      );
      customerId = customer.id;
      const { error } = await serverSupabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if (error)
        throw new InternalServerError('Could not save billing customer');
    }

    if (existing?.stripeSubscriptionId) {
      // Provider lookup failures must stop checkout rather than permit another charge.
      const current = await stripe.subscriptions.retrieve(
        existing.stripeSubscriptionId
      );
      const owner =
        typeof current.customer === 'string'
          ? current.customer
          : current.customer.id;
      if (owner !== customerId || current.metadata?.contractorId !== user.id)
        throw new InternalServerError(
          'Subscription ownership needs reconciliation'
        );
      if (['active', 'trialing', 'past_due'].includes(current.status)) {
        const currentCycle =
          current.items.data[0]?.price.recurring?.interval === 'year'
            ? 'yearly'
            : 'monthly';
        if (existing.planType === contractorPlan && currentCycle === cycle)
          throw new BadRequestError(
            'You already have this plan and billing cycle'
          );
        const changed = await SubscriptionService.updateSubscriptionPlan(
          user.id,
          contractorPlan,
          current.id,
          cycle
        );
        return NextResponse.json({
          success: true,
          subscriptionId: existing.id,
          stripeSubscriptionId: changed.subscriptionId,
          clientSecret: changed.clientSecret,
          requiresPayment: changed.requiresPayment,
          isUpgrade: true,
          paymentSheet: await buildPaymentSheet(
            changed.clientSecret,
            customerId
          ),
        });
      }
      if (['canceled', 'incomplete_expired'].includes(current.status))
        await syncContractorProviderState(current, user.id);
      // An unpaid/incomplete checkout resumes through its durable reservation.
    }
    const created = await SubscriptionService.createStripeSubscription(
      user.id,
      contractorPlan,
      customerId,
      cycle
    );
    const { data: row, error: rowError } = await serverSupabase
      .from('contractor_subscriptions')
      .select('id')
      .eq('contractor_id', user.id)
      .eq('stripe_subscription_id', created.subscriptionId)
      .single();
    if (rowError || !row)
      throw new InternalServerError('Could not load the reserved subscription');
    return NextResponse.json({
      success: true,
      subscriptionId: row.id,
      stripeSubscriptionId: created.subscriptionId,
      clientSecret: created.clientSecret,
      requiresPayment: !!created.clientSecret,
      paymentSheet: await buildPaymentSheet(created.clientSecret, customerId),
    });
  }
);
