/**
 * Tests for Environment Security Manager
 */

import {
  EnvironmentSecurity,
  environmentSecurity,
  getSecureEnv,
  getTypedEnv,
  getApiConfig,
  getStripeConfig,
  getGoogleMapsConfig,
  getFeatureFlags,
  SecurityConfig,
  EnvironmentValidationResult,
} from '../EnvironmentSecurity';

// Mock dependencies
jest.mock('../logger');

describe('EnvironmentSecurity', () => {
  let instance: EnvironmentSecurity;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a clean copy of process.env for each test
    process.env = { ...originalEnv };
    instance = EnvironmentSecurity.getInstance();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = EnvironmentSecurity.getInstance();
      const instance2 = EnvironmentSecurity.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateEnvironment', () => {
    it('should validate environment successfully with required keys', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.EXPO_PUBLIC_APP_NAME = 'Mintenance';
      process.env.EXPO_PUBLIC_APP_VERSION = '1.0.0';

      const result = instance.validateEnvironment();

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.securityIssues)).toBe(true);
    });

    it('should detect missing required keys', () => {
      // Clear required env vars
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const result = instance.validateEnvironment();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('EXPO_PUBLIC_SUPABASE_URL'))).toBe(true);
    });

    it('should validate URL formats', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'invalid-url';

      const result = instance.validateEnvironment();

      expect(result.errors.some(e => e.includes('Invalid URL'))).toBe(true);
    });

    it('should require HTTPS in production for URLs', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';

      const result = instance.validateEnvironment();

      expect(result.errors.some(e => e.includes('HTTPS'))).toBe(true);
    });
  });

  describe('Security Issue Detection', () => {
    it('should detect exposed sensitive keys', () => {
      process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY = 'sk_test_123';

      const result = instance.validateEnvironment();

      expect(result.securityIssues.some(s => s.includes('Sensitive key exposed'))).toBe(true);
    });

    it('should detect test values in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';

      const result = instance.validateEnvironment();

      expect(result.securityIssues.some(s => s.includes('Development/test value'))).toBe(true);
    });

    it('should allow valid public secrets', () => {
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

      const result = instance.validateEnvironment();

      // These should not be flagged as security issues
      expect(result.securityIssues.filter(s =>
        s.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY') ||
        s.includes('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY')
      ).length).toBe(0);
    });
  });

  describe('Environment-Specific Validations', () => {
    it('should warn about debug logging in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_LOG_LEVEL = 'debug';

      const result = instance.validateEnvironment();

      expect(result.warnings.some(w => w.includes('Debug logging'))).toBe(true);
    });

    it('should warn about missing Sentry in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;

      const result = instance.validateEnvironment();

      expect(result.warnings.some(w => w.includes('Sentry'))).toBe(true);
    });

    it('should warn about disabled console logs in development', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';
      delete process.env.EXPO_PUBLIC_ENABLE_CONSOLE_LOGS;

      const result = instance.validateEnvironment();

      expect(result.warnings.some(w => w.includes('Console logging disabled'))).toBe(true);
    });
  });

  describe('getSecureEnv', () => {
    it('should return environment variable value', () => {
      process.env.TEST_KEY = 'test-value';

      const value = instance.getSecureEnv('TEST_KEY');

      expect(value).toBe('test-value');
    });

    it('should return undefined for missing non-required key', () => {
      const value = instance.getSecureEnv('NONEXISTENT_KEY', false);

      expect(value).toBeUndefined();
    });

    it('should throw error for missing required key', () => {
      expect(() => {
        instance.getSecureEnv('REQUIRED_MISSING_KEY', true);
      }).toThrow('Required environment variable missing');
    });

    it('should track validated keys', () => {
      process.env.TRACKED_KEY = 'value';

      instance.getSecureEnv('TRACKED_KEY');

      const report = instance.generateSecurityReport();
      expect(report.usage.validatedKeys.includes('TRACKED_KEY')).toBe(true);
    });
  });

  describe('getTypedEnv', () => {
    it('should parse string values', () => {
      process.env.STRING_KEY = 'hello';

      const value = instance.getTypedEnv('STRING_KEY', EnvironmentSecurity.parsers.string);

      expect(value).toBe('hello');
    });

    it('should parse number values', () => {
      process.env.NUMBER_KEY = '42';

      const value = instance.getTypedEnv('NUMBER_KEY', EnvironmentSecurity.parsers.number);

      expect(value).toBe(42);
    });

    it('should parse boolean values', () => {
      process.env.BOOL_TRUE = 'true';
      process.env.BOOL_FALSE = 'false';

      const valueTrue = instance.getTypedEnv('BOOL_TRUE', EnvironmentSecurity.parsers.boolean);
      const valueFalse = instance.getTypedEnv('BOOL_FALSE', EnvironmentSecurity.parsers.boolean);

      expect(valueTrue).toBe(true);
      expect(valueFalse).toBe(false);
    });

    it('should parse URL values', () => {
      process.env.URL_KEY = 'https://example.com';

      const value = instance.getTypedEnv('URL_KEY', EnvironmentSecurity.parsers.url);

      expect(value).toBe('https://example.com/');
    });

    it('should use default value for missing key', () => {
      const value = instance.getTypedEnv('MISSING_KEY', EnvironmentSecurity.parsers.number, 100);

      expect(value).toBe(100);
    });

    it('should use default value for parse error', () => {
      process.env.INVALID_NUMBER = 'not-a-number';

      const value = instance.getTypedEnv('INVALID_NUMBER', EnvironmentSecurity.parsers.number, 0);

      expect(value).toBe(0);
    });

    it('should throw error for required missing key', () => {
      expect(() => {
        instance.getTypedEnv('REQUIRED_MISSING', EnvironmentSecurity.parsers.string, undefined, true);
      }).toThrow('Required environment variable missing');
    });

    it('should throw error for parse failure without default', () => {
      process.env.INVALID_URL = 'not a url';

      expect(() => {
        instance.getTypedEnv('INVALID_URL', EnvironmentSecurity.parsers.url);
      }).toThrow('Failed to parse');
    });
  });

  describe('Type Parsers', () => {
    it('should parse string', () => {
      const result = EnvironmentSecurity.parsers.string('test');
      expect(result).toBe('test');
    });

    it('should parse valid number', () => {
      const result = EnvironmentSecurity.parsers.number('123');
      expect(result).toBe(123);
    });

    it('should throw on invalid number', () => {
      expect(() => EnvironmentSecurity.parsers.number('abc')).toThrow('Not a valid number');
    });

    it('should parse boolean true variants', () => {
      expect(EnvironmentSecurity.parsers.boolean('true')).toBe(true);
      expect(EnvironmentSecurity.parsers.boolean('TRUE')).toBe(true);
      expect(EnvironmentSecurity.parsers.boolean('1')).toBe(true);
    });

    it('should parse boolean false variants', () => {
      expect(EnvironmentSecurity.parsers.boolean('false')).toBe(false);
      expect(EnvironmentSecurity.parsers.boolean('FALSE')).toBe(false);
      expect(EnvironmentSecurity.parsers.boolean('0')).toBe(false);
    });

    it('should throw on invalid boolean', () => {
      expect(() => EnvironmentSecurity.parsers.boolean('maybe')).toThrow('Not a valid boolean');
    });

    it('should parse valid URL', () => {
      const result = EnvironmentSecurity.parsers.url('https://example.com');
      expect(result).toBe('https://example.com/');
    });

    it('should throw on invalid URL', () => {
      expect(() => EnvironmentSecurity.parsers.url('not-a-url')).toThrow('Not a valid URL');
    });
  });

  describe('generateSecurityReport', () => {
    it('should generate comprehensive security report', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_APP_NAME = 'Test';

      const report = instance.generateSecurityReport();

      expect(report).toBeDefined();
      expect(report.environment).toBeDefined();
      expect(report.validation).toBeDefined();
      expect(report.configuration).toBeDefined();
      expect(report.usage).toBeDefined();
    });

    it('should include configuration details', () => {
      const report = instance.generateSecurityReport();

      expect(report.configuration.strictValidation).toBeDefined();
      expect(Array.isArray(report.configuration.allowedDomains)).toBe(true);
      expect(report.configuration.requiredKeysCount).toBeGreaterThan(0);
      expect(report.configuration.sensitiveKeysCount).toBeGreaterThan(0);
    });

    it('should track validated and unused keys', () => {
      process.env.TEST_USED = 'value';
      instance.getSecureEnv('TEST_USED');

      const report = instance.generateSecurityReport();

      expect(Array.isArray(report.usage.validatedKeys)).toBe(true);
      expect(Array.isArray(report.usage.unusedRequiredKeys)).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('getSecureEnv should work as helper', () => {
      process.env.HELPER_TEST = 'helper-value';

      const value = getSecureEnv('HELPER_TEST');

      expect(value).toBe('helper-value');
    });

    it('getTypedEnv should work as helper', () => {
      process.env.HELPER_NUMBER = '789';

      const value = getTypedEnv('HELPER_NUMBER', EnvironmentSecurity.parsers.number);

      expect(value).toBe(789);
    });
  });

  describe('Configuration Getters', () => {
    it('getApiConfig should return API configuration', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      const config = getApiConfig();

      expect(config).toBeDefined();
      expect(config.supabaseUrl).toBe('https://test.supabase.co');
      expect(config.supabaseAnonKey).toBe('test-key');
      expect(config.apiBaseUrl).toBeDefined();
      expect(config.apiTimeout).toBeDefined();
    });

    it('getStripeConfig should return Stripe configuration', () => {
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

      const config = getStripeConfig();

      expect(config).toBeDefined();
      expect(config.publishableKey).toBe('pk_test_123');
    });

    it('getGoogleMapsConfig should return Google Maps configuration', () => {
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIzaTest123';

      const config = getGoogleMapsConfig();

      expect(config).toBeDefined();
      expect(config.apiKey).toBe('AIzaTest123');
    });

    it('getFeatureFlags should return feature flags', () => {
      process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH = 'true';
      process.env.EXPO_PUBLIC_ENABLE_ANALYTICS = 'false';

      const flags = getFeatureFlags();

      expect(flags).toBeDefined();
      expect(flags.enableBiometricAuth).toBe(true);
      expect(flags.enableAnalytics).toBe(false);
      expect(typeof flags.enablePushNotifications).toBe('boolean');
      expect(typeof flags.enableCrashReporting).toBe('boolean');
      expect(typeof flags.enablePerformanceMonitoring).toBe('boolean');
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should have different allowed domains for production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      const prodInstance = EnvironmentSecurity.getInstance();

      const report = prodInstance.generateSecurityReport();

      expect(report.configuration.allowedDomains.includes('mintenance.com')).toBe(true);
      expect(report.configuration.allowedDomains.includes('localhost')).toBe(false);
    });

    it('should have different allowed domains for development', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';
      const devInstance = EnvironmentSecurity.getInstance();

      const report = devInstance.generateSecurityReport();

      expect(report.configuration.allowedDomains.includes('localhost')).toBe(true);
    });

    it('should have different allowed domains for staging', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'staging';
      const stagingInstance = EnvironmentSecurity.getInstance();

      const report = stagingInstance.generateSecurityReport();

      expect(report.configuration.allowedDomains.includes('staging.mintenance.com')).toBe(true);
    });

    it('should require more keys in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      const prodInstance = EnvironmentSecurity.getInstance();

      const prodReport = prodInstance.generateSecurityReport();

      process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';
      const devInstance = EnvironmentSecurity.getInstance();

      const devReport = devInstance.generateSecurityReport();

      expect(prodReport.configuration.requiredKeysCount).toBeGreaterThanOrEqual(
        devReport.configuration.requiredKeysCount
      );
    });

    it('should enable strict validation in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      const prodInstance = EnvironmentSecurity.getInstance();

      const report = prodInstance.generateSecurityReport();

      expect(report.configuration.strictValidation).toBe(true);
    });

    it('should not enable strict validation in development', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';
      const devInstance = EnvironmentSecurity.getInstance();

      const report = devInstance.generateSecurityReport();

      expect(report.configuration.strictValidation).toBe(false);
    });
  });

  describe('Singleton Instance Export', () => {
    it('should export singleton instance', () => {
      expect(environmentSecurity).toBeDefined();
      expect(environmentSecurity).toBeInstanceOf(EnvironmentSecurity);
    });

    it('should use same instance as getInstance', () => {
      expect(environmentSecurity).toBe(EnvironmentSecurity.getInstance());
    });
  });
});
