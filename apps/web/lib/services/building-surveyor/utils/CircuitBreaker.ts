/**
 * Generic Circuit Breaker
 *
 * Prevents cascading failures by tracking error counts and temporarily
 * disabling calls to failing services.
 *
 * States:
 *  - CLOSED: Normal operation, requests pass through
 *  - OPEN: Service is failing, requests are rejected immediately
 *  - HALF_OPEN: After reset timeout, one probe request is allowed
 */

import { logger } from '@mintenance/shared';

export interface CircuitBreakerConfig {
  /** Name for logging */
  name: string;
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting to reset (half-open) */
  resetTimeoutMs: number;
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /** Returns true if the circuit is open (service should be skipped) */
  isOpen(): boolean {
    if (this.failureCount >= this.config.failureThreshold) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < this.config.resetTimeoutMs) {
        return true;
      }
      // Half-open: allow one probe and reset
      this.failureCount = 0;
    }
    return false;
  }

  /** Record a failure — increments counter and may open circuit */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.config.failureThreshold) {
      logger.warn(`Circuit breaker OPEN for ${this.config.name}`, {
        service: this.config.name,
        failureCount: this.failureCount,
        resetTimeoutMs: this.config.resetTimeoutMs,
      });
    }
  }

  /** Record a success — resets the failure counter */
  recordSuccess(): void {
    if (this.failureCount > 0) {
      logger.info(`Circuit breaker RESET for ${this.config.name}`, {
        service: this.config.name,
        previousFailures: this.failureCount,
      });
    }
    this.failureCount = 0;
  }

  /** Execute a function through the circuit breaker */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error(`Circuit breaker open for ${this.config.name}`);
    }
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}
