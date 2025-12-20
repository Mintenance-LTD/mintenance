import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitBreakerConfig,
  CircuitState,
  circuitBreakerManager,
  DEFAULT_CONFIGS,
  initializeCircuitBreakers,
} from '../../utils/circuitBreaker';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { logger } = require('../../utils/logger');

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockConfig: CircuitBreakerConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockConfig = {
      name: 'test-service',
      failureThreshold: 3,
      recoveryTimeout: 5000,
      monitoringWindow: 10000,
      expectedErrors: ['NetworkError', 'TimeoutError'],
    };

    circuitBreaker = new CircuitBreaker(mockConfig);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with correct default state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isHealthy()).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Circuit breaker initialized: test-service',
        {
          failureThreshold: 3,
          recoveryTimeout: 5000,
        }
      );
    });

    it('should initialize metrics correctly', () => {
      const metrics = circuitBreaker.getMetrics();
      expect(metrics).toEqual({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        circuitOpenCount: 0,
        averageResponseTime: 0,
        lastFailureTime: null,
        currentState: CircuitState.CLOSED,
      });
    });
  });

  describe('execute - successful operations', () => {
    it('should execute successful operation and update metrics', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
    });

    it('should calculate average response time correctly', async () => {
      const operation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      });

      // Execute the operation and advance timers concurrently
      const executePromise = circuitBreaker.execute(operation);
      jest.advanceTimersByTime(100);
      await executePromise;

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should gradually reduce failure count on success', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('NetworkError'));
      const successOperation = jest.fn().mockResolvedValue('success');

      // Generate some failures
      try { await circuitBreaker.execute(failingOperation); } catch {}
      try { await circuitBreaker.execute(failingOperation); } catch {}

      // Success should reduce failure count
      await circuitBreaker.execute(successOperation);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(2);
    });
  });

  describe('execute - failed operations', () => {
    it('should handle expected errors and update failure count', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('NetworkError');

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.lastFailureTime).not.toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Circuit breaker test-service recorded failure',
        {
          error: 'NetworkError',
          failureCount: 1,
          threshold: 3,
        }
      );
    });

    it('should ignore unexpected errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('UnexpectedError'));

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('UnexpectedError');

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failedRequests).toBe(1);
      // Failure count should not increase for unexpected errors
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should trip circuit breaker after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      // Execute enough failures to trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch {}
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(logger.error).toHaveBeenCalledWith(
        'Circuit breaker test-service TRIPPED - entering OPEN state',
        expect.objectContaining({
          failureCount: 3,
        })
      );
    });
  });

  describe('open circuit behavior', () => {
    beforeEach(async () => {
      // Trip the circuit breaker
      const failingOperation = jest.fn().mockRejectedValue(new Error('NetworkError'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {}
      }
    });

    it('should reject requests when circuit is open', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        'Circuit breaker test-service is OPEN - service unavailable'
      );
      expect(operation).not.toHaveBeenCalled();
    });

    it('should use fallback function when provided', async () => {
      const configWithFallback: CircuitBreakerConfig = {
        ...mockConfig,
        fallbackFunction: () => 'fallback-result',
      };
      const cbWithFallback = new CircuitBreaker(configWithFallback);

      // Trip the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('NetworkError'));
      for (let i = 0; i < 3; i++) {
        try {
          await cbWithFallback.execute(failingOperation);
        } catch {}
      }

      const operation = jest.fn().mockResolvedValue('success');
      const result = await cbWithFallback.execute(operation);

      expect(result).toBe('fallback-result');
      expect(operation).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Circuit breaker test-service using fallback function'
      );
    });

    it('should transition to half-open after recovery timeout', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // Advance time past recovery timeout
      jest.advanceTimersByTime(5000);

      await circuitBreaker.execute(operation);

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(operation).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Circuit breaker test-service entering HALF_OPEN state'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Circuit breaker test-service recovered - returning to CLOSED state'
      );
    });
  });

  describe('half-open state behavior', () => {
    beforeEach(async () => {
      // Trip the circuit breaker
      const failingOperation = jest.fn().mockRejectedValue(new Error('NetworkError'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {}
      }
      // Advance time to trigger half-open state on next call
      jest.advanceTimersByTime(5000);
    });

    it('should close circuit on successful operation in half-open state', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should remain open on failed operation in half-open state', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('NetworkError'));

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('NetworkError');

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('error handling', () => {
    it('should handle empty expected errors list', () => {
      const config: CircuitBreakerConfig = {
        ...mockConfig,
        expectedErrors: [],
      };
      const cb = new CircuitBreaker(config);

      const operation = jest.fn().mockRejectedValue(new Error('AnyError'));

      expect(async () => {
        await cb.execute(operation);
      }).rejects.toThrow('AnyError');
    });

    it('should match errors by name', async () => {
      const error = new Error('Test message');
      error.name = 'NetworkError';
      const operation = jest.fn().mockRejectedValue(error);

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Test message');

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should match errors by message content', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('This is a TimeoutError message'));

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('This is a TimeoutError message');

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('metrics and health', () => {
    it('should return deep copy of metrics', () => {
      const metrics1 = circuitBreaker.getMetrics();
      const metrics2 = circuitBreaker.getMetrics();

      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2); // Different objects
    });

    it('should report healthy state correctly', () => {
      expect(circuitBreaker.isHealthy()).toBe(true);

      // Add some successful requests
      const operation = jest.fn().mockResolvedValue('success');
      circuitBreaker.execute(operation);

      expect(circuitBreaker.isHealthy()).toBe(true);
    });

    it('should report unhealthy state when failure rate is high', async () => {
      // Create many failed requests
      const failingOperation = jest.fn().mockRejectedValue(new Error('UnexpectedError'));
      for (let i = 0; i < 10; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {}
      }

      expect(circuitBreaker.isHealthy()).toBe(false);
    });

    it('should report unhealthy when circuit is open', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('NetworkError'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {}
      }

      expect(circuitBreaker.isHealthy()).toBe(false);
    });
  });

  describe('manual operations', () => {
    it('should allow manual reset', async () => {
      // Trip the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('NetworkError'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {}
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      circuitBreaker.manualReset();

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(logger.info).toHaveBeenCalledWith('Circuit breaker test-service manually reset');
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CircuitBreakerManager();
  });

  describe('circuit breaker management', () => {
    it('should create and store circuit breakers', () => {
      const config: CircuitBreakerConfig = {
        name: 'test-service',
        failureThreshold: 5,
        recoveryTimeout: 10000,
        monitoringWindow: 60000,
        expectedErrors: [],
      };

      const cb = manager.create(config);
      const retrieved = manager.get('test-service');

      expect(cb).toBeDefined();
      expect(retrieved).toBe(cb);
      expect(retrieved?.getState()).toBe(CircuitState.CLOSED);
    });

    it('should return undefined for non-existent circuit breaker', () => {
      const result = manager.get('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('execute operations', () => {
    beforeEach(() => {
      const config: CircuitBreakerConfig = {
        name: 'test-service',
        failureThreshold: 3,
        recoveryTimeout: 5000,
        monitoringWindow: 10000,
        expectedErrors: ['NetworkError'],
      };
      manager.create(config);
    });

    it('should execute operation with named circuit breaker', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await manager.execute('test-service', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should throw error for non-existent service', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(manager.execute('non-existent', operation)).rejects.toThrow(
        'Circuit breaker not found for service: non-existent'
      );
    });
  });

  describe('metrics and health status', () => {
    beforeEach(() => {
      const config1: CircuitBreakerConfig = {
        name: 'service-1',
        failureThreshold: 3,
        recoveryTimeout: 5000,
        monitoringWindow: 10000,
        expectedErrors: [],
      };
      const config2: CircuitBreakerConfig = {
        name: 'service-2',
        failureThreshold: 5,
        recoveryTimeout: 8000,
        monitoringWindow: 15000,
        expectedErrors: [],
      };
      manager.create(config1);
      manager.create(config2);
    });

    it('should return all metrics', () => {
      const metrics = manager.getAllMetrics();

      expect(Object.keys(metrics)).toEqual(['service-1', 'service-2']);
      expect(metrics['service-1']).toBeDefined();
      expect(metrics['service-2']).toBeDefined();
      expect(metrics['service-1'].currentState).toBe(CircuitState.CLOSED);
    });

    it('should return health status for all services', () => {
      const healthStatus = manager.getHealthStatus();

      expect(Object.keys(healthStatus)).toEqual(['service-1', 'service-2']);
      expect(healthStatus['service-1']).toEqual({
        healthy: true,
        state: CircuitState.CLOSED,
      });
      expect(healthStatus['service-2']).toEqual({
        healthy: true,
        state: CircuitState.CLOSED,
      });
    });

    it('should reset all circuit breakers', () => {
      manager.resetAll();

      expect(logger.info).toHaveBeenCalledWith('All circuit breakers reset');
    });
  });
});

describe('singleton and initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide singleton circuit breaker manager', () => {
    expect(circuitBreakerManager).toBeDefined();
    expect(circuitBreakerManager).toBeInstanceOf(CircuitBreakerManager);
  });

  it('should have default configurations', () => {
    expect(DEFAULT_CONFIGS.SUPABASE).toBeDefined();
    expect(DEFAULT_CONFIGS.STRIPE).toBeDefined();
    expect(DEFAULT_CONFIGS.ML_SERVICE).toBeDefined();
    expect(DEFAULT_CONFIGS.GEOCODING).toBeDefined();
    expect(DEFAULT_CONFIGS.NOTIFICATION).toBeDefined();

    expect(DEFAULT_CONFIGS.ML_SERVICE.fallbackFunction).toBeDefined();
    expect(DEFAULT_CONFIGS.ML_SERVICE.fallbackFunction()).toEqual({
      confidence: 0.5,
      fallback: true,
    });
  });

  it('should initialize all default circuit breakers', () => {
    initializeCircuitBreakers();

    expect(circuitBreakerManager.get('supabase')).toBeDefined();
    expect(circuitBreakerManager.get('stripe')).toBeDefined();
    expect(circuitBreakerManager.get('ml_service')).toBeDefined();
    expect(circuitBreakerManager.get('geocoding')).toBeDefined();
    expect(circuitBreakerManager.get('notification')).toBeDefined();

    expect(logger.info).toHaveBeenCalledWith('All circuit breakers initialized successfully');
  });

  it('should validate default config values', () => {
    const configs = Object.values(DEFAULT_CONFIGS);

    configs.forEach(config => {
      expect(config.name).toBeTruthy();
      expect(config.failureThreshold).toBeGreaterThan(0);
      expect(config.recoveryTimeout).toBeGreaterThan(0);
      expect(config.monitoringWindow).toBeGreaterThan(0);
      expect(Array.isArray(config.expectedErrors)).toBe(true);
    });
  });
});