/**
 * Plan-pricing lookup table.
 *
 * Extracted from `SubscriptionService.ts` (2026-04-26). Keeping this
 * in its own module means new plans can be added without touching the
 * Stripe-operations or persistence code, and tests can import the map
 * directly without instantiating a service.
 *
 * Amounts are in PENCE (smallest GBP unit) — Stripe expects integer
 * minor units. Display layers convert to pounds via `amount / 100`.
 */
import type { SubscriptionPlan } from './types';

export const PLAN_PRICING: Record<
  SubscriptionPlan,
  { amount: number; name: string }
> = {
  free: { amount: 0, name: 'Free' },
  basic: { amount: 0, name: 'Basic' }, // Free tier
  professional: { amount: 2900, name: 'Professional' }, // £29
  enterprise: { amount: 9900, name: 'Business' }, // £99
};
