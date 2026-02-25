/**
 * Feature Access Configuration
 *
 * Defines all features and their access levels for different user roles and subscription tiers.
 *
 * Subscription Tiers:
 * - Homeowners:
 *   - free: Core features + AI matching, 1 property
 *   - landlord: £24.99/month - compliance dashboard, tenant reporting, portfolio analytics, up to 25 properties
 *   - agency: £49.99/month - team access, bulk operations, unlimited properties
 * - Contractors:
 *   - free: Forever free with 10 bids/month
 *   - basic: £29/month
 *   - professional: £79/month
 *   - enterprise: £199/month
 */

// Re-export types from dedicated types file
export type {
  ContractorSubscriptionTier,
  HomeownerSubscriptionTier,
  SubscriptionTier,
  UserRole,
  FeatureLimit,
  FeatureDefinition,
} from './feature-access-types';

import type {
  ContractorSubscriptionTier,
  SubscriptionTier,
  UserRole,
  FeatureLimit,
  FeatureDefinition,
} from './feature-access-types';

// Import feature definitions from dedicated files
import { HOMEOWNER_FEATURES } from './feature-access-homeowner';
import { CONTRACTOR_FEATURES } from './feature-access-contractor';

// Re-export feature definition objects
export { HOMEOWNER_FEATURES } from './feature-access-homeowner';
export { CONTRACTOR_FEATURES } from './feature-access-contractor';

// =====================================================
// MERGED FEATURES & CATEGORIES
// =====================================================

export const FEATURES = {
  ...HOMEOWNER_FEATURES,
  ...CONTRACTOR_FEATURES,
};

export const FEATURE_CATEGORIES = [
  'Job Management',
  'Bidding',
  'Discovery',
  'Social',
  'Portfolio',
  'Branding',
  'Analytics',
  'Business Tools',
  'Support',
  'Marketing',
  'Communication',
  'Resources',
  'Content',
  'Payments',
  'Reviews',
  'Properties',
  'Compliance',
  'Tenant Management',
  'Maintenance',
  'Team',
] as const;

export type FeatureCategory = (typeof FEATURE_CATEGORIES)[number];

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get all features for a specific category
 */
export function getFeaturesByCategory(category: FeatureCategory): FeatureDefinition[] {
  return Object.values(FEATURES).filter((feature) => feature.category === category);
}

/**
 * Resolve the effective homeowner tier key for FeatureLimit lookup
 */
function getHomeownerTierKey(tier?: SubscriptionTier): keyof FeatureLimit {
  switch (tier) {
    case 'agency':
      return 'homeowner_agency';
    case 'landlord':
      return 'homeowner_landlord';
    default:
      return 'homeowner_free';
  }
}

/**
 * Check a homeowner feature limit, falling back to the legacy `homeowner` boolean
 */
function resolveHomeownerLimit(
  limits: FeatureLimit,
  tier?: SubscriptionTier
): number | boolean | 'unlimited' {
  const tierKey = getHomeownerTierKey(tier);
  const tierValue = limits[tierKey];

  // If the feature has tier-specific homeowner limits, use them
  if (tierValue !== undefined) {
    return tierValue;
  }

  // Fall back to legacy `homeowner: true` (means all tiers get access)
  if (limits.homeowner !== undefined) {
    return limits.homeowner;
  }

  return false;
}

/**
 * Get all features available to a specific role and tier
 */
export function getAvailableFeatures(
  role: UserRole,
  tier?: SubscriptionTier
): FeatureDefinition[] {
  if (role === 'admin') {
    return Object.values(FEATURES);
  }

  if (role === 'homeowner') {
    return Object.values(HOMEOWNER_FEATURES).filter((feature) => {
      const limit = resolveHomeownerLimit(feature.limits, tier);
      return limit !== false && limit !== 0;
    });
  }

  // Contractor features based on tier
  if (!tier) {
    return [];
  }

  return Object.values(CONTRACTOR_FEATURES).filter((feature) => {
    const limit = feature.limits[tier as ContractorSubscriptionTier];
    return limit !== false && limit !== 0;
  });
}

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(
  featureId: string,
  role: UserRole,
  tier?: SubscriptionTier
): boolean {
  const feature = FEATURES[featureId];
  if (!feature) {
    return false;
  }

  // Admins have access to everything
  if (role === 'admin') {
    return true;
  }

  // Homeowner features - check tier-specific limits
  if (role === 'homeowner') {
    const limit = resolveHomeownerLimit(feature.limits, tier);
    return limit !== false && limit !== 0;
  }

  // Contractor features require a tier
  if (!tier) {
    return false;
  }

  const limit = feature.limits[tier as ContractorSubscriptionTier];
  return limit !== false && limit !== 0;
}

/**
 * Get the limit for a specific feature
 */
export function getFeatureLimit(
  featureId: string,
  role: UserRole,
  tier?: SubscriptionTier
): number | boolean | 'unlimited' {
  const feature = FEATURES[featureId];
  if (!feature) {
    return false;
  }

  // Admins have unlimited access
  if (role === 'admin') {
    return 'unlimited';
  }

  // Homeowner features - check tier-specific limits
  if (role === 'homeowner') {
    return resolveHomeownerLimit(feature.limits, tier);
  }

  // Contractor features
  if (!tier) {
    return false;
  }

  return feature.limits[tier as ContractorSubscriptionTier] ?? false;
}

/**
 * Get upgrade tiers for a feature
 * Returns the tiers that have better access to this feature
 */
export function getUpgradeTiers(
  featureId: string,
  currentTier: SubscriptionTier
): SubscriptionTier[] {
  const feature = FEATURES[featureId];
  if (!feature) {
    return [];
  }

  const tierOrder: ContractorSubscriptionTier[] = ['free', 'basic', 'professional', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier as ContractorSubscriptionTier);
  const upgradeTiers: SubscriptionTier[] = [];

  if (currentIndex === -1) return []; // Not a contractor tier

  for (let i = currentIndex + 1; i < tierOrder.length; i++) {
    const tier = tierOrder[i];
    const limit = feature.limits[tier];
    const currentLimit = feature.limits[currentTier as ContractorSubscriptionTier];

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

// =====================================================
// PRICING
// =====================================================

/**
 * Pricing information for contractor subscription tiers
 */
export const TIER_PRICING = {
  free: {
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect to get started - free forever',
  },
  basic: {
    name: 'Basic',
    price: 29,
    period: 'month',
    description: 'Essential features for independent contractors',
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
    description: 'Complete solution for established businesses',
  },
} as const;

/**
 * Pricing information for homeowner subscription tiers
 */
export const HOMEOWNER_TIER_PRICING = {
  free: {
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Core features + AI matching for your home',
    propertyLimit: 1,
  },
  landlord: {
    name: 'Landlord',
    price: 24.99,
    period: 'month',
    annualPrice: 249,
    description: 'Complete property management for landlords',
    propertyLimit: 25,
    popular: true,
  },
  agency: {
    name: 'Agency',
    price: 49.99,
    period: 'month',
    annualPrice: 499,
    description: 'Multi-user portfolio management for letting agents',
    propertyLimit: 'unlimited' as const,
  },
} as const;
