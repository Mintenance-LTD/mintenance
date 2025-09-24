import {
  ServiceHealthMonitor,
  serviceHealthMonitor,
  initializeCoreServiceHealthChecks
} from '../../utils/serviceHealthMonitor';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      }))
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } })
    }
  }
}));

// Mock fetch for URL health checks
global.fetch = jest.fn();

describe('ServiceHealthMonitor', () => {
  let monitor: ServiceHealthMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Create a fresh instance for each test
    monitor = ServiceHealthMonitor.getInstance();
    monitor.stopMonitoring(); // Ensure clean state

    // Clear all registered services to ensure test isolation
    const allStatuses = monitor.getAllServiceStatuses();
    allStatuses.forEach(status => {
      monitor.unregisterService(status.serviceName);
    });
  });

  afterEach(() => {
    monitor.stopMonitoring();

    // Clean up all registered services after each test
    const allStatuses = monitor.getAllServiceStatuses();
    allStatuses.forEach(status => {
      monitor.unregisterService(status.serviceName);
    });

    jest.useRealTimers();
  });

  describe('service registration', () => {
    it('should register a service successfully', () => {
      const serviceCheck = {
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      };

      monitor.registerService(serviceCheck);

      const status = monitor.getServiceStatus('TestService');
      expect(status).toBeDefined();
      expect(status?.serviceName).toBe('TestService');
      expect(status?.status).toBe('unknown');
      expect(status?.uptime).toBe(100);
    });

    it('should unregister a service', () => {
      const serviceCheck = {
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      };

      monitor.registerService(serviceCheck);
      expect(monitor.getServiceStatus('TestService')).toBeDefined();

      monitor.unregisterService('TestService');
      expect(monitor.getServiceStatus('TestService')).toBeNull();
    });
  });

  describe('health checking', () => {
    it('should check service health with function', async () => {
      const healthCheckFn = jest.fn().mockResolvedValue(true);
      const serviceCheck = {
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: healthCheckFn
      };

      monitor.registerService(serviceCheck);

      // Mock Date.now to simulate time passage for response time measurement
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1100); // End time (100ms later)

      const status = await monitor.checkServiceHealth('TestService');

      expect(healthCheckFn).toHaveBeenCalled();
      expect(status.status).toBe('healthy');
      expect(status.responseTime).toBe(100);
      expect(status.errorRate).toBe(0);
    });

    it('should check service health with URL', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true
      } as Response);

      const serviceCheck = {
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckUrl: 'https://api.test.com/health'
      };

      monitor.registerService(serviceCheck);

      const status = await monitor.checkServiceHealth('TestService');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/health',
        expect.objectContaining({
          method: 'HEAD',
          signal: expect.any(AbortSignal)
        })
      );
      expect(status.status).toBe('healthy');
    });

    it('should handle health check failures', async () => {
      const healthCheckFn = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const serviceCheck = {
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: healthCheckFn
      };

      monitor.registerService(serviceCheck);

      const status = await monitor.checkServiceHealth('TestService');

      expect(status.status).toBe('unhealthy');
      expect(status.errorRate).toBe(100);
    });

    it('should handle health check timeouts', async () => {
      // Use real timers for this test to handle timeout properly
      jest.useRealTimers();

      const healthCheckFn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 200)) // 200ms delay
      );
      const serviceCheck = {
        serviceName: 'TestService',
        timeout: 100, // 100ms timeout - shorter than health check
        healthCheckFunction: healthCheckFn
      };

      monitor.registerService(serviceCheck);

      const status = await monitor.checkServiceHealth('TestService');

      expect(status.status).toBe('unhealthy');

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('should determine correct health status based on metrics', async () => {
      const serviceCheck = {
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      };

      monitor.registerService(serviceCheck);

      // Mock slow response time (over warning threshold)
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(1500); // 1.5 seconds

      const status = await monitor.checkServiceHealth('TestService');

      expect(status.status).toBe('degraded'); // Should be degraded due to slow response
    });

    it('should throw error for unregistered service', async () => {
      await expect(
        monitor.checkServiceHealth('UnregisteredService')
      ).rejects.toThrow('Service UnregisteredService not registered');
    });
  });

  describe('monitoring operations', () => {
    it('should start monitoring', () => {
      const healthCheckFn = jest.fn().mockResolvedValue(true);
      monitor.registerService({
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: healthCheckFn
      });

      monitor.startMonitoring(1000);

      jest.advanceTimersByTime(1000);

      expect(healthCheckFn).toHaveBeenCalled();
    });

    it('should stop monitoring', () => {
      const healthCheckFn = jest.fn().mockResolvedValue(true);
      monitor.registerService({
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: healthCheckFn
      });

      monitor.startMonitoring(1000);
      monitor.stopMonitoring();

      jest.advanceTimersByTime(2000);

      expect(healthCheckFn).toHaveBeenCalledTimes(0);
    });

    it('should not start monitoring if already running', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      monitor.startMonitoring(1000);
      monitor.startMonitoring(1000); // Second call should be ignored

      monitor.stopMonitoring();
      consoleSpy.mockRestore();
    });

    it('should check all services', async () => {
      const healthCheckFn1 = jest.fn().mockResolvedValue(true);
      const healthCheckFn2 = jest.fn().mockResolvedValue(false);

      monitor.registerService({
        serviceName: 'Service1',
        timeout: 5000,
        healthCheckFunction: healthCheckFn1
      });

      monitor.registerService({
        serviceName: 'Service2',
        timeout: 5000,
        healthCheckFunction: healthCheckFn2
      });

      // Mock Date.now for consistent response time measurement
      jest.spyOn(Date, 'now')
        .mockReturnValue(1000)
        .mockReturnValueOnce(1100) // Service1 response time
        .mockReturnValueOnce(1200); // Service2 response time

      const results = await monitor.checkAllServices();

      expect(results).toHaveLength(2);
      expect(results.find(r => r.serviceName === 'Service1')?.status).toBe('healthy');
      expect(results.find(r => r.serviceName === 'Service2')?.status).toBe('unhealthy');
    });

    it('should handle service check failures in checkAllServices', async () => {
      const healthCheckFn = jest.fn().mockRejectedValue(new Error('Service error'));

      monitor.registerService({
        serviceName: 'FailingService',
        timeout: 5000,
        healthCheckFunction: healthCheckFn
      });

      const results = await monitor.checkAllServices();

      expect(results).toHaveLength(1);
      expect(results[0].serviceName).toBe('FailingService');
      expect(results[0].status).toBe('unhealthy');
    });
  });

  describe('health reports', () => {
    it('should generate system health report', async () => {
      // Register test services for this specific test
      monitor.registerService({
        serviceName: 'HealthyService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      });

      monitor.registerService({
        serviceName: 'DegradedService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      });

      monitor.registerService({
        serviceName: 'UnhealthyService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(false)
      });

      // Mock Date.now for response time measurements
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // HealthyService start
        .mockReturnValueOnce(1100) // HealthyService end (100ms)
        .mockReturnValueOnce(1200) // DegradedService start
        .mockReturnValueOnce(2700) // DegradedService end (1500ms - degraded)
        .mockReturnValueOnce(2800) // UnhealthyService start
        .mockReturnValueOnce(2900); // UnhealthyService end

      // Check services to populate statuses
      await monitor.checkServiceHealth('HealthyService');
      await monitor.checkServiceHealth('DegradedService');
      await monitor.checkServiceHealth('UnhealthyService');

      const report = monitor.getSystemHealthReport();

      expect(report.overall).toBe('unhealthy'); // Due to unhealthy service
      expect(report.summary.totalServices).toBe(3);
      expect(report.summary.healthyServices).toBe(1);
      expect(report.summary.degradedServices).toBe(1);
      expect(report.summary.unhealthyServices).toBe(1);
      expect(report.services).toHaveLength(3);
    });

    it('should return degraded overall status when only degraded services exist', async () => {
      // Register only degraded service for this test
      monitor.registerService({
        serviceName: 'DegradedService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      });

      // Mock slow response time for degraded status
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(2500); // End time (1500ms - degraded)

      await monitor.checkServiceHealth('DegradedService');

      const report = monitor.getSystemHealthReport();

      expect(report.overall).toBe('degraded');
    });

    it('should get all service statuses', () => {
      // Register test services for this specific test
      monitor.registerService({
        serviceName: 'HealthyService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      });

      monitor.registerService({
        serviceName: 'DegradedService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      });

      monitor.registerService({
        serviceName: 'UnhealthyService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(false)
      });

      const statuses = monitor.getAllServiceStatuses();

      expect(statuses).toHaveLength(3);
      expect(statuses.map(s => s.serviceName)).toContain('HealthyService');
      expect(statuses.map(s => s.serviceName)).toContain('DegradedService');
      expect(statuses.map(s => s.serviceName)).toContain('UnhealthyService');
    });
  });

  describe('metrics tracking', () => {
    it('should record service operation metrics', () => {
      monitor.registerService({
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      });

      monitor.recordServiceOperation('TestService', 'testMethod', 500, true);

      const status = monitor.getServiceStatus('TestService');

      expect(status?.responseTime).toBe(500);
      expect(status?.errorRate).toBe(0);
      expect(status?.uptime).toBe(100);
      expect(status?.metadata?.requestCount).toBe(1);
      expect(status?.metadata?.errorCount).toBe(0);
    });

    it('should update error rate on failed operations', () => {
      monitor.registerService({
        serviceName: 'TestService',
        timeout: 5000,
        healthCheckFunction: jest.fn().mockResolvedValue(true)
      });

      // Record successful operation
      monitor.recordServiceOperation('TestService', 'testMethod', 100, true);
      // Record failed operation
      monitor.recordServiceOperation('TestService', 'testMethod', 200, false);

      const status = monitor.getServiceStatus('TestService');

      expect(status?.errorRate).toBe(50); // 1 error out of 2 requests = 50%
      expect(status?.uptime).toBe(50);
      expect(status?.metadata?.requestCount).toBe(2);
      expect(status?.metadata?.errorCount).toBe(1);
    });

    it('should ignore metrics for unregistered services', () => {
      monitor.recordServiceOperation('UnregisteredService', 'testMethod', 100, true);

      const status = monitor.getServiceStatus('UnregisteredService');
      expect(status).toBeNull();
    });
  });

  describe('URL health checks', () => {
    it('should check URL health successfully', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true
      } as Response);

      monitor.registerService({
        serviceName: 'URLService',
        timeout: 5000,
        healthCheckUrl: 'https://api.test.com/health'
      });

      const status = await monitor.checkServiceHealth('URLService');

      expect(status.status).toBe('healthy');
    });

    it('should handle URL health check failures', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      } as Response);

      monitor.registerService({
        serviceName: 'URLService',
        timeout: 5000,
        healthCheckUrl: 'https://api.test.com/health'
      });

      const status = await monitor.checkServiceHealth('URLService');

      expect(status.status).toBe('unhealthy');
    });

    it('should handle URL fetch errors', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network error'));

      monitor.registerService({
        serviceName: 'URLService',
        timeout: 5000,
        healthCheckUrl: 'https://api.test.com/health'
      });

      const status = await monitor.checkServiceHealth('URLService');

      expect(status.status).toBe('unhealthy');
    });
  });
});

describe('initializeCoreServiceHealthChecks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize core service health checks', () => {
    const registerSpy = jest.spyOn(serviceHealthMonitor, 'registerService');
    const startMonitoringSpy = jest.spyOn(serviceHealthMonitor, 'startMonitoring');

    initializeCoreServiceHealthChecks();

    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'Database',
        timeout: 5000
      })
    );

    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'AuthService',
        timeout: 3000
      })
    );

    expect(startMonitoringSpy).toHaveBeenCalledWith(30000);

    registerSpy.mockRestore();
    startMonitoringSpy.mockRestore();
  });
});