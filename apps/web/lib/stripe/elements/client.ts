/**
 * Shared Stripe.js client loader for Elements components.
 * Lazy-loaded and cached — only makes network request on first use.
 */
import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripeClient(): Promise<Stripe | null> | null {
  if (stripePromise) return stripePromise;

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    if (process.env.NODE_ENV === 'test') return null;
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
  }

  stripePromise = loadStripe(publishableKey);
  return stripePromise;
}
