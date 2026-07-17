/**
 * Stripe configuration for server-side usage
 * Lazily initialized to avoid module-level throws during next build.
 */

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined in environment variables'
      );
    }
    // No apiVersion override: stripe-node sends the API version its bundled
    // typings are generated from (v22 -> 2026-06-24.dahlia). The previous
    // '2025-01-27.acacia' pin pre-dated the 2025-03-31.basil breaking
    // changes (Invoice.subscription -> Invoice.parent, Subscription
    // current_period_* -> SubscriptionItem, latest_invoice.payment_intent
    // -> latest_invoice.confirmation_secret), so keeping it under the v22
    // SDK would make runtime responses diverge from the compile-time types.
    // Mobile PaymentSheet ephemeral keys still pass their own per-request
    // apiVersion where the mobile SDK requires it.
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Legacy (< 2025-03-31.basil) API payload shapes.
 *
 * Webhook event payload shape is controlled by the webhook endpoint's
 * pinned api_version in the Stripe dashboard — NOT by this SDK — so the
 * webhook handlers must accept both the pre-basil shape (top-level
 * `invoice.subscription`, `subscription.current_period_*`) and the
 * basil+ shape (`invoice.parent.subscription_details.subscription`,
 * `subscription.items.data[].current_period_*`). The readers below
 * normalise both.
 */
interface LegacyInvoiceFields {
  subscription?: string | { id: string } | null;
}

interface LegacySubscriptionPeriodFields {
  current_period_start?: number | null;
  current_period_end?: number | null;
}

/**
 * Resolve the subscription id an invoice belongs to, tolerating both
 * pre-basil and basil+ payload shapes. Returns null for one-off invoices.
 */
export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const parentSubscription = invoice.parent?.subscription_details?.subscription;
  if (parentSubscription) {
    return typeof parentSubscription === 'string'
      ? parentSubscription
      : parentSubscription.id;
  }
  const legacySubscription = (invoice as Stripe.Invoice & LegacyInvoiceFields)
    .subscription;
  if (legacySubscription) {
    return typeof legacySubscription === 'string'
      ? legacySubscription
      : legacySubscription.id;
  }
  return null;
}

/**
 * Resolve a subscription's current billing period as ISO strings,
 * tolerating both payload shapes. Basil+ moved the period onto each
 * subscription item; for multi-item subscriptions we take the earliest
 * start and the latest end so renewal dates never shrink.
 */
export function getSubscriptionPeriodBounds(
  subscription: Stripe.Subscription
): {
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
} {
  const legacy = subscription as Stripe.Subscription &
    LegacySubscriptionPeriodFields;
  let start =
    typeof legacy.current_period_start === 'number'
      ? legacy.current_period_start
      : null;
  let end =
    typeof legacy.current_period_end === 'number'
      ? legacy.current_period_end
      : null;

  if (start === null || end === null) {
    for (const item of subscription.items?.data ?? []) {
      if (typeof item.current_period_start === 'number') {
        start =
          start === null
            ? item.current_period_start
            : Math.min(start, item.current_period_start);
      }
      if (typeof item.current_period_end === 'number') {
        end =
          end === null
            ? item.current_period_end
            : Math.max(end, item.current_period_end);
      }
    }
  }

  return {
    currentPeriodStart:
      start !== null ? new Date(start * 1000).toISOString() : null,
    currentPeriodEnd: end !== null ? new Date(end * 1000).toISOString() : null,
  };
}

/**
 * Extract the PaymentIntent client secret from an expanded
 * `latest_invoice`. Callers must create/update the subscription with
 * `expand: ['latest_invoice.confirmation_secret']` — the pre-basil
 * `latest_invoice.payment_intent` expansion is rejected by the API on
 * basil+ versions.
 */
export function getInvoiceClientSecret(
  latestInvoice: string | Stripe.Invoice | null | undefined
): string | null {
  if (!latestInvoice || typeof latestInvoice === 'string') return null;
  return latestInvoice.confirmation_secret?.client_secret ?? null;
}
