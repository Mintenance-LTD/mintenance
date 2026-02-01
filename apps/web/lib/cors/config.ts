/**
 * CORS Configuration for Next.js API Routes
 *
 * SECURITY: Whitelist-based origin validation
 * - Production: Strict whitelist of allowed domains
 * - Development: Includes localhost origins for local testing
 * - Environment: Supports custom origins via ALLOWED_ORIGINS env var
 *
 * @see VULN-007 in security audit
 */

/**
 * Production allowed origins (strict whitelist)
 * These are the only origins allowed to make cross-origin requests to the API
 */
const PRODUCTION_ORIGINS = [
  'https://mintenance.com',
  'https://www.mintenance.com',
  'https://app.mintenance.com',
];

/**
 * Development origins (only used in non-production environments)
 * Automatically added when NODE_ENV !== 'production'
 */
const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',      // Next.js dev server
  'http://localhost:19006',     // Expo dev server (React Native)
  'http://127.0.0.1:3000',      // Alternative localhost
  'http://127.0.0.1:19006',     // Alternative Expo localhost
];

/**
 * Get allowed origins based on environment
 *
 * Logic:
 * - Production: Only production origins + custom env origins
 * - Development: Production + development + custom env origins
 *
 * Custom origins can be added via ALLOWED_ORIGINS env var (comma-separated)
 * Example: ALLOWED_ORIGINS=https://staging.mintenance.com,https://preview.mintenance.com
 */
export function getAllowedOrigins(): string[] {
  const isProd = process.env.NODE_ENV === 'production';

  // Start with appropriate base origins
  let origins = isProd
    ? [...PRODUCTION_ORIGINS]
    : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];

  // Add custom origins from environment variable
  const customOriginsEnv = process.env.ALLOWED_ORIGINS;
  if (customOriginsEnv) {
    const customOrigins = customOriginsEnv
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);

    origins = [...origins, ...customOrigins];
  }

  // Add NEXT_PUBLIC_APP_URL if not already included
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !origins.includes(appUrl)) {
    origins.push(appUrl);
  }

  // Remove duplicates
  return Array.from(new Set(origins));
}

/**
 * Check if an origin is allowed to make cross-origin requests
 *
 * @param origin - The origin header from the request (e.g., "https://mintenance.com")
 * @returns true if the origin is in the whitelist, false otherwise
 *
 * SECURITY: Returns false for null/undefined origins
 */
export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Get feature flag status for CORS validation
 *
 * Allows gradual rollout:
 * - ENABLE_CORS_VALIDATION=false → CORS disabled (legacy behavior)
 * - ENABLE_CORS_VALIDATION=true → CORS enabled globally
 *
 * @returns true if CORS validation is enabled
 */
export function isCorsEnabled(): boolean {
  // Default to enabled for security
  const enabledEnv = process.env.ENABLE_CORS_VALIDATION;
  if (enabledEnv === undefined) return true;

  return enabledEnv === 'true' || enabledEnv === '1';
}

/**
 * Get CORS rollout percentage for gradual deployment
 *
 * Used for phased rollout:
 * - 0 = disabled for all users
 * - 10 = enabled for 10% of requests (based on request hash)
 * - 100 = enabled for all users
 *
 * @returns percentage (0-100)
 */
export function getCorsRolloutPercentage(): number {
  const percentage = process.env.CORS_ROLLOUT_PERCENTAGE;
  if (!percentage) return 100; // Default to full rollout

  const parsed = parseInt(percentage, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 100) return 100;

  return parsed;
}
