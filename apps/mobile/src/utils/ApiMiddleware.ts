/**
 * API Middleware
 * Integrates API protection with service calls
 */

import { apiProtectionService, ApiRequest, ApiResponse } from './ApiProtection';
import { logger } from './logger';
import { config } from '../config/environment';

export interface MiddlewareConfig {
  enableProtection: boolean;
  bypassEndpoints: string[];
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export interface RequestContext {
  userId?: string;
  userTier?: string;
  clientId?: string;
  endpoint: string;
  method: string;
  startTime: number;
  retryCount: number;
}

export class ApiMiddleware {
  private config: MiddlewareConfig;
  private activeRequests = new Map<string, RequestContext>();

  constructor(middlewareConfig: Partial<MiddlewareConfig> = {}) {
    this.config = {
      enableProtection: config.environment === 'production',
      bypassEndpoints: ['/health', '/metrics', '/status'],
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      ...middlewareConfig,
    };
  }

  /**
   * Middleware for outgoing API requests
   */
  async requestMiddleware<T>(
    requestFn: () => Promise<T>,
    context: {
      endpoint: string;
      method: string;
      userId?: string;
      userTier?: string;
      clientId?: string;
    }
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const requestContext: RequestContext = {
      ...context,
      startTime: Date.now(),
      retryCount: 0,
    };

    this.activeRequests.set(requestId, requestContext);

    try {
      // Check if protection should be applied
      if (this.config.enableProtection && !this.shouldBypassProtection(context.endpoint)) {
        const protectionCheck = await this.checkProtection(requestContext);
        if (!protectionCheck.allowed) {
          throw new ApiProtectionError(protectionCheck.reason || 'Request blocked', {
            endpoint: context.endpoint,
            reason: protectionCheck.reason,
            rateLimitInfo: protectionCheck.rateLimitInfo,
          });
        }
      }

      // Execute request with retries
      const result = await this.executeWithRetries(requestFn, requestContext);

      // Record successful request
      this.recordRequestMetrics(requestContext, { success: true });

      return result;
    } catch (error) {
      // Record failed request
      this.recordRequestMetrics(requestContext, { success: false, error });

      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Check API protection
   */
  private async checkProtection(context: RequestContext): Promise<{
    allowed: boolean;
    reason?: string;
    rateLimitInfo?: any;
  }> {
    const apiRequest: ApiRequest = {
      endpoint: context.endpoint,
      method: context.method,
      userId: context.userId,
      userTier: context.userTier,
      clientId: context.clientId,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      timestamp: Date.now(),
    };

    return apiProtectionService.checkRequest(apiRequest);
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetries<T>(
    requestFn: () => Promise<T>,
    context: RequestContext
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        context.retryCount = attempt;

        // Add timeout protection
        const result = await Promise.race([
          requestFn(),
          this.createTimeoutPromise(context.endpoint),
        ]);

        if (attempt > 0) {
          logger.info('ApiMiddleware', 'Request succeeded after retry', {
            endpoint: context.endpoint,
            attempt,
            userId: context.userId,
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        context.retryCount = attempt + 1;

        // Don't retry on certain errors
        if (!this.shouldRetry(error as Error, attempt)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this.delay(delay);

          logger.warn('ApiMiddleware', 'Request failed, retrying', {
            endpoint: context.endpoint,
            attempt: attempt + 1,
            delay,
            error: (error as Error).message,
            userId: context.userId,
          });
        }
      }
    }

    // Log final failure
    logger.error('ApiMiddleware', 'Request failed after all retries', {
      endpoint: context.endpoint,
      retries: this.config.maxRetries,
      error: lastError?.message,
      userId: context.userId,
    });

    throw lastError;
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }

    // Don't retry protection errors
    if (error instanceof ApiProtectionError) {
      return false;
    }

    // Don't retry client errors (4xx)
    if (error.message.includes('400') || error.message.includes('401') ||
        error.message.includes('403') || error.message.includes('404')) {
      return false;
    }

    // Retry network errors and server errors (5xx)
    if (error.message.includes('Network') ||
        error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(endpoint: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout: ${endpoint} took longer than ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);
    });
  }

  /**
   * Check if endpoint should bypass protection
   */
  private shouldBypassProtection(endpoint: string): boolean {
    return this.config.bypassEndpoints.some(bypass =>
      endpoint.includes(bypass)
    );
  }

  /**
   * Record request metrics
   */
  private recordRequestMetrics(
    context: RequestContext,
    result: { success: boolean; error?: any }
  ): void {
    const duration = Date.now() - context.startTime;

    logger.debug('ApiMiddleware', 'Request completed', {
      endpoint: context.endpoint,
      method: context.method,
      duration,
      success: result.success,
      retries: context.retryCount,
      userId: context.userId,
    });

    // Record metrics for monitoring
    this.recordPerformanceMetrics(context, duration, result.success);
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetrics(
    context: RequestContext,
    duration: number,
    success: boolean
  ): void {
    // This would integrate with performance monitoring service
    const metrics = {
      endpoint: context.endpoint,
      method: context.method,
      duration,
      success,
      retries: context.retryCount,
      timestamp: Date.now(),
    };

    // In production, send to monitoring service
    if (config.enablePerformanceMonitoring) {
      // Send to metrics service
      this.sendMetricsToMonitoring(metrics);
    }
  }

  /**
   * Send metrics to monitoring service
   */
  private sendMetricsToMonitoring(metrics: any): void {
    // Implementation would depend on monitoring service (DataDog, New Relic, etc.)
    logger.debug('ApiMiddleware', 'Performance metrics recorded', metrics);
  }

  /**
   * Get client IP address
   */
  private getClientIP(): string {
    // In React Native, this would need to be obtained from device info
    // For web, would use request headers
    return '127.0.0.1'; // Placeholder
  }

  /**
   * Get user agent
   */
  private getUserAgent(): string {
    // In React Native, construct from device info
    // For web, use navigator.userAgent
    return 'MintainanceApp/1.0'; // Placeholder
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current active request count
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get active requests info
   */
  getActiveRequests(): Array<{
    id: string;
    context: RequestContext;
    duration: number;
  }> {
    const now = Date.now();
    return Array.from(this.activeRequests.entries()).map(([id, context]) => ({
      id,
      context,
      duration: now - context.startTime,
    }));
  }

  /**
   * Cancel all active requests (for cleanup)
   */
  cancelAllRequests(): void {
    this.activeRequests.clear();
  }
}

/**
 * Custom error for API protection violations
 */
export class ApiProtectionError extends Error {
  public readonly code = 'API_PROTECTION_ERROR';
  public readonly statusCode = 429;

  constructor(
    message: string,
    public readonly details: {
      endpoint: string;
      reason?: string;
      rateLimitInfo?: any;
    }
  ) {
    super(message);
    this.name = 'ApiProtectionError';
  }
}

/**
 * Supabase function wrapper with API protection
 */
export class ProtectedSupabaseClient {
  private middleware: ApiMiddleware;

  constructor(private supabaseClient: any, middlewareConfig?: Partial<MiddlewareConfig>) {
    this.middleware = new ApiMiddleware(middlewareConfig);
  }

  /**
   * Protected function invocation
   */
  async invokeFunction<T>(
    functionName: string,
    options: any = {},
    context: {
      userId?: string;
      userTier?: string;
    } = {}
  ): Promise<T> {
    return this.middleware.requestMiddleware(
      () => this.supabaseClient.functions.invoke(functionName, options),
      {
        endpoint: `/functions/${functionName}`,
        method: 'POST',
        ...context,
      }
    );
  }

  /**
   * Protected database query
   */
  async query<T>(
    queryFn: () => Promise<T>,
    context: {
      table: string;
      operation: string;
      userId?: string;
      userTier?: string;
    }
  ): Promise<T> {
    return this.middleware.requestMiddleware(
      queryFn,
      {
        endpoint: `/database/${context.table}`,
        method: context.operation.toUpperCase(),
        userId: context.userId,
        userTier: context.userTier,
      }
    );
  }

  /**
   * Get middleware statistics
   */
  getStats(): {
    activeRequests: number;
    protection: any;
  } {
    return {
      activeRequests: this.middleware.getActiveRequestCount(),
      protection: apiProtectionService.getSecurityStats(),
    };
  }
}

// Export singleton middleware instance
export const apiMiddleware = new ApiMiddleware();

export default apiMiddleware;