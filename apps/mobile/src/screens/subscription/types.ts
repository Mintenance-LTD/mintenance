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
