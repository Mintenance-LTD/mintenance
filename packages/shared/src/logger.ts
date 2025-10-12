/**
 * Production-Safe Logger
 * 
 * Centralized logging utility that:
 * - Sanitizes sensitive data in production
 * - Supports log levels
 * - Provides structured logging
 * - Never exposes PII, auth tokens, or payment data
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

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.minLogLevel = this.getMinLogLevel();
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
        sanitized[key] = Array.isArray(value) 
          ? value.map(item => typeof item === 'object' ? this.sanitizeObject(item as Record<string, unknown>) : item)
          : this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formatted = `[${timestamp}] ${levelStr} ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      const sanitizedContext = this.sanitize(context);
      formatted += ` ${JSON.stringify(sanitizedContext)}`;
    }

    return formatted;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      case 'info':
        console.log(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        if (error) {
          console.error('Error details:', error.stack || error.message || error);
        }
        break;
    }
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
      ? { ...context, errorDetails: String(error) }
      : context;
    
    this.log('error', message, errorContext, errorObj);
  }

  /**
   * Create a child logger with preset context
   */
  child(childContext: LogContext): Logger {
    const childLogger = new Logger();
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger.log = (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
      originalLog(level, message, { ...childContext, ...context }, error);
    };

    return childLogger;
  }
}

export const logger = new Logger();
export { Logger };