/**
 * Rate Limiter Enhanced — Facade
 *
 * This file exists for backward compatibility. All consumers import from here.
 * The actual implementation lives in ./rate-limiter/ module directory.
 */
export {
  EnhancedRateLimiter,
  getRateLimiter,
  checkRateLimit,
  checkLoginRateLimit,
  checkPasswordResetRateLimit,
  checkJobCreationRateLimit,
  checkApiRateLimit,
  checkWebhookRateLimit,
  createRateLimitHeaders,
} from './rate-limiter/index';
export type {
  RateLimitResult,
  RateLimitOptions,
  RateLimitStore,
} from './rate-limiter/index';
