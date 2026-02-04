/**
 * Enhanced Production Logger
 *
 * Advanced logging system with:
 * - Structured JSON logging for production
 * - Monitoring service integration hooks
 * - Performance tracking
 * - Request correlation
 * - Automatic error tracking
 * - Log batching for efficiency
 */

import { LogLevel, LogContext, LogEntry, logger } from './logger';

export interface LogTransport {
  name: string;
  send(entry: EnhancedLogEntry): Promise<void>;
}

/** Minimal Sentry-like API for transport typing */
interface SentryLike {
  captureException(e: Error, opts?: object): void;
  captureMessage(m: string, level: string, opts?: object): void;
  addBreadcrumb(o: { message: string; level: string; data?: unknown; timestamp: string }): void;
}

// LogEntry is imported from ./logger
export interface EnhancedLogEntry extends LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
  metadata?: Record<string, unknown>;
  performance?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  duration?: number;
  memory?: NodeJS.MemoryUsage;
  cpu?: NodeJS.CpuUsage;
}

export interface EnhancedLogContext extends LogContext {
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  environment?: string;
  version?: string;
  platform?: 'web' | 'mobile' | 'server';
  browser?: string;
  device?: string;
}

export interface LoggerConfig {
  service?: string;
  environment?: string;
  version?: string;
  minLogLevel?: LogLevel;
  enableBatching?: boolean;
  batchSize?: number;
  flushInterval?: number;
  enableJsonLogging?: boolean;
  enablePerformanceTracking?: boolean;
  transports?: LogTransport[];
}

/**
 * Enhanced Logger with production features
 * Note: This is a standalone implementation, not extending BaseLogger to avoid signature conflicts
 */
export class EnhancedLogger {
  private config: Required<LoggerConfig>;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private transports: LogTransport[] = [];
  private globalContext: EnhancedLogContext = {};
  private performanceStartTimes: Map<string, number> = new Map();

  constructor(config: LoggerConfig = {}) {
    this.config = {
      service: config.service || 'mintenance',
      environment: config.environment || process.env.NODE_ENV || 'development',
      version: config.version || process.env.npm_package_version || 'unknown',
      minLogLevel: config.minLogLevel || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      enableBatching: config.enableBatching ?? (process.env.NODE_ENV === 'production'),
      batchSize: config.batchSize || 100,
      flushInterval: config.flushInterval || 5000,
      enableJsonLogging: config.enableJsonLogging ?? (process.env.NODE_ENV === 'production'),
      enablePerformanceTracking: config.enablePerformanceTracking ?? false,
      transports: config.transports || []
    };

    this.transports = this.config.transports;
    this.setupBatching();
    this.setupGlobalContext();
  }

