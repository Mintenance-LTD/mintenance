// Logger implementation - uses console directly to avoid circular dependencies
/**
 * Production-Safe Logger
 *
 * Centralized logging utility that:
 * - Sanitizes sensitive data in production
 * - Supports log levels
 * - Provides structured logging
 * - Never exposes PII, auth tokens, or payment data
 * - Safely handles large objects and circular references
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private minLogLevel: LogLevel;
  private baseContext?: LogContext;

  constructor(baseContext?: LogContext) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.minLogLevel = this.getMinLogLevel();
    this.baseContext = baseContext;
  }

  private getMinLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    return level || (this.isDevelopment ? 'debug' : 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.minLogLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private sanitize(data: unknown): unknown {
    if (!data) return data;

    // In production, sanitize sensitive data
    if (!this.isDevelopment && typeof data === 'object') {
      return this.sanitizeObject(data as Record<string, unknown>);
    }

    return data;
  }

  /**
   * Keys whose VALUE must always be redacted regardless of content.
   * Broadened 2026-04-21 per security audit: the original set missed
   * `cookie`, stripe identifiers, step-up / MFA secrets, generic
   * bearer/jwt markers, and encryption internals (authTag / iv).
   */
  private static readonly SENSITIVE_KEYS = new Set([
    // auth
    'password',
    'passwd',
    'pwd',
    'token',
    'jwt',
    'bearer',
    'authorization',
    'cookie',
    'setcookie',
    'set-cookie',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'idtoken',
    'id_token',
    // api / service
    'secret',
    'apikey',
    'api_key',
    'clientsecret',
    'client_secret',
    // crypto internals
    'authtag',
    'auth_tag',
    'iv',
    // mfa
    'totpsecret',
    'totp_secret',
    'mfasecret',
    'mfa_secret',
    'backupcode',
    'backup_code',
    'backup_codes',
    // payments (card + bank)
    'creditcard',
    'credit_card',
    'cardnumber',
    'card_number',
    'cvv',
    'cvc',
    'pan',
    'cardid',
    'card_id',
    'paymentmethod',
    'payment_method',
    'accountnumber',
    'account_number',
    'routingnumber',
    'routing_number',
    'bankaccount',
    'bank_account',
    // stripe
    'stripeaccountid',
    'stripe_account_id',
    'stripecustomerid',
    'stripe_customer_id',
    'stripesubscriptionid',
    'stripe_subscription_id',
    'stripeclientsecret',
    'stripe_client_secret',
    // government / tax
    'ssn',
    'social_security',
    'taxid',
    'tax_id',
    'nationalinsurance',
    'national_insurance',
    'ni_number',
  ]);

  /**
   * Substrings to match against lower-cased key names (catches variants
   * like `userPassword`, `refresh_token_hash`, `stripe_restricted_key`,
   * `x_api_key`, etc. without enumerating every form).
   */
  private static readonly SENSITIVE_KEY_SUBSTRINGS = [
    'password',
    'passwd',
    'token',
    'secret',
    'apikey',
    'api_key',
    'authorization',
    'bearer',
    'jwt',
    'cookie',
  ];

  /**
   * Regex for card-number-shaped strings: 13-19 digits, optionally
   * separated by spaces or hyphens. Used to scrub free-form string
   * values that slip past key-based redaction.
   */
  private static readonly CC_LIKE_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;

  private static readonly JWT_LIKE_REGEX =
    /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

  private static isSensitiveKey(lowerKey: string): boolean {
    if (Logger.SENSITIVE_KEYS.has(lowerKey)) return true;
    return Logger.SENSITIVE_KEY_SUBSTRINGS.some((s) => lowerKey.includes(s));
  }

  private static scrubString(value: string): string {
    return value
      .replace(Logger.JWT_LIKE_REGEX, '[REDACTED_JWT]')
      .replace(Logger.CC_LIKE_REGEX, '[REDACTED_CC]');
  }

  private sanitizeObject(
    obj: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
      const normalizedKey = key.toLowerCase();

      if (
        Logger.isSensitiveKey(lowerKey) ||
        Logger.isSensitiveKey(normalizedKey)
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = Logger.scrubString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string'
            ? Logger.scrubString(item)
            : typeof item === 'object' && item !== null
              ? this.sanitizeObject(item as Record<string, unknown>)
              : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private safeStringify(obj: unknown, maxDepth = 3): string {
    const seen = new WeakSet();

    const replacer = (depth: number) => (_key: string, value: unknown) => {
      // Handle null/undefined
      if (value === null || value === undefined) {
        return value;
      }

      // Handle primitives
      if (typeof value !== 'object') {
        return value;
      }

      // Prevent circular references
      if (seen.has(value as object)) {
        return '[Circular]';
      }
      seen.add(value as object);

      // Limit depth to prevent stack overflow
      if (depth > maxDepth) {
        return '[Max Depth Reached]';
      }

      // Handle arrays
      if (Array.isArray(value)) {
        // Limit array size in logs
        if (value.length > 50) {
          return `[Array(${value.length})] ${JSON.stringify(value.slice(0, 10), replacer(depth + 1))}...`;
        }
        return value;
      }

      // Handle Error objects
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: this.isDevelopment ? value.stack : undefined,
        };
      }

      // Handle objects with too many properties
      const keys = Object.keys(value as object);
      if (keys.length > 100) {
        return `[Object with ${keys.length} properties]`;
      }

      return value;
    };

    try {
      return JSON.stringify(obj, replacer(0));
    } catch (error) {
      return '[Unable to stringify object]';
    }
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);

    let formatted = `[${timestamp}] ${levelStr} ${message}`;

    if (context) {
      try {
        const keys = Object.keys(context);
        if (keys.length > 0 && keys.length < 100) {
          const sanitizedContext = this.sanitize(context);
          formatted += ` ${this.safeStringify(sanitizedContext)}`;
        } else if (keys.length >= 100) {
          formatted += ` [Context with ${keys.length} properties - too large to log]`;
        }
      } catch (error) {
        formatted += ' [Context unavailable]';
      }
    }

    return formatted;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const mergedContext = this.baseContext
      ? { ...this.baseContext, ...context }
      : context;
    const formattedMessage = this.formatMessage(level, message, mergedContext);

    // Use console directly to avoid circular dependency
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        if (error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: this.isDevelopment ? error.stack : undefined,
          });
        }
        break;
    }

    // In production, send to monitoring service (e.g., Sentry, DataDog)
    if (!this.isDevelopment) {
      this.sendToMonitoring(level, message, mergedContext, error);
    }
  }

  private sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const payload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitize(context),
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: this.isDevelopment ? error.stack : undefined,
          }
        : undefined,
    };
    console.error('[MONITORING]', this.safeStringify(payload));
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : undefined;
    const errorContext =
      error && !(error instanceof Error)
        ? { ...context, errorDetails: error }
        : context;

    this.log('error', message, errorContext, errorObj);
  }

  /**
   * Create a child logger with preset context
   */
  child(childContext: LogContext): Logger {
    const mergedContext = this.baseContext
      ? { ...this.baseContext, ...childContext }
      : childContext;
    return new Logger(mergedContext);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };
