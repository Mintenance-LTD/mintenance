/**
 * Environment Security Manager
 * Handles secure environment variable validation and management
 */

import { logger } from './logger';

export interface SecurityConfig {
  environment: 'development' | 'staging' | 'production';
  enableStrictValidation: boolean;
  allowedDomains: string[];
  requiredKeys: string[];
  sensitiveKeys: string[];
}

export interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

export class EnvironmentSecurity {
  private static instance: EnvironmentSecurity;
  private config: SecurityConfig;
  private validatedKeys = new Set<string>();

  private constructor() {
    this.config = this.buildSecurityConfig();
    this.performStartupValidation();
  }

  static getInstance(): EnvironmentSecurity {
    if (!EnvironmentSecurity.instance) {
      EnvironmentSecurity.instance = new EnvironmentSecurity();
    }
    return EnvironmentSecurity.instance;
  }

  /**
   * Build security configuration based on environment
   */
  private buildSecurityConfig(): SecurityConfig {
    const environment = (process.env.EXPO_PUBLIC_ENVIRONMENT || 'development') as 'development' | 'staging' | 'production';

    return {
      environment,
      enableStrictValidation: environment === 'production',
      allowedDomains: this.getAllowedDomains(environment),
      requiredKeys: this.getRequiredKeys(environment),
      sensitiveKeys: [
        'SUPABASE_ACCESS_TOKEN',
        'STRIPE_SECRET_KEY',
        'OPENAI_API_KEY',
        'AWS_SECRET_ACCESS_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'TWENTY_FIRST_API_KEY',
      ],
    };
  }

  /**
   * Get allowed domains for different environments
   */
  private getAllowedDomains(environment: string): string[] {
    switch (environment) {
      case 'production':
        return [
          'mintenance.com',
          'api.mintenance.com',
          'supabase.co',
          'stripe.com',
          'googleapis.com',
          'expo.dev',
        ];
      case 'staging':
        return [
          'staging.mintenance.com',
          'staging-api.mintenance.com',
          'supabase.co',
          'stripe.com',
          'googleapis.com',
          'expo.dev',
        ];
      default:
        return [
          'localhost',
          '127.0.0.1',
          'supabase.co',
          'stripe.com',
          'googleapis.com',
          'expo.dev',
        ];
    }
  }

  /**
   * Get required environment keys for different environments
   */
  private getRequiredKeys(environment: string): string[] {
    const baseKeys = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_APP_NAME',
      'EXPO_PUBLIC_APP_VERSION',
    ];

    if (environment === 'production') {
      return [
        ...baseKeys,
        'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'EXPO_PUBLIC_SENTRY_DSN',
        'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
      ];
    }

