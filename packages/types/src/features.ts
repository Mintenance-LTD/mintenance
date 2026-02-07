import type { SubscriptionTier } from './subscriptions';

/**
 * Feature limit definition
 */
export interface FeatureLimit {
  free?: number | boolean | 'unlimited';
  basic?: number | boolean | 'unlimited';
  professional?: number | boolean | 'unlimited';
  enterprise?: number | boolean | 'unlimited';
  homeowner?: boolean;
}

/**
 * Feature definition with access controls
 */
export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  limits: FeatureLimit;
  upgradeMessage?: string;
  learnMoreUrl?: string;
}

/**
 * Feature usage tracking
 */
export interface FeatureUsage {
  id: string;
  user_id: string;
  feature_id: string;
  used_count: number;
  limit_count: number | 'unlimited';
  reset_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Feature access result
 */
export interface FeatureAccessResult {
  hasAccess: boolean;
  limit: number | boolean | 'unlimited';
  used?: number;
  remaining?: number | 'unlimited';
  requiresUpgrade: boolean;
  upgradeTiers: SubscriptionTier[];
  feature?: FeatureDefinition;
}

/**
 * Feature category
 */
export type FeatureCategory =
  | 'Job Management'
  | 'Bidding'
  | 'Discovery'
  | 'Social'
  | 'Portfolio'
  | 'Branding'
  | 'Analytics'
  | 'Business Tools'
  | 'Support'
  | 'Marketing'
  | 'Communication'
  | 'Resources'
  | 'Content'
  | 'Payments'
  | 'Reviews'
  | 'Properties';
