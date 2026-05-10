/**
 * Secure Environment Configuration
 *
 * ⚠️ SECURITY CRITICAL: This file handles secure credential management
 * Only client-safe values should be exposed to the frontend
 */

import Constants from 'expo-constants';
// Audit P2 (2026-05-10): Stripe publishable key is sourced from a single
// canonical accessor (`getStripeConfig().publishableKey` in
// EnvironmentSecurity.ts) so a future env-name change only has to be
// applied once. Two independent `process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
// reads previously coexisted; both now flow through that helper.
import { getStripeConfig } from '../utils/EnvironmentSecurity';

// Environment configuration with security hardening
const CONFIG = {
  // Supabase Public Configuration (safe for client)
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  // Stripe Public Configuration (safe for client) — see canonical
  // source in EnvironmentSecurity.getStripeConfig().
  STRIPE_PUBLISHABLE_KEY: getStripeConfig().publishableKey || '',

  // App Configuration
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Mintenance',
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',

  // API Configuration
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL || 'https://demo.supabase.co/rest/v1',
  API_TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000'),

  // Feature Flags
  ENABLE_BIOMETRIC_AUTH:
    process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH === 'true',
  ENABLE_PUSH_NOTIFICATIONS:
    process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === 'true',
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
} as const;

// Validate required configuration
const validateEnvironment = (): void => {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter(
    (key) =>
      !CONFIG[key as keyof typeof CONFIG] ||
      CONFIG[key as keyof typeof CONFIG] === ''
  );

  if (missing.length > 0) {
    const { logger } = require('../utils/logger');
    logger.warn('Missing required environment variables', { missing });
    if (CONFIG.ENVIRONMENT === 'production') {
      throw new Error(
        `Production deployment missing required environment variables: ${missing.join(', ')}`
      );
    }
  }
};

// Security validation for URLs and keys
const validateSecurityConfig = (): void => {
  const { logger } = require('../utils/logger');

  // Validate Supabase URL format
  if (!CONFIG.SUPABASE_URL.startsWith('https://')) {
    logger.error('SECURITY: Supabase URL must use HTTPS');
    if (CONFIG.ENVIRONMENT === 'production') {
      throw new Error('Insecure Supabase URL - HTTPS required');
    }
  }

  // Check for exposed dashboard URLs
  if (CONFIG.SUPABASE_URL.includes('/dashboard/')) {
    logger.error(
      'SECURITY: Supabase dashboard URL detected - use project API URL'
    );
    throw new Error(
      'Invalid Supabase URL - use project API URL, not dashboard URL'
    );
  }

  // Validate anon key format (basic JWT structure check)
  if (
    CONFIG.SUPABASE_ANON_KEY !== '' &&
    !CONFIG.SUPABASE_ANON_KEY.includes('.')
  ) {
    logger.error('SECURITY: Invalid Supabase anon key format');
    if (CONFIG.ENVIRONMENT === 'production') {
      throw new Error('Invalid Supabase anon key format');
    }
  }
};

// Run validation
validateEnvironment();
validateSecurityConfig();

// Credential access functions
// In Expo apps, public credentials are provided via EXPO_PUBLIC_ environment variables.
// These are embedded at build time and are appropriate for client-safe keys
// (e.g., restricted Google Maps keys, publishable Stripe keys).
const getServerCredentials = {
  /**
   * Get Google Maps API key from environment
   * The key should have platform restrictions (iOS/Android bundle ID) configured
   * in the Google Cloud Console to prevent unauthorized usage.
   */
  async getGoogleMapsKey(): Promise<string> {
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (!key) {
      const { logger } = require('../utils/logger');
      logger.warn(
        'CredentialAccess',
        'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Google Maps features will be unavailable.'
      );
    }
    return key;
  },

  /**
   * Get third-party service credentials from environment
   * Looks up EXPO_PUBLIC_{SERVICE}_API_KEY and EXPO_PUBLIC_{SERVICE}_BASE_URL.
   * Only client-safe (publishable/restricted) keys should be stored in EXPO_PUBLIC_ vars.
   */
  async getServiceCredentials(
    service: string
  ): Promise<{ token: string; baseUrl: string }> {
    const envPrefix = `EXPO_PUBLIC_${service.toUpperCase().replace(/-/g, '_')}`;
    const token =
      (process.env as Record<string, string | undefined>)[
        `${envPrefix}_API_KEY`
      ] || '';
    const baseUrl =
      (process.env as Record<string, string | undefined>)[
        `${envPrefix}_BASE_URL`
      ] || '';

    if (!token) {
      const { logger } = require('../utils/logger');
      logger.warn(
        'CredentialAccess',
        `Environment variable ${envPrefix}_API_KEY is not set for service "${service}".`
      );
    }

    return { token, baseUrl };
  },
};

// Log security status
const { logger } = require('../utils/logger');
logger.info('Security Configuration initialized', {
  environment: CONFIG.ENVIRONMENT,
  supabaseConfigured: CONFIG.SUPABASE_URL !== '',
  stripeConfigured: CONFIG.STRIPE_PUBLISHABLE_KEY !== '',
  analyticsEnabled: CONFIG.ENABLE_ANALYTICS,
  biometricEnabled: CONFIG.ENABLE_BIOMETRIC_AUTH,
});

export default CONFIG;
