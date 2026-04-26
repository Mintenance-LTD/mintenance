/**
 * Shared subscription types.
 *
 * Extracted from `SubscriptionService.ts` (2026-04-26) as part of the
 * 704-line split per the deferred audit P2 backlog. The original file
 * is now a thin facade re-exporting from this module + the helper
 * modules in this directory.
 */

export type SubscriptionPlan = 'free' | 'basic' | 'professional' | 'enterprise';

export type SubscriptionStatus =
  | 'free'
  | 'trial'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'unpaid';

export interface SubscriptionFeatures {
  maxJobs: number | null;
  maxActiveJobs: number | null;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  additionalFeatures: Record<string, unknown>;
}

export interface Subscription {
  id: string;
  contractorId: string;
  planType: SubscriptionPlan;
  planName: string;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  trialStart: Date | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  features: SubscriptionFeatures;
}

export interface SubscriptionPlanDetails {
  planType: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  features: SubscriptionFeatures;
}
