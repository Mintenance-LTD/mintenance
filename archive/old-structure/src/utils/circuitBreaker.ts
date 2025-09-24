/**
 * CIRCUIT BREAKER IMPLEMENTATION
 * Production-grade fault tolerance for external services
 *
 * Features:
 * - Automatic failure detection and recovery
 * - Configurable thresholds and timeouts
 * - Metrics collection and monitoring
 * - Graceful degradation strategies
 * - Support for multiple failure scenarios
 */

import { logger } from './logger';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time in ms before attempting recovery
  monitoringWindow: number; // Time window for failure counting
  expectedErrors: string[]; // Error types that should trigger circuit breaker
  fallbackFunction?: () => any; // Fallback when circuit is open
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpenCount: number;
  averageResponseTime: number;
  lastFailureTime: number | null;
  currentState: CircuitState;
}

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit breaker is open, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

/**
 * Circuit Breaker for external service calls
 * Implements the Circuit Breaker pattern for fault tolerance
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private nextAttemptTime = 0;
  private metrics: CircuitBreakerMetrics;

  constructor(private config: CircuitBreakerConfig) {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0,
      averageResponseTime: 0,
      lastFailureTime: null,
      currentState: this.state,
    };

    logger.info(`Circuit breaker initialized: ${config.name}`, {
      failureThreshold: config.failureThreshold,
      recoveryTimeout: config.recoveryTimeout,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        return this.handleOpenCircuit();
      } else {
        this.state = CircuitState.HALF_OPEN;
        logger.info(
          `Circuit breaker ${this.config.name} entering HALF_OPEN state`
        );
      }
    }

    return this.callWithMetrics(operation);
  }

  /**
   * Execute operation with metrics collection
   */
  private async callWithMetrics<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const result = await operation();

      // Success - record metrics
      const responseTime = Date.now() - startTime;
      this.onSuccess(responseTime);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error as Error, responseTime);
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.updateAverageResponseTime(responseTime);

    if (this.state === CircuitState.HALF_OPEN) {
      this.reset();
      logger.info(
        `Circuit breaker ${this.config.name} recovered - returning to CLOSED state`
      );
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1); // Gradually reduce failure count
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error, responseTime: number): void {
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = Date.now();
    this.updateAverageResponseTime(responseTime);

    if (this.isExpectedError(error)) {
      this.failureCount++;

      logger.warn(`Circuit breaker ${this.config.name} recorded failure`, {
        error: error.message,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });

      if (this.failureCount >= this.config.failureThreshold) {
        this.trip();
      }
    }
  }

  /**
   * Check if error should trigger circuit breaker
   */
  private isExpectedError(error: Error): boolean {
    if (this.config.expectedErrors.length === 0) {
      return true; // All errors trigger circuit breaker
    }

    return this.config.expectedErrors.some(
      (expectedError) =>
        error.name === expectedError || error.message.includes(expectedError)
    );
  }

  /**
   * Trip the circuit breaker to OPEN state
   */
  private trip(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    this.metrics.circuitOpenCount++;
    this.metrics.currentState = this.state;

    logger.error(
      `Circuit breaker ${this.config.name} TRIPPED - entering OPEN state`,
      {
        failureCount: this.failureCount,
        nextAttemptTime: new Date(this.nextAttemptTime).toISOString(),
      }
    );
  }

  /**
   * Reset circuit breaker to normal operation
   */
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.nextAttemptTime = 0;
    this.metrics.currentState = this.state;
  }

  /**
   * Handle requests when circuit is open
   */
  private handleOpenCircuit<T>(): T {
    if (this.config.fallbackFunction) {
      logger.info(
        `Circuit breaker ${this.config.name} using fallback function`
      );
      return this.config.fallbackFunction();
    } else {
      throw new Error(
        `Circuit breaker ${this.config.name} is OPEN - service unavailable`
      );
    }
  }

  /**
   * Update running average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalResponses =
      this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalResponses - 1) + responseTime) /
      totalResponses;
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset circuit breaker (for testing/admin purposes)
   */
  manualReset(): void {
    this.reset();
    logger.info(`Circuit breaker ${this.config.name} manually reset`);
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    if (this.metrics.totalRequests === 0) return true;

    const failureRate =
      this.metrics.failedRequests / this.metrics.totalRequests;
    return failureRate < 0.5 && this.state !== CircuitState.OPEN;
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Create a new circuit breaker for a service
   */
  create(config: CircuitBreakerConfig): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker(config);
    this.circuitBreakers.set(config.name, circuitBreaker);
    return circuitBreaker;
  }

  /**
   * Get existing circuit breaker
   */
  get(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Execute operation with named circuit breaker
   */
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      throw new Error(`Circuit breaker not found for service: ${serviceName}`);
    }

    return circuitBreaker.execute(operation);
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const allMetrics: Record<string, CircuitBreakerMetrics> = {};

    this.circuitBreakers.forEach((circuitBreaker, name) => {
      allMetrics[name] = circuitBreaker.getMetrics();
    });

    return allMetrics;
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): Record<string, { healthy: boolean; state: CircuitState }> {
    const healthStatus: Record<
      string,
      { healthy: boolean; state: CircuitState }
    > = {};

    this.circuitBreakers.forEach((circuitBreaker, name) => {
      healthStatus[name] = {
        healthy: circuitBreaker.isHealthy(),
        state: circuitBreaker.getState(),
      };
    });

    return healthStatus;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.forEach((circuitBreaker) => {
      circuitBreaker.manualReset();
    });

    logger.info('All circuit breakers reset');
  }
}

// Singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Default configurations for common services
export const DEFAULT_CONFIGS = {
  SUPABASE: {
    name: 'supabase',
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
    expectedErrors: ['NetworkError', 'TimeoutError', 'PostgrestError'],
  },
  STRIPE: {
    name: 'stripe',
    failureThreshold: 3,
    recoveryTimeout: 60000, // 1 minute
    monitoringWindow: 120000, // 2 minutes
    expectedErrors: ['StripeError', 'APIError', 'NetworkError'],
  },
  ML_SERVICE: {
    name: 'ml_service',
    failureThreshold: 10,
    recoveryTimeout: 15000, // 15 seconds
    monitoringWindow: 60000, // 1 minute
    expectedErrors: ['ModelError', 'InferenceError', 'TimeoutError'],
    fallbackFunction: () => ({ confidence: 0.5, fallback: true }),
  },
  GEOCODING: {
    name: 'geocoding',
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
    expectedErrors: ['APIError', 'RateLimitError', 'NetworkError'],
  },
  NOTIFICATION: {
    name: 'notification',
    failureThreshold: 8,
    recoveryTimeout: 20000, // 20 seconds
    monitoringWindow: 300000, // 5 minutes
    expectedErrors: ['PushError', 'SMSError', 'EmailError'],
  },
};

// Initialize default circuit breakers
export const initializeCircuitBreakers = (): void => {
  // Supabase circuit breaker
  circuitBreakerManager.create(DEFAULT_CONFIGS.SUPABASE);

  // Stripe circuit breaker
  circuitBreakerManager.create(DEFAULT_CONFIGS.STRIPE);

  // ML service circuit breaker with fallback
  circuitBreakerManager.create(DEFAULT_CONFIGS.ML_SERVICE);

  // Geocoding service circuit breaker
  circuitBreakerManager.create(DEFAULT_CONFIGS.GEOCODING);

  // Notification service circuit breaker
  circuitBreakerManager.create(DEFAULT_CONFIGS.NOTIFICATION);

  logger.info('All circuit breakers initialized successfully');
};
