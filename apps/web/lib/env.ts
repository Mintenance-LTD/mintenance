/**
 * Environment Variable Validation
 *
 * This module validates all required environment variables at startup
 * to prevent runtime failures due to missing or invalid configuration.
 *
 * Uses Zod for runtime type checking and validation.
 * This is the SINGLE SOURCE OF TRUTH for environment variable validation.
 */

import { z } from 'zod';
import { logger } from '@mintenance/shared';

// Define the schema for environment variables
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // JWT Configuration (CRITICAL)
  JWT_SECRET: z
    .string()
    .min(64, 'JWT_SECRET must be at least 64 characters for production security')
    .describe('Secret key for JWT signing - must be strong and random'),

  // Supabase Configuration (CRITICAL)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .describe('Supabase project URL'),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .describe('Supabase service role key - server-side only'),

  // Stripe Configuration (CRITICAL)
  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_/, 'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_')
    .describe('Stripe secret key - server-side only'),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .regex(/^whsec_/, 'STRIPE_WEBHOOK_SECRET must start with whsec_')
    .describe('Stripe webhook signing secret'),

  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .regex(/^pk_(test|live)_/, 'Must start with pk_test_ or pk_live_')
    .describe('Stripe publishable key - client-side'),

  // Redis Configuration (OPTIONAL - has fallback)
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url()
    .optional()
    .describe('Upstash Redis URL for rate limiting'),

  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .describe('Upstash Redis token'),

  // Optional Configuration
  SENTRY_DSN: z
    .string()
    .url()
    .optional()
    .describe('Sentry DSN for error tracking'),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional()
    .describe('Application public URL'),
});

// Type inference from schema
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Throws an error with detailed information if validation fails
 */
function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);

    // Additional runtime checks
    if (parsed.NODE_ENV === 'production') {
      // In production, ensure we're using live keys
      if (parsed.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        logger.warn('Using Stripe test key in production', {
          service: 'env-validation',
        });
      }

      // Ensure Redis is configured in production
      if (!parsed.UPSTASH_REDIS_REST_URL || !parsed.UPSTASH_REDIS_REST_TOKEN) {
        logger.warn('Redis not configured - rate limiting will be degraded', {
          service: 'env-validation',
        });
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors for easy debugging
      const errorMessages = error.errors
        .map((err) => {
          const path = err.path.join('.') || 'unknown';
          return `  - ${path}: ${err.message}`;
        })
        .join('\n');

      const fullErrorMessage = [
        '',
        '❌ Environment variable validation failed:',
        errorMessages,
        '',
        '📋 Please check your .env file and ensure all required variables are set.',
        '   See .env.example for reference.',
        '',
        'Required variables:',
        '  - JWT_SECRET (min 64 characters)',
        '  - NEXT_PUBLIC_SUPABASE_URL (valid URL)',
        '  - SUPABASE_SERVICE_ROLE_KEY',
        '  - STRIPE_SECRET_KEY (must start with sk_test_ or sk_live_)',
        '  - STRIPE_WEBHOOK_SECRET (must start with whsec_)',
        '  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (must start with pk_test_ or pk_live_)',
        ''
      ].join('\n');

      // Write to stderr synchronously to ensure it's captured
      process.stderr.write(fullErrorMessage);

      throw new Error(fullErrorMessage);
    }

    throw error;
  }
}

/**
 * Validated environment variables
 * This will throw an error at module import time if validation fails
 */
export const env = validateEnv();

/**
 * Helper function to check if running in production
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Helper function to check if running in development
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Helper function to check if running in test
 */
export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

// Log successful validation in development
if (isDevelopment()) {
  logger.info('Environment variables validated successfully', {
    service: 'env-validation',
  });
}
