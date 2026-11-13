/**
 * Cache configuration for different data types
 */
export const CACHE_TAGS = {
  CONTRACTORS: 'contractors',
  JOBS: 'jobs',
  SERVICES: 'services',
  CATEGORIES: 'categories',
  USER_PROFILES: 'user-profiles',
  USER_JOBS: 'user-jobs',
  USER_BIDS: 'user-bids',
  USER_PAYMENTS: 'user-payments',
  USER_PROPERTIES: 'user-properties',
  USER_SUBSCRIPTIONS: 'user-subscriptions',
  USER_MESSAGES: 'user-messages',
  USER_RECOMMENDATIONS: 'user-recommendations',
  USER_ONBOARDING: 'user-onboarding',
} as const;

export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;
