/**
 * Lazy Stripe client for the contractor-subscription service.
 *
 * 2026-05-28 audit: consolidated onto the single shared lazy proxy in
 * `@/lib/stripe`. This file previously had its OWN proxy pinned to
 * apiVersion '2024-04-10' (~13 months behind the rest of the app), which
 * meant subscription writes ran on a different API version than every
 * other Stripe call. Re-exporting the shared proxy keeps the existing
 * import surface (callers import `stripe` from here) while pinning the
 * API version in exactly one place (lib/stripe.ts → '2025-01-27.acacia').
 */
export { stripe } from '@/lib/stripe';
