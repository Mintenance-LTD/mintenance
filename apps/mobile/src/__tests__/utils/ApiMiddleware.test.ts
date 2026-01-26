import {
  ApiMiddleware,
  ApiProtectionError,
  ProtectedSupabaseClient,
  apiMiddleware,
} from '../../utils/ApiMiddleware';
import { apiProtectionService } from '../../utils/ApiProtection';
import { logger } from '../../utils/logger';
import { config } from '../../config/environment';

// Mock dependencies
jest.mock('../../utils/ApiProtection', () => ({
  apiProtectionService: {
    checkRequest: jest.fn(),
    getSecurityStats: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/environment', () => ({
  config: {
    environment: 'test',
    enablePerformanceMonitoring: false,
  },
}));

describe('ApiMiddleware', () => {
  let middleware: ApiMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new ApiMiddleware();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const middleware = new ApiMiddleware();
      expect(middleware).toBeDefined();
      expect(middleware.getActiveRequestCount()).toBe(0);
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        enableProtection: true,
        maxRetries: 5,
        retryDelayMs: 2000,
        timeoutMs: 60000,
        bypassEndpoints: ['/custom'],
      };
      const middleware = new ApiMiddleware(customConfig);
      expect(middleware).toBeDefined();
    });

    it('should enable protection in production', () => {
      (config as any).environment = 'production';
      const middleware = new ApiMiddleware();
      expect(middleware).toBeDefined();
      (config as any).environment = 'test';
    });
  });

  describe('requestMiddleware', () => {
    const mockRequestFn = jest.fn();
    const context = {
      endpoint: '/api/test',
      method: 'GET',
      userId: 'user123',
      userTier: 'premium',
    };

    beforeEach(() => {
      mockRequestFn.mockResolvedValue({ data: 'test' });
      (apiProtectionService.checkRequest as jest.Mock).mockResolvedValue({
        allowed: true,
      });
    });

    it('should execute request successfully', async () => {
      const result = await middleware.requestMiddleware(mockRequestFn, context);

      expect(result).toEqual({ data: 'test' });
      expect(mockRequestFn).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Request completed',
        expect.objectContaining({
          endpoint: context.endpoint,
          method: context.method,
          success: true,
        })
      );
    });

    it('should track active requests', async () => {
      const promise = middleware.requestMiddleware(mockRequestFn, context);

      expect(middleware.getActiveRequestCount()).toBe(1);

      await promise;

      expect(middleware.getActiveRequestCount()).toBe(0);
    });

    it('should check protection when enabled', async () => {
      const protectedMiddleware = new ApiMiddleware({ enableProtection: true });

      await protectedMiddleware.requestMiddleware(mockRequestFn, context);

      expect(apiProtectionService.checkRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: context.endpoint,
          method: context.method,
          userId: context.userId,
          userTier: context.userTier,
        })
      );
    });

    it('should bypass protection for whitelisted endpoints', async () => {
      const protectedMiddleware = new ApiMiddleware({
        enableProtection: true,
        bypassEndpoints: ['/health'],
      });

      await protectedMiddleware.requestMiddleware(mockRequestFn, {
        ...context,
        endpoint: '/health/check',
      });

      expect(apiProtectionService.checkRequest).not.toHaveBeenCalled();
    });

    it('should throw ApiProtectionError when protection denies request', async () => {
      (apiProtectionService.checkRequest as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Rate limit exceeded',
        rateLimitInfo: { limit: 100, remaining: 0 },
      });

      const protectedMiddleware = new ApiMiddleware({ enableProtection: true });

      await expect(
        protectedMiddleware.requestMiddleware(mockRequestFn, context)
      ).rejects.toThrow(ApiProtectionError);
    });

    it('should handle request timeout', async () => {
      mockRequestFn.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      const middleware = new ApiMiddleware({ timeoutMs: 100 });

      await expect(
        middleware.requestMiddleware(mockRequestFn, context)
      ).rejects.toThrow(/Request timeout/);
    });

    it('should record metrics on success', async () => {
      await middleware.requestMiddleware(mockRequestFn, context);

      expect(logger.debug).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Request completed',
        expect.objectContaining({
          success: true,
          duration: expect.any(Number),
        })
      );
    });

    it('should record metrics on failure', async () => {
      const error = new Error('Request failed');
      mockRequestFn.mockRejectedValue(error);

      await expect(
        middleware.requestMiddleware(mockRequestFn, context)
      ).rejects.toThrow(error);

      expect(logger.debug).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Request completed',
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('Retry Logic', () => {
    const mockRequestFn = jest.fn();
    const context = {
      endpoint: '/api/test',
      method: 'POST',
    };

    beforeEach(() => {
      (apiProtectionService.checkRequest as jest.Mock).mockResolvedValue({
        allowed: true,
      });
    });

    it('should retry on network errors', async () => {
      mockRequestFn
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success' });

      const middleware = new ApiMiddleware({
        maxRetries: 2,
        retryDelayMs: 10,
      });

      const result = await middleware.requestMiddleware(mockRequestFn, context);

      expect(result).toEqual({ data: 'success' });
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Request succeeded after retry',
        expect.objectContaining({
          endpoint: context.endpoint,
          attempt: 1,
        })
      );
    });

    it('should retry on 500 errors', async () => {
      mockRequestFn
        .mockRejectedValueOnce(new Error('500 Internal Server Error'))
        .mockResolvedValueOnce({ data: 'success' });

      const middleware = new ApiMiddleware({
        maxRetries: 2,
        retryDelayMs: 10,
      });

      const result = await middleware.requestMiddleware(mockRequestFn, context);

      expect(result).toEqual({ data: 'success' });
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout errors', async () => {
      mockRequestFn
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce({ data: 'success' });

      const middleware = new ApiMiddleware({
        maxRetries: 2,
        retryDelayMs: 10,
      });

      const result = await middleware.requestMiddleware(mockRequestFn, context);

      expect(result).toEqual({ data: 'success' });
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 errors', async () => {
      mockRequestFn.mockRejectedValue(new Error('400 Bad Request'));

      const middleware = new ApiMiddleware({
        maxRetries: 2,
        retryDelayMs: 10,
      });

      await expect(
        middleware.requestMiddleware(mockRequestFn, context)
      ).rejects.toThrow('400 Bad Request');

      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 errors', async () => {
      mockRequestFn.mockRejectedValue(new Error('401 Unauthorized'));

      const middleware = new ApiMiddleware({
        maxRetries: 2,
        retryDelayMs: 10,
      });

      await expect(
        middleware.requestMiddleware(mockRequestFn, context)
      ).rejects.toThrow('401 Unauthorized');

      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on ApiProtectionError', async () => {
      const protectionError = new ApiProtectionError('Rate limited', {
        endpoint: '/api/test',
      });
      mockRequestFn.mockRejectedValue(protectionError);

      const middleware = new ApiMiddleware({
        maxRetries: 2,
        retryDelayMs: 10,
      });

      await expect(
        middleware.requestMiddleware(mockRequestFn, context)
      ).rejects.toThrow(protectionError);

      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff for retries', async () => {
      mockRequestFn
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success' });

      const middleware = new ApiMiddleware({
        maxRetries: 3,
        retryDelayMs: 10,
      });

      const startTime = Date.now();
      await middleware.requestMiddleware(mockRequestFn, context);
      const duration = Date.now() - startTime;

      // Expect at least 10ms + 20ms = 30ms for two retries with exponential backoff
      expect(duration).toBeGreaterThanOrEqual(30);
      expect(mockRequestFn).toHaveBeenCalledTimes(3);
    });

    it('should log retry attempts', async () => {
      mockRequestFn
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success' });

      const middleware = new ApiMiddleware({
        maxRetries: 2,
        retryDelayMs: 10,
      });

      await middleware.requestMiddleware(mockRequestFn, context);

      expect(logger.warn).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Request failed, retrying',
        expect.objectContaining({
          endpoint: context.endpoint,
          attempt: 1,
          delay: 10,
        })
      );
    });

    it('should fail after max retries', async () => {
      mockRequestFn.mockRejectedValue(new Error('Network error'));

      const middleware = new ApiMiddleware({
        maxRetries: 2,
        retryDelayMs: 10,
      });

      await expect(
        middleware.requestMiddleware(mockRequestFn, context)
      ).rejects.toThrow('Network error');

      expect(mockRequestFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(logger.error).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Request failed after all retries',
        expect.objectContaining({
          endpoint: context.endpoint,
          retries: 2,
        })
      );
    });
  });

  describe('Active Request Management', () => {
    const mockRequestFn = jest.fn();

    it('should track multiple active requests', async () => {
      mockRequestFn.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 50))
      );

      const promise1 = middleware.requestMiddleware(mockRequestFn, {
        endpoint: '/api/test1',
        method: 'GET',
      });

      const promise2 = middleware.requestMiddleware(mockRequestFn, {
        endpoint: '/api/test2',
        method: 'POST',
      });

      expect(middleware.getActiveRequestCount()).toBe(2);

      const activeRequests = middleware.getActiveRequests();
      expect(activeRequests).toHaveLength(2);
      expect(activeRequests[0].context.endpoint).toBe('/api/test1');
      expect(activeRequests[1].context.endpoint).toBe('/api/test2');

      await Promise.all([promise1, promise2]);

      expect(middleware.getActiveRequestCount()).toBe(0);
    });

    it('should calculate request duration', async () => {
      mockRequestFn.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 50))
      );

      const promise = middleware.requestMiddleware(mockRequestFn, {
        endpoint: '/api/test',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      const activeRequests = middleware.getActiveRequests();
      expect(activeRequests[0].duration).toBeGreaterThanOrEqual(20);

      await promise;
    });

    it('should clear active requests on cancel', () => {
      mockRequestFn.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 1000))
      );

      middleware.requestMiddleware(mockRequestFn, {
        endpoint: '/api/test',
        method: 'GET',
      });

      expect(middleware.getActiveRequestCount()).toBe(1);

      middleware.cancelAllRequests();

      expect(middleware.getActiveRequestCount()).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    const mockRequestFn = jest.fn();

    it('should send metrics when monitoring is enabled', async () => {
      (config as any).enablePerformanceMonitoring = true;
      mockRequestFn.mockResolvedValue({ data: 'test' });

      await middleware.requestMiddleware(mockRequestFn, {
        endpoint: '/api/test',
        method: 'GET',
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Performance metrics recorded',
        expect.objectContaining({
          endpoint: '/api/test',
          method: 'GET',
          success: true,
          duration: expect.any(Number),
        })
      );

      (config as any).enablePerformanceMonitoring = false;
    });
  });
});

