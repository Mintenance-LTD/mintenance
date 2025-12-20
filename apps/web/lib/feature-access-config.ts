/**
 * Feature Access Configuration
 *
 * Defines all features and their access levels for different user roles and subscription tiers.
 *
 * Subscription Tiers:
 * - Homeowners: Free (all features included)
 * - Contractors:
 *   - free: Forever free with 5 bids/month
 *   - basic: £29/month
 *   - professional: £79/month
 *   - enterprise: £199/month
 */

export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';
export type UserRole = 'homeowner' | 'contractor' | 'admin';

export interface FeatureLimit {
  free?: number | boolean | 'unlimited';
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
      free: 5,
      basic: 20,
      professional: 100,
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
  CONTRACTOR_GROUPS: {
    id: 'CONTRACTOR_GROUPS',
    name: 'Contractor Groups',
    description: 'Join and participate in contractor groups',
    category: 'Social',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional to join contractor groups and network with peers.',
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
  CONTRACTOR_TEAM_MANAGEMENT: {
    id: 'CONTRACTOR_TEAM_MANAGEMENT',
    name: 'Team Management',
    description: 'Manage team members and assign roles',
    category: 'Business Tools',
    limits: {
      free: false,
      basic: false,
      professional: false,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Enterprise to manage team members.',
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
  CONTRACTOR_PUBLISH_ARTICLES: {
    id: 'CONTRACTOR_PUBLISH_ARTICLES',
    name: 'Publish Articles',
    description: 'Write and publish articles to showcase expertise',
    category: 'Content',
    limits: {
      free: false,
      basic: false,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to Professional to publish articles and build your reputation.',
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
] as const;

export type FeatureCategory = typeof FEATURE_CATEGORIES[number];

/**
 * Get all features for a specific category
 */
export function getFeaturesByCategory(category: FeatureCategory): FeatureDefinition[] {
  return Object.values(FEATURES).filter(feature => feature.category === category);
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
    return Object.values(HOMEOWNER_FEATURES);
  }

  // Contractor features based on tier
  if (!tier) {
    return [];
  }

  return Object.values(CONTRACTOR_FEATURES).filter(feature => {
    const limit = feature.limits[tier];
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

  // Homeowner features
  if (role === 'homeowner') {
    return feature.limits.homeowner === true;
  }

  // Contractor features require a tier
  if (!tier) {
    return false;
  }

  const limit = feature.limits[tier];
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

  // Homeowner features
  if (role === 'homeowner') {
    return feature.limits.homeowner === true ? 'unlimited' : false;
  }

  // Contractor features
  if (!tier) {
    return false;
  }

  return feature.limits[tier] ?? false;
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

  const tierOrder: SubscriptionTier[] = ['free', 'basic', 'professional', 'enterprise'];
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
 * Pricing information for subscription tiers
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
