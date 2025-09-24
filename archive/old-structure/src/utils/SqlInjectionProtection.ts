/**
 * SQL Injection Protection Utilities
 *
 * ⚠️ SECURITY CRITICAL: Prevents SQL injection attacks
 * Use these utilities for all database queries
 */

import { logger } from './logger';

// Dangerous SQL keywords and patterns
const DANGEROUS_SQL_PATTERNS = [
  // SQL Commands
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b/gi,

  // SQL Injection techniques
  /(\bOR\b|\bAND\b)\s*(\d+\s*=\s*\d+|\w+\s*=\s*\w+)/gi,
  /\b(TRUE|FALSE)\b\s*=\s*\b(TRUE|FALSE)\b/gi,
  /(\b1\b\s*=\s*\b1\b|\b0\b\s*=\s*\b0\b)/g,

  // Comment patterns
  /(--|\/\*|\*\/|#)/g,

  // String concatenation attacks
  /(\+|\|\|)\s*(SELECT|UNION|INSERT)/gi,

  // Function calls
  /\b(CONCAT|SUBSTRING|CHAR|ASCII|LEN|LENGTH|COUNT|MAX|MIN|SUM|AVG)\s*\(/gi,

  // System functions
  /\b(xp_|sp_|fn_|OPENROWSET|OPENDATASOURCE|BULK INSERT)\b/gi,

  // Blind SQL injection
  /\b(WAITFOR|DELAY|SLEEP|BENCHMARK)\b/gi,

  // Information schema
  /\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS|SYSTABLES)\b/gi,
] as const;

// Safe characters for different contexts
const SAFE_PATTERNS = {
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  numbers: /^[0-9]+$/,
  decimal: /^[0-9]+(\.[0-9]+)?$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  safeString: /^[a-zA-Z0-9\s.,!?-]+$/,
} as const;

export class SqlInjectionProtection {
  /**
   * Scan input for SQL injection patterns
   */
  static scanForSqlInjection(input: string | any): {
    isSafe: boolean;
    threats: string[];
    sanitized: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
  } {
    if (!input || typeof input !== 'string') {
      return { isSafe: true, threats: [], sanitized: String(input || ''), risk: 'low' };
    }

    const threats: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let sanitized = input.trim();

    // Check each dangerous pattern
    for (const pattern of DANGEROUS_SQL_PATTERNS) {
      const matches = sanitized.match(pattern);
      if (matches) {
        threats.push(`SQL pattern detected: ${pattern.source}`);

        // Determine risk level based on pattern type
        if (pattern.source.includes('DROP|DELETE|UPDATE')) {
          riskLevel = 'critical';
        } else if (pattern.source.includes('SELECT|INSERT|UNION')) {
          riskLevel = 'high';
        } else if (pattern.source.includes('OR|AND')) {
          riskLevel = 'medium';
        }

        // Log the threat
        logger.warn('SqlInjectionProtection', 'SQL injection pattern detected', {
          pattern: pattern.source,
          input: sanitized.substring(0, 100),
          matches: matches.slice(0, 3) // Log first 3 matches only
        });
      }
    }

    // Sanitize the input by removing dangerous patterns
    if (threats.length > 0) {
      for (const pattern of DANGEROUS_SQL_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
      }

      // Remove excessive whitespace
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
    }

    return {
      isSafe: threats.length === 0,
      threats,
      sanitized,
      risk: riskLevel
    };
  }

  /**
   * Validate that input matches a safe pattern
   */
  static validateSafePattern(
    input: string,
    patternType: keyof typeof SAFE_PATTERNS,
    fieldName: string = 'input'
  ): { isValid: boolean; error?: string } {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: `${fieldName} must be a non-empty string` };
    }

    const pattern = SAFE_PATTERNS[patternType];
    if (!pattern.test(input)) {
      logger.warn('SqlInjectionProtection', 'Input failed safe pattern validation', {
        fieldName,
        patternType,
        input: input.substring(0, 50)
      });

      return {
        isValid: false,
        error: `${fieldName} contains invalid characters for type ${patternType}`
      };
    }

    return { isValid: true };
  }

  /**
   * Escape string for safe SQL usage (last resort - use parameterized queries instead)
   */
  static escapeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Escape single quotes by doubling them
    let escaped = input.replace(/'/g, "''");

    // Remove or escape other dangerous characters
    escaped = escaped
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/\0/g, '\\0') // Escape null bytes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\x1a/g, '\\Z'); // Escape ctrl+Z

    logger.debug('SqlInjectionProtection', 'String escaped for SQL', {
      original: input.substring(0, 50),
      escaped: escaped.substring(0, 50)
    });

    return escaped;
  }

  /**
   * Validate UUID format
   */
  static validateUuid(uuid: string, fieldName: string = 'UUID'): { isValid: boolean; error?: string } {
    return this.validateSafePattern(uuid, 'uuid', fieldName);
  }

  /**
   * Validate numeric input
   */
  static validateNumeric(
    input: string | number,
    options: {
      allowDecimal?: boolean;
      min?: number;
      max?: number;
      fieldName?: string
    } = {}
  ): { isValid: boolean; value?: number; error?: string } {
    const { allowDecimal = false, min, max, fieldName = 'number' } = options;

    // Convert to string for pattern validation
    const stringInput = String(input);

    // Check pattern
    const pattern = allowDecimal ? SAFE_PATTERNS.decimal : SAFE_PATTERNS.numbers;
    if (!pattern.test(stringInput)) {
      return {
        isValid: false,
        error: `${fieldName} must be a valid ${allowDecimal ? 'decimal' : 'integer'}`
      };
    }

    // Convert to number
    const numValue = allowDecimal ? parseFloat(stringInput) : parseInt(stringInput, 10);

    if (isNaN(numValue)) {
      return { isValid: false, error: `${fieldName} is not a valid number` };
    }

    // Range validation
    if (min !== undefined && numValue < min) {
      return { isValid: false, error: `${fieldName} must be at least ${min}` };
    }

    if (max !== undefined && numValue > max) {
      return { isValid: false, error: `${fieldName} must be at most ${max}` };
    }

    return { isValid: true, value: numValue };
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string, maxLength: number = 100): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // First check for SQL injection
    const sqlCheck = this.scanForSqlInjection(query);
    if (!sqlCheck.isSafe) {
      logger.warn('SqlInjectionProtection', 'Unsafe search query blocked', {
        query: query.substring(0, 50),
        threats: sqlCheck.threats
      });
      return ''; // Return empty string for unsafe queries
    }

    // Sanitize for search
    let sanitized = query
      .trim()
      .substring(0, maxLength) // Limit length
      .replace(/[<>\"']/g, '') // Remove dangerous HTML/SQL chars
      .replace(/\s+/g, ' '); // Normalize whitespace

    // Additional search-specific sanitization
    sanitized = sanitized
      .replace(/[*%_]/g, '') // Remove SQL wildcard characters
      .replace(/[()]/g, ''); // Remove parentheses

    return sanitized;
  }

  /**
   * Create safe parameterized query placeholder
   */
  static createSafeQuery(
    template: string,
    params: Record<string, any>
  ): { query: string; safeParams: Record<string, any>; isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const safeParams: Record<string, any> = {};

    // Validate template doesn't contain dangerous patterns
    const templateCheck = this.scanForSqlInjection(template);
    if (!templateCheck.isSafe) {
      errors.push('Query template contains dangerous SQL patterns');
      return { query: '', safeParams: {}, isValid: false, errors };
    }

    // Validate and sanitize each parameter
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        const paramCheck = this.scanForSqlInjection(value);
        if (!paramCheck.isSafe) {
          errors.push(`Parameter '${key}' contains dangerous SQL patterns`);
          continue;
        }
        safeParams[key] = paramCheck.sanitized;
      } else if (typeof value === 'number' && !isNaN(value)) {
        safeParams[key] = value;
      } else if (value === null || value === undefined) {
        safeParams[key] = null;
      } else {
        errors.push(`Parameter '${key}' has invalid type: ${typeof value}`);
      }
    }

    return {
      query: template,
      safeParams,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Rate limiting for database operations
   */
  static checkQueryRateLimit(
    userId: string,
    queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT'
  ): { allowed: boolean; remaining: number; resetTime: number } {
    // This should be implemented with Redis or another persistent store
    // For now, just return allowed for development
    logger.debug('SqlInjectionProtection', 'Query rate limit check', {
      userId: userId.substring(0, 8),
      queryType
    });

    return {
      allowed: true,
      remaining: 100,
      resetTime: Date.now() + 60000
    };
  }
}

export default SqlInjectionProtection;