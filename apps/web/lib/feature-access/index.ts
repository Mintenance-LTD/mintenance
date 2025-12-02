/**
 * Feature Access System - Exports
 *
 * Central export point for the feature access system.
 * Import everything you need from this single file.
 */

// Configuration
export {
  FEATURES,
  FEATURE_CATEGORIES,
  TIER_PRICING,
  getFeaturesByCategory,
  getAvailableFeatures,
  hasFeatureAccess,
  getFeatureLimit,
  getUpgradeTiers,
  type SubscriptionTier,
  type UserRole,
  type FeatureLimit,
  type FeatureDefinition,
  type FeatureCategory,
} from '../feature-access-config';

// Hooks
export {
  useFeatureAccess,
  useFeature,
  type FeatureAccessResult,
} from '@/hooks/useFeatureAccess';

// Components
export {
  FeatureGate,
  FeatureButton,
  FeatureBadge,
  withFeatureAccess,
} from '@/components/ui/FeatureGate';

export {
  Paywall,
  PaywallBanner,
} from '@/components/ui/Paywall';

// Re-export types from shared package
export type {
  FeatureUsage,
  SubscriptionInfo,
  TierPricing,
} from '@mintenance/types';
