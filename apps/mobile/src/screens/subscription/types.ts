export interface SubscriptionPlanFeatures {
  maxJobs?: number | null;
  maxActiveJobs?: number;
  prioritySupport?: boolean;
  advancedAnalytics?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
  additionalFeatures?: Record<string, unknown>;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[] | SubscriptionPlanFeatures;
  recommended?: boolean;
}

export interface SubscriptionStatus {
  role: string;
  subscription: {
    planType: string;
    planName?: string;
    status: string;
    amount?: number;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  } | null;
  trial?: {
    isTrialActive?: boolean;
    active?: boolean;
    daysRemaining: number;
  } | null;
  requiresSubscription?: boolean;
  // 2026-05-23 audit-18 P1: web /api/subscriptions/status returns an
  // earlyAccess block (eligible + cohortLimit). Mobile was hardcoding
  // requiresSubscription:false and skipping this entirely, so early-
  // access cohort messaging never reached mobile.
  earlyAccess?: {
    eligible: boolean;
    cohortLimit: number | null;
  };
  // 2026-07-22 fee-consistency fix: the contractor's effective platform
  // fee, resolved server-side with the same resolver the escrow release
  // charges with. Present only for the contractor role. Display surfaces
  // (bid preview) read this instead of a hardcoded percent.
  effectiveTier?: 'free' | 'basic' | 'professional' | 'enterprise';
  platformFeeRate?: number;
  platformFeePercent?: string;
}

export const getFeatureStrings = (
  features: SubscriptionPlan['features']
): string[] => {
  if (Array.isArray(features)) return features;
  if (!features || typeof features !== 'object') return [];
  const f = features as SubscriptionPlanFeatures;
  const result: string[] = [];
  if (f.maxJobs != null) result.push(`Up to ${f.maxJobs} jobs`);
  if (f.maxActiveJobs) result.push(`${f.maxActiveJobs} active jobs`);
  if (f.prioritySupport) result.push('Priority support');
  if (f.advancedAnalytics) result.push('Advanced analytics');
  if (f.customBranding) result.push('Custom branding');
  if (f.apiAccess) result.push('API access');
  return result;
};
