/**
 * Stripe-side subscription operations.
 *
 * Extracted from `SubscriptionService.ts` (2026-04-26). Every function
 * in this module makes at least one Stripe API call. They're separated
 * from the DB persistence layer (`./persistence.ts`) so:
 *
 *   - Network-vs-DB error handling is co-located.
 *   - Tests can mock the Stripe SDK once for this whole module.
 *   - The pure-DB updates (e.g. updating
 *     `contractor_subscriptions.plan_type` after a Stripe call
 *     succeeds) live alongside the Stripe call so a partial failure
 *     is observable in one place.
 */
import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getInvoiceClientSecret } from '@/lib/stripe';
import { stripe } from './stripe-client';
import { PLAN_PRICING } from './plan-pricing';
import type { SubscriptionPlan } from './types';

/**
 * Get-or-create the Stripe Price ID for a given plan + amount.
 *
 * Free tier returns the sentinel `'free-tier'` (we never round-trip
 * to Stripe for £0). For paid tiers we currently CREATE a fresh price
 * each time and let Stripe deduplicate by amount + product. A future
 * optimization is to cache the latest price id in
 * `subscription_features.stripe_price_id`.
 */
export async function getOrCreateStripePrice(
  planType: SubscriptionPlan,
  amountInPence: number
): Promise<string> {
  if (planType === 'free') {
    return 'free-tier';
  }
  const price = await stripe.prices.create({
    currency: 'gbp',
    unit_amount: amountInPence,
    recurring: { interval: 'month' },
    product_data: {
      name: `${PLAN_PRICING[planType].name} Plan`,
    } as Stripe.PriceCreateParams['product_data'],
  });
  return price.id;
}

/**
 * Create a Stripe subscription for a contractor.
 *
 * Free tier short-circuits — we return a sentinel id so callers can
 * proceed to `saveSubscription()` without any Stripe round-trip.
 *
 * For paid tiers, the subscription is created with
 * `payment_behavior: 'default_incomplete'`, which means Stripe waits
 * for the first invoice to be paid before flipping the subscription
 * to `active`. The returned `clientSecret` is used by the mobile /
 * web client to confirm the PaymentIntent.
 */
