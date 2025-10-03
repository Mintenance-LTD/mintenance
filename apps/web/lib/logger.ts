// Web Logger Utility - Structured logging for Next.js/web environment
// Adapted from mobile logger pattern for browser and server-side compatibility

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

// Sentry integration placeholder - can be initialized later
let sentryFunctions = {
  captureMessage: (() => {}) as any,
  captureException: (() => {}) as any,
  addBreadcrumb: (() => {}) as any,
};

// Function to set Sentry functions after initialization
export const setSentryFunctions = (functions: {
  captureMessage: any;
  captureException: any;
  addBreadcrumb: any;
}) => {
  sentryFunctions = functions;
};

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  // Normalize arguments to support both styles:
  // 1) message, context
  // 2) tag, message, context
  private normalizeMessageArgs(
    first: string,
    second?: string | LogContext | unknown,
    third?: LogContext | unknown
  ): { message: string; context?: LogContext | unknown } {
    if (typeof second === 'string') {
      const message = `[${first}] ${second}`;
      return { message, context: third };
    }
    return { message: first, context: second };
  }

  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj, (key, value) => {
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          // Skip deeply nested objects to prevent circular references
          if (key === 'contexts' || key === 'logContext') {
            return '[Circular Reference Detected]';
          }
        }
        return value;
      });
    } catch (error) {
      return '[Unable to stringify]';
    }
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${this.safeStringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private toContext(input: unknown): LogContext | undefined {
    if (input == null) return undefined;
    if (typeof input === 'object')
      return this.sanitizeContext(input as LogContext);
    try {
      return { value: String(input) };
    } catch (_) {
      return { value: '[Unserializable]' };
    }
  }

  debug(messageOrTag: string, contextOrMessage?: LogContext | unknown | string, maybeContext?: LogContext | unknown): void {
    const { message, context } = this.normalizeMessageArgs(
      messageOrTag,
      contextOrMessage as any,
      maybeContext
    );
    if (this.isDevelopment) {
      console.log(
        this.formatMessage('debug', message, this.toContext(context))
      );
    }

    sentryFunctions.addBreadcrumb({
      message: `Debug: ${message}`,
      category: 'debug',
      level: 'info',
      data: this.toContext(context),
    });
  }

  info(messageOrTag: string, contextOrMessage?: LogContext | unknown | string, maybeContext?: LogContext | unknown): void {
    const { message, context } = this.normalizeMessageArgs(
      messageOrTag,
      contextOrMessage as any,
      maybeContext
    );
    if (this.isDevelopment) {
      console.info(
        this.formatMessage('info', message, this.toContext(context))
      );
    }

    sentryFunctions.addBreadcrumb({
      message: `Info: ${message}`,
      category: 'info',
      level: 'info',
      data: this.toContext(context),
    });
    sentryFunctions.captureMessage(message, 'info');
  }

  warn(messageOrTag: string, contextOrMessage?: LogContext | unknown | string, maybeContext?: LogContext | unknown): void {
    const { message, context } = this.normalizeMessageArgs(
      messageOrTag,
      contextOrMessage as any,
      maybeContext
    );
    if (this.isDevelopment) {
      console.warn(
        this.formatMessage('warn', message, this.toContext(context))
      );
    }

    sentryFunctions.addBreadcrumb({
      message: `Warning: ${message}`,
      category: 'warning',
      level: 'warning',
      data: this.toContext(context),
    });
    sentryFunctions.captureMessage(message, 'warning');
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    try {
      // Create a safe copy without circular references
      const sanitized: LogContext = {};
      for (const [key, value] of Object.entries(context)) {
        if (key === 'contexts' || key === 'logContext') {
          sanitized[key] = '[Omitted to prevent circular reference]';
        } else if (typeof value === 'object' && value !== null) {
          // Only include simple object properties
          sanitized[key] = value.toString ? value.toString() : '[Object]';
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    } catch (error) {
      return { error: 'Failed to sanitize context' };
    }
  }

  error(
    messageOrTag: string,
    errorOrContextOrMessage?: unknown | string,
    maybeContext?: LogContext
  ): void {
    const { message, context } = this.normalizeMessageArgs(
      messageOrTag,
      errorOrContextOrMessage as any,
      maybeContext
    );
    const isErr = errorOrContextOrMessage instanceof Error;
    const err: Error | undefined = isErr
      ? (errorOrContextOrMessage as Error)
      : undefined;
    const ctx = isErr ? context : this.toContext(errorOrContextOrMessage);
    const sanitizedContext = ctx ? this.sanitizeContext(ctx) : undefined;
    const formattedMessage = this.formatMessage(
      'error',
      message,
      sanitizedContext
    );

    if (this.isDevelopment) {
      console.error(formattedMessage, err);
    }

    sentryFunctions.addBreadcrumb({
      message: `Error: ${message}`,
      category: 'error',
      level: 'error',
      data: { ...sanitizedContext, error: err?.message },
    });

    if (err) {
      sentryFunctions.captureException(err, {
        contexts: { logContext: sanitizedContext },
      });
    } else {
      sentryFunctions.captureMessage(message, 'error');
    }
  }

  // Performance logging
  performance(
    operation: string,
    duration: number,
    context?: LogContext | unknown
  ): void {
    const message = `${operation} completed in ${duration}ms`;

    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, this.toContext(context)));
    }

    sentryFunctions.addBreadcrumb({
      message: `Performance: ${message}`,
      category: 'performance',
      level: 'info',
      data: {
        duration,
        operation,
        ...(this.toContext(context) || {}),
      },
    });
  }

  // Network request logging
  network(
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: LogContext | unknown
  ): void {
    const message = `${method.toUpperCase()} ${url} - ${status} (${duration}ms)`;
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';

    if (this.isDevelopment) {
      const logMethod =
        level === 'error'
          ? console.error
          : level === 'warn'
            ? console.warn
            : console.log;
      logMethod(
        this.formatMessage(level as LogLevel, message, this.toContext(context))
      );
    }

    sentryFunctions.addBreadcrumb({
      message: `Network: ${message}`,
      category: 'http',
      level: status >= 400 ? 'error' : 'info',
      data: {
        method,
        url,
        status,
        duration,
        ...(this.toContext(context) || {}),
      },
    });

    if (status >= 400) {
      sentryFunctions.captureMessage(`Network Error: ${message}`, 'error');
    }
  }

  // User action logging
  userAction(action: string, context?: LogContext | unknown): void {
    const message = `User action: ${action}`;

    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, this.toContext(context)));
    }

    sentryFunctions.addBreadcrumb({
      message,
      category: 'user',
      level: 'info',
      data: this.toContext(context),
    });
  }

  // Navigation logging
  navigation(from: string, to: string, context?: LogContext | unknown): void {
    const message = `Navigation: ${from} -> ${to}`;

    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, this.toContext(context)));
    }

    sentryFunctions.addBreadcrumb({
      message,
      category: 'navigation',
      level: 'info',
      data: { from, to, ...(this.toContext(context) || {}) },
    });
  }

  // Authentication logging
  auth(action: string, success: boolean, context?: LogContext | unknown): void {
    const message = `Auth ${action}: ${success ? 'success' : 'failed'}`;
    const level = success ? 'info' : 'warn';

    if (this.isDevelopment) {
      const logMethod = success ? console.log : console.warn;
      logMethod(this.formatMessage(level, message, this.toContext(context)));
    }

    sentryFunctions.addBreadcrumb({
      message,
      category: 'auth',
      level: success ? 'info' : 'warning',
      data: { action, success, ...(this.toContext(context) || {}) },
    });

    if (!success) {
      sentryFunctions.captureMessage(
        `Authentication failed: ${action}`,
        'warning'
      );
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience methods for backward compatibility
export const log = {
  debug: (
    messageOrTag: string,
    contextOrMessage?: LogContext | unknown | string,
    maybeContext?: LogContext | unknown
  ) => logger.debug(messageOrTag, contextOrMessage as any, maybeContext),
  info: (
    messageOrTag: string,
    contextOrMessage?: LogContext | unknown | string,
    maybeContext?: LogContext | unknown
  ) => logger.info(messageOrTag, contextOrMessage as any, maybeContext),
  warn: (
    messageOrTag: string,
    contextOrMessage?: LogContext | unknown | string,
    maybeContext?: LogContext | unknown
  ) => logger.warn(messageOrTag, contextOrMessage as any, maybeContext),
  error: (
    messageOrTag: string,
    errorOrContextOrMessage?: unknown | string,
    maybeContext?: LogContext
  ) => logger.error(messageOrTag, errorOrContextOrMessage as any, maybeContext),
  performance: (
    operation: string,
    duration: number,
    context?: LogContext | unknown
  ) => logger.performance(operation, duration, context),
  network: (
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: LogContext | unknown
  ) => logger.network(method, url, status, duration, context),
  userAction: (action: string, context?: LogContext | unknown) =>
    logger.userAction(action, context),
  navigation: (from: string, to: string, context?: LogContext | unknown) =>
    logger.navigation(from, to, context),
  auth: (action: string, success: boolean, context?: LogContext | unknown) =>
    logger.auth(action, success, context),
};

export default logger;
