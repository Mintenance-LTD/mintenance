// Environment Configuration
// Centralized configuration management for all environments with security

import {
  environmentSecurity,
  getApiConfig,
  getStripeConfig,
  getGoogleMapsConfig,
  getFeatureFlags,
  getTypedEnv,
  EnvironmentSecurity
} from '../utils/EnvironmentSecurity';

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  // App Info
  version: string;
  buildNumber: string;
  environment: Environment;

  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;

  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;

  // External Services
  sentryDsn?: string;
  stripePublishableKey?: string;
  googleMapsApiKey?: string;

  // Feature Flags
  enableBiometricAuth: boolean;
  enablePushNotifications: boolean;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableConsoleLogs: boolean;

  // Performance
  networkTimeout: number;

  // Security metadata
  isSecurelyConfigured: boolean;
  configurationValidation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// Helper function to parse boolean from string
const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean = false
): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper function to parse number from string
const parseNumber = (
  value: string | undefined,
  defaultValue: number
): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Get current environment
const getCurrentEnvironment = (): Environment => {
  const env =
    process.env.EXPO_PUBLIC_ENVIRONMENT ||
    process.env.NODE_ENV ||
    'development';

  switch (env) {
    case 'production':
      return 'production';
    case 'staging':
      return 'staging';
    default:
      return 'development';
  }
};

// Build configuration from environment variables with security validation
const buildConfig = (): AppConfig => {
  const environment = getCurrentEnvironment();

  // Get secure configurations
  const apiConfig = getApiConfig();
  const stripeConfig = getStripeConfig();
  const googleMapsConfig = getGoogleMapsConfig();
  const featureFlags = getFeatureFlags();

  // Get validation results
  const validation = environmentSecurity.validateEnvironment();

  return {
    // App Info
    version: getTypedEnv('EXPO_PUBLIC_APP_VERSION', EnvironmentSecurity.parsers.string, '1.0.0'),
    buildNumber: getTypedEnv('EXPO_PUBLIC_BUILD_NUMBER', EnvironmentSecurity.parsers.string, '1'),
    environment,

    // API Configuration (secured)
    apiBaseUrl: apiConfig.apiBaseUrl,
    apiTimeout: apiConfig.apiTimeout,

    // Supabase (secured)
    supabaseUrl: apiConfig.supabaseUrl,
    supabaseAnonKey: apiConfig.supabaseAnonKey,

    // External Services (secured)
    sentryDsn: getTypedEnv('EXPO_PUBLIC_SENTRY_DSN', EnvironmentSecurity.parsers.string),
    stripePublishableKey: stripeConfig.publishableKey,
    googleMapsApiKey: googleMapsConfig.apiKey,

    // Feature Flags (secured)
    enableBiometricAuth: featureFlags.enableBiometricAuth,
    enablePushNotifications: featureFlags.enablePushNotifications,
    enableAnalytics: featureFlags.enableAnalytics,
    enableCrashReporting: featureFlags.enableCrashReporting,
    enablePerformanceMonitoring: featureFlags.enablePerformanceMonitoring,

    // Logging
    logLevel: getTypedEnv(
      'EXPO_PUBLIC_LOG_LEVEL',
      (value: string) => {
        const validLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLevels.includes(value)) {
          throw new Error(`Invalid log level: ${value}`);
        }
        return value as 'debug' | 'info' | 'warn' | 'error';
      },
      environment === 'development' ? 'debug' : 'info'
    ),
    enableConsoleLogs: getTypedEnv(
      'EXPO_PUBLIC_ENABLE_CONSOLE_LOGS',
      EnvironmentSecurity.parsers.boolean,
      environment === 'development'
    ),

    // Performance
    networkTimeout: getTypedEnv('EXPO_PUBLIC_NETWORK_TIMEOUT', EnvironmentSecurity.parsers.number, 30000),

    // Security metadata
    isSecurelyConfigured: validation.isValid,
    configurationValidation: {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
    },
  };
};

// Export the configuration
export const config: AppConfig = buildConfig();

// Enhanced configuration validation with security checks
export const validateConfig = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
} => {
  // Use the comprehensive security validation
  const securityValidation = environmentSecurity.validateEnvironment();

  // Additional app-specific validations
  const appErrors: string[] = [];
  const appWarnings: string[] = [];

  // Check configuration consistency
  if (config.enableCrashReporting && !config.sentryDsn) {
    appWarnings.push('Crash reporting enabled but Sentry DSN not configured');
  }

  if (config.environment === 'production' && config.logLevel === 'debug') {
    appWarnings.push('Debug logging enabled in production - performance impact expected');
  }

  if (!config.isSecurelyConfigured) {
    appErrors.push('Security validation failed - check environment configuration');
  }

  return {
    isValid: securityValidation.isValid && appErrors.length === 0,
    errors: [...securityValidation.errors, ...appErrors],
    warnings: [...securityValidation.warnings, ...appWarnings],
    securityIssues: securityValidation.securityIssues,
  };
};

// Get comprehensive security report
export const getSecurityReport = () => {
  return environmentSecurity.generateSecurityReport();
};

// Helper functions for feature flags
export const isFeatureEnabled = (
  feature: keyof Pick<
    AppConfig,
    | 'enableBiometricAuth'
    | 'enablePushNotifications'
    | 'enableAnalytics'
    | 'enableCrashReporting'
    | 'enablePerformanceMonitoring'
  >
): boolean => {
  return config[feature];
};

export const isDevelopment = () => config.environment === 'development';
export const isStaging = () => config.environment === 'staging';
export const isProduction = () => config.environment === 'production';

// Log configuration on startup (development only)
if (isDevelopment()) {
  const { logger } = require('../utils/logger');
  logger.info('App Configuration loaded', {
    environment: config.environment,
    version: config.version,
    apiBaseUrl: config.apiBaseUrl,
    enabledFeatures: {
      biometric: config.enableBiometricAuth,
      pushNotifications: config.enablePushNotifications,
      analytics: config.enableAnalytics,
      crashReporting: config.enableCrashReporting,
      performanceMonitoring: config.enablePerformanceMonitoring,
    },
  });

  // Validate configuration
  const validation = validateConfig();
  if (!validation.isValid) {
    logger.warn('Configuration validation failed', {
      errors: validation.errors,
    });
  } else {
    logger.info('Configuration is valid');
  }
}

export default config;