export async function createStripeSubscription(
  contractorId: string,
  planType: SubscriptionPlan,
  stripeCustomerId: string
): Promise<{ subscriptionId: string; clientSecret: string | null }> {
  if (planType === 'free') {
    return { subscriptionId: 'free-tier', clientSecret: null };
  }

  try {
    const planPricing = PLAN_PRICING[planType];
    if (!planPricing) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    const priceId = await getOrCreateStripePrice(planType, planPricing.amount);

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      // basil+ API versions reject the old `latest_invoice.payment_intent`
      // expansion; confirmation_secret carries the same client secret.
      expand: ['latest_invoice.confirmation_secret'],
      metadata: {
        contractorId,
        planType,
        platform: 'mintenance',
      },
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: getInvoiceClientSecret(subscription.latest_invoice),
    };
  } catch (err) {
    logger.error('Error creating Stripe subscription', {
      service: 'SubscriptionService',
      contractorId,
      planType,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Upgrade or downgrade an existing subscription to a new plan.
 *
 * Updates the Stripe subscription with `proration_behavior:
 * 'always_invoice'` so the customer is charged or credited for the
 * prorated difference. After the Stripe call succeeds we update the
 * matching DB row (`contractor_subscriptions`) — failures on the DB
 * side are logged but do not throw, since the Stripe state is the
 * source of truth and webhooks will reconcile.
 *
 * Returns whether the change requires further payment (e.g. an open
 * invoice from the proration). The mobile / web client uses the
 * returned `clientSecret` to confirm the PaymentIntent if needed.
 */
export async function updateSubscriptionPlan(
  contractorId: string,
  newPlanType: SubscriptionPlan,
  existingStripeSubscriptionId: string
): Promise<{
  subscriptionId: string;
  clientSecret: string | null;
  requiresPayment: boolean;
}> {
  try {
    const planPricing = PLAN_PRICING[newPlanType];
    if (!planPricing) {
      throw new Error(`Invalid plan type: ${newPlanType}`);
    }

    // Retrieve current subscription
    let currentSubscription: Stripe.Subscription;
    try {
      currentSubscription = await stripe.subscriptions.retrieve(
        existingStripeSubscriptionId
      );
    } catch (stripeError: unknown) {
      const err = stripeError as Error & { code?: string };
      logger.error('Failed to retrieve Stripe subscription', {
        service: 'SubscriptionService',
        contractorId,
        subscriptionId: existingStripeSubscriptionId,
        error: err.message,
        stripeErrorCode: err.code,
      });
      throw new Error(
        `Failed to retrieve subscription: ${err.message || 'Subscription not found'}`
      );
    }

    // Check if subscription is in a state that allows updates
    const allowedStatuses = ['active', 'trialing', 'past_due'];
    if (!allowedStatuses.includes(currentSubscription.status)) {
      logger.warn(
        'Attempting to update subscription with non-standard status',
        {
          service: 'SubscriptionService',
          contractorId,
          subscriptionId: existingStripeSubscriptionId,
          status: currentSubscription.status,
          allowedStatuses,
        }
      );
      // For incomplete subscriptions, we should handle differently
      if (
        currentSubscription.status === 'incomplete' ||
        currentSubscription.status === 'incomplete_expired'
      ) {
        throw new Error(
          `Cannot update incomplete subscription. Please cancel and create a new subscription. Current status: ${currentSubscription.status}`
        );
      }
      // For other statuses, log but try to proceed
      logger.warn('Proceeding with update despite non-standard status', {
        service: 'SubscriptionService',
        status: currentSubscription.status,
      });
    }

    const currentItemId = currentSubscription.items.data[0]?.id;
    if (!currentItemId) {
      throw new Error('Current subscription item not found');
    }

    const newPriceId = await getOrCreateStripePrice(
      newPlanType,
      planPricing.amount
    );

    let updatedSubscription: Stripe.Subscription;
    try {
      updatedSubscription = await stripe.subscriptions.update(
        existingStripeSubscriptionId,
        {
          items: [{ id: currentItemId, price: newPriceId }],
          metadata: {
            ...currentSubscription.metadata,
            planType: newPlanType,
          },
          proration_behavior: 'always_invoice',
          expand: ['latest_invoice.confirmation_secret'],
        }
      );
    } catch (updateError: unknown) {
      const err = updateError as Error & { code?: string; type?: string };
      logger.error('Failed to update Stripe subscription', {
        service: 'SubscriptionService',
        contractorId,
        subscriptionId: existingStripeSubscriptionId,
        error: err.message,
        stripeErrorCode: err.code,
        stripeErrorType: err.type,
      });
      throw new Error(
        `Failed to update subscription: ${err.message || 'Unknown error'}`
      );
    }

    // When a subscription is updated with `always_invoice` proration,
    // Stripe may create a new invoice. If Stripe settled it automatically
    // its status is 'paid'; an 'open'/'draft' invoice still needs the
    // client to confirm payment with the confirmation_secret's client
    // secret (the basil+ replacement for the removed
    // latest_invoice.payment_intent expansion).
    const invoice = updatedSubscription.latest_invoice;
    let clientSecret: string | null = null;
    let requiresPayment = false;

    if (invoice && typeof invoice !== 'string') {
      clientSecret = getInvoiceClientSecret(invoice);
      requiresPayment = invoice.status === 'open' || invoice.status === 'draft';
    }

    // Update database
    const { error: updateDbError } = await serverSupabase
      .from('contractor_subscriptions')
      .update({
        plan_type: newPlanType,
        plan_name: planPricing.name,
        stripe_price_id: newPriceId,
        amount: planPricing.amount / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', existingStripeSubscriptionId);

    if (updateDbError) {
      logger.error('Failed to update subscription in database', {
        service: 'SubscriptionService',
        contractorId,
        error: updateDbError.message,
      });
      // Don't throw — Stripe update succeeded, DB update is secondary;
      // webhook reconciliation will fix the DB state.
    }

    return {
      subscriptionId: existingStripeSubscriptionId,
      clientSecret,
      requiresPayment: !!requiresPayment,
    };
  } catch (err) {
    logger.error('Error updating subscription plan', {
      service: 'SubscriptionService',
      contractorId,
      newPlanType,
      subscriptionId: existingStripeSubscriptionId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

/**
 * Cancel a subscription, either at period end (default) or
 * immediately.
 *
 * Returns false (not throw) on any failure path so the caller can
 * surface a "we couldn't cancel — please retry" without crashing the
 * whole route. The Stripe call still happens before the DB update, so
 * a partial failure leaves the DB out of sync with Stripe — webhook
 * reconciliation handles that.
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<boolean> {
  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    const { error } = await serverSupabase
      .from('contractor_subscriptions')
      .update({
        cancel_at_period_end: cancelAtPeriodEnd,
        canceled_at: cancelAtPeriodEnd ? null : new Date().toISOString(),
        status: cancelAtPeriodEnd ? 'active' : 'canceled',
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (error) {
      logger.error('Failed to update canceled subscription', {
        service: 'SubscriptionService',
        subscriptionId,
        error: error.message,
      });
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error canceling subscription', {
      service: 'SubscriptionService',
      subscriptionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
