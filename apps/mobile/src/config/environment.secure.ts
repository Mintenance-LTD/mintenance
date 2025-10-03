/**
 * Secure Environment Configuration
 *
 * ⚠️ SECURITY CRITICAL: This file handles secure credential management
 * Only client-safe values should be exposed to the frontend
 */

import Constants from 'expo-constants';

// Environment configuration with security hardening
const CONFIG = {
  // Supabase Public Configuration (safe for client)
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  // Stripe Public Configuration (safe for client)
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',

  // App Configuration
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Mintenance',
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',

  // API Configuration
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://demo.supabase.co/rest/v1',
  API_TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000'),

  // Feature Flags
  ENABLE_BIOMETRIC_AUTH: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH === 'true',
  ENABLE_PUSH_NOTIFICATIONS: process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === 'true',
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
} as const;

// Validate required configuration
const validateEnvironment = (): void => {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !CONFIG[key as keyof typeof CONFIG] || CONFIG[key as keyof typeof CONFIG] === '');

  if (missing.length > 0) {
    console.warn('⚠️ Missing required environment variables:', missing);
    if (CONFIG.ENVIRONMENT === 'production') {
      throw new Error(`Production deployment missing required environment variables: ${missing.join(', ')}`);
    }
  }
};

// Security validation for URLs and keys
const validateSecurityConfig = (): void => {
  // Validate Supabase URL format
  if (!CONFIG.SUPABASE_URL.startsWith('https://')) {
    console.error('🚨 SECURITY: Supabase URL must use HTTPS');
    if (CONFIG.ENVIRONMENT === 'production') {
      throw new Error('Insecure Supabase URL - HTTPS required');
    }
  }

  // Check for exposed dashboard URLs
  if (CONFIG.SUPABASE_URL.includes('/dashboard/')) {
    console.error('🚨 SECURITY: Supabase dashboard URL detected - use project API URL');
    throw new Error('Invalid Supabase URL - use project API URL, not dashboard URL');
  }

  // Validate anon key format (basic JWT structure check)
  if (CONFIG.SUPABASE_ANON_KEY !== '' && !CONFIG.SUPABASE_ANON_KEY.includes('.')) {
    console.error('🚨 SECURITY: Invalid Supabase anon key format');
    if (CONFIG.ENVIRONMENT === 'production') {
      throw new Error('Invalid Supabase anon key format');
    }
  }
};

// Run validation
validateEnvironment();
validateSecurityConfig();

// Server-side credential proxy functions
// These should make requests to your backend API, not expose keys directly
export const getServerCredentials = {
  /**
   * Get Google Maps API key from server
   * ⚠️ This should be implemented as a server endpoint that returns restricted keys
   */
  async getGoogleMapsKey(): Promise<string> {
    // TODO: Implement server endpoint /api/credentials/google-maps
    // For now, return a restricted key or implement domain restrictions
    console.warn('🚨 SECURITY: Google Maps key should be fetched from server with domain restrictions');
    return 'GOOGLE_MAPS_KEY_FROM_SERVER';
  },

  /**
   * Get third-party service credentials from server
   * ⚠️ Never expose these on the client side
   */
  async getServiceCredentials(service: string): Promise<{ token: string; baseUrl: string }> {
    // TODO: Implement server endpoint /api/credentials/:service
    throw new Error(`Server credential endpoint not implemented for ${service}`);
  }
};

// Log security status
console.log('🔒 Security Configuration:', {
  environment: CONFIG.ENVIRONMENT,
  supabaseConfigured: CONFIG.SUPABASE_URL !== '',
  stripeConfigured: CONFIG.STRIPE_PUBLISHABLE_KEY !== '',
  analyticsEnabled: CONFIG.ENABLE_ANALYTICS,
  biometricEnabled: CONFIG.ENABLE_BIOMETRIC_AUTH
});

export default CONFIG;