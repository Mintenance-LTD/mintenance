'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { supabase } from '@/lib/supabase'; // Use the default exported supabase client
import {
  FEATURES,
  hasFeatureAccess,
  getFeatureLimit,
  getUpgradeTiers,
  type SubscriptionTier,
  type UserRole,
  type FeatureDefinition,
} from '@/lib/feature-access-config';
import { logger } from '@mintenance/shared';

interface FeatureUsage {
  featureId: string;
  used: number;
  limit: number | 'unlimited';
  resetDate: string;
}

interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: 'free' | 'active' | 'past_due' | 'canceled' | 'expired';
  currentPeriodEnd?: string | null;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  limit: number | boolean | 'unlimited';
  used?: number;
  remaining?: number | 'unlimited';
  requiresUpgrade: boolean;
  upgradeTiers: SubscriptionTier[];
  feature?: FeatureDefinition;
}

export function useFeatureAccess() {
  const { user, loading: userLoading } = useCurrentUser();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<Map<string, FeatureUsage>>(new Map());
  const [loading, setLoading] = useState(true);
  // supabase client is already imported at the top of the file

  // Fetch subscription info
  useEffect(() => {
    if (!user || user.role !== 'contractor') {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('contractor_subscriptions')
          .select('plan_type, status, current_period_end')
          .eq('contractor_id', user.id)
          .in('status', ['free', 'active', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          logger.error('[FeatureAccess] Failed to fetch subscription', error);
          // Default to free if no subscription found
          setSubscription({
            tier: 'free',
            status: 'free',
          });
          return;
        }

        if (data) {
          setSubscription({
            tier: data.plan_type as SubscriptionTier,
            status: data.status as SubscriptionInfo['status'],
            currentPeriodEnd: data.current_period_end,
          });
        } else {
          // No subscription found, default to free
          setSubscription({
            tier: 'free',
            status: 'free',
          });
        }
      } catch (err) {
        logger.error('[FeatureAccess] Error fetching subscription', err);
        setSubscription({
          tier: 'free',
          status: 'free',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user, supabase]);

  // Fetch usage data for metered features
  useEffect(() => {
    if (!user || !subscription) {
      return;
    }

    const fetchUsage = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_usage')
          .select('*')
          .eq('user_id', user.id)
          .gte('reset_date', new Date().toISOString());

        if (error) {
          logger.error('[FeatureAccess] Failed to fetch usage', error);
          return;
        }

        if (data) {
          const usageMap = new Map<string, FeatureUsage>();
          data.forEach(item => {
            usageMap.set(item.feature_id, {
              featureId: item.feature_id,
              used: item.used_count,
              limit: item.limit_count,
              resetDate: item.reset_date,
            });
          });
          setUsage(usageMap);
        }
      } catch (err) {
        logger.error('[FeatureAccess] Error fetching usage', err);
      }
    };

    fetchUsage();
  }, [user, subscription, supabase]);

  /**
   * Check if user has access to a feature
   */
  const checkAccess = useCallback(
    (featureId: string): FeatureAccessResult => {
      const feature = FEATURES[featureId];

      if (!feature) {
        return {
          hasAccess: false,
          limit: false,
          requiresUpgrade: false,
          upgradeTiers: [],
        };
      }

      // Admins have unlimited access
      if (user?.role === 'admin') {
        return {
          hasAccess: true,
          limit: 'unlimited',
          remaining: 'unlimited',
          requiresUpgrade: false,
          upgradeTiers: [],
          feature,
        };
      }

      const role = (user?.role || 'homeowner') as UserRole;
      const tier = subscription?.tier;

      // Check basic access
      const access = hasFeatureAccess(featureId, role, tier);
      const limit = getFeatureLimit(featureId, role, tier);

      // For boolean features (true/false access)
      if (typeof limit === 'boolean') {
        const upgradeTiers = tier && !access ? getUpgradeTiers(featureId, tier) : [];
        return {
          hasAccess: access,
          limit,
          requiresUpgrade: !access,
          upgradeTiers,
          feature,
        };
      }

      // For numeric/unlimited features (metered)
      const usageData = usage.get(featureId);
      const used = usageData?.used || 0;

      if (limit === 'unlimited') {
        return {
          hasAccess: true,
          limit: 'unlimited',
          used,
          remaining: 'unlimited',
          requiresUpgrade: false,
          upgradeTiers: [],
          feature,
        };
      }

      // Numeric limit
      const numericLimit = typeof limit === 'number' ? limit : 0;
      const remaining = Math.max(0, numericLimit - used);
      const hasAccessNow = access && remaining > 0;

      return {
        hasAccess: hasAccessNow,
        limit: numericLimit,
        used,
        remaining,
        requiresUpgrade: !hasAccessNow,
        upgradeTiers: tier ? getUpgradeTiers(featureId, tier) : [],
        feature,
      };
    },
    [user, subscription, usage]
  );

  /**
   * Track usage for a metered feature
   */
  const trackUsage = useCallback(
    async (featureId: string, incrementBy: number = 1): Promise<boolean> => {
      if (!user || !subscription) {
        return false;
      }

      try {
        const result = checkAccess(featureId);

        // Check if user has remaining usage
        if (!result.hasAccess) {
          return false;
        }

        // Update usage in database
        const { error } = await supabase.rpc('increment_feature_usage', {
          p_user_id: user.id,
          p_feature_id: featureId,
          p_increment: incrementBy,
        });

        if (error) {
          logger.error('[FeatureAccess] Failed to track usage', error);
          return false;
        }

        // Update local state
        const currentUsage = usage.get(featureId);
        const newUsed = (currentUsage?.used || 0) + incrementBy;

        setUsage(prev => {
          const next = new Map(prev);
          next.set(featureId, {
            featureId,
            used: newUsed,
            limit: currentUsage?.limit || 0,
            resetDate: currentUsage?.resetDate || new Date().toISOString(),
          });
          return next;
        });

        return true;
      } catch (err) {
        logger.error('[FeatureAccess] Error tracking usage', err);
        return false;
      }
    },
    [user, subscription, usage, checkAccess, supabase]
  );

  /**
   * Get remaining usage for a metered feature
   */
  const getRemainingUsage = useCallback(
    (featureId: string): number | 'unlimited' => {
      const result = checkAccess(featureId);
      return result.remaining ?? 0;
    },
    [checkAccess]
  );

  /**
   * Check if paywall should be shown for a feature
   */
  const shouldShowPaywall = useCallback(
    (featureId: string): boolean => {
      const result = checkAccess(featureId);
      return result.requiresUpgrade;
    },
    [checkAccess]
  );

  /**
   * Get feature information
   */
  const getFeature = useCallback(
    (featureId: string): FeatureDefinition | undefined => {
      return FEATURES[featureId];
    },
    []
  );

  /**
   * Get all available features for current user
   */
  const getAvailableFeatures = useCallback((): FeatureDefinition[] => {
    if (!user) {
      return [];
    }

    const role = user.role as UserRole;
    const tier = subscription?.tier;

    return Object.values(FEATURES).filter(feature => {
      return hasFeatureAccess(feature.id, role, tier);
    });
  }, [user, subscription]);

  return {
    // State
    user,
    subscription,
    loading: userLoading || loading,

    // Methods
    hasAccess: checkAccess,
    trackUsage,
    getRemainingUsage,
    shouldShowPaywall,
    getFeature,
    getAvailableFeatures,

    // Subscription info
    tier: subscription?.tier || 'free',
    status: subscription?.status || 'free',
    isFreeActive: subscription?.status === 'free',
  };
}

/**
 * Hook to check a single feature access
 * Convenience wrapper around useFeatureAccess
 */
export function useFeature(featureId: string): FeatureAccessResult & {
  loading: boolean;
  trackUsage: () => Promise<boolean>;
} {
  const {
    hasAccess: checkAccess,
    trackUsage: trackUsageBase,
    loading,
  } = useFeatureAccess();

  const result = checkAccess(featureId);

  const trackUsage = useCallback(async () => {
    return trackUsageBase(featureId);
  }, [featureId, trackUsageBase]);

  return {
    ...result,
    loading,
    trackUsage,
  };
}
