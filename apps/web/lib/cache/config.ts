import { unstable_cache } from 'next/cache';

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

/**
 * Generic cache query wrapper for easy caching of any function
 */
export function cacheQuery<T>(
  key: string | string[],
  queryFn: () => Promise<T>,
  revalidate: number = CACHE_DURATIONS.SHORT,
  tags?: string[]
): Promise<T> {
  const cacheKey = Array.isArray(key) ? key : [key];
  return unstable_cache(queryFn, cacheKey, {
    revalidate,
    tags: tags || [],
  })();
}
