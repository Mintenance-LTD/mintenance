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

export { CACHE_TAGS, CACHE_DURATIONS } from './cache/config';

export { getCachedUser, getCachedContractors } from './cache/public-queries';

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
