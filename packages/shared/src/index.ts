// Shared utilities and helpers
export { logger } from './logger';
export { formatDate, formatCurrency, formatPhone } from './formatters';
export { debounce, throttle } from './utils';
export { generateId, sanitizeString } from './helpers';

// Constants
export const APP_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  PAGINATION_SIZE: 20,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORTED_FILE_TYPES: ['application/pdf', 'text/plain'],
} as const;