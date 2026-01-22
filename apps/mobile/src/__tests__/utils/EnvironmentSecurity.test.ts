import {
  EnvironmentSecurity,
  environmentSecurity,
  getSecureEnv,
  getTypedEnv,
  getApiConfig,
  getStripeConfig,
  getGoogleMapsConfig,
  getFeatureFlags,
} from '../../utils/EnvironmentSecurity';
import { logger } from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EnvironmentSecurity', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (EnvironmentSecurity as any).instance = undefined;
    // Save original env
    originalEnv = { ...process.env };
    // Clear all env vars first
    for (const key in process.env) {
      delete process.env[key];
    }
    // Set up clean test env
    Object.assign(process.env, {
      NODE_ENV: 'test',
      EXPO_PUBLIC_ENVIRONMENT: 'development',
      EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      EXPO_PUBLIC_APP_NAME: 'TestApp',
      EXPO_PUBLIC_APP_VERSION: '1.0.0',
    });
  });

  afterEach(() => {
    // Clear all env vars first
    for (const key in process.env) {
      delete process.env[key];
    }
    // Restore original env
    Object.assign(process.env, originalEnv);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EnvironmentSecurity.getInstance();
      const instance2 = EnvironmentSecurity.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should perform startup validation on creation', () => {
      EnvironmentSecurity.getInstance();
      expect(logger.info).toHaveBeenCalledWith(
        'EnvironmentSecurity',
        'Environment validation passed',
        expect.any(Object)
      );
    });
  });

  describe('validateEnvironment', () => {
    it('should validate successfully with all required keys', () => {
      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.securityIssues).toHaveLength(0);
    });

    it('should detect missing required keys', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL');
    });

    it('should validate URL formats', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'not-a-valid-url';

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid URL format'))).toBe(true);
    });

    it('should require HTTPS in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_' + 'a'.repeat(99);
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://sentry.io/test';
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIza' + 'a'.repeat(35);

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('must use HTTPS in production'))).toBe(true);
    });

    it('should check for exposed sensitive keys', () => {
      process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY = 'sk_test_secret';

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.securityIssues).toContain('Sensitive key exposed as public: EXPO_PUBLIC_STRIPE_SECRET_KEY');
    });

    it('should detect development values in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:3000';
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_' + 'a'.repeat(99);
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://sentry.io/test';
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIza' + 'a'.repeat(35);

      // In production with security issues, getInstance will throw
      expect(() => {
        EnvironmentSecurity.getInstance();
      }).toThrow('Critical security issues detected in environment configuration');
    });

    it('should validate API key formats', () => {
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'invalid_stripe_key';

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.warnings.some(w => w.includes('Invalid format'))).toBe(true);
    });

    it('should validate Stripe key format correctly', () => {
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_' + 'a'.repeat(99);

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.warnings.filter(w => w.includes('STRIPE_PUBLISHABLE_KEY'))).toHaveLength(0);
    });

    it('should validate Google Maps API key format', () => {
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIza' + 'a'.repeat(35);

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.warnings.filter(w => w.includes('GOOGLE_MAPS_API_KEY'))).toHaveLength(0);
    });

    it('should warn about debug logging in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_LOG_LEVEL = 'debug';
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_' + 'a'.repeat(99);
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://sentry.io/test';
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIza' + 'a'.repeat(35);

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.warnings).toContain('Debug logging enabled in production');
    });

    it('should warn about console logging in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_ENABLE_CONSOLE_LOGS = 'true';
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_' + 'a'.repeat(99);
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://sentry.io/test';
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIza' + 'a'.repeat(35);

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.warnings).toContain('Console logging enabled in production');
    });

    it('should warn about missing Sentry in production', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_' + 'a'.repeat(99);
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIza' + 'a'.repeat(35);

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.warnings).toContain('Sentry DSN not configured for production error tracking');
    });

    it('should detect potential secrets in public keys', () => {
      process.env.EXPO_PUBLIC_SOME_SECRET = 'VeryLongSecretKeyWithMixedCaseAnd123';

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.securityIssues.some(issue => issue.includes('Potential secret exposed'))).toBe(true);
    });

    it('should allow known public secrets', () => {
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.veryLongTokenWithMixedCase123';

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.securityIssues.filter(issue =>
        issue.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')
      )).toHaveLength(0);
    });

    it('should validate domain allowlist in strict mode', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://malicious.com/api';
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_' + 'a'.repeat(99);
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://sentry.io/test';
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIza' + 'a'.repeat(35);

      const instance = EnvironmentSecurity.getInstance();
      const result = instance.validateEnvironment();

      expect(result.errors.some(e => e.includes('URL domain not allowed'))).toBe(true);
    });
  });

  describe('getSecureEnv', () => {
    it('should return environment variable value', () => {
      process.env.TEST_KEY = 'test-value';

      const instance = EnvironmentSecurity.getInstance();
      const value = instance.getSecureEnv('TEST_KEY');

      expect(value).toBe('test-value');
    });

    it('should return undefined for missing optional key', () => {
      const instance = EnvironmentSecurity.getInstance();
      const value = instance.getSecureEnv('MISSING_KEY');

      expect(value).toBeUndefined();
    });

    it('should throw for missing required key', () => {
      const instance = EnvironmentSecurity.getInstance();

      expect(() => {
        instance.getSecureEnv('MISSING_KEY', true);
      }).toThrow('Required environment variable missing: MISSING_KEY');
    });

    it('should track validated keys', () => {
      process.env.TEST_KEY = 'test-value';

      const instance = EnvironmentSecurity.getInstance();
      instance.getSecureEnv('TEST_KEY');

      const report = instance.generateSecurityReport();
      expect(report.usage.validatedKeys).toContain('TEST_KEY');
    });
  });

  describe('getTypedEnv', () => {
    it('should parse string values', () => {
      process.env.STRING_KEY = 'hello';

      const instance = EnvironmentSecurity.getInstance();
      const value = instance.getTypedEnv('STRING_KEY', EnvironmentSecurity.parsers.string);

      expect(value).toBe('hello');
    });

    it('should parse number values', () => {
      process.env.NUMBER_KEY = '42';

      const instance = EnvironmentSecurity.getInstance();
      const value = instance.getTypedEnv('NUMBER_KEY', EnvironmentSecurity.parsers.number);

      expect(value).toBe(42);
    });

    it('should parse boolean true values', () => {
      process.env.BOOL_KEY_TRUE = 'true';
      process.env.BOOL_KEY_1 = '1';

      const instance = EnvironmentSecurity.getInstance();
      const valueTrue = instance.getTypedEnv('BOOL_KEY_TRUE', EnvironmentSecurity.parsers.boolean);
      const value1 = instance.getTypedEnv('BOOL_KEY_1', EnvironmentSecurity.parsers.boolean);

      expect(valueTrue).toBe(true);
      expect(value1).toBe(true);
    });

    it('should parse boolean false values', () => {
      process.env.BOOL_KEY_FALSE = 'false';
      process.env.BOOL_KEY_0 = '0';

      const instance = EnvironmentSecurity.getInstance();
      const valueFalse = instance.getTypedEnv('BOOL_KEY_FALSE', EnvironmentSecurity.parsers.boolean);
      const value0 = instance.getTypedEnv('BOOL_KEY_0', EnvironmentSecurity.parsers.boolean);

      expect(valueFalse).toBe(false);
      expect(value0).toBe(false);
    });

    it('should parse URL values', () => {
      process.env.URL_KEY = 'https://example.com/path';

      const instance = EnvironmentSecurity.getInstance();
      const value = instance.getTypedEnv('URL_KEY', EnvironmentSecurity.parsers.url);

      expect(value).toBe('https://example.com/path');
    });

    it('should use default value when key is missing', () => {
      const instance = EnvironmentSecurity.getInstance();
      const value = instance.getTypedEnv('MISSING_KEY', EnvironmentSecurity.parsers.number, 100);

      expect(value).toBe(100);
    });

    it('should throw when required key is missing and no default', () => {
      const instance = EnvironmentSecurity.getInstance();

      expect(() => {
        instance.getTypedEnv('MISSING_KEY', EnvironmentSecurity.parsers.number, undefined, true);
      }).toThrow('Required environment variable missing: MISSING_KEY');
    });

    it('should throw on invalid number parsing', () => {
      process.env.INVALID_NUMBER = 'not-a-number';

      const instance = EnvironmentSecurity.getInstance();

      expect(() => {
        instance.getTypedEnv('INVALID_NUMBER', EnvironmentSecurity.parsers.number);
      }).toThrow('Failed to parse environment variable INVALID_NUMBER');
    });

    it('should throw on invalid boolean parsing', () => {
      process.env.INVALID_BOOL = 'maybe';

      const instance = EnvironmentSecurity.getInstance();

      expect(() => {
        instance.getTypedEnv('INVALID_BOOL', EnvironmentSecurity.parsers.boolean);
      }).toThrow('Failed to parse environment variable INVALID_BOOL');
    });

    it('should throw on invalid URL parsing', () => {
      process.env.INVALID_URL = 'not a url';

      const instance = EnvironmentSecurity.getInstance();

      expect(() => {
        instance.getTypedEnv('INVALID_URL', EnvironmentSecurity.parsers.url);
      }).toThrow('Failed to parse environment variable INVALID_URL');
    });

    it('should use default value on parsing error', () => {
      process.env.INVALID_NUMBER = 'not-a-number';

      const instance = EnvironmentSecurity.getInstance();
      const value = instance.getTypedEnv('INVALID_NUMBER', EnvironmentSecurity.parsers.number, 42);

      expect(value).toBe(42);
      expect(logger.warn).toHaveBeenCalledWith('EnvironmentSecurity', 'Using default value for INVALID_NUMBER');
    });
  });

  describe('generateSecurityReport', () => {
    it('should generate comprehensive security report', () => {
      process.env.TEST_KEY = 'test-value';

      const instance = EnvironmentSecurity.getInstance();
      instance.getSecureEnv('TEST_KEY');
      instance.getSecureEnv('EXPO_PUBLIC_SUPABASE_URL');

      const report = instance.generateSecurityReport();

      expect(report).toHaveProperty('environment');
      expect(report).toHaveProperty('validation');
      expect(report).toHaveProperty('configuration');
      expect(report).toHaveProperty('usage');
      expect(report.usage.validatedKeys).toContain('TEST_KEY');
      expect(report.usage.validatedKeys).toContain('EXPO_PUBLIC_SUPABASE_URL');
    });

    it('should identify unused required keys', () => {
      const instance = EnvironmentSecurity.getInstance();
      const report = instance.generateSecurityReport();

      expect(report.usage.unusedRequiredKeys).toContain('EXPO_PUBLIC_SUPABASE_URL');
      expect(report.usage.unusedRequiredKeys).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    });

    it('should include configuration details', () => {
      const instance = EnvironmentSecurity.getInstance();
      const report = instance.generateSecurityReport();

      expect(report.configuration.strictValidation).toBe(false);
      expect(report.configuration.allowedDomains).toContain('localhost');
      expect(report.configuration.requiredKeysCount).toBeGreaterThan(0);
      expect(report.configuration.sensitiveKeysCount).toBeGreaterThan(0);
    });
  });

  describe('Environment Configuration', () => {
    it('should configure for development environment', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';

      const instance = EnvironmentSecurity.getInstance();
      const report = instance.generateSecurityReport();

      expect(report.environment).toBe('development');
      expect(report.configuration.strictValidation).toBe(false);
      expect(report.configuration.allowedDomains).toContain('localhost');
    });

    it('should configure for staging environment', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'staging';

      const instance = EnvironmentSecurity.getInstance();
      const report = instance.generateSecurityReport();

      expect(report.environment).toBe('staging');
      expect(report.configuration.allowedDomains).toContain('staging.mintenance.com');
    });

    it('should configure for production environment', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_' + 'a'.repeat(99);
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://sentry.io/test';
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIza' + 'a'.repeat(35);

      const instance = EnvironmentSecurity.getInstance();
      const report = instance.generateSecurityReport();

      expect(report.environment).toBe('production');
      expect(report.configuration.strictValidation).toBe(true);
      expect(report.configuration.allowedDomains).toContain('mintenance.com');
    });
  });

  describe('Helper Functions', () => {
    it('should export getSecureEnv helper', () => {
      process.env.TEST_KEY = 'test-value';

      const value = getSecureEnv('TEST_KEY');
      expect(value).toBe('test-value');
    });

    it('should export getTypedEnv helper', () => {
      process.env.NUMBER_KEY = '42';

      const value = getTypedEnv('NUMBER_KEY', EnvironmentSecurity.parsers.number);
      expect(value).toBe(42);
    });

    it('should export getApiConfig helper', () => {
      const config = getApiConfig();

      expect(config.supabaseUrl).toBe('https://test.supabase.co');
      expect(config.supabaseAnonKey).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
      expect(config.apiBaseUrl).toBe('http://localhost:3000');
      expect(config.apiTimeout).toBe(30000);
    });

    it('should export getStripeConfig helper', () => {
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_key';

      const config = getStripeConfig();
      expect(config.publishableKey).toBe('pk_test_key');
    });

    it('should export getGoogleMapsConfig helper', () => {
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test_maps_key';

      const config = getGoogleMapsConfig();
      expect(config.apiKey).toBe('test_maps_key');
    });

    it('should export getFeatureFlags helper with defaults', () => {
      const flags = getFeatureFlags();

      expect(flags.enableBiometricAuth).toBe(true);
      expect(flags.enablePushNotifications).toBe(true);
      expect(flags.enableAnalytics).toBe(false);
      expect(flags.enableCrashReporting).toBe(false);
      expect(flags.enablePerformanceMonitoring).toBe(false);
    });

    it('should parse feature flags from environment', () => {
      process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH = 'false';
      process.env.EXPO_PUBLIC_ENABLE_ANALYTICS = 'true';

      const flags = getFeatureFlags();

      expect(flags.enableBiometricAuth).toBe(false);
      expect(flags.enableAnalytics).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should fail fast in production on security issues', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
      process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY = 'sk_live_secret';

      expect(() => {
        EnvironmentSecurity.getInstance();
      }).toThrow('Critical security issues detected in environment configuration');
    });

    it('should log errors but not throw in development', () => {
      process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';
      process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY = 'sk_test_secret';

      const instance = EnvironmentSecurity.getInstance();
      expect(instance).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(environmentSecurity).toBeDefined();
      expect(environmentSecurity).toBeInstanceOf(EnvironmentSecurity);
    });
  });
});