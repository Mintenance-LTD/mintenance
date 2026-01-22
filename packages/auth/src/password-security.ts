import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { logger } from '@mintenance/shared';
/**
 * Enhanced password security with Argon2id support and migration from bcrypt
 * Implements OWASP password storage best practices
 */
// Password hashing algorithms
export enum HashAlgorithm {
  BCRYPT = 'bcrypt',
  ARGON2ID = 'argon2id',
  SCRYPT = 'scrypt', // Backup option
}
// Configuration for different algorithms
interface HashConfig {
  algorithm: HashAlgorithm;
  bcrypt?: {
    rounds: number;
  };
  argon2?: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
    saltLength: number;
  };
  scrypt?: {
    cost: number;
    blockSize: number;
    parallelism: number;
    keyLength: number;
  };
}
/**
 * Get secure hashing configuration based on environment
 */
function getHashConfig(): HashConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  // For tests, use faster settings
  if (isTest) {
    return {
      algorithm: HashAlgorithm.BCRYPT,
      bcrypt: { rounds: 10 },
    };
  }
  // Production uses Argon2id (OWASP recommended)
  // Fallback to scrypt if Argon2 is not available
  // Last resort is bcrypt with high rounds
  if (isProduction) {
    try {
      // Try to load argon2 if available
      const argon2 = require('argon2');
      return {
        algorithm: HashAlgorithm.ARGON2ID,
        argon2: {
          memoryCost: 65536, // 64 MB
          timeCost: 3,
          parallelism: 4,
          saltLength: 16,
        },
      };
    } catch {
      // Argon2 not available, use scrypt
      return {
        algorithm: HashAlgorithm.SCRYPT,
        scrypt: {
          cost: 16384, // N
          blockSize: 8, // r
          parallelism: 1, // p
          keyLength: 32,
        },
      };
    }
  }
  // Development uses bcrypt for simplicity
  return {
    algorithm: HashAlgorithm.BCRYPT,
    bcrypt: { rounds: 14 }, // OWASP 2024 recommendation
  };
}
/**
 * Hash a password using the configured algorithm
 */
