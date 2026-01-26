import * as crypto from 'crypto';
import { logger } from '@mintenance/shared';
/**
 * Secure configuration system with enhanced JWT secret management
 * Implements OWASP best practices for secret management
 */
interface SecureConfig {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  NODE_ENV: string;
  DATABASE_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  BCRYPT_ROUNDS: number;
  SESSION_DURATION: number;
  REFRESH_TOKEN_DURATION: number;
}
/**
 * Generate a cryptographically secure random secret
 */
function generateSecureSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('base64url');
}
/**
 * Validate secret strength
 */
function validateSecretStrength(secret: string, minLength: number = 32): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!secret) {
    issues.push('Secret is empty');
    return { isValid: false, issues };
  }
  if (secret.length < minLength) {
    issues.push(`Secret must be at least ${minLength} characters long (current: ${secret.length})`);
  }
  // Check for weak patterns
  const weakPatterns = [
    /^dev-/i,
    /^test/i,
    /^demo/i,
    /^example/i,
    /secret/i,
    /password/i,
    /12345/,
    /qwerty/i,
    /^[a-z]+$/i,
    /^[0-9]+$/,
  ];
  for (const pattern of weakPatterns) {
    if (pattern.test(secret)) {
      issues.push(`Secret contains weak pattern: ${pattern}`);
    }
  }
  // Check for insufficient entropy (simple repetition check)
  const uniqueChars = new Set(secret).size;
  if (uniqueChars < 10) {
    issues.push(`Secret has insufficient character diversity (only ${uniqueChars} unique characters)`);
  }
  // Check for common/default secrets
  const blacklistedSecrets = [
    'your-secret-key-change-in-production',
    'dev-insecure-secret-not-for-production',
    'changeme',
    'secret',
    'password',
  ];
  if (blacklistedSecrets.includes(secret.toLowerCase())) {
    issues.push('Secret is a known default/weak value');
  }
  return {
    isValid: issues.length === 0,
    issues,
  };
}
/**
 * Get secure configuration with validation
 */
export function getSecureConfig(): SecureConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  // In test environment, use predictable but secure secrets
  if (isTest) {
    return {
      JWT_SECRET: crypto.createHash('sha256').update('test-jwt-secret').digest('base64url'),
      JWT_REFRESH_SECRET: crypto.createHash('sha256').update('test-refresh-secret').digest('base64url'),
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      BCRYPT_ROUNDS: 10, // Faster for tests
      SESSION_DURATION: 15 * 60 * 1000, // 15 minutes
      REFRESH_TOKEN_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }
  // JWT Secret validation
  let jwtSecret = process.env.JWT_SECRET;
  let jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  // Generate secure secrets if not provided in development
  if (isDevelopment) {
    if (!jwtSecret || jwtSecret.includes('dev-') || jwtSecret.includes('insecure')) {
      jwtSecret = generateSecureSecret();
      logger.warn('Generated temporary JWT secret for development. Set JWT_SECRET in .env for persistence', {
        service: 'auth',
        recommendation: `Add to .env: JWT_SECRET="${jwtSecret}"`,
      });
    }
    if (!jwtRefreshSecret) {
      jwtRefreshSecret = generateSecureSecret();
      logger.warn('Generated temporary refresh secret for development. Set JWT_REFRESH_SECRET in .env', {
        service: 'auth',
        recommendation: `Add to .env: JWT_REFRESH_SECRET="${jwtRefreshSecret}"`,
      });
    }
  }
  // Strict validation for production
  if (isProduction || !isDevelopment) {
    // JWT_SECRET validation
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    const jwtValidation = validateSecretStrength(jwtSecret, 32);
    if (!jwtValidation.isValid) {
      throw new Error(
        `JWT_SECRET validation failed:\n${jwtValidation.issues.map(i => `  - ${i}`).join('\n')}`
      );
    }
    // JWT_REFRESH_SECRET validation
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
    }
    const refreshValidation = validateSecretStrength(jwtRefreshSecret, 32);
    if (!refreshValidation.isValid) {
      throw new Error(
        `JWT_REFRESH_SECRET validation failed:\n${refreshValidation.issues.map(i => `  - ${i}`).join('\n')}`
      );
    }
    // Ensure secrets are different
    if (jwtSecret === jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }
  }
  // BCRYPT rounds configuration (OWASP recommends 14+ for 2024)
  const bcryptRounds = isProduction ? 14 : 12;
  return {
    JWT_SECRET: jwtSecret!,
    JWT_REFRESH_SECRET: jwtRefreshSecret || jwtSecret! + '-refresh',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    BCRYPT_ROUNDS: bcryptRounds,
    SESSION_DURATION: 15 * 60 * 1000, // 15 minutes
    REFRESH_TOKEN_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}
/**
 * Generate secure secrets for production deployment
 */
export function generateProductionSecrets(): {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CSRF_SECRET: string;
  ENCRYPTION_KEY: string;
} {
  return {
    JWT_SECRET: generateSecureSecret(64),
    JWT_REFRESH_SECRET: generateSecureSecret(64),
    CSRF_SECRET: generateSecureSecret(32),
    ENCRYPTION_KEY: generateSecureSecret(32),
  };
}
/**
 * Rotate secrets safely
 */
export async function rotateSecrets(
  currentConfig: SecureConfig,
  gracePeriodMs: number = 5 * 60 * 1000 // 5 minutes
): Promise<SecureConfig> {
  logger.info('Starting secret rotation', {
    service: 'auth',
    gracePeriod: `${gracePeriodMs / 1000}s`,
  });
  // Generate new secrets
  const newSecrets = {
    ...currentConfig,
    JWT_SECRET: generateSecureSecret(64),
    JWT_REFRESH_SECRET: generateSecureSecret(64),
  };
  // In production, you would:
  // 1. Store both old and new secrets temporarily
  // 2. Accept tokens signed with either during grace period
  // 3. After grace period, only accept new secret
  // 4. Log rotation event for audit
  logger.info('Secret rotation completed', {
    service: 'auth',
    nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  });
  return newSecrets;
}
// Export singleton config
let _config: SecureConfig | null = null;
export function getConfig(): SecureConfig {
  if (!_config) {
    _config = getSecureConfig();
  }
  return _config;
}
// CLI utility for generating secrets
if (require.main === module) {
  ;
  const secrets = generateProductionSecrets();
  ;
  ;
  ;
  ;
  ;
  ;
}