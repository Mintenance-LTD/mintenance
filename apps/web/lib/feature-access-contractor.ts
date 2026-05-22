/**
 * Contractor Feature Definitions
 */
import type { FeatureDefinition } from './feature-access-types';

export const CONTRACTOR_FEATURES: Record<string, FeatureDefinition> = {
  // Job Bidding & Discovery
  CONTRACTOR_BID_LIMIT: {
    id: 'CONTRACTOR_BID_LIMIT',
    name: 'Monthly Bid Limit',
    description: 'Number of bids you can submit per month',
    category: 'Bidding',
    // Free/Basic = 10/mo (acquisition tier). Pro/Business = unlimited (the
    // promise that justifies the subscription). Aligned with landing page
    // 2026-05-22 — was previously professional: 50 which broke the "unlimited
    // bids on Pro" claim. See plan in feat/tiered-pricing branch.
    limits: {
      free: 10,
      basic: 10,
      professional: 'unlimited',
      enterprise: 'unlimited',
    },
    upgradeMessage:
      "You've reached your monthly bid limit. Upgrade to submit more bids.",
    learnMoreUrl: '/contractor/subscription',
  },
  // Active concurrent jobs cap — the upgrade pressure on Free contractors.
  // A free contractor can BID on 10/mo but only WORK ON 3 at a time. Enforced
  // at bid-accept time (POST /api/jobs/[id]/bids/[bidId]/accept). Pro+ removes
  // the cap. 2026-05-22 plan.
  CONTRACTOR_ACTIVE_JOBS_LIMIT: {
    id: 'CONTRACTOR_ACTIVE_JOBS_LIMIT',
    name: 'Active Jobs Limit',
    description:
      'Maximum number of jobs you can work on at the same time (status: assigned or in_progress)',
    category: 'Bidding',
    limits: {
      free: 3,
      basic: 3,
      professional: 'unlimited',
      enterprise: 'unlimited',
    },
    upgradeMessage:
      "You've reached your concurrent active-jobs limit. Finish a current job or upgrade to Professional for unlimited active jobs.",
    learnMoreUrl: '/contractor/subscription',
  },
  CONTRACTOR_DISCOVERY_CARD: {
    id: 'CONTRACTOR_DISCOVERY_CARD',
    name: 'Discovery Card',
    description: 'Appear in homeowner discovery feed',
    category: 'Discovery',
    limits: { free: true, basic: true, professional: true, enterprise: true },
    upgradeMessage:
      'Upgrade to appear in the homeowner discovery feed and get more visibility.',
  },
  CONTRACTOR_FEATURED_LISTING: {
    id: 'CONTRACTOR_FEATURED_LISTING',
    name: 'Featured Listing',
    description: 'Get featured placement in search results',
    category: 'Discovery',
    limits: { free: false, basic: false, professional: true, enterprise: true },
    upgradeMessage:
      'Upgrade to Professional to get featured placement in search results.',
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
    upgradeMessage:
      'Upgrade to Enterprise for priority placement in all contractor listings.',
  },

  // 2026-05-22 dropped: CONTRACTOR_SOCIAL_FEED, CONTRACTOR_POST_LIMIT.
  // Marketplace social feeds don't drive value; killed before someone built
  // it. Replaced by lead-recommendations digest (see below).

  // Portfolio & Branding
  CONTRACTOR_PORTFOLIO_PHOTOS: {
    id: 'CONTRACTOR_PORTFOLIO_PHOTOS',
    name: 'Portfolio Photos',
    description: 'Number of portfolio photos you can upload',
    category: 'Portfolio',
    limits: { free: 3, basic: 20, professional: 100, enterprise: 'unlimited' },
    upgradeMessage:
      'Upgrade to showcase more of your work with additional portfolio photos.',
  },
  // 2026-05-22 dropped CONTRACTOR_CUSTOM_BRANDING — no real demand signal,
  // builds tech debt. Removed from landing page in same commit.
  CONTRACTOR_VERIFIED_BADGE: {
    id: 'CONTRACTOR_VERIFIED_BADGE',
    name: 'Verified Badge',
    description: 'Display verified badge on your profile',
    category: 'Branding',
    limits: { free: false, basic: true, professional: true, enterprise: true },
    upgradeMessage: 'Upgrade to get a verified badge on your profile.',
  },

  // Analytics & Reporting
  CONTRACTOR_BASIC_ANALYTICS: {
    id: 'CONTRACTOR_BASIC_ANALYTICS',
    name: 'Basic Analytics',
    description: 'View basic performance metrics',
    category: 'Analytics',
    limits: { free: true, basic: true, professional: true, enterprise: true },
  },
  CONTRACTOR_ADVANCED_ANALYTICS: {
    id: 'CONTRACTOR_ADVANCED_ANALYTICS',
    name: 'Advanced Analytics',
    description: 'Detailed analytics and insights',
    category: 'Analytics',
    limits: { free: false, basic: false, professional: true, enterprise: true },
    upgradeMessage:
      'Upgrade to Professional for advanced analytics and insights.',
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
    upgradeMessage:
      'Upgrade to Enterprise for custom reports and data exports.',
  },

  // Business Tools
  CONTRACTOR_QUOTE_BUILDER: {
    id: 'CONTRACTOR_QUOTE_BUILDER',
    name: 'Quote Builder',
    description: 'Professional quote builder tool',
    category: 'Business Tools',
    limits: { free: true, basic: true, professional: true, enterprise: true },
  },
  CONTRACTOR_INVOICE_MANAGEMENT: {
    id: 'CONTRACTOR_INVOICE_MANAGEMENT',
    name: 'Invoice Management',
    description: 'Create and manage invoices',
    category: 'Business Tools',
    limits: { free: false, basic: true, professional: true, enterprise: true },
    upgradeMessage: 'Upgrade to access invoice management tools.',
  },
  CONTRACTOR_CRM: {
    id: 'CONTRACTOR_CRM',
    name: 'Customer Relationship Management',
    description: 'CRM tools to manage customer relationships',
    category: 'Business Tools',
    limits: { free: false, basic: false, professional: true, enterprise: true },
    upgradeMessage:
      'Upgrade to Professional for CRM tools to manage your customers.',
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
    upgradeMessage:
      'Upgrade to Enterprise for API access and custom integrations.',
  },

  // Support & Training
  CONTRACTOR_EMAIL_SUPPORT: {
    id: 'CONTRACTOR_EMAIL_SUPPORT',
    name: 'Email Support',
    description: 'Email support with 48-hour response time',
    category: 'Support',
    limits: { free: true, basic: true, professional: true, enterprise: true },
  },
  CONTRACTOR_PRIORITY_SUPPORT: {
    id: 'CONTRACTOR_PRIORITY_SUPPORT',
    name: 'Priority Support',
    description: 'Priority email support with 24-hour response time',
    category: 'Support',
    limits: { free: false, basic: false, professional: true, enterprise: true },
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
  // 2026-05-22 dropped CONTRACTOR_DEDICATED_ACCOUNT_MANAGER — no CSM staffing
  // function exists. False promise risk. Build only when we actually staff it.

  // 2026-05-22 consolidated three flags (CONTRACTOR_MARKETING_TOOLS,
  // CONTRACTOR_MARKET_INSIGHTS, CONTRACTOR_LEAD_GENERATION) into a single
  // CONTRACTOR_LEAD_RECOMMENDATIONS feature with a real implementation
  // (daily digest of matching jobs via cron). The old flags had no code
  // consumers.
  CONTRACTOR_LEAD_RECOMMENDATIONS: {
    id: 'CONTRACTOR_LEAD_RECOMMENDATIONS',
    name: 'Lead Recommendations',
    description:
      'Daily push + email digest of jobs in your area matching your skills',
    category: 'Marketing',
    limits: { free: false, basic: false, professional: true, enterprise: true },
    upgradeMessage:
      'Upgrade to Professional to get daily lead recommendations.',
  },

  // Communication
  CONTRACTOR_MESSAGING: {
    id: 'CONTRACTOR_MESSAGING',
    name: 'Messaging',
    description: 'Chat with homeowners about jobs',
    category: 'Communication',
    limits: { free: true, basic: true, professional: true, enterprise: true },
  },
  CONTRACTOR_VIDEO_CALLS: {
    id: 'CONTRACTOR_VIDEO_CALLS',
    name: 'Video Calls',
    description: 'Video calls with homeowners',
    category: 'Communication',
    limits: { free: true, basic: true, professional: true, enterprise: true },
  },
  // 2026-05-22 dropped CONTRACTOR_VIDEO_CALL_RECORDING — no WebRTC vendor
  // integration exists. Defer to v2 if call recording becomes strategic.

  // Resources & Content
  CONTRACTOR_RESOURCES_LIBRARY: {
    id: 'CONTRACTOR_RESOURCES_LIBRARY',
    name: 'Resources Library',
    description: 'Access to business resources and templates',
    category: 'Resources',
    limits: { free: true, basic: true, professional: true, enterprise: true },
  },
  CONTRACTOR_TRAINING_MATERIALS: {
    id: 'CONTRACTOR_TRAINING_MATERIALS',
    name: 'Training Materials',
    description: 'Training videos and certification courses',
    category: 'Resources',
    limits: { free: false, basic: false, professional: true, enterprise: true },
    upgradeMessage:
      'Upgrade to Professional for training materials and courses.',
  },
};