    return baseKeys;
  }

  /**
   * Perform comprehensive environment validation
   */
  validateEnvironment(): EnvironmentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityIssues: string[] = [];

    // 1. Check required keys
    this.config.requiredKeys.forEach(key => {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable: ${key}`);
      }
    });

    // 2. Validate URL formats
    this.validateUrls(errors);

    // 3. Check for security issues
    this.detectSecurityIssues(securityIssues);

    // 4. Environment-specific validations
    this.validateEnvironmentSpecific(errors, warnings);

    // 5. Check for exposed sensitive keys
    this.checkExposedKeys(securityIssues);

    // 6. Validate API key formats
    this.validateApiKeyFormats(errors, warnings);

    return {
      isValid: errors.length === 0 && securityIssues.length === 0,
      errors,
      warnings,
      securityIssues,
    };
  }

  /**
   * Validate URL environment variables
   */
  private validateUrls(errors: string[]): void {
    const urlKeys = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_API_BASE_URL',
      'EXPO_PUBLIC_SENTRY_DSN',
    ];

    urlKeys.forEach(key => {
      const url = process.env[key];
      if (url) {
        try {
          const urlObj = new URL(url);

          // Check if domain is allowed
          const isAllowedDomain = this.config.allowedDomains.some(domain =>
            urlObj.hostname.includes(domain) || urlObj.hostname === domain
          );

          if (!isAllowedDomain && this.config.enableStrictValidation) {
            errors.push(`URL domain not allowed for ${key}: ${urlObj.hostname}`);
          }

          // Check for HTTPS in production
          if (this.config.environment === 'production' && urlObj.protocol !== 'https:') {
            errors.push(`${key} must use HTTPS in production`);
          }
        } catch (error) {
          errors.push(`Invalid URL format for ${key}: ${url}`);
        }
      }
    });
  }

  /**
   * Detect potential security issues
   */
  private detectSecurityIssues(securityIssues: string[]): void {
    // Check for hardcoded secrets in public keys
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('EXPO_PUBLIC_')) {
        const value = process.env[key] || '';

        // Check for patterns that might be secrets
        if (this.looksLikeSecret(value) && !this.isAllowedPublicSecret(key)) {
          securityIssues.push(`Potential secret exposed in public environment variable: ${key}`);
        }
      }
    });

    // Check for development keys in production
    if (this.config.environment === 'production') {
      const testKeys = ['test_', 'dev_', 'localhost', '127.0.0.1'];
      Object.entries(process.env).forEach(([key, value]) => {
        if (value && testKeys.some(testKey => value.includes(testKey))) {
          securityIssues.push(`Development/test value detected in production for ${key}`);
        }
      });
    }
  }

  /**
   * Check if a value looks like a secret
   */
  private looksLikeSecret(value: string): boolean {
    return (
      value.length > 20 &&
      /^[a-zA-Z0-9+/=_-]+$/.test(value) &&
      value !== value.toLowerCase() &&
      value !== value.toUpperCase()
    );
  }

  /**
   * Check if a public key is allowed to contain secret-like values
   */
  private isAllowedPublicSecret(key: string): boolean {
    const allowedPublicSecrets = [
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
    ];
    return allowedPublicSecrets.includes(key);
  }

  /**
   * Environment-specific validations
   */
  private validateEnvironmentSpecific(errors: string[], warnings: string[]): void {
    const environment = this.config.environment;

    if (environment === 'production') {
      // Production-specific checks
      if (process.env.EXPO_PUBLIC_LOG_LEVEL === 'debug') {
        warnings.push('Debug logging enabled in production');
      }

      if (process.env.EXPO_PUBLIC_ENABLE_CONSOLE_LOGS === 'true') {
        warnings.push('Console logging enabled in production');
      }

      if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
        warnings.push('Sentry DSN not configured for production error tracking');
      }
    }

    if (environment === 'development') {
      // Development-specific checks
      if (!process.env.EXPO_PUBLIC_ENABLE_CONSOLE_LOGS) {
        warnings.push('Console logging disabled in development');
      }
    }
  }

  /**
   * Check for accidentally exposed sensitive keys
   */
  private checkExposedKeys(securityIssues: string[]): void {
    this.config.sensitiveKeys.forEach(sensitiveKey => {
      const publicKey = `EXPO_PUBLIC_${sensitiveKey}`;
      if (process.env[publicKey]) {
        securityIssues.push(`Sensitive key exposed as public: ${publicKey}`);
      }
    });
  }

  /**
   * Validate API key formats
   */
  private validateApiKeyFormats(errors: string[], warnings: string[]): void {
    const apiKeyValidations = {
      'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY': /^pk_(test_|live_)[a-zA-Z0-9]{99}$/,
      'STRIPE_SECRET_KEY': /^sk_(test_|live_)[a-zA-Z0-9]{99}$/,
      'EXPO_PUBLIC_SUPABASE_ANON_KEY': /^eyJ[a-zA-Z0-9+/=_-]+$/,
      'OPENAI_API_KEY': /^sk-[a-zA-Z0-9]{48}$/,
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY': /^AIza[a-zA-Z0-9_-]{35}$/,
    };

    Object.entries(apiKeyValidations).forEach(([key, pattern]) => {
      const value = process.env[key];
      if (value && !pattern.test(value)) {
        if (this.config.environment === 'production') {
          errors.push(`Invalid format for ${key}`);
        } else {
          warnings.push(`Invalid format for ${key} (may be test key)`);
        }
      }
    });
  }

  /**
   * Securely get environment variable with validation
   */
  getSecureEnv(key: string, required: boolean = false): string | undefined {
    const value = process.env[key];

    if (required && !value) {
      const error = `Required environment variable missing: ${key}`;
      logger.error('EnvironmentSecurity', error);
      throw new Error(error);
    }

    if (value) {
      this.validatedKeys.add(key);
    }

    return value;
  }

  /**
   * Get environment variable with type conversion and validation
   */
  getTypedEnv<T>(
    key: string,
    parser: (value: string) => T,
    defaultValue?: T,
    required: boolean = false
  ): T {
    const value = this.getSecureEnv(key, required);

    if (!value) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      if (required) {
        throw new Error(`Required environment variable missing: ${key}`);
      }
      return undefined as T;
    }

    try {
      return parser(value);
    } catch (error) {
      const errorMsg = `Failed to parse environment variable ${key}: ${error}`;
      logger.error('EnvironmentSecurity', errorMsg);

      if (defaultValue !== undefined) {
        logger.warn('EnvironmentSecurity', `Using default value for ${key}`);
        return defaultValue;
      }

      throw new Error(errorMsg);
    }
  }

  /**
   * Common type parsers
   */
  static parsers = {
    string: (value: string) => value,
    number: (value: string) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) throw new Error('Not a valid number');
      return parsed;
    },
    boolean: (value: string) => {
      const lowered = value.toLowerCase();
      if (lowered === 'true' || lowered === '1') return true;
      if (lowered === 'false' || lowered === '0') return false;
      throw new Error('Not a valid boolean');
    },
    url: (value: string) => {
      try {
        return new URL(value).toString();
      } catch {
        throw new Error('Not a valid URL');
      }
    },
  };

  /**
   * Perform startup validation and logging
   */
  private performStartupValidation(): void {
    const validation = this.validateEnvironment();

    if (!validation.isValid) {
      logger.error('EnvironmentSecurity', 'Environment validation failed', {
        errors: validation.errors,
        securityIssues: validation.securityIssues,
      });

      // In production, fail fast on critical issues
      if (this.config.environment === 'production' && validation.securityIssues.length > 0) {
        throw new Error('Critical security issues detected in environment configuration');
      }
    }

    if (validation.warnings.length > 0) {
      logger.warn('EnvironmentSecurity', 'Environment validation warnings', {
        warnings: validation.warnings,
      });
    }

    if (validation.isValid) {
      logger.info('EnvironmentSecurity', 'Environment validation passed', {
        environment: this.config.environment,
        validatedKeysCount: this.validatedKeys.size,
      });
    }
  }

  /**
   * Generate environment security report
   */
  generateSecurityReport(): {
    environment: string;
    validation: EnvironmentValidationResult;
    configuration: {
      strictValidation: boolean;
      allowedDomains: string[];
      requiredKeysCount: number;
      sensitiveKeysCount: number;
    };
    usage: {
      validatedKeys: string[];
      unusedRequiredKeys: string[];
    };
  } {
    const validation = this.validateEnvironment();
    const unusedRequiredKeys = this.config.requiredKeys.filter(
      key => !this.validatedKeys.has(key)
    );

    return {
      environment: this.config.environment,
      validation,
      configuration: {
        strictValidation: this.config.enableStrictValidation,
        allowedDomains: this.config.allowedDomains,
        requiredKeysCount: this.config.requiredKeys.length,
        sensitiveKeysCount: this.config.sensitiveKeys.length,
      },
      usage: {
        validatedKeys: Array.from(this.validatedKeys),
        unusedRequiredKeys,
      },
    };
  }
}

// Export singleton instance
export const environmentSecurity = EnvironmentSecurity.getInstance();

// Helper functions for common use cases
export const getSecureEnv = (key: string, required: boolean = false) =>
  environmentSecurity.getSecureEnv(key, required);

export const getTypedEnv = <T>(
  key: string,
  parser: (value: string) => T,
  defaultValue?: T,
  required: boolean = false
) => environmentSecurity.getTypedEnv(key, parser, defaultValue, required);

// Common environment getters with validation
export const getApiConfig = () => ({
  supabaseUrl: getSecureEnv('EXPO_PUBLIC_SUPABASE_URL', true)!,
  supabaseAnonKey: getSecureEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', true)!,
  apiBaseUrl: getSecureEnv('EXPO_PUBLIC_API_BASE_URL') || 'http://localhost:3000',
  apiTimeout: getTypedEnv('EXPO_PUBLIC_API_TIMEOUT', EnvironmentSecurity.parsers.number, 30000),
});

export const getStripeConfig = () => ({
  publishableKey: getSecureEnv('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  // Secret key should only be accessed server-side
});

export const getGoogleMapsConfig = () => ({
  apiKey: getSecureEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'),
});

export const getFeatureFlags = () => ({
  enableBiometricAuth: getTypedEnv('EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH', EnvironmentSecurity.parsers.boolean, true),
  enablePushNotifications: getTypedEnv('EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS', EnvironmentSecurity.parsers.boolean, true),
  enableAnalytics: getTypedEnv('EXPO_PUBLIC_ENABLE_ANALYTICS', EnvironmentSecurity.parsers.boolean, false),
  enableCrashReporting: getTypedEnv('EXPO_PUBLIC_ENABLE_CRASH_REPORTING', EnvironmentSecurity.parsers.boolean, false),
  enablePerformanceMonitoring: getTypedEnv('EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING', EnvironmentSecurity.parsers.boolean, false),
});