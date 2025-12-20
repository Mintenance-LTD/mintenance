/**
 * SQL Sanitization Utilities
 *
 * Provides protection against SQL injection attacks in ILIKE and pattern matching queries.
 *
 * SECURITY CRITICAL: This module prevents SQL injection vulnerabilities.
 * DO NOT modify without security review.
 */

import { sanitizeText } from './sanitize';

/**
 * Escapes SQL wildcards and special characters for use in ILIKE queries.
 *
 * Protects against SQL injection attacks like:
 * - Input: "%' OR '1'='1" → Escaped: "\%' OR '1'='1"
 * - Input: "test_%" → Escaped: "test\_\%"
 *
 * @param input - User-provided search term
 * @returns Safely escaped string suitable for SQL ILIKE patterns
 */
export function escapeSQLWildcards(input: string): string {
  if (!input) return '';

  return input
    // Escape backslashes first (must be first to avoid double-escaping)
    .replace(/\\/g, '\\\\')
    // Escape SQL wildcards
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    // Escape single quotes for SQL string safety
    .replace(/'/g, "''");
}

/**
 * Sanitizes and escapes user input for safe use in SQL ILIKE queries.
 *
 * This is a two-step process:
 * 1. Remove XSS/HTML injection attempts (via sanitizeText)
 * 2. Escape SQL wildcards and special characters
 *
 * @param input - User-provided search term
 * @returns Sanitized and SQL-safe search term
 *
 * @example
 * ```typescript
 * const userInput = "%' OR '1'='1 <script>alert('xss')</script>";
 * const safe = sanitizeForSQL(userInput);
 * // Result: "\%' OR '1'='1 "
 *
 * // Use in Supabase query:
 * .ilike('column_name', `%${safe}%`)
 * ```
 */
export function sanitizeForSQL(input: string | undefined | null): string {
  if (!input) return '';

  // Step 1: Remove HTML/XSS attempts
  const xssSafe = sanitizeText(input);

  // Step 2: Escape SQL wildcards
  const sqlSafe = escapeSQLWildcards(xssSafe);

  // Trim whitespace
  return sqlSafe.trim();
}

/**
 * Validates that a search term is safe to use and not suspiciously long.
 *
 * @param input - User-provided search term
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns true if input is valid, false otherwise
 */
export function isValidSearchTerm(input: string, maxLength: number = 200): boolean {
  if (!input || typeof input !== 'string') return false;
  if (input.length > maxLength) return false;

  // Check for excessive special characters (potential injection attempt)
  const specialCharCount = (input.match(/[%_'";\\]/g) || []).length;
  const specialCharRatio = specialCharCount / input.length;

  // If more than 30% special characters, likely an attack
  if (specialCharRatio > 0.3) return false;

  return true;
}

/**
 * Sanitizes an array of search terms for SQL queries.
 *
 * @param terms - Array of user-provided search terms
 * @param maxTerms - Maximum number of terms to process (default: 10)
 * @returns Array of sanitized search terms
 */
export function sanitizeSearchTerms(
  terms: string[],
  maxTerms: number = 10
): string[] {
  if (!Array.isArray(terms)) return [];

  return terms
    .slice(0, maxTerms) // Limit number of terms
    .map(term => sanitizeForSQL(term))
    .filter(term => term.length > 0); // Remove empty strings
}

/**
 * Creates a safe ILIKE pattern with wildcards.
 *
 * @param searchTerm - User-provided search term
 * @param pattern - Pattern type: 'contains', 'startsWith', 'endsWith', 'exact'
 * @returns SQL-safe ILIKE pattern
 *
 * @example
 * ```typescript
 * const pattern = createSafeILIKEPattern("John's", 'contains');
 * // Result: "%John''s%"
 *
 * const startPattern = createSafeILIKEPattern("test", 'startsWith');
 * // Result: "test%"
 * ```
 */
export function createSafeILIKEPattern(
  searchTerm: string,
  pattern: 'contains' | 'startsWith' | 'endsWith' | 'exact' = 'contains'
): string {
  const safeTerm = sanitizeForSQL(searchTerm);

  if (!safeTerm) return '';

  switch (pattern) {
    case 'contains':
      return `%${safeTerm}%`;
    case 'startsWith':
      return `${safeTerm}%`;
    case 'endsWith':
      return `%${safeTerm}`;
    case 'exact':
      return safeTerm;
    default:
      return `%${safeTerm}%`;
  }
}

/**
 * Rate limiting helper for search operations.
 * Prevents brute-force SQL injection attempts.
 */
class SearchRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxAttempts: number = 50;
  private readonly windowMs: number = 60000; // 1 minute

  /**
   * Checks if a search operation is allowed for the given key.
   *
   * @param key - Unique identifier (e.g., user ID or IP)
   * @returns true if search is allowed, false if rate limit exceeded
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }

    record.count++;
    return true;
  }

  /**
   * Clears rate limiting for a specific key.
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Cleans up expired entries.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

export const searchRateLimiter = new SearchRateLimiter();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  const cleanupInterval = setInterval(() => {
    searchRateLimiter.cleanup();
  }, 5 * 60 * 1000);

  // Allow cleanup to be stopped if needed
  if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    (cleanupInterval as any).unref();
  }
}