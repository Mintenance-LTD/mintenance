// Subscription matching DB: public.subscriptions
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | 'incomplete';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'basic' | 'professional' | 'enterprise';
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compat
  name?: string;
  next_billing_date?: string | null;
}

/**
 * Pricing plan for subscriptions
 */
export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  limits: {
    jobs_per_month?: number;
    bids_per_month?: number;
    photos_per_job?: number;
    team_members?: number;
  };
  is_popular: boolean;
  is_active: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Subscription tier for contractors
 */
export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';

/**
 * Subscription information
 */
export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: 'free' | 'active' | 'past_due' | 'canceled' | 'expired';
  currentPeriodEnd?: string | null;
  currentPeriodStart?: string | null;
  canceledAt?: string | null;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Tier pricing information
 */
export interface TierPricing {
  name: string;
  price: number;
  period: string;
  description: string;
  popular?: boolean;
  features?: string[];
}
