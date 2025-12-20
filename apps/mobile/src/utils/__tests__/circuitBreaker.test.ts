/**
 * Tests for Circuit Breaker - Fault Tolerance System
 */

import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  DEFAULT_CONFIGS,
  initializeCircuitBreakers,
  circuitBreakerManager,
} from '../circuitBreaker';
import { logger } from '../logger';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    jest.clearAllMocks();
    breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringWindow: 60000,
      expectedErrors: ['NetworkError', 'TimeoutError'],
    });
  });

  describe('Initialization', () => {
    it('should initialize with CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should log initialization', () => {
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker initialized'),
        expect.objectContaining({
          failureThreshold: 3,
          recoveryTimeout: 1000,
        })
      );
    });

    it('should initialize metrics', () => {
      const metrics = breaker.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.circuitOpenCount).toBe(0);
      expect(metrics.currentState).toBe(CircuitState.CLOSED);
    });
  });

  describe('Successful Requests', () => {
    it('should execute successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should track successful requests', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await breaker.execute(operation);

      const metrics = breaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
    });

    it('should update average response time', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await breaker.execute(operation);

      const metrics = breaker.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should remain in CLOSED state', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await breaker.execute(operation);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Failed Requests', () => {
    it('should track failed requests', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      await expect(breaker.execute(operation)).rejects.toThrow();

      const metrics = breaker.getMetrics();
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.totalRequests).toBe(1);
    });

    it('should record failure time', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      await expect(breaker.execute(operation)).rejects.toThrow();

      const metrics = breaker.getMetrics();
      expect(metrics.lastFailureTime).toBeGreaterThan(0);
    });

    it('should only count expected errors', async () => {
      const unexpectedError = new Error('UnexpectedError');
      const operation = jest.fn().mockRejectedValue(unexpectedError);

      await expect(breaker.execute(operation)).rejects.toThrow();

      // Should not trip circuit for unexpected errors
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should log warnings for expected failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      await expect(breaker.execute(operation)).rejects.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('recorded failure'),
        expect.any(Object)
      );
    });
  });

  describe('Circuit State Transitions', () => {
    it('should trip to OPEN after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      // Trigger 3 failures (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should log when circuit trips', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('TRIPPED'),
        expect.any(Object)
      );
    });

    it('should increment circuitOpenCount when tripped', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      const metrics = breaker.getMetrics();
      expect(metrics.circuitOpenCount).toBe(1);
    });

    it('should reject requests when OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      // Next request should be rejected without calling operation
      operation.mockClear();
      await expect(breaker.execute(operation)).rejects.toThrow(
        'Circuit breaker test-service is OPEN'
      );
      expect(operation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      jest.useFakeTimers();

      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Fast forward past recovery timeout
      jest.advanceTimersByTime(1001);

      // Next request should transition to HALF_OPEN
      operation.mockResolvedValue('success');
      await breaker.execute(operation);

      // Should be back to CLOSED after successful request in HALF_OPEN
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      jest.useRealTimers();
    });

    it('should log HALF_OPEN state transition', async () => {
      jest.useFakeTimers();

      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      jest.clearAllMocks();
      jest.advanceTimersByTime(1001);

      operation.mockResolvedValue('success');
      await breaker.execute(operation);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('HALF_OPEN')
      );

      jest.useRealTimers();
    });

    it('should reset to CLOSED after successful request in HALF_OPEN', async () => {
      jest.useFakeTimers();

      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      jest.advanceTimersByTime(1001);

      operation.mockResolvedValue('success');
      await breaker.execute(operation);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('recovered')
      );

      jest.useRealTimers();
    });
  });

  describe('Fallback Function', () => {
    it('should use fallback when circuit is OPEN', async () => {
      const fallback = jest.fn().mockReturnValue({ fallback: true });
      const breakerWithFallback = new CircuitBreaker({
        name: 'test-fallback',
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: ['NetworkError'],
        fallbackFunction: fallback,
      });

      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        await expect(breakerWithFallback.execute(operation)).rejects.toThrow();
      }

      // Next request should use fallback
      const result = await breakerWithFallback.execute(operation);
      expect(result).toEqual({ fallback: true });
      expect(fallback).toHaveBeenCalled();
    });

    it('should log fallback usage', async () => {
      const fallback = jest.fn().mockReturnValue({ fallback: true });
      const breakerWithFallback = new CircuitBreaker({
        name: 'test-fallback',
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: ['NetworkError'],
        fallbackFunction: fallback,
      });

      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      for (let i = 0; i < 2; i++) {
        await expect(breakerWithFallback.execute(operation)).rejects.toThrow();
      }

      jest.clearAllMocks();
      await breakerWithFallback.execute(operation);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('fallback')
      );
    });
  });

  describe('Manual Reset', () => {
    it('should manually reset circuit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      breaker.manualReset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should log manual reset', () => {
      jest.clearAllMocks();
      breaker.manualReset();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('manually reset')
      );
    });
  });

  describe('Health Check', () => {
    it('should be healthy when no requests', () => {
      expect(breaker.isHealthy()).toBe(true);
    });

    it('should be healthy with low failure rate', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await breaker.execute(operation);
      await breaker.execute(operation);

      expect(breaker.isHealthy()).toBe(true);
    });

    it('should be unhealthy when circuit is OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }

      expect(breaker.isHealthy()).toBe(false);
    });

    it('should be unhealthy with high failure rate', async () => {
      const failingOp = jest.fn().mockRejectedValue(new Error('NetworkError'));
      const successOp = jest.fn().mockResolvedValue('success');

      // Create 60% failure rate (3 failures, 2 successes)
      await successOp();
      await successOp();
      try {
        await breaker.execute(failingOp);
      } catch {}
      try {
        await breaker.execute(failingOp);
      } catch {}
      try {
        await breaker.execute(failingOp);
      } catch {}

      expect(breaker.isHealthy()).toBe(false);
    });
  });

  describe('Metrics', () => {
    it('should provide metrics snapshot', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await breaker.execute(operation);

      const metrics = breaker.getMetrics();
      expect(metrics).toEqual(
        expect.objectContaining({
          totalRequests: 1,
          successfulRequests: 1,
          failedRequests: 0,
          circuitOpenCount: 0,
          currentState: CircuitState.CLOSED,
        })
      );
    });

    it('should calculate average response time correctly', async () => {
      const fastOp = jest.fn().mockResolvedValue('fast');
      const slowOp = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'slow';
      });

      await breaker.execute(fastOp);
      await breaker.execute(slowOp);

      const metrics = breaker.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Expected Errors', () => {
    it('should match error by name', async () => {
      const error = new Error('Some message');
      error.name = 'NetworkError';
      const operation = jest.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow();

      // Should count as expected error
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should match error by message substring', async () => {
      const error = new Error('Connection TimeoutError occurred');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow();

      // Should count as expected error
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should trip on all errors when expectedErrors is empty', async () => {
      const anyErrorBreaker = new CircuitBreaker({
        name: 'any-error',
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: [],
      });

      const operation = jest.fn().mockRejectedValue(new Error('AnyError'));

      // Should trip after 2 failures
      for (let i = 0; i < 2; i++) {
        await expect(anyErrorBreaker.execute(operation)).rejects.toThrow();
      }

      expect(anyErrorBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CircuitBreakerManager();
  });

  describe('Create and Get', () => {
    it('should create a circuit breaker', () => {
      const breaker = manager.create({
        name: 'test-service',
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: [],
      });

      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });

    it('should retrieve created circuit breaker', () => {
      manager.create({
        name: 'test-service',
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: [],
      });

      const breaker = manager.get('test-service');
      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });

    it('should return undefined for non-existent breaker', () => {
      const breaker = manager.get('non-existent');
      expect(breaker).toBeUndefined();
    });
  });

  describe('Execute', () => {
    it('should execute operation with named circuit breaker', async () => {
      manager.create({
        name: 'test-service',
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: [],
      });

      const operation = jest.fn().mockResolvedValue('success');
      const result = await manager.execute('test-service', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should throw error for non-existent circuit breaker', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(
        manager.execute('non-existent', operation)
      ).rejects.toThrow('Circuit breaker not found');
    });
  });

  describe('Metrics Collection', () => {
    it('should collect metrics from all circuit breakers', async () => {
      manager.create({
        name: 'service-1',
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: [],
      });

      manager.create({
        name: 'service-2',
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: [],
      });

      const operation = jest.fn().mockResolvedValue('success');
      await manager.execute('service-1', operation);

      const metrics = manager.getAllMetrics();
      expect(metrics).toHaveProperty('service-1');
      expect(metrics).toHaveProperty('service-2');
      expect(metrics['service-1'].totalRequests).toBe(1);
      expect(metrics['service-2'].totalRequests).toBe(0);
    });

    it('should return empty object when no breakers', () => {
      const metrics = manager.getAllMetrics();
      expect(metrics).toEqual({});
    });
  });

  describe('Health Status', () => {
    it('should get health status of all services', async () => {
      manager.create({
        name: 'healthy-service',
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: [],
      });

      const operation = jest.fn().mockResolvedValue('success');
      await manager.execute('healthy-service', operation);

      const health = manager.getHealthStatus();
      expect(health['healthy-service']).toEqual({
        healthy: true,
        state: CircuitState.CLOSED,
      });
    });

    it('should return empty object when no breakers', () => {
      const health = manager.getHealthStatus();
      expect(health).toEqual({});
    });
  });

  describe('Reset All', () => {
    it('should reset all circuit breakers', async () => {
      manager.create({
        name: 'service-1',
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: ['Error'],
      });

      manager.create({
        name: 'service-2',
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringWindow: 60000,
        expectedErrors: ['Error'],
      });

      // Trip both circuits
      const failOp = jest.fn().mockRejectedValue(new Error('Error'));
      for (let i = 0; i < 2; i++) {
        try {
          await manager.execute('service-1', failOp);
        } catch {}
        try {
          await manager.execute('service-2', failOp);
        } catch {}
      }

      manager.resetAll();

      const health = manager.getHealthStatus();
      expect(health['service-1'].state).toBe(CircuitState.CLOSED);
      expect(health['service-2'].state).toBe(CircuitState.CLOSED);
    });

    it('should log reset all', () => {
      jest.clearAllMocks();
      manager.resetAll();

      expect(logger.info).toHaveBeenCalledWith('All circuit breakers reset');
    });
  });
});

