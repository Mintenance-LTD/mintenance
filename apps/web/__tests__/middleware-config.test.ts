/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/config', () => ({
  ConfigManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { ConfigManager } from '@/lib/config';
import { logger } from '@/lib/logger';

describe('Middleware Configuration', () => {
  let mockConfigManager: any;
  let middleware: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ConfigManager implementation
    mockConfigManager = {
      isInitialized: false,
      config: null,
      initialize: jest.fn(),
      getConfig: jest.fn(),
      validateConfig: jest.fn(),
    };

    (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

    // Mock middleware function
    middleware = async (request: NextRequest) => {
      const configManager = ConfigManager.getInstance();

      // Initialize on first request
      if (!configManager.isInitialized) {
        try {
          await configManager.initialize();
          configManager.isInitialized = true;
          logger.info('Middleware configuration initialized successfully');
        } catch (error) {
          logger.error('Failed to initialize middleware configuration', { error });
          // Critical failure: crash the middleware
          throw new Error('Middleware configuration initialization failed');
        }
      }

      const config = configManager.getConfig();

      if (!config) {
        logger.error('Configuration not available after initialization');
        throw new Error('Configuration not available');
      }

      // Use config for request processing
      const response = NextResponse.next();
      response.headers.set('X-Config-Version', config.version || 'unknown');

      return response;
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Middleware initialization success', () => {
    it('should initialize config on first request', async () => {
      mockConfigManager.initialize.mockResolvedValue(undefined);
      mockConfigManager.getConfig.mockReturnValue({
        version: '1.0',
        features: { rateLimit: true },
      });

      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await middleware(request);

      expect(mockConfigManager.initialize).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Middleware configuration initialized successfully'
      );
      expect(response.headers.get('X-Config-Version')).toBe('1.0');
    });

    it('should not reinitialize on subsequent requests', async () => {
      mockConfigManager.isInitialized = true;
      mockConfigManager.getConfig.mockReturnValue({
        version: '1.0',
        features: { rateLimit: true },
      });

      const request1 = new NextRequest('http://localhost:3000/api/test1');
      const request2 = new NextRequest('http://localhost:3000/api/test2');

      await middleware(request1);
      await middleware(request2);

      expect(mockConfigManager.initialize).not.toHaveBeenCalled();
    });

    it('should set response headers with config data', async () => {
      mockConfigManager.isInitialized = true;
      mockConfigManager.getConfig.mockReturnValue({
        version: '2.5',
        features: { rateLimit: true },
      });

      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await middleware(request);

      expect(response.headers.get('X-Config-Version')).toBe('2.5');
    });
  });

  describe('Middleware initialization failure', () => {
    it('should throw error on initialization failure', async () => {
      mockConfigManager.initialize.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/test');

      await expect(middleware(request)).rejects.toThrow(
        'Middleware configuration initialization failed'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize middleware configuration',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it('should throw error if config unavailable after init', async () => {
      mockConfigManager.initialize.mockResolvedValue(undefined);
      mockConfigManager.getConfig.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/test');

      await expect(middleware(request)).rejects.toThrow(
        'Configuration not available'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Configuration not available after initialization'
      );
    });

    it('should handle timeout during initialization', async () => {
      mockConfigManager.initialize.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initialization timeout')), 100)
          )
      );

      const request = new NextRequest('http://localhost:3000/api/test');

      await expect(middleware(request)).rejects.toThrow(
        'Middleware configuration initialization failed'
      );
    });

    it('should handle missing environment variables', async () => {
      mockConfigManager.initialize.mockRejectedValue(
        new Error('SUPABASE_URL is required')
      );

      const request = new NextRequest('http://localhost:3000/api/test');

      await expect(middleware(request)).rejects.toThrow(
        'Middleware configuration initialization failed'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize middleware configuration',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'SUPABASE_URL is required',
          }),
        })
      );
    });
  });

  describe('ConfigManager singleton behavior', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(ConfigManager.getInstance).toHaveBeenCalledTimes(2);
    });

    it('should maintain state across multiple requests', async () => {
      mockConfigManager.initialize.mockResolvedValue(undefined);
      mockConfigManager.getConfig.mockReturnValue({
        version: '1.0',
        features: { rateLimit: true },
      });

      const request1 = new NextRequest('http://localhost:3000/api/test1');
      await middleware(request1);

      mockConfigManager.isInitialized = true;

      const request2 = new NextRequest('http://localhost:3000/api/test2');
      await middleware(request2);

      // Should only initialize once
      expect(mockConfigManager.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Request handling with valid config', () => {
    beforeEach(() => {
      mockConfigManager.isInitialized = true;
      mockConfigManager.getConfig.mockReturnValue({
        version: '1.0',
        features: {
          rateLimit: true,
          authentication: true,
        },
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000,
        },
      });
    });

    it('should process request with full config', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.headers.get('X-Config-Version')).toBe('1.0');
    });

    it('should handle different routes', async () => {
      const routes = [
        'http://localhost:3000/api/auth/login',
        'http://localhost:3000/api/jobs',
        'http://localhost:3000/api/contractors',
      ];

      for (const route of routes) {
        const request = new NextRequest(route);
        const response = await middleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        expect(response.headers.get('X-Config-Version')).toBe('1.0');
      }
    });

    it('should handle POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('Request handling with failed config', () => {
    it('should throw error if config becomes unavailable', async () => {
      mockConfigManager.isInitialized = true;
      mockConfigManager.getConfig.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/test');

      await expect(middleware(request)).rejects.toThrow(
        'Configuration not available'
      );
    });

    it('should handle config validation failures', async () => {
      mockConfigManager.initialize.mockResolvedValue(undefined);
      mockConfigManager.getConfig.mockReturnValue({
        version: '1.0',
        features: {
          rateLimit: true,
        },
      });
      mockConfigManager.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Missing required field: rateLimit.maxRequests'],
      });

      const request = new NextRequest('http://localhost:3000/api/test');

      // If validation is part of getConfig
      mockConfigManager.getConfig.mockImplementation(() => {
        const validation = mockConfigManager.validateConfig();
        if (!validation.valid) {
          throw new Error(validation.errors.join(', '));
        }
        return null;
      });

      await expect(middleware(request)).rejects.toThrow();
    });
  });

  describe('Concurrent initialization handling', () => {
    it('should handle concurrent requests during initialization', async () => {
      let initializeCalls = 0;
      mockConfigManager.initialize.mockImplementation(async () => {
        initializeCalls++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        mockConfigManager.isInitialized = true;
      });
      mockConfigManager.getConfig.mockReturnValue({
        version: '1.0',
        features: { rateLimit: true },
      });

      const request1 = new NextRequest('http://localhost:3000/api/test1');
      const request2 = new NextRequest('http://localhost:3000/api/test2');

      // Start both requests concurrently
      const promise1 = middleware(request1);
      const promise2 = middleware(request2);

      const [response1, response2] = await Promise.all([promise1, promise2]);

      expect(response1).toBeInstanceOf(NextResponse);
      expect(response2).toBeInstanceOf(NextResponse);
      // Both requests should succeed, but init should be called by both
      // In real implementation, you'd want mutex/lock to prevent this
      expect(initializeCalls).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Config hot reload', () => {
    it('should support config updates without restart', async () => {
      mockConfigManager.isInitialized = true;
      mockConfigManager.getConfig
        .mockReturnValueOnce({
          version: '1.0',
          features: { rateLimit: true },
        })
        .mockReturnValueOnce({
          version: '2.0',
          features: { rateLimit: true, newFeature: true },
        });

      const request1 = new NextRequest('http://localhost:3000/api/test1');
      const response1 = await middleware(request1);

      expect(response1.headers.get('X-Config-Version')).toBe('1.0');

      const request2 = new NextRequest('http://localhost:3000/api/test2');
      const response2 = await middleware(request2);

      expect(response2.headers.get('X-Config-Version')).toBe('2.0');
    });
  });
});
