/**
 * @mintenance/security - Unified security and sanitization package
 *
 * This package provides comprehensive sanitization and security features
 * for the Mintenance platform, with platform-specific optimizations.
 */
import { BaseSanitizer, SanitizationOptions } from './core/BaseSanitizer';
import { logger } from '@mintenance/shared';
import { SqlProtection, SqlScanResult } from './core/SqlProtection';
import { WebSanitizer } from './adapters/WebSanitizer';
import { MobileSanitizer } from './adapters/MobileSanitizer';
import { ContentSanitizers } from './specialized/ContentSanitizers';
import {
  SanitizationRateLimiter,
  SqlQueryRateLimiter,
  AuthRateLimiter,
  RateLimiterFactory,
  RateLimitResult,
} from './core/RateLimiter';
// Detect platform
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
const isServer = typeof window === 'undefined' && typeof process !== 'undefined' && !isReactNative;
const isMobile = isReactNative;
// Select appropriate adapter
const PlatformSanitizer = isServer || isWeb ? WebSanitizer : MobileSanitizer;
/**
 * Main sanitization API
 * Provides a unified interface across all platforms
 */
export const sanitize = {
  /**
   * HTML sanitization
   * Uses DOMPurify on web/server, regex on mobile
   */
  html: (input: string | undefined | null, options?: SanitizationOptions): string => {
    const sanitizer = new PlatformSanitizer();
    return sanitizer.sanitizeHtml(input, options);
  },
  /**
   * Plain text sanitization
   * Removes all HTML and normalizes whitespace
   */
  text: (input: string | undefined | null, maxLength?: number): string => {
    return BaseSanitizer.sanitizeText(input, maxLength);
  },
  /**
   * SQL injection protection
   * Basic sanitization for SQL queries
   */
  sql: (input: string | undefined | null): string => {
    return BaseSanitizer.sanitizeForSQL(input);
  },
  /**
   * Advanced SQL injection detection
   * Returns detailed threat analysis
   */
  sqlAdvanced: (input: string | undefined | null): SqlScanResult => {
    return SqlProtection.scanForInjection(input);
  },
  /**
   * Email address sanitization
   */
  email: (input: string | undefined | null): string => {
    return BaseSanitizer.sanitizeEmail(input);
  },
  /**
   * Phone number sanitization
   * Supports international format (10-14 digits)
   */
  phone: (input: string | undefined | null): string => {
    return BaseSanitizer.sanitizePhone(input);
  },
  /**
   * URL sanitization
   */
  url: (input: string | undefined | null): string => {
    return BaseSanitizer.sanitizeUrl(input);
  },
  /**
   * File name sanitization
   */
  fileName: (input: string | undefined | null): string => {
    return BaseSanitizer.sanitizeFileName(input);
  },
  /**
   * Numeric input sanitization
   */
  numeric: (
    input: unknown,
    options?: { min?: number; max?: number; decimals?: number }
  ): number | null => {
    return BaseSanitizer.sanitizeNumeric(input, options);
  },
  /**
   * Job description sanitization
   */
  jobDescription: (input: string | undefined | null): string => {
    return ContentSanitizers.jobDescription(input);
  },
  /**
   * Contractor bio sanitization
   */
  contractorBio: (input: string | undefined | null): string => {
    return ContentSanitizers.contractorBio(input);
  },
  /**
   * Message sanitization
   */
  message: (input: string | undefined | null): string => {
    return ContentSanitizers.message(input);
  },
  /**
   * Search query sanitization
   */
  searchQuery: (input: string | undefined | null): string => {
    return ContentSanitizers.searchQuery(input);
  },
  /**
   * Address sanitization
   */
  address: (input: string | undefined | null): string => {
    return ContentSanitizers.address(input);
  },
  /**
   * Company name sanitization
   */
  companyName: (input: string | undefined | null): string => {
    return ContentSanitizers.companyName(input);
  },
  /**
   * Person name sanitization
   */
  personName: (input: string | undefined | null): string => {
    return ContentSanitizers.personName(input);
  },
  /**
   * Review content sanitization
   */
  reviewContent: (input: string | undefined | null): string => {
    return ContentSanitizers.reviewContent(input);
  },
  /**
   * Invoice description sanitization
   */
  invoiceDescription: (input: string | undefined | null): string => {
    return ContentSanitizers.invoiceDescription(input);
  },
  /**
   * Milestone title sanitization
   */
  milestoneTitle: (input: string | undefined | null): string => {
    return ContentSanitizers.milestoneTitle(input);
  },
  /**
   * Tag sanitization
   */
  tag: (input: string | undefined | null): string => {
    return ContentSanitizers.tag(input);
  },
  /**
   * JSON string sanitization
   */
  jsonString: (input: string | undefined | null): string => {
    return ContentSanitizers.jsonString(input);
  },
  /**
   * API key validation
   */
  apiKey: (input: string | undefined | null): string => {
    return ContentSanitizers.apiKey(input);
  },
  /**
   * Webhook URL sanitization
   */
  webhookUrl: (input: string | undefined | null): string => {
    return ContentSanitizers.webhookUrl(input);
  },
  /**
   * Create ILIKE pattern for PostgreSQL
   */
  createILIKEPattern: (
    searchTerm: string,
    pattern: 'contains' | 'startsWith' | 'endsWith' | 'exact' = 'contains'
  ): string => {
    return BaseSanitizer.createSafeILIKEPattern(searchTerm, pattern);
  },
  /**
   * Check if search term is valid
   */
  isValidSearchTerm: (input: string, maxLength?: number): boolean => {
    return BaseSanitizer.isValidSearchTerm(input, maxLength);
  },
  /**
   * Escape SQL wildcards
   */
  escapeSQLWildcards: (input: string | undefined | null): string => {
    return BaseSanitizer.escapeSQLWildcards(input);
  },
};
// Mobile-specific sanitizers (no-op on other platforms)
if (isMobile) {
  Object.assign(sanitize, {
    /**
     * Amount sanitization (0-1M with 2 decimals)
     */
    amount: (input: unknown): number | null => {
      return MobileSanitizer.sanitizeAmount(input);
    },
    /**
     * Rating sanitization (1-5 with 1 decimal)
     */
    rating: (input: unknown): number | null => {
      return MobileSanitizer.sanitizeRating(input);
    },
    /**
     * Object sanitization (recursive)
     */
    object: <T extends Record<string, unknown>>(
      obj: T,
      fieldSanitizers?: Partial<Record<keyof T, (value: unknown) => unknown>>
    ): T => {
      return MobileSanitizer.sanitizeObject(obj, fieldSanitizers);
    },
    /**
     * React Native specific sanitization
     */
    forReactNative: (input: string | undefined | null): string => {
      return MobileSanitizer.sanitizeForReactNative(input);
    },
  });
}
// Export SQL Protection class for advanced usage
export { SqlProtection } from './core/SqlProtection';
export type { SqlScanResult } from './core/SqlProtection';
// Export rate limiters
export {
  SanitizationRateLimiter,
  SqlQueryRateLimiter,
  AuthRateLimiter,
  RateLimiterFactory,
} from './core/RateLimiter';
export type { RateLimitResult } from './core/RateLimiter';
// Export base classes for extension
export { BaseSanitizer } from './core/BaseSanitizer';
export { WebSanitizer } from './adapters/WebSanitizer';
export { MobileSanitizer } from './adapters/MobileSanitizer';
export { ContentSanitizers } from './specialized/ContentSanitizers';
// Export types
export type { SanitizationOptions } from './core/BaseSanitizer';
export type { SqlThreat } from './core/SqlProtection';
export type { RateLimitOptions } from './core/RateLimiter';
/**
 * Utility functions
 */
