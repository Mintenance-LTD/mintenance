/**
 * `SubscriptionService` — facade over the contractor-subscription
 * helper modules in this directory.
 *
 * # History
 *
 * Until 2026-04-26 this file was a 704-line single class containing
 * the type definitions, plan-pricing constants, lazy Stripe client,
 * read queries, Stripe write operations, and DB persistence — all in
 * one place. That file was on the pre-commit `KNOWN_LARGE_FILES`
 * allowlist for months.
 *
 * The 2026-04-26 split moves each concern into its own module:
 *
 *   - `./types.ts`              — `Subscription`, `SubscriptionPlan`,
 *                                 `SubscriptionFeatures`, etc.
 *   - `./stripe-client.ts`      — lazy Stripe SDK proxy
 *   - `./plan-pricing.ts`       — `PLAN_PRICING` constant
 *   - `./queries.ts`            — read-only Supabase queries
 *   - `./stripe-operations.ts`  — Stripe API calls + DB sync
 *   - `./persistence.ts`        — pure DB inserts / updates
 *
 * This file remains as a static-method facade so every existing
 * `SubscriptionService.foo(...)` call site continues to work without
 * modification. New call sites SHOULD prefer importing the specific
 * helper they need:
 *
 *   import { getContractorSubscription } from '@/lib/services/subscription/queries';
 *
 * over:
 *
 *   import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
 *
 * The narrower import lets webpack tree-shake the Stripe SDK out of
 * routes that only need the read path (which is the majority of
 * routes that hit this service).
 */

import {
  getAvailablePlans,
  getContractorSubscription,
  getSubscriptionFeatures,
} from './queries';
import {
  cancelSubscription,
  createStripeSubscription,
  updateSubscriptionPlan,
} from './stripe-operations';
import { createFreeTierSubscription, saveSubscription } from './persistence';

export type {
  Subscription,
  SubscriptionFeatures,
  SubscriptionPlan,
  SubscriptionPlanDetails,
  SubscriptionStatus,
} from './types';

/**
 * Static-method facade preserving the legacy `SubscriptionService.X`
 * call shape. New code SHOULD import the underlying helpers directly
 * for better tree-shaking — see file header.
 */
export class SubscriptionService {
  // Reads
  static getAvailablePlans = getAvailablePlans;
  static getContractorSubscription = getContractorSubscription;
  static getSubscriptionFeatures = getSubscriptionFeatures;

  // Stripe operations
  static createStripeSubscription = createStripeSubscription;
  static updateSubscriptionPlan = updateSubscriptionPlan;
  static cancelSubscription = cancelSubscription;

  // Persistence
  static saveSubscription = saveSubscription;
  static createFreeTierSubscription = createFreeTierSubscription;
}
