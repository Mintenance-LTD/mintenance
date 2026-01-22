import { logger } from '@mintenance/shared';

/**
 * Advanced SQL injection protection
 * Based on mobile's comprehensive SqlInjectionProtection implementation
 */
export interface SqlThreat {
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}
export interface SqlScanResult {
  isSafe: boolean;
  risk: 'low' | 'medium' | 'high' | 'critical';
  threats: SqlThreat[];
  sanitized: string;
  original: string;
}
export class SqlProtection {
  /**
   * Comprehensive SQL injection patterns
   * Covers common attack vectors
   */
  private static readonly DANGEROUS_SQL_PATTERNS: Array<{
    regex: RegExp;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }> = [
    // SQL Commands
    {
      regex: /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/gi,
      severity: 'high',
      description: 'SQL command keywords detected',
    },
    // UNION attacks
    {
      regex: /\bUNION\b.*\b(SELECT|ALL)\b/gi,
      severity: 'critical',
      description: 'UNION-based SQL injection attempt',
    },
    // Boolean-based blind SQL injection
    {
      regex: /(\bOR\b|\bAND\b)\s*(\d+\s*=\s*\d+|\w+\s*=\s*\w+|'[^']*'\s*=\s*'[^']*')/gi,
      severity: 'high',
      description: 'Boolean-based blind injection pattern',
    },
    // Time-based blind SQL injection
    {
      regex: /\b(WAITFOR\s+DELAY|SLEEP|BENCHMARK|PG_SLEEP)\b/gi,
      severity: 'critical',
      description: 'Time-based blind injection attempt',
    },
    // Comments
    {
      regex: /(--|\/\*|\*\/|#)/g,
      severity: 'medium',
      description: 'SQL comment sequences detected',
    },
    // System functions and procedures
    {
      regex: /\b(xp_|sp_|fn_|sys\.|information_schema\.|pg_catalog\.)/gi,
      severity: 'high',
      description: 'System function/procedure access attempt',
    },
    // File operations
    {
      regex: /\b(OPENROWSET|OPENDATASOURCE|BULK\s+INSERT|LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/gi,
      severity: 'critical',
      description: 'File operation attempt detected',
    },
    // Stacked queries
    {
      regex: /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)/gi,
      severity: 'high',
      description: 'Stacked query attempt',
    },
    // Hex encoding attempts
    {
      regex: /0x[0-9a-fA-F]+/g,
      severity: 'low',
      description: 'Hexadecimal encoding detected',
    },
    // String concatenation
    {
      regex: /(\|\||CONCAT|CHAR\()/gi,
      severity: 'medium',
      description: 'String concatenation attempt',
    },
    // Escape sequence attempts
    {
      regex: /\\x[0-9a-fA-F]{2}|\\[0-7]{1,3}/g,
      severity: 'low',
      description: 'Escape sequence detected',
    },
  ];
  /**
   * Safe pattern validators
   */
  private static readonly SAFE_PATTERNS: Record<string, RegExp> = {
    alphanumeric: /^[a-zA-Z0-9]+$/,
    alphanumericSpace: /^[a-zA-Z0-9\s]+$/,
    numbers: /^\d+$/,
    decimal: /^\d+(\.\d+)?$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    safeString: /^[a-zA-Z0-9\s\-_.@]+$/,
  };
  /**
   * Scan input for SQL injection patterns
   * Returns detailed threat analysis
   */
  static scanForInjection(input: string | undefined | null): SqlScanResult {
    if (!input || typeof input !== 'string') {
      return {
        isSafe: true,
        risk: 'low',
        threats: [],
        sanitized: '',
        original: '',
      };
    }
    const threats: SqlThreat[] = [];
    let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let sanitized = input;
    // Check each dangerous pattern
    for (const patternDef of this.DANGEROUS_SQL_PATTERNS) {
      const matches = input.match(patternDef.regex);
      if (matches) {
        threats.push({
          pattern: matches[0],
          severity: patternDef.severity,
          description: patternDef.description,
        });
        // Update highest severity
        if (this.compareSeverity(patternDef.severity, highestSeverity) > 0) {
          highestSeverity = patternDef.severity;
        }
        // Remove the dangerous pattern from sanitized output
        sanitized = sanitized.replace(patternDef.regex, '');
      }
    }
    // Clean up the sanitized string
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    return {
      isSafe: threats.length === 0,
      risk: highestSeverity,
      threats,
      sanitized,
      original: input,
    };
  }
  /**
   * Compare severity levels
   */
  private static compareSeverity(
    a: 'low' | 'medium' | 'high' | 'critical',
    b: 'low' | 'medium' | 'high' | 'critical'
  ): number {
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return severityOrder[a] - severityOrder[b];
  }
  /**
   * Validate input against safe patterns
   */
  static validateSafePattern(
    input: string,
    patternType: keyof typeof SqlProtection.SAFE_PATTERNS
  ): boolean {
    const pattern = this.SAFE_PATTERNS[patternType];
    return pattern ? pattern.test(input) : false;
  }
  /**
   * Enhanced string escaping for SQL
   * More comprehensive than basic escapeSQLWildcards
   */
  static escapeString(input: string | undefined | null): string {
    if (!input || typeof input !== 'string') return '';
    let escaped = input;
    // Escape single quotes (SQL standard)
    escaped = escaped.replace(/'/g, "''");
    // Escape backslashes
    escaped = escaped.replace(/\\/g, '\\\\');
    // Escape null bytes
    escaped = escaped.replace(/\0/g, '\\0');
    // Escape newlines
    escaped = escaped.replace(/\n/g, '\\n');
    // Escape carriage returns
    escaped = escaped.replace(/\r/g, '\\r');
    // Escape tab characters
    escaped = escaped.replace(/\t/g, '\\t');
    // Escape ctrl+Z (EOF marker)
    escaped = escaped.replace(/\x1a/g, '\\Z');
    // Escape SQL wildcards for LIKE queries
    escaped = escaped.replace(/%/g, '\\%');
    escaped = escaped.replace(/_/g, '\\_');
    return escaped;
  }
  /**
   * Validate UUID format
   */
  static validateUuid(input: string): boolean {
    return this.SAFE_PATTERNS.uuid.test(input);
  }
  /**
   * Validate numeric input
   */
  static validateNumeric(input: string, allowDecimal = false): boolean {
    const pattern = allowDecimal ? this.SAFE_PATTERNS.decimal : this.SAFE_PATTERNS.numbers;
    return pattern.test(input);
  }
  /**
   * Create parameterized query placeholder
   * Helps developers use parameterized queries correctly
   */
  static createParameterizedQuery(
    template: string,
    params: Record<string, any>
  ): { query: string; values: unknown[] } {
    let query = template;
    const values: unknown[] = [];
    let paramIndex = 1;
    // Replace named parameters with numbered placeholders
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `:${key}`;
      if (query.includes(placeholder)) {
        query = query.replace(new RegExp(placeholder, 'g'), `$${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    return { query, values };
  }
  /**
   * Sanitize input for use in search queries
   * Removes wildcards and special characters
   */
  static sanitizeSearchQuery(query: string, maxLength: number = 200): string {
    if (!query || query.length > maxLength) return '';
    // Remove SQL wildcards
    let sanitized = query.replace(/[%_]/g, '');
    // Remove other special characters that could be problematic
    sanitized = sanitized.replace(/['"`;\\]/g, '');
    // Remove multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    // Final length check
    return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
  }
  /**
   * Log security threats for monitoring
   */
  static logThreat(
    scanResult: SqlScanResult,
    context?: { userId?: string; ip?: string; endpoint?: string }
  ): void {
    if (!scanResult.isSafe) {
      const logData = {
        type: 'sql_injection_attempt',
        risk: scanResult.risk,
        threats: scanResult.threats,
        context,
        timestamp: new Date().toISOString(),
      };
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[SQL Protection] Threat detected:', logData);
      }
      // In production, this should send to a security monitoring service
      // Example: Sentry, Datadog, CloudWatch, etc.
      if (typeof global !== 'undefined' && (global as any).securityLogger) {
        (global as any).securityLogger.warn('SQL injection attempt', logData);
      }
    }
  }
  /**
   * Batch validate multiple inputs
   */
  static batchValidate(inputs: string[]): SqlScanResult[] {
    return inputs.map(input => this.scanForInjection(input));
  }
  /**
   * Check if any threats are critical
   */
  static hasCriticalThreat(scanResult: SqlScanResult): boolean {
    return scanResult.risk === 'critical' || scanResult.risk === 'high';
  }
  /**
   * Get security recommendation based on scan result
   */
  static getSecurityRecommendation(scanResult: SqlScanResult): string {
    if (scanResult.isSafe) {
      return 'Input appears safe for database queries.';
    }
    switch (scanResult.risk) {
      case 'critical':
        return 'CRITICAL: Block this request immediately. Possible active attack.';
      case 'high':
        return 'HIGH RISK: Consider blocking this request. Strong indicators of SQL injection.';
      case 'medium':
        return 'MEDIUM RISK: Sanitize input thoroughly before use in queries.';
      case 'low':
        return 'LOW RISK: Input contains patterns that could be suspicious in certain contexts.';
      default:
        return 'Unknown risk level. Treat with caution.';
    }
  }
}