export const utils = {
  /**
   * Check if running in production
   */
  isProduction: (): boolean => {
    return process.env.NODE_ENV === 'production';
  },
  /**
   * Check platform
   */
  getPlatform: (): 'web' | 'server' | 'mobile' => {
    if (isServer) return 'server';
    if (isWeb) return 'web';
    return 'mobile';
  },
  /**
   * Validate and sanitize multiple fields at once
   */
  sanitizeFields: <T extends Record<string, unknown>>(
    data: T,
    schema: Partial<Record<keyof T, 'text' | 'email' | 'phone' | 'url' | 'number'>>
  ): T => {
    const result = { ...data } as Record<string, unknown>;
    for (const [key, type] of Object.entries(schema)) {
      const value = result[key];
      if (value === undefined || value === null) continue;
      const strValue = String(value);
      switch (type) {
        case 'text':
          result[key] = sanitize.text(strValue);
          break;
        case 'email':
          result[key] = sanitize.email(strValue);
          break;
        case 'phone':
          result[key] = sanitize.phone(strValue);
          break;
        case 'url':
          result[key] = sanitize.url(strValue);
          break;
        case 'number':
          result[key] = sanitize.numeric(strValue);
          break;
      }
    }
    return result as T;
  },
  /**
   * Create a Zod transformer for sanitization
   */
  createZodTransformer: (sanitizer: (input: unknown) => any) => {
    return (val: unknown) => sanitizer(val);
  },
  /**
   * Check if input contains XSS patterns (mobile only)
   */
  containsXSSPatterns: (input: string): boolean => {
    if (isMobile) {
      return MobileSanitizer.containsXSSPatterns(input);
    }
    // On web, use DOMPurify's detection
    const sanitized = sanitize.html(input);
    return sanitized !== input;
  },
  /**
   * Log security threats
   */
  logSecurityThreat: (
    type: 'xss' | 'sql_injection' | 'rate_limit',
    details: unknown,
    context?: { userId?: string; ip?: string; endpoint?: string }
  ): void => {
    const logData = {
      type,
      details,
      context,
      timestamp: new Date().toISOString(),
      platform: utils.getPlatform(),
    };
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[Security Threat]', logData);
    }
    // In production, send to monitoring service
    const globalObj = typeof global !== 'undefined' ? global as Record<string, unknown> : undefined;
    if (globalObj?.securityLogger) {
      const securityLogger = globalObj.securityLogger as { warn: (msg: string, data: unknown) => void };
      securityLogger.warn('Security threat detected', logData);
    }
  },
};
/**
 * Default instances
 */
export const defaultRateLimiter = RateLimiterFactory.getInstance('sanitization');
export const sqlRateLimiter = RateLimiterFactory.getInstance('sql');
export const authRateLimiter = RateLimiterFactory.getInstance('auth');
// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    RateLimiterFactory.destroyAll();
  });
}
// For backwards compatibility, export common functions at top level
export const {
  text: sanitizeText,
  html: sanitizeHtml,
  sql: sanitizeForSQL,
  email: sanitizeEmail,
  phone: sanitizePhone,
  url: sanitizeUrl,
  fileName: sanitizeFileName,
  searchQuery: sanitizeSearchQuery,
  jobDescription: sanitizeJobDescription,
  contractorBio: sanitizeContractorBio,
  message: sanitizeMessage,
  escapeSQLWildcards,
} = sanitize;
// Export default
export default sanitize;