describe('Default Configurations', () => {
  it('should have SUPABASE config', () => {
    expect(DEFAULT_CONFIGS.SUPABASE).toEqual({
      name: 'supabase',
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringWindow: 60000,
      expectedErrors: ['NetworkError', 'TimeoutError', 'PostgrestError'],
    });
  });

  it('should have STRIPE config', () => {
    expect(DEFAULT_CONFIGS.STRIPE).toEqual({
      name: 'stripe',
      failureThreshold: 3,
      recoveryTimeout: 60000,
      monitoringWindow: 120000,
      expectedErrors: ['StripeError', 'APIError', 'NetworkError'],
    });
  });

  it('should have ML_SERVICE config with fallback', () => {
    expect(DEFAULT_CONFIGS.ML_SERVICE).toMatchObject({
      name: 'ml_service',
      failureThreshold: 10,
      recoveryTimeout: 15000,
      monitoringWindow: 60000,
      expectedErrors: ['ModelError', 'InferenceError', 'TimeoutError'],
    });
    expect(DEFAULT_CONFIGS.ML_SERVICE.fallbackFunction).toBeDefined();
    expect(DEFAULT_CONFIGS.ML_SERVICE.fallbackFunction!()).toEqual({
      confidence: 0.5,
      fallback: true,
    });
  });

  it('should have GEOCODING config', () => {
    expect(DEFAULT_CONFIGS.GEOCODING.name).toBe('geocoding');
  });

  it('should have NOTIFICATION config', () => {
    expect(DEFAULT_CONFIGS.NOTIFICATION.name).toBe('notification');
  });
});

describe('Initialize Circuit Breakers', () => {
  it('should initialize all default circuit breakers', () => {
    jest.clearAllMocks();
    initializeCircuitBreakers();

    expect(logger.info).toHaveBeenCalledWith(
      'All circuit breakers initialized successfully'
    );
  });

  it('should create all service breakers', () => {
    // Clear existing breakers
    const manager = new CircuitBreakerManager();
    const originalCreate = manager.create.bind(manager);
    manager.create = jest.fn(originalCreate);

    // Re-initialize with mocked manager would require dependency injection
    // For now, just verify configs exist
    expect(circuitBreakerManager.get('supabase')).toBeDefined();
    expect(circuitBreakerManager.get('stripe')).toBeDefined();
    expect(circuitBreakerManager.get('ml_service')).toBeDefined();
    expect(circuitBreakerManager.get('geocoding')).toBeDefined();
    expect(circuitBreakerManager.get('notification')).toBeDefined();
  });
});
