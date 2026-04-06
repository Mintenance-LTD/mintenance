/**
 * Cache module barrel file - re-exports from ./cache/* modules.
 *
 * Split for maintainability (was 792 lines):
 *  - ./cache/types          — shared query types + Supabase error helper
 *  - ./cache/config         — CACHE_TAGS, CACHE_DURATIONS, cacheQuery wrapper
 *  - ./cache/invalidation   — revalidate* tag-invalidation helpers
 *  - ./cache/public-queries — public/read cached queries (users, contractors, jobs, categories)
 *  - ./cache/user-queries   — per-user cached queries (jobs, bids, payments, properties, etc.)
 */

export { CACHE_TAGS, CACHE_DURATIONS, cacheQuery } from './cache/config';

export {
  revalidateContractors,
  revalidateJobs,
  revalidateServiceCategories,
  revalidateUserProfile,
} from './cache/invalidation';

export {
  getCachedUser,
  getCachedContractors,
  getCachedServiceCategories,
  getCachedContractorById,
} from './cache/public-queries';

export { getCachedJobs } from './cache/jobs-queries';

export {
  getCachedUserJobs,
  getCachedUserBids,
  getCachedUserProperties,
  getCachedUserMessages,
  getCachedUserQuotes,
} from './cache/user-queries';

export {
  getCachedUserPayments,
  getCachedUserSubscriptions,
} from './cache/billing-queries';
