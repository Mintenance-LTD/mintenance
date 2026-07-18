import Stripe from 'stripe';

/**
 * Compatibility readers for Stripe objects across API versions.
 *
 * Context (2026-07-17): Dependabot PR #1004 bumped the stripe SDK
 * 15 → 22. The v22 SDK's TypeScript types describe its bundled API
 * version (2026-06-24.dahlia), but our runtime requests stay pinned to
 * '2025-01-27.acacia' in `lib/stripe.ts`, and webhook payload shapes
 * follow the webhook endpoint's own configured API version. So at any
 * given moment an object in this codebase can carry either shape:
 *
 *   acacia (runtime today)          dahlia (SDK types / future)
 *   ─────────────────────           ───────────────────────────
 *   invoice.subscription         →  invoice.parent.subscription_details.subscription
 *   invoice.payment_intent       →  invoice.confirmation_secret.client_secret
 *   subscription.current_period_*→  subscription.items.data[].current_period_*
 *
 * These helpers read the new location first and fall back to the
 * legacy one, so behaviour is identical under the current acacia pin
 * and stays correct when the pin (or the webhook endpoint version)
 * moves forward. The Legacy* casts below are the single sanctioned
 * escape hatch for the removed fields — do not widen them.
 */

type LegacyInvoiceFields = {
  subscription?: string | Stripe.Subscription | null;
  payment_intent?: string | Stripe.PaymentIntent | null;
};

type LegacySubscriptionFields = {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | undefined {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (parentSub) {
    return typeof parentSub === 'string' ? parentSub : parentSub.id;
  }
  const legacySub = (invoice as Stripe.Invoice & LegacyInvoiceFields)
    .subscription;
  if (legacySub) {
    return typeof legacySub === 'string' ? legacySub : legacySub.id;
  }
  return undefined;
}

/**
 * Unix-second billing period for a subscription. All Mintenance
 * subscriptions are single-item, so the first item's period IS the
 * subscription's period under post-basil API versions.
 */
export function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  start: number | null;
  end: number | null;
} {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_end) {
    return {
      start: item.current_period_start ?? null,
      end: item.current_period_end,
    };
  }
  const legacy = subscription as Stripe.Subscription & LegacySubscriptionFields;
  return {
    start: legacy.current_period_start ?? null,
    end: legacy.current_period_end ?? null,
  };
}

/**
 * Client secret the frontend needs to confirm the first payment of a
 * `default_incomplete` subscription. Requires the caller to have
 * expanded `latest_invoice.payment_intent` (acacia) — under a
 * post-basil pin, switch the expand to `latest_invoice.confirmation_secret`
 * and this helper picks it up unchanged.
 */
export function getInvoicePaymentClientSecret(
  invoice: Stripe.Invoice | null | undefined
): string | null {
  if (!invoice) return null;
  if (invoice.confirmation_secret?.client_secret) {
    return invoice.confirmation_secret.client_secret;
  }
  const legacyPi = (invoice as Stripe.Invoice & LegacyInvoiceFields)
    .payment_intent;
  if (legacyPi && typeof legacyPi !== 'string') {
    return legacyPi.client_secret;
  }
  return null;
}