  private setupBatching(): void {
    if (this.config.enableBatching) {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);

      // Ensure logs are flushed on process exit
      if (typeof process !== 'undefined') {
        process.on('exit', () => this.flush());
        process.on('SIGINT', () => {
          this.flush();
          process.exit();
        });
      }
    }
  }

  private setupGlobalContext(): void {
    this.globalContext = {
      service: this.config.service,
      environment: this.config.environment,
      version: this.config.version,
      platform: this.detectPlatform(),
    };

    // Add request/session tracking if available
    if (typeof window !== 'undefined') {
      // Browser environment
      this.globalContext.sessionId = this.getOrCreateSessionId();
      this.globalContext.browser = this.detectBrowser();
      this.globalContext.device = this.detectDevice();
    }
  }

  private detectPlatform(): 'web' | 'mobile' | 'server' {
    if (typeof window === 'undefined') return 'server';
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return 'mobile';
    return 'web';
  }

  private detectBrowser(): string | undefined {
    if (typeof navigator === 'undefined') return undefined;
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private detectDevice(): string | undefined {
    if (typeof navigator === 'undefined') return undefined;
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'no-session';

    const sessionKey = 'mintenance_session_id';
    let sessionId = sessionStorage.getItem(sessionKey);

    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(sessionKey, sessionId);
    }

    return sessionId;
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: EnhancedLogContext,
    error?: Error,
    metadata?: Record<string, unknown>
  ): EnhancedLogEntry {
    const entry: EnhancedLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.globalContext, ...context },
      metadata,
    };

    if (error) {
      entry.error = error;
      entry.metadata = {
        ...entry.metadata,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      };
    }

    if (this.config.enablePerformanceTracking && typeof process !== 'undefined') {
      entry.performance = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      };
    }

    return entry;
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: EnhancedLogEntry): string {
    if (this.config.enableJsonLogging) {
      // Production: structured JSON logging
      return JSON.stringify({
        ...entry,
        // Sanitize sensitive data
        context: this.sanitizeContext((entry.context ?? {}) as Record<string, unknown>),
        metadata: this.sanitizeContext((entry.metadata ?? {}) as Record<string, unknown>),
      });
    } else {
      // Development: human-readable format
      const timestamp = entry.timestamp;
      const level = entry.level.toUpperCase().padEnd(5);
      let output = `[${timestamp}] ${level} ${entry.message}`;

      if (entry.context && Object.keys(entry.context).length > 0) {
        const sanitized = this.sanitizeContext(entry.context as Record<string, unknown>) as Record<string, unknown>;
        output += ` ${JSON.stringify(sanitized, null, 2)}`;
      }

      if (entry.error) {
        output += `\n${entry.error.stack || entry.error.message}`;
      }

      return output;
    }
  }

  /**
   * Sanitize sensitive data from context
   */
  private sanitizeContext(data: Record<string, unknown>): Record<string, unknown> {
    if (!data) return {} as Record<string, unknown>;
    if (typeof data !== 'object') return {} as Record<string, unknown>;

    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /apikey/i,
      /api[_-]?key/i,
      /access[_-]?token/i,
      /refresh[_-]?token/i,
      /credit[_-]?card/i,
      /card[_-]?number/i,
      /cvv/i,
      /ssn/i,
      /social[_-]?security/i,
      /authorization/i,
      /bearer/i,
      /private[_-]?key/i,
      /stripe/i,
      /supabase[_-]?key/i,
    ];

    const sanitized: Record<string, unknown> = (Array.isArray(data) ? [] : {}) as Record<string, unknown>;

    for (const [key, value] of Object.entries(data)) {
      const keyStr = String(key);
      const shouldRedact = sensitivePatterns.some(pattern => pattern.test(keyStr));

      if (shouldRedact) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value as unknown as Record<string, unknown>);
      } else if (typeof value === 'string' && value.length > 1000) {
        // Truncate very long strings in production
        sanitized[key] = this.config.environment === 'production'
          ? value.substring(0, 1000) + '...[truncated]'
          : value;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Send log entry to transports
   */
  private async sendToTransports(entry: LogEntry): Promise<void> {
    for (const transport of this.transports) {
      try {
        await transport.send(entry);
      } catch (error) {
        // Fallback to console if transport fails
        logger.error('Transport failed:', error, { service: 'general' });
      }
    }
  }

  /**
   * Buffer or send log entry
   */
  private processLogEntry(entry: LogEntry): void {
    if (this.config.enableBatching) {
      this.buffer.push(entry);

      if (this.buffer.length >= this.config.batchSize) {
        this.flush();
      }
    } else {
      this.sendToTransports(entry);
    }

    // Always output to console in development
    if (this.config.environment === 'development') {
      const formatted = this.formatLogEntry(entry);
      switch (entry.level) {
        case 'debug':
          logger.debug(formatted);
          break;
        case 'info':
          logger.info(`Log output: ${formatted}`, { service: 'general' });
          break;
        case 'warn':
          logger.warn(`Log output: ${formatted}`, { service: 'general' });
          break;
        case 'error':
          logger.error(`Log output: ${formatted}`, undefined, { service: 'general' });
          break;
      }
    }
  }

  /**
   * Flush buffered logs
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    // Send batch to transports
    for (const transport of this.transports) {
      try {
        // Transports can implement batch sending
        if ('sendBatch' in transport && typeof transport.sendBatch === 'function') {
          (transport as { sendBatch(entries: LogEntry[]): void }).sendBatch(entries);
        } else {
          entries.forEach((entry) => transport.send(entry as EnhancedLogEntry));
        }
      } catch (error) {
        logger.error('Transport batch failed:', error, { service: 'general' });
      }
    }

    // In production, also output to console if no transports
    if (this.config.environment === 'production' && this.transports.length === 0) {
      entries.forEach(entry => {
        const formatted = this.formatLogEntry(entry);
        logger.info(`Log output: ${formatted}`, { service: 'general' });
      });
    }
  }

  /**
   * Log with enhanced context
   */
  log(level: LogLevel, message: string, context?: EnhancedLogContext, metadata?: Record<string, unknown>): void {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.minLogLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex < currentLevelIndex) return;

    const entry = this.createLogEntry(level, message, context, undefined, metadata);
    this.processLogEntry(entry);
  }

  /**
   * Enhanced debug logging
   */
  debug(message: string, context?: EnhancedLogContext, metadata?: Record<string, unknown>): void {
    this.log('debug', message, context, metadata);
  }

  /**
   * Enhanced info logging
   */
  info(message: string, context?: EnhancedLogContext, metadata?: Record<string, unknown>): void {
    this.log('info', message, context, metadata);
  }

  /**
   * Enhanced warning logging
   */
  warn(message: string, context?: EnhancedLogContext, metadata?: Record<string, unknown>): void {
    this.log('warn', message, context, metadata);
  }

  /**
   * Enhanced error logging
   */
  error(message: string, error?: Error | unknown, context?: EnhancedLogContext, metadata?: Record<string, unknown>): void {
    let errorObj: Error | undefined;
    let errorMetadata: Record<string, unknown> = metadata || {};

    if (error instanceof Error) {
      errorObj = error;
    } else if (error) {
      // Convert non-Error objects to metadata
      errorMetadata = {
        ...errorMetadata,
        errorData: error,
        errorType: typeof error,
      };

      // Try to extract useful info
      if (typeof error === 'object' && error !== null) {
        const err: Record<string, unknown> = error as Record<string, unknown>;
        if (err['message'] !== undefined) errorMetadata.message = err['message'];
        if (err['code'] !== undefined) errorMetadata.code = err['code'];
        if (err['status'] !== undefined) errorMetadata.status = err['status'];
        if (err['statusCode'] !== undefined) errorMetadata.statusCode = err['statusCode'];
      }
    }

    const entry = this.createLogEntry('error', message, context, errorObj, errorMetadata);
    this.processLogEntry(entry);

    // Send to error tracking service immediately for errors
    if (this.transports.length > 0) {
      this.sendToTransports(entry);
    }
  }

  /**
   * Start performance timing
   */
  time(label: string): void {
    this.performanceStartTimes.set(label, Date.now());
  }

  /**
   * End performance timing and log
   */
  timeEnd(label: string, context?: EnhancedLogContext): void {
    const startTime = this.performanceStartTimes.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performanceStartTimes.delete(label);

      this.info(`${label}: ${duration}ms`, context, {
        performance: { duration },
        perfLabel: label
      });
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext: EnhancedLogContext): EnhancedLogger {
    const childLogger = new EnhancedLogger(this.config);
    childLogger.globalContext = { ...this.globalContext, ...childContext };
    childLogger.transports = this.transports;
    return childLogger;
  }

  /**
   * Add a transport dynamically
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * Remove a transport
   */
  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    Object.assign(this.config, config);

    // Restart batching if config changed
    if ('enableBatching' in config || 'flushInterval' in config) {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      this.setupBatching();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

/**
 * Default logger instance
 */
export const enhancedLogger = new EnhancedLogger();

/**
 * Console transport for backwards compatibility
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';

  async send(entry: EnhancedLogEntry): Promise<void> {
    const formatted = JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
        logger.debug(formatted);
        break;
      case 'info':
        logger.info(`Log output: ${formatted}`, { service: 'general' });
        break;
      case 'warn':
        logger.warn(`Log output: ${formatted}`, { service: 'general' });
        break;
      case 'error':
        logger.error(`Log output: ${formatted}`, undefined, { service: 'general' });
        break;
    }
  }
}

/**
 * Example Sentry transport
 */
export class SentryTransport implements LogTransport {
  name = 'sentry';
  private sentryClient: SentryLike | unknown;

  constructor(sentryClient?: unknown) {
    this.sentryClient = sentryClient;
  }

  async send(entry: EnhancedLogEntry): Promise<void> {
    if (!this.sentryClient) {
      // Try to get Sentry from global scope
      const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
      const glob = typeof global !== 'undefined' ? (global as unknown as Record<string, unknown>) : null;
      if (win?.['Sentry']) {
        this.sentryClient = win['Sentry'] as SentryLike;
      } else if (glob?.['Sentry']) {
        this.sentryClient = glob['Sentry'] as SentryLike;
      }
    }

    if (!this.sentryClient) return;

    const client: SentryLike = this.sentryClient as SentryLike;
    switch (entry.level) {
      case 'error':
        if (entry.error) {
          client.captureException(entry.error, {
            contexts: { logger: entry.context },
            extra: entry.metadata,
          });
        } else {
          client.captureMessage(entry.message, 'error', {
            contexts: { logger: entry.context },
            extra: entry.metadata,
          });
        }
        break;
      case 'warn':
        client.captureMessage(entry.message, 'warning', {
          contexts: { logger: entry.context },
          extra: entry.metadata,
        });
        break;
      case 'info':
        client.addBreadcrumb({
          message: entry.message,
          level: 'info',
          data: entry.context,
          timestamp: entry.timestamp,
        });
        break;
      case 'debug':
        client.addBreadcrumb({
          message: entry.message,
          level: 'debug',
          data: entry.context,
          timestamp: entry.timestamp,
        });
        break;
    }
  }
}