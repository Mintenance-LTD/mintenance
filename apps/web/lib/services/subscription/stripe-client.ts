/**
 * Lazy Stripe client for the contractor-subscription service.
 *
 * Extracted from `SubscriptionService.ts` (2026-04-26) so the proxy +
 * lazy init lives in one place. The proxy pattern is necessary because:
 *
 *   - Importing the SDK at module-load time would throw if
 *     `STRIPE_SECRET_KEY` is missing during the Next.js build (e.g.
 *     a preview deploy without the secret set), bringing down every
 *     route that transitively imports SubscriptionService.
 *   - Lazy-initializing inside each method would scatter `getStripe()`
 *     calls everywhere.
 *
 * The proxy delegates property access to a lazily-instantiated client.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
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
