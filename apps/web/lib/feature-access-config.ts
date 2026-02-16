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

export type ContractorSubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';
export type HomeownerSubscriptionTier = 'free' | 'landlord' | 'agency';
export type SubscriptionTier = ContractorSubscriptionTier | HomeownerSubscriptionTier;
export type UserRole = 'homeowner' | 'contractor' | 'admin';

export interface FeatureLimit {
  // Contractor tiers
  free?: number | boolean | 'unlimited';
  basic?: number | boolean | 'unlimited';
  professional?: number | boolean | 'unlimited';
  enterprise?: number | boolean | 'unlimited';
  // Homeowner tiers (backward-compatible: `homeowner: true` means all tiers)
  homeowner?: boolean;
  homeowner_free?: number | boolean | 'unlimited';
  homeowner_landlord?: number | boolean | 'unlimited';
  homeowner_agency?: number | boolean | 'unlimited';
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

// =====================================================
// HOMEOWNER FEATURES (All Free)
// =====================================================

const HOMEOWNER_FEATURES: Record<string, FeatureDefinition> = {
  // Job Management
  HOMEOWNER_POST_JOBS: {
    id: 'HOMEOWNER_POST_JOBS',
    name: 'Post Jobs',
    description: 'Create and post job listings to find contractors',
    category: 'Job Management',
    limits: { homeowner: true },
  },
  HOMEOWNER_UNLIMITED_JOBS: {
    id: 'HOMEOWNER_UNLIMITED_JOBS',
    name: 'Unlimited Jobs',
    description: 'Post unlimited number of jobs',
    category: 'Job Management',
    limits: { homeowner: true },
  },
  HOMEOWNER_EDIT_JOBS: {
    id: 'HOMEOWNER_EDIT_JOBS',
    name: 'Edit Jobs',
    description: 'Edit and update job details',
    category: 'Job Management',
    limits: { homeowner: true },
  },
  HOMEOWNER_JOB_TRACKING: {
    id: 'HOMEOWNER_JOB_TRACKING',
    name: 'Job Tracking',
    description: 'Track job progress and milestones',
    category: 'Job Management',
    limits: { homeowner: true },
  },

  // Communication
  HOMEOWNER_MESSAGING: {
    id: 'HOMEOWNER_MESSAGING',
    name: 'Messaging',
    description: 'Chat with contractors about jobs',
    category: 'Communication',
    limits: { homeowner: true },
  },
  HOMEOWNER_VIDEO_CALLS: {
    id: 'HOMEOWNER_VIDEO_CALLS',
    name: 'Video Calls',
    description: 'Schedule and conduct video calls with contractors',
    category: 'Communication',
    limits: { homeowner: true },
  },
  HOMEOWNER_NOTIFICATIONS: {
    id: 'HOMEOWNER_NOTIFICATIONS',
    name: 'Notifications',
    description: 'Receive notifications about bids and messages',
    category: 'Communication',
    limits: { homeowner: true },
  },

  // AI & Search
  HOMEOWNER_AI_ASSESSMENT: {
    id: 'HOMEOWNER_AI_ASSESSMENT',
    name: 'AI Building Assessment',
    description: 'Get AI-powered building condition assessments from photos',
    category: 'AI & Search',
    limits: { homeowner: true },
  },
  HOMEOWNER_AI_SEARCH: {
    id: 'HOMEOWNER_AI_SEARCH',
    name: 'AI Search',
    description: 'Use AI to find the best contractors for your needs',
    category: 'AI & Search',
    limits: { homeowner: true },
  },
  HOMEOWNER_CONTRACTOR_DISCOVERY: {
    id: 'HOMEOWNER_CONTRACTOR_DISCOVERY',
    name: 'Contractor Discovery',
    description: 'Browse and discover contractors',
    category: 'Discovery',
    limits: { homeowner: true },
  },

  // Payments & Financial
  HOMEOWNER_SECURE_PAYMENTS: {
    id: 'HOMEOWNER_SECURE_PAYMENTS',
    name: 'Secure Payments',
    description: 'Make secure payments through the platform',
    category: 'Payments',
    limits: { homeowner: true },
  },
  HOMEOWNER_ESCROW: {
    id: 'HOMEOWNER_ESCROW',
    name: 'Escrow Protection',
    description: 'Hold payments in escrow until work is completed',
    category: 'Payments',
    limits: { homeowner: true },
  },
  HOMEOWNER_PAYMENT_METHODS: {
    id: 'HOMEOWNER_PAYMENT_METHODS',
    name: 'Payment Methods',
    description: 'Manage multiple payment methods',
    category: 'Payments',
    limits: { homeowner: true },
  },

  // Reviews & Ratings
  HOMEOWNER_LEAVE_REVIEWS: {
    id: 'HOMEOWNER_LEAVE_REVIEWS',
    name: 'Leave Reviews',
    description: 'Leave reviews and ratings for contractors',
    category: 'Reviews',
    limits: { homeowner: true },
  },
  HOMEOWNER_VIEW_REVIEWS: {
    id: 'HOMEOWNER_VIEW_REVIEWS',
    name: 'View Reviews',
    description: 'Read reviews from other homeowners',
    category: 'Reviews',
    limits: { homeowner: true },
  },

  // Properties
  HOMEOWNER_PROPERTY_MANAGEMENT: {
    id: 'HOMEOWNER_PROPERTY_MANAGEMENT',
    name: 'Property Management',
    description: 'Manage multiple properties',
    category: 'Properties',
    limits: { homeowner: true },
  },
  HOMEOWNER_PROPERTY_LIMIT: {
    id: 'HOMEOWNER_PROPERTY_LIMIT',
    name: 'Property Limit',
    description: 'Maximum number of properties you can manage',
    category: 'Properties',
    limits: {
      homeowner_free: 1,
      homeowner_landlord: 25,
      homeowner_agency: 'unlimited',
    },
    upgradeMessage: 'Upgrade to manage more properties.',
    learnMoreUrl: '/pricing',
  },

  // Landlord & Agency Features
  HOMEOWNER_COMPLIANCE_DASHBOARD: {
    id: 'HOMEOWNER_COMPLIANCE_DASHBOARD',
    name: 'Compliance Dashboard',
    description: 'Track gas safety, electrical, EPC and other compliance certificates per property',
    category: 'Compliance',
    limits: {
      homeowner_free: false,
      homeowner_landlord: true,
      homeowner_agency: true,
    },
    upgradeMessage: 'Upgrade to Landlord to track compliance certificates and get expiry reminders.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_TENANT_REPORTING: {
    id: 'HOMEOWNER_TENANT_REPORTING',
    name: 'Tenant Reporting Links',
    description: 'Shareable links for tenants to report maintenance issues without an account',
    category: 'Tenant Management',
    limits: {
      homeowner_free: false,
      homeowner_landlord: true,
      homeowner_agency: true,
    },
    upgradeMessage: 'Upgrade to Landlord to give tenants a simple way to report issues.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_RECURRING_MAINTENANCE: {
    id: 'HOMEOWNER_RECURRING_MAINTENANCE',
    name: 'Recurring Maintenance',
    description: 'Schedule recurring maintenance tasks with automatic job creation',
    category: 'Maintenance',
    limits: {
      homeowner_free: false,
      homeowner_landlord: true,
      homeowner_agency: true,
    },
    upgradeMessage: 'Upgrade to Landlord to schedule recurring maintenance automatically.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_PORTFOLIO_ANALYTICS: {
    id: 'HOMEOWNER_PORTFOLIO_ANALYTICS',
    name: 'Portfolio Analytics',
    description: 'Spend tracking, maintenance history, and analytics per property',
    category: 'Analytics',
    limits: {
      homeowner_free: false,
      homeowner_landlord: true,
      homeowner_agency: true,
    },
    upgradeMessage: 'Upgrade to Landlord for detailed per-property analytics and spend tracking.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_TENANT_CONTACTS: {
    id: 'HOMEOWNER_TENANT_CONTACTS',
    name: 'Tenant & Contact Records',
    description: 'Store tenant details, lease dates, and key contacts per property',
    category: 'Tenant Management',
    limits: {
      homeowner_free: false,
      homeowner_landlord: true,
      homeowner_agency: true,
    },
    upgradeMessage: 'Upgrade to Landlord to manage tenant and contact records.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_TEAM_ACCESS: {
    id: 'HOMEOWNER_TEAM_ACCESS',
    name: 'Team Access',
    description: 'Invite team members with role-based access to manage properties',
    category: 'Team',
    limits: {
      homeowner_free: false,
      homeowner_landlord: false,
      homeowner_agency: true,
    },
    upgradeMessage: 'Upgrade to Agency for team member invites and role-based access.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_BULK_OPERATIONS: {
    id: 'HOMEOWNER_BULK_OPERATIONS',
    name: 'Bulk Operations',
    description: 'Bulk job posting and compliance exports across properties',
    category: 'Team',
    limits: {
      homeowner_free: false,
      homeowner_landlord: false,
      homeowner_agency: true,
    },
    upgradeMessage: 'Upgrade to Agency for bulk operations across your portfolio.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_YOY_COMPARISON: {
    id: 'HOMEOWNER_YOY_COMPARISON',
    name: 'Year-over-Year Comparison',
    description: 'Compare maintenance spend and activity across years',
    category: 'Analytics',
    limits: {
      homeowner_free: false,
      homeowner_landlord: false,
      homeowner_agency: true,
    },
    upgradeMessage: 'Upgrade to Agency for year-over-year portfolio comparisons.',
    learnMoreUrl: '/pricing',
  },
};

// =====================================================
// CONTRACTOR FEATURES (Tiered)
// =====================================================

const CONTRACTOR_FEATURES: Record<string, FeatureDefinition> = {
  // Job Bidding & Discovery
  CONTRACTOR_BID_LIMIT: {
    id: 'CONTRACTOR_BID_LIMIT',
    name: 'Monthly Bid Limit',
    description: 'Number of bids you can submit per month',
    category: 'Bidding',
    limits: {
      free: 10,
      basic: 10,
      professional: 50,
      enterprise: 'unlimited',
    },
    upgradeMessage: "You've reached your monthly bid limit. Upgrade to submit more bids.",
    learnMoreUrl: '/contractor/subscription',
  },
  CONTRACTOR_DISCOVERY_CARD: {
    id: 'CONTRACTOR_DISCOVERY_CARD',
    name: 'Discovery Card',
    description: 'Appear in homeowner discovery feed',
    category: 'Discovery',
    limits: {
      free: true,
      basic: true,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to appear in the homeowner discovery feed and get more visibility.',
  },
  CONTRACTOR_FEATURED_LISTING: {
    id: 'CONTRACTOR_FEATURED_LISTING',
    name: 'Featured Listing',
    description: 'Get featured placement in search results',
    category: 'Discovery',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional to get featured placement in search results.',
  },
  CONTRACTOR_PRIORITY_PLACEMENT: {
    id: 'CONTRACTOR_PRIORITY_PLACEMENT',
    name: 'Priority Placement',
    description: 'Appear at the top of contractor listings',
    category: 'Discovery',
    limits: {
      free: false,
      basic: false,
      professional: false,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Enterprise for priority placement in all contractor listings.',
  },

  // Social & Community
  CONTRACTOR_SOCIAL_FEED: {
    id: 'CONTRACTOR_SOCIAL_FEED',
    name: 'Social Feed',
    description: 'Access to contractor social feed and community',
    category: 'Social',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional to join the contractor community and social feed.',
  },
  CONTRACTOR_POST_LIMIT: {
    id: 'CONTRACTOR_POST_LIMIT',
    name: 'Social Posts Per Month',
    description: 'Number of social posts you can create per month',
    category: 'Social',
    limits: {
      free: 0,
      basic: 0,
      professional: 20,
      enterprise: 'unlimited',
    },
    upgradeMessage: 'Upgrade to create posts and engage with the contractor community.',
  },

  // Portfolio & Branding
  CONTRACTOR_PORTFOLIO_PHOTOS: {
    id: 'CONTRACTOR_PORTFOLIO_PHOTOS',
    name: 'Portfolio Photos',
    description: 'Number of portfolio photos you can upload',
    category: 'Portfolio',
    limits: {
      free: 3,
      basic: 20,
      professional: 100,
      enterprise: 'unlimited',
    },
    upgradeMessage: 'Upgrade to showcase more of your work with additional portfolio photos.',
  },
  CONTRACTOR_CUSTOM_BRANDING: {
    id: 'CONTRACTOR_CUSTOM_BRANDING',
    name: 'Custom Branding',
    description: 'Custom colors, logo, and branding on your profile',
    category: 'Branding',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional for custom branding on your profile.',
  },
  CONTRACTOR_VERIFIED_BADGE: {
    id: 'CONTRACTOR_VERIFIED_BADGE',
    name: 'Verified Badge',
    description: 'Display verified badge on your profile',
    category: 'Branding',
    limits: {
      free: false,
      basic: true,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to get a verified badge on your profile.',
  },

  // Analytics & Reporting
  CONTRACTOR_BASIC_ANALYTICS: {
    id: 'CONTRACTOR_BASIC_ANALYTICS',
    name: 'Basic Analytics',
    description: 'View basic performance metrics',
    category: 'Analytics',
    limits: {
      free: true,
      basic: true,
      professional: true,
      enterprise: true,
    },
  },
  CONTRACTOR_ADVANCED_ANALYTICS: {
    id: 'CONTRACTOR_ADVANCED_ANALYTICS',
    name: 'Advanced Analytics',
    description: 'Detailed analytics and insights',
    category: 'Analytics',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional for advanced analytics and insights.',
  },
  CONTRACTOR_CUSTOM_REPORTS: {
    id: 'CONTRACTOR_CUSTOM_REPORTS',
    name: 'Custom Reports',
    description: 'Create and export custom reports',
    category: 'Analytics',
    limits: {
      free: false,
      basic: false,
      professional: false,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Enterprise for custom reports and data exports.',
  },

  // Business Tools
  CONTRACTOR_QUOTE_BUILDER: {
    id: 'CONTRACTOR_QUOTE_BUILDER',
    name: 'Quote Builder',
    description: 'Professional quote builder tool',
    category: 'Business Tools',
    limits: {
      free: true,
      basic: true,
      professional: true,
      enterprise: true,
    },
  },
  CONTRACTOR_INVOICE_MANAGEMENT: {
    id: 'CONTRACTOR_INVOICE_MANAGEMENT',
    name: 'Invoice Management',
    description: 'Create and manage invoices',
    category: 'Business Tools',
    limits: {
      free: false,
      basic: true,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to access invoice management tools.',
  },
  CONTRACTOR_CRM: {
    id: 'CONTRACTOR_CRM',
    name: 'Customer Relationship Management',
    description: 'CRM tools to manage customer relationships',
    category: 'Business Tools',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional for CRM tools to manage your customers.',
  },
  CONTRACTOR_API_ACCESS: {
    id: 'CONTRACTOR_API_ACCESS',
    name: 'API Access',
    description: 'Access to developer API for integrations',
    category: 'Business Tools',
    limits: {
      free: false,
      basic: false,
      professional: false,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Enterprise for API access and custom integrations.',
  },

  // Support & Training
  CONTRACTOR_EMAIL_SUPPORT: {
    id: 'CONTRACTOR_EMAIL_SUPPORT',
    name: 'Email Support',
    description: 'Email support with 48-hour response time',
    category: 'Support',
    limits: {
      free: true,
      basic: true,
      professional: true,
      enterprise: true,
    },
  },
  CONTRACTOR_PRIORITY_SUPPORT: {
    id: 'CONTRACTOR_PRIORITY_SUPPORT',
    name: 'Priority Support',
    description: 'Priority email support with 24-hour response time',
    category: 'Support',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional for priority support.',
  },
  CONTRACTOR_PHONE_SUPPORT: {
    id: 'CONTRACTOR_PHONE_SUPPORT',
    name: 'Phone Support',
    description: 'Direct phone support line',
    category: 'Support',
    limits: {
      free: false,
      basic: false,
      professional: false,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Enterprise for direct phone support.',
  },
  CONTRACTOR_DEDICATED_ACCOUNT_MANAGER: {
    id: 'CONTRACTOR_DEDICATED_ACCOUNT_MANAGER',
    name: 'Dedicated Account Manager',
    description: 'Personal account manager for your business',
    category: 'Support',
    limits: {
      free: false,
      basic: false,
      professional: false,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Enterprise for a dedicated account manager.',
  },

  // Marketing & Growth
  CONTRACTOR_MARKETING_TOOLS: {
    id: 'CONTRACTOR_MARKETING_TOOLS',
    name: 'Marketing Tools',
    description: 'Marketing materials and campaign tools',
    category: 'Marketing',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional for marketing tools and resources.',
  },
  CONTRACTOR_MARKET_INSIGHTS: {
    id: 'CONTRACTOR_MARKET_INSIGHTS',
    name: 'Market Insights',
    description: 'Local market data and competitor insights',
    category: 'Marketing',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional for market insights and competitive analysis.',
  },
  CONTRACTOR_LEAD_GENERATION: {
    id: 'CONTRACTOR_LEAD_GENERATION',
    name: 'Lead Generation',
    description: 'Advanced lead generation tools',
    category: 'Marketing',
    limits: {
      free: false,
      basic: false,
      professional: false,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Enterprise for advanced lead generation.',
  },

  // Communication
  CONTRACTOR_MESSAGING: {
    id: 'CONTRACTOR_MESSAGING',
    name: 'Messaging',
    description: 'Chat with homeowners about jobs',
    category: 'Communication',
    limits: {
      free: true,
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
      free: true,
      basic: true,
      professional: true,
      enterprise: true,
    },
  },
  CONTRACTOR_VIDEO_CALL_RECORDING: {
    id: 'CONTRACTOR_VIDEO_CALL_RECORDING',
    name: 'Video Call Recording',
    description: 'Record video calls for reference',
    category: 'Communication',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional to record video calls.',
  },

  // Resources & Content
  CONTRACTOR_RESOURCES_LIBRARY: {
    id: 'CONTRACTOR_RESOURCES_LIBRARY',
    name: 'Resources Library',
    description: 'Access to business resources and templates',
    category: 'Resources',
    limits: {
      free: true,
      basic: true,
      professional: true,
      enterprise: true,
    },
  },
  CONTRACTOR_TRAINING_MATERIALS: {
    id: 'CONTRACTOR_TRAINING_MATERIALS',
    name: 'Training Materials',
    description: 'Training videos and certification courses',
    category: 'Resources',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional for training materials and courses.',
  },
};

// =====================================================
// EXPORTS
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

export type FeatureCategory = typeof FEATURE_CATEGORIES[number];

/**
 * Get all features for a specific category
 */
export function getFeaturesByCategory(category: FeatureCategory): FeatureDefinition[] {
  return Object.values(FEATURES).filter(feature => feature.category === category);
}

/**
 * Resolve the effective homeowner tier key for FeatureLimit lookup
 */
function getHomeownerTierKey(tier?: SubscriptionTier): keyof FeatureLimit {
  switch (tier) {
    case 'agency': return 'homeowner_agency';
    case 'landlord': return 'homeowner_landlord';
    default: return 'homeowner_free';
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
    return Object.values(HOMEOWNER_FEATURES).filter(feature => {
      const limit = resolveHomeownerLimit(feature.limits, tier);
      return limit !== false && limit !== 0;
    });
  }

  // Contractor features based on tier
  if (!tier) {
    return [];
  }

  return Object.values(CONTRACTOR_FEATURES).filter(feature => {
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