describe('ApiProtectionError', () => {
  it('should create error with correct properties', () => {
    const error = new ApiProtectionError('Rate limit exceeded', {
      endpoint: '/api/test',
      reason: 'Too many requests',
      rateLimitInfo: { limit: 100, remaining: 0 },
    });

    expect(error.message).toBe('Rate limit exceeded');
    expect(error.name).toBe('ApiProtectionError');
    expect(error.code).toBe('API_PROTECTION_ERROR');
    expect(error.statusCode).toBe(429);
    expect(error.details).toEqual({
      endpoint: '/api/test',
      reason: 'Too many requests',
      rateLimitInfo: { limit: 100, remaining: 0 },
    });
  });

  it('should be instanceof Error', () => {
    const error = new ApiProtectionError('Test error', {
      endpoint: '/api/test',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiProtectionError);
  });
});

describe('ProtectedSupabaseClient', () => {
  let mockSupabaseClient: any;
  let protectedClient: ProtectedSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = {
      functions: {
        invoke: jest.fn(),
      },
    };
    protectedClient = new ProtectedSupabaseClient(mockSupabaseClient);
    (apiProtectionService.checkRequest as jest.Mock).mockResolvedValue({
      allowed: true,
    });
  });

  describe('invokeFunction', () => {
    it('should invoke function with protection', async () => {
      const mockResponse = { data: 'function result' };
      mockSupabaseClient.functions.invoke.mockResolvedValue(mockResponse);

      const result = await protectedClient.invokeFunction(
        'test-function',
        { param1: 'value1' },
        { userId: 'user123', userTier: 'premium' }
      );

      expect(result).toEqual(mockResponse);
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'test-function',
        { param1: 'value1' }
      );
    });

    it('should use correct endpoint format', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({ data: 'test' });

      await protectedClient.invokeFunction('my-function');

      // The middleware should be called with the correct endpoint
      expect(logger.debug).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Request completed',
        expect.objectContaining({
          endpoint: '/functions/my-function',
          method: 'POST',
        })
      );
    });

    it('should handle function invocation errors', async () => {
      const error = new Error('Function error');
      mockSupabaseClient.functions.invoke.mockRejectedValue(error);

      await expect(
        protectedClient.invokeFunction('test-function')
      ).rejects.toThrow(error);
    });
  });

  describe('query', () => {
    it('should execute protected database query', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue({ data: 'query result' });

      const result = await protectedClient.query(mockQueryFn, {
        table: 'users',
        operation: 'select',
        userId: 'user123',
        userTier: 'free',
      });

      expect(result).toEqual({ data: 'query result' });
      expect(mockQueryFn).toHaveBeenCalled();
    });

    it('should use correct endpoint format for queries', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue({ data: 'test' });

      await protectedClient.query(mockQueryFn, {
        table: 'posts',
        operation: 'insert',
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'ApiMiddleware',
        'Request completed',
        expect.objectContaining({
          endpoint: '/database/posts',
          method: 'INSERT',
        })
      );
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      const mockQueryFn = jest.fn().mockRejectedValue(error);

      await expect(
        protectedClient.query(mockQueryFn, {
          table: 'users',
          operation: 'select',
        })
      ).rejects.toThrow(error);
    });
  });

  describe('getStats', () => {
    it('should return middleware and protection stats', () => {
      const mockSecurityStats = {
        totalRequests: 1000,
        blockedRequests: 50,
      };
      (apiProtectionService.getSecurityStats as jest.Mock).mockReturnValue(
        mockSecurityStats
      );

      const stats = protectedClient.getStats();

      expect(stats).toEqual({
        activeRequests: 0,
        protection: mockSecurityStats,
      });
      expect(apiProtectionService.getSecurityStats).toHaveBeenCalled();
    });
  });
});

describe('Singleton Export', () => {
  it('should export singleton middleware instance', () => {
    expect(apiMiddleware).toBeDefined();
    expect(apiMiddleware).toBeInstanceOf(ApiMiddleware);
  });

  it('should be the default export', () => {
    const defaultExport = require('../../utils/ApiMiddleware').default;
    expect(defaultExport).toBe(apiMiddleware);
  });
});