// Environment Configuration
// Centralized configuration management for all environments

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
}

// Helper function to parse boolean from string
const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper function to parse number from string
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Get current environment
const getCurrentEnvironment = (): Environment => {
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'production';
    case 'staging':
      return 'staging';
    default:
      return 'development';
  }
};

// Build configuration from environment variables
const buildConfig = (): AppConfig => {
  const environment = getCurrentEnvironment();
  
  return {
    // App Info
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    buildNumber: process.env.EXPO_PUBLIC_BUILD_NUMBER || '1',
    environment,
    
    // API Configuration
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 
                (environment === 'production' ? 'https://api.mintenance.com' :
                 environment === 'staging' ? 'https://staging-api.mintenance.com' :
                 'http://localhost:3000'),
    apiTimeout: parseNumber(process.env.EXPO_PUBLIC_API_TIMEOUT, 30000),
    
    // Supabase
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    
    // External Services
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    
    // Feature Flags
    enableBiometricAuth: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH, true),
    enablePushNotifications: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS, true),
    enableAnalytics: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_ANALYTICS, environment === 'production'),
    enableCrashReporting: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING, environment !== 'development'),
    enablePerformanceMonitoring: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING, environment === 'production'),
    
    // Logging
    logLevel: (process.env.EXPO_PUBLIC_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 
              (environment === 'development' ? 'debug' : 'info'),
    enableConsoleLogs: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_CONSOLE_LOGS, environment === 'development'),
    
    // Performance
    networkTimeout: parseNumber(process.env.EXPO_PUBLIC_NETWORK_TIMEOUT, 30000),
  };
};

// Export the configuration
export const config: AppConfig = buildConfig();

// Configuration validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required fields
  if (!config.supabaseUrl) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is required');
  }
  
  if (!config.supabaseAnonKey) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  // Production-specific validations
  if (config.environment === 'production') {
    if (!config.sentryDsn && config.enableCrashReporting) {
      errors.push('EXPO_PUBLIC_SENTRY_DSN is required in production when crash reporting is enabled');
    }
    
    if (!config.stripePublishableKey) {
      errors.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is required in production');
    }
    
    if (config.apiBaseUrl.includes('localhost')) {
      errors.push('API base URL should not point to localhost in production');
    }
  }
  
  // URL validations
  try {
    new URL(config.apiBaseUrl);
  } catch {
    errors.push('EXPO_PUBLIC_API_BASE_URL must be a valid URL');
  }
  
  try {
    new URL(config.supabaseUrl);
  } catch {
    errors.push('EXPO_PUBLIC_SUPABASE_URL must be a valid URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Helper functions for feature flags
export const isFeatureEnabled = (feature: keyof Pick<AppConfig, 
  'enableBiometricAuth' | 
  'enablePushNotifications' | 
  'enableAnalytics' | 
  'enableCrashReporting' | 
  'enablePerformanceMonitoring'
>): boolean => {
  return config[feature];
};

export const isDevelopment = () => config.environment === 'development';
export const isStaging = () => config.environment === 'staging';
export const isProduction = () => config.environment === 'production';

// Log configuration on startup (development only)
if (isDevelopment()) {
  console.log('App Configuration:', {
    environment: config.environment,
    version: config.version,
    apiBaseUrl: config.apiBaseUrl,
    enabledFeatures: {
      biometric: config.enableBiometricAuth,
      pushNotifications: config.enablePushNotifications,
      analytics: config.enableAnalytics,
      crashReporting: config.enableCrashReporting,
      performanceMonitoring: config.enablePerformanceMonitoring,
    }
  });
  
  // Validate configuration
  const validation = validateConfig();
  if (!validation.isValid) {
    console.warn('Configuration Validation Errors:');
    validation.errors.forEach(error => console.warn(`  - ${error}`));
  } else {
    console.log('Configuration is valid');
  }
}

export default config;
