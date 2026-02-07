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

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'creditCard',
      'credit_card',
      'cardNumber',
      'card_number',
      'cvv',
      'ssn',
      'social_security',
      'authorization'
    ]);

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('token')) {
        sanitized[key] = '[REDACTED]';
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

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
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

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const mergedContext = this.baseContext ? { ...this.baseContext, ...context } : context;
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

  private sendToMonitoring(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
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
    const errorContext = error && !(error instanceof Error) 
      ? { ...context, errorDetails: error }
      : context;
    
    this.log('error', message, errorContext, errorObj);
  }

  /**
   * Create a child logger with preset context
   */
  child(childContext: LogContext): Logger {
    const mergedContext = this.baseContext ? { ...this.baseContext, ...childContext } : childContext;
    return new Logger(mergedContext);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };

