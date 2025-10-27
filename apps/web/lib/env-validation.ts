/**
 * Environment Variable Validation
 * Validates required environment variables at application startup
 * Fails fast if critical configuration is missing
 */

import { logger } from '@mintenance/shared';

export interface EnvConfig {
  // Authentication
  JWT_SECRET: string;

  // Database
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Payments
  STRIPE_SECRET_KEY?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;

  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL?: string;

  // Optional Services
  SENTRY_DSN?: string;
  REDIS_URL?: string;
}

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NODE_ENV',
] as const;

const PAYMENT_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
] as const;

/**
 * Validate environment variables
 * @throws Error if required variables are missing
 */
export function validateEnv(): EnvConfig {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check payment variables (warning only in development)
  for (const key of PAYMENT_ENV_VARS) {
    if (!process.env[key]) {
      if (process.env.NODE_ENV === 'production') {
        missing.push(key);
      } else {
        warnings.push(key);
      }
    }
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}`;
    logger.error(errorMessage, undefined, { service: 'env-validation' });
    throw new Error(errorMessage);
  }

  // Log warnings for optional variables
  if (warnings.length > 0) {
    logger.warn('Missing optional environment variables', {
      service: 'env-validation',
      missing: warnings,
    });
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }

  // Validate URL formats
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_APP_URL);
    } catch {
      throw new Error('NEXT_PUBLIC_APP_URL must be a valid URL');
    }
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV || '')) {
    throw new Error(`NODE_ENV must be one of: ${validEnvs.join(', ')}`);
  }

  logger.info('Environment variables validated successfully', {
    service: 'env-validation',
    env: process.env.NODE_ENV,
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasSentry: !!process.env.SENTRY_DSN,
    hasRedis: !!process.env.REDIS_URL,
  });

  return {
    JWT_SECRET: process.env.JWT_SECRET!,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    REDIS_URL: process.env.REDIS_URL,
  };
}

/**
 * Get validated environment config (cached)
 */
let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
  }
  return cachedConfig;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