export async function hashPassword(password: string): Promise<string> {
  const config = getHashConfig();
  // Validate password strength first
  const validation = validatePasswordStrength(password);
  if (!validation.isValid) {
    throw new Error(`Password validation failed: ${validation.issues.join(', ')}`);
  }
  try {
    switch (config.algorithm) {
      case HashAlgorithm.ARGON2ID: {
        const argon2 = require('argon2');
        return await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: config.argon2!.memoryCost,
          timeCost: config.argon2!.timeCost,
          parallelism: config.argon2!.parallelism,
          saltLength: config.argon2!.saltLength,
        });
      }
      case HashAlgorithm.SCRYPT: {
        const salt = crypto.randomBytes(16);
        const derivedKey = crypto.scryptSync(
          password,
          salt,
          config.scrypt!.keyLength,
          {
            N: config.scrypt!.cost,
            r: config.scrypt!.blockSize,
            p: config.scrypt!.parallelism,
          }
        );
        // Format: algorithm$salt$hash
        return `scrypt$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
      }
      case HashAlgorithm.BCRYPT:
      default: {
        const salt = await bcrypt.genSalt(config.bcrypt!.rounds);
        const hash = await bcrypt.hash(password, salt);
        // Add algorithm prefix for migration support
        return `bcrypt$${hash}`;
      }
    }
  } catch (error) {
    logger.error('Password hashing failed', { error, algorithm: config.algorithm });
    // Fallback to bcrypt if other algorithms fail
    const salt = await bcrypt.genSalt(14);
    return `bcrypt$${await bcrypt.hash(password, salt)}`;
  }
}
/**
 * Verify a password against a hash (supports multiple algorithms)
 */
export async function verifyPassword(password: string, hash: string): Promise<{
  isValid: boolean;
  needsRehash: boolean;
}> {
  try {
    // Detect algorithm from hash format
    if (hash.startsWith('$argon2')) {
      // Native Argon2 format
      const argon2 = require('argon2');
      const isValid = await argon2.verify(hash, password);
      return { isValid, needsRehash: false };
    }
    if (hash.startsWith('scrypt$')) {
      // Custom scrypt format
      const [, saltBase64, hashBase64] = hash.split('$');
      const salt = Buffer.from(saltBase64, 'base64');
      const storedHash = Buffer.from(hashBase64, 'base64');
      const config = getHashConfig();
      const derivedKey = crypto.scryptSync(
        password,
        salt,
        storedHash.length,
        {
          N: config.scrypt?.cost || 16384,
          r: config.scrypt?.blockSize || 8,
          p: config.scrypt?.parallelism || 1,
        }
      );
      const isValid = crypto.timingSafeEqual(derivedKey, storedHash);
      // Suggest rehash if not using current algorithm
      return { isValid, needsRehash: config.algorithm !== HashAlgorithm.SCRYPT };
    }
    if (hash.startsWith('bcrypt$')) {
      // Custom bcrypt format
      const actualHash = hash.substring(7);
      const isValid = await bcrypt.compare(password, actualHash);
      // Check if rehash needed (upgrade to stronger algorithm or more rounds)
      const config = getHashConfig();
      const needsRehash = config.algorithm !== HashAlgorithm.BCRYPT ||
                         getRoundsFromBcryptHash(actualHash) < (config.bcrypt?.rounds || 14);
      return { isValid, needsRehash };
    }
    // Legacy bcrypt format (no prefix)
    if (hash.startsWith('$2')) {
      const isValid = await bcrypt.compare(password, hash);
      return { isValid, needsRehash: true }; // Always suggest rehash for legacy
    }
    // Unknown format
    logger.error('Unknown password hash format', { hashPrefix: hash.substring(0, 10) });
    return { isValid: false, needsRehash: false };
  } catch (error) {
    logger.error('Password verification failed', { error });
    return { isValid: false, needsRehash: false };
  }
}
/**
 * Extract rounds from bcrypt hash
 */
function getRoundsFromBcryptHash(hash: string): number {
  try {
    const match = hash.match(/^\$2[aby]\$(\d+)\$/);
    return match ? parseInt(match[1], 10) : 10;
  } catch {
    return 10;
  }
}
/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  // Minimum length (NIST 800-63B recommends 8+)
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }
  // Maximum length check
  if (password.length > 128) {
    issues.push('Password must not exceed 128 characters');
  }
  // Character diversity
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const diversity = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  score += diversity;
  if (diversity < 3) {
    suggestions.push('Use a mix of uppercase, lowercase, numbers, and symbols');
  }
  // Check for common passwords (basic list - in production, use a comprehensive list)
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password1',
    'admin', 'letmein', 'welcome', 'monkey', 'dragon',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    issues.push('Password is too common');
    score = 0;
  }
  // Check for repeated characters
  if (/(.)\1{3,}/.test(password)) {
    issues.push('Password contains too many repeated characters');
    score -= 1;
  }
  // Check for sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    suggestions.push('Avoid sequential characters');
    score -= 1;
  }
  // Check for keyboard patterns
  if (/(?:qwerty|asdf|zxcv|qazwsx|1qaz|2wsx)/i.test(password)) {
    issues.push('Password contains keyboard patterns');
    score -= 2;
  }
  // Calculate final score (0-5 scale)
  const normalizedScore = Math.max(0, Math.min(5, score));
  return {
    isValid: issues.length === 0 && password.length >= 8,
    score: normalizedScore,
    issues,
    suggestions: normalizedScore < 3 ? suggestions : [],
  };
}
/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const charsetLength = charset.length;
  let password = '';
  // Ensure at least one of each type
  const requirements = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789',
    '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ];
  // Add one random character from each requirement
  for (const req of requirements) {
    const randomIndex = crypto.randomInt(0, req.length);
    password += req[randomIndex];
  }
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charsetLength);
    password += charset[randomIndex];
  }
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
}
/**
 * Check if password has been breached (using Have I Been Pwned API)
 */
export async function checkPasswordBreach(password: string): Promise<{
  isBreached: boolean;
  occurrences?: number;
}> {
  try {
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'Mintenance-Security-Check',
      },
    });
    if (!response.ok) {
      logger.warn('Could not check password breach status', { status: response.status });
      return { isBreached: false };
    }
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        return {
          isBreached: true,
          occurrences: parseInt(count, 10),
        };
      }
    }
    return { isBreached: false };
  } catch (error) {
    logger.error('Password breach check failed', { error });
    return { isBreached: false }; // Fail open to avoid blocking users
  }
}
/**
 * Password policy configuration
 */
export const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: false, // NIST doesn't recommend forced complexity
  requireLowercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  preventCommonPasswords: true,
  checkBreaches: true,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordHistoryCount: 5, // Prevent reuse of last 5 passwords
  maxPasswordAge: 0, // No forced expiration (NIST recommendation)
};