// Shared utilities and helpers
export { logger } from './logger';
export { formatDate, formatCurrency, formatPhone } from './formatters';
export { debounce, throttle, hashString } from './utils';
export { generateId, sanitizeString } from './helpers';

// Materials types and utilities
export type {
  Material,
  MaterialCategory,
  MaterialUnit,
  MaterialSpecifications,
  CreateMaterialInput,
  UpdateMaterialInput,
  MaterialQueryFilters,
  MaterialsListResponse,
} from './types/materials';
export {
  MaterialCategoryLabels,
  MaterialUnitLabels,
  formatMaterialPrice,
  formatMaterialUnitPrice,
  getEffectiveUnitPrice,
  calculateMaterialCost,
} from './types/materials';

// Property types
export type {
  Property,
  PropertyType,
  PropertyWithStats,
  PropertyFavorite,
  PropertyInput,
  PropertyHealthScore,
} from './types/property';
// Application Configuration Constants
export const APP_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  PAGINATION_SIZE: 20,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORTED_FILE_TYPES: ['application/pdf', 'text/plain'],
} as const;
// Business Logic Constants
export const BUSINESS_RULES = {
  /** Minimum budget (GBP) that requires photo attachments */
  BUDGET_REQUIRES_PHOTOS_THRESHOLD: 500,
  /** Token expiration warning threshold in minutes */
  TOKEN_EXPIRY_WARNING_MINUTES: 5,
  /** Maximum number of jobs a user can create per hour */
  MAX_JOBS_PER_HOUR: 10,
  /** Maximum login attempts before account lockout */
  MAX_LOGIN_ATTEMPTS: 5,
  /** Login lockout duration in minutes */
  LOGIN_LOCKOUT_DURATION_MINUTES: 15,
  /** Password reset rate limit - max attempts per hour */
  MAX_PASSWORD_RESETS_PER_HOUR: 3,
  /** Session expiry duration in days when "remember me" is checked */
  REMEMBER_ME_DURATION_DAYS: 30,
  /** Default session expiry duration in hours */
  DEFAULT_SESSION_DURATION_HOURS: 24,
  /** Contractor search radius in kilometers */
  DEFAULT_SEARCH_RADIUS_KM: 50,
  /** Maximum photos per job */
  MAX_PHOTOS_PER_JOB: 10,
  /** Maximum skills per contractor */
  MAX_SKILLS_PER_CONTRACTOR: 20,
} as const;
// Rate Limiting Constants
export const RATE_LIMITS = {
  /** API requests per minute */
  API_REQUESTS_PER_MINUTE: 1000,
  /** AI analysis requests per minute (expensive operations) */
  AI_ANALYSIS_PER_MINUTE: 5,
  /** AI search requests per minute */
  AI_SEARCH_PER_MINUTE: 10,
  /** AI suggestions requests per minute */
  AI_SUGGESTIONS_PER_MINUTE: 20,
  /** Webhook requests per minute */
  WEBHOOK_REQUESTS_PER_MINUTE: 100,
  /** Maximum entries in fallback rate limiter (memory safety) */
  MAX_FALLBACK_ENTRIES: 1000,
  /** Redis operation timeout in milliseconds */
  REDIS_TIMEOUT_MS: 5000,
  /** Redis expire operation timeout in milliseconds */
  REDIS_EXPIRE_TIMEOUT_MS: 2000,
  /** Production fallback retry after (seconds) */
  PRODUCTION_FALLBACK_RETRY_AFTER: 60,
} as const;
// Feature Flags Constants
export const FEATURE_FLAGS = {
  /** Default rollout percentage for new features */
  DEFAULT_ROLLOUT_PERCENTAGE: 100,
  /** Environment variable name for 2025 UI rollout */
  UI_2025_ROLLOUT_ENV: 'FEATURE_2025_UI_ROLLOUT_PERCENTAGE',
} as const;
// Time Constants (in milliseconds)
export const TIME_MS = {
  /** One second in milliseconds */
  SECOND: 1000,
  /** One minute in milliseconds */
  MINUTE: 60 * 1000,
  /** One hour in milliseconds */
  HOUR: 60 * 60 * 1000,
  /** One day in milliseconds */
  DAY: 24 * 60 * 60 * 1000,
} as const;