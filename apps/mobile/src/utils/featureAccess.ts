/**
 * Feature Access Utilities for React Native Mobile App
 *
 * Platform-specific implementation for mobile that mirrors the web implementation.
 */

import { supabase } from '../config/supabase';

export type SubscriptionTier = 'trial' | 'basic' | 'professional' | 'enterprise';
export type UserRole = 'homeowner' | 'contractor' | 'admin';

export interface FeatureLimit {
  trial?: number | boolean | 'unlimited';
  basic?: number | boolean | 'unlimited';
  professional?: number | boolean | 'unlimited';
  enterprise?: number | boolean | 'unlimited';
  homeowner?: boolean;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  limits: FeatureLimit;
  upgradeMessage?: string;
  learnMoreUrl?: string;
}

// Import feature definitions from shared config
// Note: In production, these should be in a shared package
// For now, duplicating the essential features for mobile

export const MOBILE_FEATURES: Record<string, FeatureDefinition> = {
  // Homeowner Features
  HOMEOWNER_POST_JOBS: {
    id: 'HOMEOWNER_POST_JOBS',
    name: 'Post Jobs',
    description: 'Create and post job listings',
    category: 'Job Management',
    limits: { homeowner: true },
  },
  HOMEOWNER_MESSAGING: {
    id: 'HOMEOWNER_MESSAGING',
    name: 'Messaging',
    description: 'Chat with contractors',
    category: 'Communication',
    limits: { homeowner: true },
  },
  HOMEOWNER_VIDEO_CALLS: {
    id: 'HOMEOWNER_VIDEO_CALLS',
    name: 'Video Calls',
    description: 'Video calls with contractors',
    category: 'Communication',
    limits: { homeowner: true },
  },
  HOMEOWNER_AI_ASSESSMENT: {
    id: 'HOMEOWNER_AI_ASSESSMENT',
    name: 'AI Assessment',
    description: 'AI-powered building assessments',
    category: 'AI & Search',
    limits: { homeowner: true },
  },

  // Contractor Features
  CONTRACTOR_BID_LIMIT: {
    id: 'CONTRACTOR_BID_LIMIT',
    name: 'Monthly Bids',
    description: 'Number of bids per month',
    category: 'Bidding',
    limits: {
      trial: 5,
      basic: 20,
      professional: 100,
      enterprise: 'unlimited',
    },
    upgradeMessage: "You've reached your monthly bid limit. Upgrade to submit more bids.",
  },
  CONTRACTOR_DISCOVERY_CARD: {
    id: 'CONTRACTOR_DISCOVERY_CARD',
    name: 'Discovery Card',
    description: 'Appear in homeowner feed',
    category: 'Discovery',
    limits: {
      trial: false,
      basic: true,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to appear in the homeowner discovery feed.',
  },
  CONTRACTOR_SOCIAL_FEED: {
    id: 'CONTRACTOR_SOCIAL_FEED',
    name: 'Social Feed',
    description: 'Access to contractor community',
    category: 'Social',
    limits: {
      trial: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional to join the contractor community.',
  },
  CONTRACTOR_PORTFOLIO_PHOTOS: {
    id: 'CONTRACTOR_PORTFOLIO_PHOTOS',
    name: 'Portfolio Photos',
    description: 'Number of portfolio photos',
    category: 'Portfolio',
    limits: {
      trial: 5,
      basic: 20,
      professional: 100,
      enterprise: 'unlimited',
    },
    upgradeMessage: 'Upgrade to showcase more work.',
  },
  CONTRACTOR_MESSAGING: {
    id: 'CONTRACTOR_MESSAGING',
    name: 'Messaging',
    description: 'Chat with homeowners',
    category: 'Communication',
    limits: {
      trial: true,
      basic: true,
      professional: true,
      enterprise: true,
    },
  },
  CONTRACTOR_VIDEO_CALLS: {
    id: 'CONTRACTOR_VIDEO_CALLS',
    name: 'Video Calls',
    description: 'Video calls with homeowners',
    category: 'Communication',
    limits: {
      trial: true,
      basic: true,
      professional: true,
      enterprise: true,
    },
  },
};

export const TIER_PRICING = {
  trial: {
    name: 'Free Trial',
    price: 0,
    period: '14 days',
    description: 'Try the platform with limited features',
  },
  basic: {
    name: 'Basic',
    price: 29,
    period: 'month',
    description: 'Essential features for contractors',
  },
  professional: {
    name: 'Professional',
    price: 79,
    period: 'month',
    description: 'Advanced features for growing businesses',
    popular: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    period: 'month',
    description: 'Complete solution for businesses',
  },
} as const;

/**
 * Feature Access Manager
 */
export class FeatureAccessManager {
  private static instance: FeatureAccessManager;
  private subscription: {
    tier: SubscriptionTier;
    status: string;
  } | null = null;
  private usage: Map<string, { used: number; limit: number | 'unlimited' }> = new Map();

  private constructor() {}

  static getInstance(): FeatureAccessManager {
    if (!FeatureAccessManager.instance) {
      FeatureAccessManager.instance = new FeatureAccessManager();
    }
    return FeatureAccessManager.instance;
  }

  /**
   * Initialize feature access for a user
   */
  async initialize(userId: string, role: UserRole): Promise<void> {
    if (role !== 'contractor') {
      // Homeowners have full access to all homeowner features
      return;
    }

    try {
      // Fetch subscription
      const { data: subData } = await supabase
        .from('contractor_subscriptions')
        .select('plan_type, status')
        .eq('contractor_id', userId)
        .in('status', ['trial', 'active', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData) {
        this.subscription = {
          tier: subData.plan_type as SubscriptionTier,
          status: subData.status,
        };
      } else {
        // Default to trial
        this.subscription = {
          tier: 'trial',
          status: 'trial',
        };
      }

      // Fetch usage
      const { data: usageData } = await supabase
        .from('feature_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('reset_date', new Date().toISOString());

      if (usageData) {
        usageData.forEach((item) => {
          this.usage.set(item.feature_id, {
            used: item.used_count,
            limit: item.limit_count,
          });
        });
      }
    } catch (err) {
      console.error('[FeatureAccess] Initialization failed', err);
      // Default to trial on error
      this.subscription = {
        tier: 'trial',
        status: 'trial',
      };
    }
  }

  /**
   * Check if user has access to a feature
   */
  hasAccess(featureId: string, role: UserRole): boolean {
    const feature = MOBILE_FEATURES[featureId];
    if (!feature) {
      return false;
    }

    // Admins have full access
    if (role === 'admin') {
      return true;
    }

    // Homeowner features
    if (role === 'homeowner') {
      return feature.limits.homeowner === true;
    }

    // Contractor features
    if (!this.subscription) {
      return false;
    }

    const limit = feature.limits[this.subscription.tier];

    // Boolean access
    if (typeof limit === 'boolean') {
      return limit;
    }

    // Unlimited access
    if (limit === 'unlimited') {
      return true;
    }

    // Numeric limit - check usage
    if (typeof limit === 'number') {
      const usage = this.usage.get(featureId);
      const used = usage?.used || 0;
      return used < limit;
    }

    return false;
  }

  /**
   * Get remaining usage for a metered feature
   */
  getRemainingUsage(featureId: string): number | 'unlimited' {
    const feature = MOBILE_FEATURES[featureId];
    if (!feature || !this.subscription) {
      return 0;
    }

    const limit = feature.limits[this.subscription.tier];

    if (limit === 'unlimited') {
      return 'unlimited';
    }

    if (typeof limit === 'number') {
      const usage = this.usage.get(featureId);
      const used = usage?.used || 0;
      return Math.max(0, limit - used);
    }

    return 0;
  }

  /**
   * Track usage for a metered feature
   */
  async trackUsage(userId: string, featureId: string, incrementBy: number = 1): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('increment_feature_usage', {
        p_user_id: userId,
        p_feature_id: featureId,
        p_increment: incrementBy,
      });

      if (error) {
        console.error('[FeatureAccess] Failed to track usage', error);
        return false;
      }

      // Update local cache
      const current = this.usage.get(featureId);
      if (current) {
        this.usage.set(featureId, {
          ...current,
          used: current.used + incrementBy,
        });
      }

      return true;
    } catch (err) {
      console.error('[FeatureAccess] Error tracking usage', err);
      return false;
    }
  }

  /**
   * Get current subscription tier
   */
  getTier(): SubscriptionTier {
    return this.subscription?.tier || 'trial';
  }

  /**
   * Get feature definition
   */
  getFeature(featureId: string): FeatureDefinition | undefined {
    return MOBILE_FEATURES[featureId];
  }

  /**
   * Get upgrade tiers for a feature
   */
  getUpgradeTiers(featureId: string): SubscriptionTier[] {
    const feature = MOBILE_FEATURES[featureId];
    if (!feature || !this.subscription) {
      return [];
    }

    const currentTier = this.subscription.tier;
    const tierOrder: SubscriptionTier[] = ['trial', 'basic', 'professional', 'enterprise'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const upgradeTiers: SubscriptionTier[] = [];

    for (let i = currentIndex + 1; i < tierOrder.length; i++) {
      const tier = tierOrder[i];
      const limit = feature.limits[tier];
      const currentLimit = feature.limits[currentTier];

      // Check if this tier has better access
      if (limit === 'unlimited' && currentLimit !== 'unlimited') {
        upgradeTiers.push(tier);
      } else if (typeof limit === 'number' && typeof currentLimit === 'number' && limit > currentLimit) {
        upgradeTiers.push(tier);
      } else if (limit === true && currentLimit === false) {
        upgradeTiers.push(tier);
      }
    }

    return upgradeTiers;
  }

  /**
   * Clear cached data
   */
  clear(): void {
    this.subscription = null;
    this.usage.clear();
  }
}

// Export singleton instance
export const featureAccess = FeatureAccessManager.getInstance();

/**
 * Helper functions for React Native components
 */

/**
 * Check if user can perform an action
 */
export async function canPerformAction(
  userId: string,
  role: UserRole,
  featureId: string
): Promise<{ allowed: boolean; message?: string }> {
  const manager = FeatureAccessManager.getInstance();

  const hasAccess = manager.hasAccess(featureId, role);

  if (!hasAccess) {
    const feature = manager.getFeature(featureId);
    return {
      allowed: false,
      message: feature?.upgradeMessage || 'This feature is not available on your current plan.',
    };
  }

  return { allowed: true };
}

/**
 * Format limit for display
 */
export function formatLimit(limit: number | boolean | 'unlimited' | undefined): string {
  if (limit === 'unlimited') return 'Unlimited';
  if (typeof limit === 'number') return limit.toString();
  if (limit === true) return 'Full Access';
  return 'Not Available';
}

/**
 * Get feature category color
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Job Management': '#3B82F6',
    'Bidding': '#10B981',
    'Discovery': '#8B5CF6',
    'Social': '#F59E0B',
    'Portfolio': '#EC4899',
    'Communication': '#06B6D4',
    'AI & Search': '#6366F1',
  };
  return colors[category] || '#6B7280';
}
