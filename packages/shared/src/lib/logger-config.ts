/**
 * Logger Configuration and Transport Setup
 *
 * Centralized configuration for logging across the platform
 * Supports multiple transports for production monitoring
 */

import { EnhancedLogger, LogTransport, EnhancedLogEntry } from '../enhanced-logger';
import { logger } from '../logger';

/**
 * Datadog Transport for production logging
 */
export class DatadogTransport implements LogTransport {
  name = 'datadog';
  private apiKey: string;
  private endpoint: string;
  private service: string;
  private environment: string;
  private buffer: EnhancedLogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: {
    apiKey: string;
    endpoint?: string;
    service?: string;
    environment?: string;
    batchSize?: number;
    flushInterval?: number;
  }) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || 'https://http-intake.logs.datadoghq.eu/api/v2/logs';
    this.service = config.service || 'mintenance';
    this.environment = config.environment || process.env.NODE_ENV || 'development';

    // Setup batching
    const flushInterval = config.flushInterval || 5000;
    this.flushTimer = setInterval(() => this.flush(), flushInterval);

    // Ensure flush on process exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => this.flush());
      process.on('SIGINT', () => {
        this.flush();
        process.exit();
      });
    }
  }

  async send(entry: EnhancedLogEntry): Promise<void> {
    this.buffer.push(entry);

    if (this.buffer.length >= 50) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    const logs = entries.map(entry => ({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      service: this.service,
      environment: this.environment,
      ...entry.context,
      metadata: entry.metadata,
      error: entry.error ? {
        message: entry.error.message,
        stack: entry.error.stack,
        name: entry.error.name
      } : undefined
    }));

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.apiKey,
          'DD-APPLICATION-KEY': this.apiKey
        },
        body: JSON.stringify(logs)
      });

      if (!response.ok) {
        logger.error('Datadog logging failed:', response.status, { service: 'lib' });
      }
    } catch (error) {
      logger.error('Failed to send logs to Datadog:', error, { service: 'lib' });
    }
  }

  async sendBatch(entries: EnhancedLogEntry[]): Promise<void> {
    for (const entry of entries) {
      this.buffer.push(entry);
    }
    await this.flush();
  }
}

/**
 * CloudWatch Transport for AWS logging
 */
export class CloudWatchTransport implements LogTransport {
  name = 'cloudwatch';
  private logGroupName: string;
  private logStreamName: string;
  private region: string;
  private buffer: EnhancedLogEntry[] = [];

  constructor(config: {
    logGroupName: string;
    logStreamName?: string;
    region?: string;
  }) {
    this.logGroupName = config.logGroupName;
    this.logStreamName = config.logStreamName || `mintenance-${Date.now()}`;
    this.region = config.region || process.env.AWS_REGION || 'eu-west-2';
  }

