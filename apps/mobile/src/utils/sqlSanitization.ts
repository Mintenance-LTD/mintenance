/**
 * SQL Sanitization Utilities
 *
 * Provides protection against SQL injection attacks in ILIKE and pattern matching queries.
 *
 * SECURITY CRITICAL: This module prevents SQL injection vulnerabilities.
 * DO NOT modify without security review.
 */

import { sanitizeText } from './sanitize';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_LOG_PATH = path.join(process.cwd(), '.cursor', 'debug.log');
const logDebug = (data: Record<string, unknown>) => {
  try {
    const logDir = path.dirname(DEBUG_LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logLine = JSON.stringify({ ...data, timestamp: Date.now() }) + '\n';
    fs.appendFileSync(DEBUG_LOG_PATH, logLine, 'utf8');
  } catch (e) {
    // Ignore logging errors
  }
};

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
  // #region agent log
  logDebug({location:'sqlSanitization.ts:55',message:'sanitizeForSQL entry',data:{input},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  if (!input) return '';

  // Step 1: Remove HTML/XSS attempts
  const xssSafe = sanitizeText(input);
  // #region agent log
  logDebug({location:'sqlSanitization.ts:59',message:'after sanitizeText',data:{input,xssSafe},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion

  // Step 2: Escape SQL wildcards
  const sqlSafe = escapeSQLWildcards(xssSafe);
  // #region agent log
  logDebug({location:'sqlSanitization.ts:62',message:'after escapeSQLWildcards',data:{xssSafe,sqlSafe},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion

  // Trim whitespace
  const result = sqlSafe.trim();
  // #region agent log
  logDebug({location:'sqlSanitization.ts:65',message:'sanitizeForSQL exit',data:{input,result},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  return result;
}

/**
 * Validates that a search term is safe to use and not suspiciously long.
 *
 * @param input - User-provided search term
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns true if input is valid, false otherwise
 */
export function isValidSearchTerm(input: string, maxLength: number = 200): boolean {
  // #region agent log
  logDebug({location:'sqlSanitization.ts:104',message:'isValidSearchTerm entry',data:{input,inputLength:input?.length,maxLength},sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
  // #endregion
  if (!input || typeof input !== 'string') return false;
  if (input.length > maxLength) return false;

  // Check for SQL injection keywords (common attack patterns)
  const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b/gi;
  if (sqlKeywords.test(input)) {
    // #region agent log
    logDebug({location:'sqlSanitization.ts:112',message:'SQL keyword detected',data:{input,rejected:true},sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
    // #endregion
    return false;
  }

  // Check for excessive special characters (potential injection attempt)
  const specialCharCount = (input.match(/[%_'";\\]/g) || []).length;
  const specialCharRatio = specialCharCount / input.length;

  // #region agent log
  logDebug({location:'sqlSanitization.ts:118',message:'special char calculation',data:{input,specialCharCount,specialCharRatio,threshold:0.3,willReject:specialCharRatio>0.3},sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
  // #endregion

  // If more than 30% special characters, likely an attack
  if (specialCharRatio > 0.3) return false;

  // #region agent log
  logDebug({location:'sqlSanitization.ts:123',message:'isValidSearchTerm exit',data:{input,result:true},sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
  // #endregion
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
  // #region agent log
  logDebug({location:'sqlSanitization.ts:135',message:'sanitizeSearchTerms entry',data:{termsCount:terms?.length,terms,maxTerms},sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
  // #endregion
  if (!Array.isArray(terms)) return [];

  const sliced = terms.slice(0, maxTerms);
  // #region agent log
  logDebug({location:'sqlSanitization.ts:142',message:'after slice',data:{slicedCount:sliced.length,sliced},sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
  // #endregion

  // Filter out invalid terms before sanitizing
  const validTerms = sliced.filter(term => isValidSearchTerm(term));
  // #region agent log
  logDebug({location:'sqlSanitization.ts:145',message:'after validation filter',data:{validCount:validTerms.length,validTerms},sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
  // #endregion

  const sanitized = validTerms.map(term => sanitizeForSQL(term));
  // #region agent log
  logDebug({location:'sqlSanitization.ts:148',message:'after sanitize',data:{sanitizedCount:sanitized.length,sanitized},sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
  // #endregion

  const filtered = sanitized.filter(term => term.length > 0);
  // #region agent log
  logDebug({location:'sqlSanitization.ts:151',message:'sanitizeSearchTerms exit',data:{resultCount:filtered.length,result:filtered},sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
  // #endregion
  return filtered;
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
  // #region agent log
  logDebug({location:'sqlSanitization.ts:177',message:'createSafeILIKEPattern entry',data:{searchTerm,pattern},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  
  // Check if input is already sanitized (contains escaped wildcards)
  // If it does, use it directly; otherwise sanitize it
  const isAlreadySanitized = /\\[%_]/.test(searchTerm) || /''/.test(searchTerm);
  const safeTerm = isAlreadySanitized ? searchTerm : sanitizeForSQL(searchTerm);
  // #region agent log
  logDebug({location:'sqlSanitization.ts:183',message:'after sanitize check',data:{searchTerm,isAlreadySanitized,safeTerm,pattern},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion

  if (!safeTerm) return '';

  const result = pattern === 'contains' ? `%${safeTerm}%` : pattern === 'startsWith' ? `${safeTerm}%` : pattern === 'endsWith' ? `%${safeTerm}` : pattern === 'exact' ? safeTerm : `%${safeTerm}%`;
  // #region agent log
  logDebug({location:'sqlSanitization.ts:188',message:'createSafeILIKEPattern exit',data:{searchTerm,safeTerm,pattern,result},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  return result;
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
    (cleanupInterval as unknown).unref();
  }
}