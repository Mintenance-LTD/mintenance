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
import { logger } from '@mintenance/shared';
import { getInvoiceClientSecret } from '@/lib/stripe';
import { stripe } from './stripe-client';
import { PLAN_PRICING } from './plan-pricing';
import type { SubscriptionPlan } from './types';
import {
  contractorPrice,
  createContractorCheckout,
} from './contractor-checkout';
import {
  syncContractorProviderState,
  type BillingCycle,
} from './contractor-provider-state';

/** Stable prices are reused across retries and billing cycles. */
export async function getOrCreateStripePrice(
  plan: SubscriptionPlan,
  amount: number,
  cycle: BillingCycle = 'monthly'
) {
  if (plan === 'free' || plan === 'basic') return 'free-tier';
  if (amount !== PLAN_PRICING[plan].amount * (cycle === 'yearly' ? 10 : 1))
    throw new Error('Invalid plan amount');
  return contractorPrice(plan, cycle);
}
export const createStripeSubscription = createContractorCheckout;

/**
 * Upgrade or downgrade an existing subscription to a new plan.
 *
 * Updates the Stripe subscription with `proration_behavior:
 * 'always_invoice'` so the customer is charged or credited for the
 * prorated difference. After the Stripe call succeeds we update the
 * matching DB row (`contractor_subscriptions`). Database failures
 * propagate so callers can retry; the provider's current price and
 * any pending invoice let retries recover without another charge.
 *
 * Returns whether the change requires further payment (e.g. an open
 * invoice from the proration). The mobile / web client uses the
 * returned `clientSecret` to confirm the PaymentIntent if needed.
 */
export async function updateSubscriptionPlan(
  contractorId: string,
  newPlanType: SubscriptionPlan,
  existingStripeSubscriptionId: string,
  billingCycle: BillingCycle = 'monthly'
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

    if (currentSubscription.metadata?.contractorId !== contractorId)
      throw new Error('Subscription ownership mismatch');
    const currentItemId = currentSubscription.items.data[0]?.id;
    if (!currentItemId) {
      throw new Error('Current subscription item not found');
    }

    const newPriceId = await getOrCreateStripePrice(
      newPlanType,
      planPricing.amount * (billingCycle === 'yearly' ? 10 : 1),
      billingCycle
    );

    if (currentSubscription.pending_update) {
      const pendingPrice =
        currentSubscription.pending_update.subscription_items?.[0]?.price;
      const pendingPriceId =
        typeof pendingPrice === 'string' ? pendingPrice : pendingPrice?.id;
      if (pendingPriceId !== newPriceId)
        throw new Error(
          'Complete the pending plan change before selecting another'
        );
      const pending = await stripe.subscriptions.retrieve(
        existingStripeSubscriptionId,
        {
          expand: ['latest_invoice.confirmation_secret'],
        }
      );
      await syncContractorProviderState(pending, contractorId);
      const secret = getInvoiceClientSecret(pending.latest_invoice);
      return {
        subscriptionId: pending.id,
        clientSecret: secret,
        requiresPayment: !!secret,
      };
    }
    if (currentSubscription.items.data[0].price.id === newPriceId) {
      await syncContractorProviderState(currentSubscription, contractorId);
      return {
        subscriptionId: currentSubscription.id,
        clientSecret: null,
        requiresPayment: false,
      };
    }

    let updatedSubscription: Stripe.Subscription;
    try {
      updatedSubscription = await stripe.subscriptions.update(
        existingStripeSubscriptionId,
        {
          items: [{ id: currentItemId, price: newPriceId }],
          proration_behavior: 'always_invoice',
          payment_behavior: 'pending_if_incomplete',
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

    await syncContractorProviderState(updatedSubscription, contractorId);

    return {
      subscriptionId: existingStripeSubscriptionId,
      clientSecret: requiresPayment ? clientSecret : null,
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
    const current = await stripe.subscriptions.retrieve(subscriptionId);
    const contractorId = current.metadata?.contractorId;
    if (!contractorId) throw new Error('Subscription owner is missing');
    const updated = cancelAtPeriodEnd
      ? await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        })
      : await stripe.subscriptions.cancel(subscriptionId);
    await syncContractorProviderState(updated, contractorId);

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
