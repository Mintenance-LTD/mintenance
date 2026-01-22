/**
 * Base sanitizer with common sanitization logic
 * Consolidates best practices from web and mobile implementations
 */
export interface SanitizationOptions {
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripTags?: boolean;
}
export interface SanitizationResult {
  value: string;
  wasModified: boolean;
  removedContent?: string[];
}
export abstract class BaseSanitizer {
  /**
   * Remove all HTML tags and normalize text
   * Consistent implementation across all platforms
   */
  static sanitizeText(input: string | undefined | null, maxLength?: number): string {
    if (!input || typeof input !== 'string') return '';
    // Remove all HTML tags
    let textOnly = input
      .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags first
      .replace(/<style[\s\S]*?<\/style>/gi, '')   // Remove style tags
      .replace(/<[^>]*>/g, '')                    // Remove all remaining tags
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')          // Replace HTML entities with spaces
      .replace(/\s+/g, ' ')                       // Normalize whitespace
      .trim();
    // Apply length limit
    const max = maxLength || 5000;
    return textOnly.length > max ? textOnly.substring(0, max) : textOnly;
  }
  /**
   * Escape SQL wildcards and special characters
   * Prevents SQL injection in LIKE queries
   */
  static escapeSQLWildcards(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape SQL wildcard %
      .replace(/_/g, '\\_')    // Escape SQL wildcard _
      .replace(/'/g, "''");    // Escape single quotes
  }
  /**
   * Two-step sanitization for SQL queries
   * 1. Remove XSS/HTML content
   * 2. Escape SQL special characters
   */
  static sanitizeForSQL(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // Step 1: Remove any HTML/XSS content
    const xssSafe = this.sanitizeText(input);
    // Step 2: Escape SQL special characters
    const sqlSafe = this.escapeSQLWildcards(xssSafe);
    return sqlSafe.trim();
  }
  /**
   * Validate and sanitize email addresses
   * RFC 5322 simplified regex pattern
   */
  static sanitizeEmail(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim().toLowerCase();
    // RFC 5322 simplified pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return '';
    }
    // Additional safety: max length
    return trimmed.length > 254 ? trimmed.substring(0, 254) : trimmed;
  }
  /**
   * Validate and sanitize phone numbers
   * Supports international format (10-14 digits)
   */
  static sanitizePhone(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // Remove all non-numeric characters
    const digitsOnly = input.replace(/\D/g, '');
    // Validate length (10-14 digits for international support)
    if (digitsOnly.length < 10 || digitsOnly.length > 14) {
      return '';
    }
    return digitsOnly;
  }
  /**
   * Sanitize file names for safe storage
   */
  static sanitizeFileName(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    // Remove path traversal attempts
    let safe = input.replace(/\.\./g, '').replace(/[\/\\]/g, '');
    // Allow only alphanumeric, dots, dashes, underscores
    safe = safe.replace(/[^a-zA-Z0-9._-]/g, '');
    // Limit length
    const maxLength = 100;
    if (safe.length > maxLength) {
      // Preserve file extension if present
      const lastDot = safe.lastIndexOf('.');
      if (lastDot > 0 && lastDot > maxLength - 10) {
        const extension = safe.substring(lastDot);
        safe = safe.substring(0, maxLength - extension.length) + extension;
      } else {
        safe = safe.substring(0, maxLength);
      }
    }
    return safe || 'unnamed';
  }
  /**
   * Validate and sanitize URLs
   */
  static sanitizeUrl(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      // Only allow http(s) protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      // Prevent javascript: and data: URLs
      if (url.href.match(/^(javascript|data|vbscript|file):/i)) {
        return '';
      }
      // Limit URL length
      const maxLength = 2000;
      return url.href.length > maxLength ? '' : url.href;
    } catch {
      return '';
    }
  }
  /**
   * Validate numeric input with constraints
   */
  static sanitizeNumeric(
    input: any,
    options?: { min?: number; max?: number; decimals?: number }
  ): number | null {
    const num = Number(input);
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }
    let result = num;
    // Apply min/max constraints
    if (options?.min !== undefined && result < options.min) {
      result = options.min;
    }
    if (options?.max !== undefined && result > options.max) {
      result = options.max;
    }
    // Apply decimal constraint
    if (options?.decimals !== undefined) {
      const multiplier = Math.pow(10, options.decimals);
      result = Math.round(result * multiplier) / multiplier;
    }
    return result;
  }
  /**
   * Create a safe ILIKE pattern for PostgreSQL queries
   */
  static createSafeILIKEPattern(
    searchTerm: string,
    pattern: 'contains' | 'startsWith' | 'endsWith' | 'exact' = 'contains'
  ): string {
    const sanitized = this.sanitizeForSQL(searchTerm);
    if (!sanitized) return '';
    switch (pattern) {
      case 'contains':
        return `%${sanitized}%`;
      case 'startsWith':
        return `${sanitized}%`;
      case 'endsWith':
        return `%${sanitized}`;
      case 'exact':
        return sanitized;
      default:
        return `%${sanitized}%`;
    }
  }
  /**
   * Check if input contains potential SQL injection patterns
   * Returns true if input appears safe
   */
  static isValidSearchTerm(input: string, maxLength: number = 200): boolean {
    if (!input || input.length > maxLength) return false;
    // Count special characters that could indicate SQL injection
    const specialChars = input.match(/[%_'";\\]/g) || [];
    const specialCharRatio = specialChars.length / input.length;
    // Reject if more than 30% special characters
    if (specialCharRatio > 0.3) return false;
    // Check for obvious SQL keywords (case-insensitive)
    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/i;
    if (sqlKeywords.test(input)) return false;
    return true;
  }
  /**
   * Abstract method for HTML sanitization
   * Must be implemented by platform-specific adapters
   */
  abstract sanitizeHtml(input: string, options?: SanitizationOptions): string;
}