  async send(entry: EnhancedLogEntry): Promise<void> {
    // In a real implementation, you would use AWS SDK
    // This is a placeholder showing the structure
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level: entry.level,
        message: entry.message,
        context: entry.context,
        metadata: entry.metadata,
        error: entry.error ? {
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined
      })
    };

    // AWS CloudWatch SDK would be used here
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[CloudWatch] ${JSON.stringify(logEvent)}`, { service: 'lib' });
    }
  }
}

/**
 * File Transport for local logging
 */
export class FileTransport implements LogTransport {
  name = 'file';
  private filePath: string;
  private stream?: unknown;

  constructor(config: { filePath: string }) {
    this.filePath = config.filePath;

    if (typeof window === 'undefined') {
      // Server-side only
      const fs = require('fs');
      const path = require('path');

      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create write stream
      this.stream = fs.createWriteStream(this.filePath, { flags: 'a' });
    }
  }

  async send(entry: EnhancedLogEntry): Promise<void> {
    if (!this.stream) return;

    const line = JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      context: entry.context,
      metadata: entry.metadata,
      error: entry.error ? {
        message: entry.error.message,
        stack: entry.error.stack
      } : undefined
    }) + '\n';

    (this.stream as any).write(line);
  }
}

/**
 * Create and configure logger based on environment
 */
export function createLogger(customConfig?: {
  service?: string;
  environment?: string;
  minLogLevel?: string;
  enableDatadog?: boolean;
  enableSentry?: boolean;
  enableCloudWatch?: boolean;
  enableFileLogging?: boolean;
  datadogApiKey?: string;
  cloudWatchConfig?: unknown;
  fileLogPath?: string;
}): EnhancedLogger {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const logger = new EnhancedLogger({
    service: customConfig?.service || 'mintenance',
    environment: customConfig?.environment || process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    minLogLevel: (customConfig?.minLogLevel as any) || (isDevelopment ? 'debug' : 'info'),
    enableBatching: !isDevelopment,
    batchSize: 100,
    flushInterval: 5000,
    enableJsonLogging: !isDevelopment,
    enablePerformanceTracking: !isTest,
    transports: []
  });

  // Add transports based on environment and configuration
  if (!isTest) {
    // Datadog integration
    if (!isDevelopment && customConfig?.enableDatadog !== false) {
      const datadogApiKey = customConfig?.datadogApiKey || process.env.DATADOG_API_KEY;
      if (datadogApiKey) {
        logger.addTransport(new DatadogTransport({
          apiKey: datadogApiKey,
          service: customConfig?.service || 'mintenance',
          environment: customConfig?.environment || process.env.NODE_ENV || 'production'
        }));
      }
    }

    // CloudWatch integration (for AWS deployments)
    if (!isDevelopment && customConfig?.enableCloudWatch && customConfig?.cloudWatchConfig) {
      logger.addTransport(new CloudWatchTransport(customConfig.cloudWatchConfig as any));
    }

    // File logging (for debugging in production)
    if (customConfig?.enableFileLogging && customConfig?.fileLogPath) {
      logger.addTransport(new FileTransport({
        filePath: customConfig.fileLogPath
      }));
    }

    // Sentry is handled separately via the SentryTransport in enhanced-logger.ts
    if (!isDevelopment && customConfig?.enableSentry !== false) {
      // Import dynamically to avoid issues if Sentry is not installed
      try {
        const { SentryTransport } = require('../enhanced-logger');
        logger.addTransport(new SentryTransport());
      } catch (e) {
        // Sentry not available
      }
    }
  }

  return logger;
}

/**
 * Default logger instances for different contexts
 */
export const loggers = {
  // Web application logger
  web: createLogger({
    service: 'mintenance-web',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
  }),

  // Mobile application logger
  mobile: createLogger({
    service: 'mintenance-mobile',
    environment: process.env.NODE_ENV || 'development'
  }),

  // API/Backend logger
  api: createLogger({
    service: 'mintenance-api',
    environment: process.env.NODE_ENV || 'development'
  }),

  // Background jobs logger
  jobs: createLogger({
    service: 'mintenance-jobs',
    environment: process.env.NODE_ENV || 'development',
    enableFileLogging: true,
    fileLogPath: '/var/log/mintenance/jobs.log'
  }),

  // Payment processing logger (more sensitive)
  payments: createLogger({
    service: 'mintenance-payments',
    environment: process.env.NODE_ENV || 'development',
    minLogLevel: 'info', // Don't log debug in payments
    enableFileLogging: true,
    fileLogPath: '/var/log/mintenance/payments.log'
  })
};

/**
 * Get logger for specific context
 */
export function getLogger(context: 'web' | 'mobile' | 'api' | 'jobs' | 'payments' = 'api'): EnhancedLogger {
  return loggers[context];
}

interface ReqLike {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  ip?: string;
  connection?: { remoteAddress?: string };
}
interface ResLike {
  setHeader(name: string, value: string): void;
  statusCode?: number;
  end: (...args: unknown[]) => void;
  get?(name: string): string | undefined;
}
type NextLike = (err?: unknown) => void;

/**
 * Express/Next.js middleware for request logging
 */
export function requestLoggingMiddleware(logger?: EnhancedLogger) {
  const log = logger || loggers.api;

  return (req: ReqLike, res: ResLike, next: NextLike) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (req.headers) req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    log.info('Request received', {
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });

    const originalEnd = res.end;
    res.end = function (...args: unknown[]) {
      const duration = Date.now() - startTime;
      log.info('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        responseSize: res.get?.('content-length')
      });
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware(logger?: EnhancedLogger) {
  const log = logger || loggers.api;

  return (err: unknown, req: ReqLike, _res: ResLike, next: NextLike) => {
    const e = err as Record<string, unknown>;
    const requestId = (req.headers?.['x-request-id'] as string) || 'unknown';

    log.error('Request error', err, {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: (e['statusCode'] as number) || 500,
      errorCode: e['code'],
      errorType: e && typeof e === 'object' && e.constructor ? (e.constructor as { name?: string }).name : undefined
    });

    next(err);
  };
}

export default createLogger();