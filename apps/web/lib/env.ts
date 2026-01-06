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
    .refine(
      (val) => {
        // Reject known weak/placeholder patterns
        const weakPatterns = [
          'your-jwt-secret',
          'change-me',
          'placeholder',
          'secret123',
          'development',
          'test-jwt',
          /^(.)\1{10,}$/, // Repeated characters like 'aaaaaaaaaa'
        ];
        const lowerVal = val.toLowerCase();
        for (const pattern of weakPatterns) {
          if (typeof pattern === 'string') {
            if (lowerVal.includes(pattern)) return false;
          } else if (pattern.test(val)) {
            return false;
          }
        }
        return true;
      },
      'JWT_SECRET appears to be a weak or placeholder value - use a cryptographically secure random string'
    )
    .refine(
      (val) => {
        // Check for minimum entropy (at least 3 different character classes)
        const hasLower = /[a-z]/.test(val);
        const hasUpper = /[A-Z]/.test(val);
        const hasNumber = /[0-9]/.test(val);
        const hasSpecial = /[^a-zA-Z0-9]/.test(val);
        const charClasses = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
        return charClasses >= 3;
      },
      'JWT_SECRET must contain at least 3 character classes (lowercase, uppercase, numbers, special characters)'
    )
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

  // AI Service Configuration (REQUIRED for AI features)
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required for AI assessment features')
    .refine(
      (val) => val.startsWith('sk-') || val.startsWith('sk-proj-'),
      'OPENAI_API_KEY must start with sk- or sk-proj-'
    )
    .optional()
    .describe('OpenAI API key for GPT-4 Vision and embeddings (server-side only)'),

  // Roboflow Configuration (OPTIONAL but recommended)
  ROBOFLOW_API_KEY: z
    .string()
    .optional()
    .describe('Roboflow API key for building damage detection'),

  ROBOFLOW_MODEL_ID: z
    .string()
    .default('building-defect-detection-7-ks0im')
    .describe('Roboflow model ID'),

  ROBOFLOW_MODEL_VERSION: z
    .string()
    .default('1')
    .describe('Roboflow model version'),

  ROBOFLOW_TIMEOUT_MS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('10000')
    .describe('Roboflow API timeout in milliseconds'),

  // Google Maps (REQUIRED for location features)
  GOOGLE_MAPS_API_KEY: z
    .string()
    .optional()
    .describe('Google Maps API key for geocoding and map display'),

  // AWS Configuration (OPTIONAL)
  AWS_ACCESS_KEY_ID: z.string().optional().describe('AWS access key for Rekognition'),
  AWS_SECRET_ACCESS_KEY: z.string().optional().describe('AWS secret key'),
  AWS_REGION: z.string().default('us-east-1').optional().describe('AWS region'),

  // Google Cloud (OPTIONAL)
  GOOGLE_CLOUD_API_KEY: z.string().optional().describe('Google Cloud API key for Vision API'),

  // Redis Configuration (REQUIRED IN PRODUCTION)
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

  // Twilio Verify Configuration (OPTIONAL - fallback for SMS)
  TWILIO_ACCOUNT_SID: z
    .string()
    .regex(/^AC/, 'TWILIO_ACCOUNT_SID must start with AC')
    .optional()
    .describe('Twilio Account SID for Verify service fallback'),

  TWILIO_AUTH_TOKEN: z
    .string()
    .min(1)
    .optional()
    .describe('Twilio Auth Token for Verify service fallback'),

  TWILIO_VERIFY_SERVICE_SID: z
    .string()
    .regex(/^VA/, 'TWILIO_VERIFY_SERVICE_SID must start with VA')
    .optional()
    .describe('Twilio Verify Service SID for SMS fallback'),
});

// Type inference from schema
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Throws an error with detailed information if validation fails
 * In test mode, uses relaxed validation with safe defaults
 */
function validateEnv(): Env {
  try {
    // In test mode, use safeParse and provide defaults for missing values
    if (process.env.NODE_ENV === 'test') {
      const result = envSchema.safeParse(process.env);
      if (!result.success) {
        // Return with safe test defaults instead of throwing
        logger.warn('Using test environment defaults', {
          service: 'env-validation',
        });
      }
      // Use parsed values if available, otherwise the schema will use defaults
      const parsed = result.success ? result.data : envSchema.parse({
        ...process.env,
        // Provide minimal defaults for test mode
        JWT_SECRET: process.env.JWT_SECRET || 'Test_JWT_Secret_1234567890_abcdefghij_KLMNOPQRSTUVWXYZ!@#$%^&*',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key',
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_mock',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock',
      });
      logger.info('Environment variables validated successfully (test mode)', {
        service: 'env-validation',
      });
      return parsed;
    }

    const parsed = envSchema.parse(process.env);

    // Additional runtime checks
    if (parsed.NODE_ENV === 'production') {
      // In production, ensure we're using live keys
      if (parsed.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        logger.warn('Using Stripe test key in production', {
          service: 'env-validation',
        });
      }

      // Ensure Redis is configured in production (skip during build)
      // During build, Next.js may not have all env vars, so we only validate at runtime
      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                         process.env.NEXT_PHASE === 'phase-development-build';
      
      if (!isBuildTime && (!parsed.UPSTASH_REDIS_REST_URL || !parsed.UPSTASH_REDIS_REST_TOKEN)) {
        logger.error('Redis is REQUIRED in production for rate limiting', {
          service: 'env-validation',
        });
        throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production');
      }

      // Warn if AI features are disabled in production
      if (!parsed.OPENAI_API_KEY) {
        logger.warn('AI assessment features will be disabled - OPENAI_API_KEY not configured', {
          service: 'env-validation',
        });
      }

      if (!parsed.GOOGLE_MAPS_API_KEY) {
        logger.warn('Google Maps features may be limited - GOOGLE_MAPS_API_KEY not configured', {
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
        '',
        'Production-only required variables:',
        '  - UPSTASH_REDIS_REST_URL',
        '  - UPSTASH_REDIS_REST_TOKEN',
        '',
        'Recommended variables:',
        '  - OPENAI_API_KEY (for AI features)',
        '  - ROBOFLOW_API_KEY (for damage detection)',
        '  - GOOGLE_MAPS_API_KEY (for location services)',
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
