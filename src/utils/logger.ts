import { captureMessage, captureException, addBreadcrumb } from '../config/sentry';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = __DEV__;

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

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${this.safeStringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, context));
    }
    
    addBreadcrumb(`Debug: ${message}`, 'debug', context);
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
    
    addBreadcrumb(`Info: ${message}`, 'info', context);
    captureMessage(message, 'info');
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message, context));
    }
    
    addBreadcrumb(`Warning: ${message}`, 'warning', context);
    captureMessage(message, 'warning');
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

  error(message: string, error?: Error, context?: LogContext): void {
    const sanitizedContext = this.sanitizeContext(context);
    const formattedMessage = this.formatMessage('error', message, sanitizedContext);
    
    if (this.isDevelopment) {
      console.error(formattedMessage, error);
    }
    
    addBreadcrumb(`Error: ${message}`, 'error', { ...sanitizedContext, error: error?.message });
    
    if (error) {
      captureException(error, { contexts: { logContext: sanitizedContext } });
    } else {
      captureMessage(message, 'error');
    }
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    const message = `${operation} completed in ${duration}ms`;
    
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, context));
    }
    
    addBreadcrumb(`Performance: ${message}`, 'performance', {
      duration,
      operation,
      ...context,
    });
  }

  // Network request logging
  network(method: string, url: string, status: number, duration: number, context?: LogContext): void {
    const message = `${method.toUpperCase()} ${url} - ${status} (${duration}ms)`;
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    
    if (this.isDevelopment) {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logMethod(this.formatMessage(level as LogLevel, message, context));
    }
    
    addBreadcrumb(`Network: ${message}`, 'http', {
      method,
      url,
      status,
      duration,
      ...context,
    });
    
    if (status >= 400) {
      captureMessage(`Network Error: ${message}`, 'error');
    }
  }

  // User action logging
  userAction(action: string, context?: LogContext): void {
    const message = `User action: ${action}`;
    
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, context));
    }
    
    addBreadcrumb(message, 'user', context);
  }

  // Navigation logging
  navigation(from: string, to: string, context?: LogContext): void {
    const message = `Navigation: ${from} -> ${to}`;
    
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, context));
    }
    
    addBreadcrumb(message, 'navigation', { from, to, ...context });
  }

  // Authentication logging
  auth(action: string, success: boolean, context?: LogContext): void {
    const message = `Auth ${action}: ${success ? 'success' : 'failed'}`;
    const level = success ? 'info' : 'warn';
    
    if (this.isDevelopment) {
      const logMethod = success ? console.log : console.warn;
      logMethod(this.formatMessage(level, message, context));
    }
    
    addBreadcrumb(message, 'auth', { action, success, ...context });
    
    if (!success) {
      captureMessage(`Authentication failed: ${action}`, 'warning');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience methods for backward compatibility
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => logger.error(message, error, context),
  performance: (operation: string, duration: number, context?: LogContext) => 
    logger.performance(operation, duration, context),
  network: (method: string, url: string, status: number, duration: number, context?: LogContext) => 
    logger.network(method, url, status, duration, context),
  userAction: (action: string, context?: LogContext) => logger.userAction(action, context),
  navigation: (from: string, to: string, context?: LogContext) => logger.navigation(from, to, context),
  auth: (action: string, success: boolean, context?: LogContext) => logger.auth(action, success, context),
};

export default logger;