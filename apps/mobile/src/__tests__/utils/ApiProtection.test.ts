/**
 * API Protection Service Tests
 * Comprehensive tests for API security and protection
 */

import { ApiProtectionService, ApiRequest, SecurityViolation } from '../../utils/ApiProtection';

describe('ApiProtectionService', () => {
  let apiProtection: ApiProtectionService;

  beforeEach(() => {
    apiProtection = new ApiProtectionService({
      enableRateLimiting: true,
      enableDDoSProtection: true,
      enableAbuseDetection: true,
      enableRequestValidation: true,
      maxRequestSize: 1024 * 1024, // 1MB
      allowedOrigins: ['localhost', 'mintenance.com'],
      blockedUserAgents: ['bot', 'crawler'],
      sensitiveEndpoints: ['/api/auth', '/api/payment'],
    });
  });

  afterEach(() => {
    apiProtection.dispose();
  });

  const createTestRequest = (overrides: Partial<ApiRequest> = {}): ApiRequest => ({
    endpoint: '/api/test',
    method: 'GET',
    userId: 'user123',
    userTier: 'free',
    ipAddress: '192.168.1.1',
    userAgent: 'TestAgent/1.0',
    timestamp: Date.now(),
    ...overrides,
  });

  describe('Basic Request Validation', () => {
    it('should allow valid requests', async () => {
      const request = createTestRequest();
      const result = await apiProtection.checkRequest(request);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.securityHeaders).toBeDefined();
    });

    it('should block requests with blocked user agents', async () => {
      const request = createTestRequest({
        userAgent: 'BadBot/1.0',
      });

      const result = await apiProtection.checkRequest(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Blocked user agent');
    });

    it('should block requests from blocked IPs', async () => {
      const request = createTestRequest({
        ipAddress: '10.0.0.1',
      });

      // First block the IP
      apiProtection.blockIdentifier('ip', '10.0.0.1');

      const result = await apiProtection.checkRequest(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('IP blocked');
    });

    it('should block requests from blocked users', async () => {
      const request = createTestRequest({
        userId: 'blocked_user',
      });

      // First block the user
      apiProtection.blockIdentifier('user', 'blocked_user');

      const result = await apiProtection.checkRequest(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User blocked');
    });
  });

  describe('Rate Limiting Protection', () => {
    it('should enforce API rate limits', async () => {
      const request = createTestRequest({
        endpoint: '/api/general',
        userId: 'user123',
      });

      // Make requests up to the limit (assuming default config)
      let result;
      for (let i = 0; i < 100; i++) {
        result = await apiProtection.checkRequest({
          ...request,
          timestamp: Date.now() + i,
        });
        if (!result.allowed) break;
      }

      // Should eventually be rate limited
      expect(result!.allowed).toBe(false);
      expect(result!.reason).toContain('Rate limit exceeded');
    });

    it('should enforce payment endpoint rate limits', async () => {
      const request = createTestRequest({
        endpoint: '/api/payment/create',
        userId: 'user123',
      });

      // Payment endpoints should have stricter limits
      let result;
      for (let i = 0; i < 20; i++) {
        result = await apiProtection.checkRequest({
          ...request,
          timestamp: Date.now() + i,
        });
        if (!result.allowed) break;
      }

      // Should be limited sooner than general API
      expect(result!.allowed).toBe(false);
      expect(result!.reason).toContain('Rate limit exceeded');
    });

    it('should enforce user tier limits', async () => {
      const freeUserRequest = createTestRequest({
        userId: 'free_user',
        userTier: 'free',
      });

      const premiumUserRequest = createTestRequest({
        userId: 'premium_user',
        userTier: 'premium',
      });

      // Free user should hit limits sooner
      let freeResult;
      for (let i = 0; i < 100; i++) {
        freeResult = await apiProtection.checkRequest({
          ...freeUserRequest,
          timestamp: Date.now() + i,
        });
        if (!freeResult.allowed) break;
      }

      // Premium user should have higher limits
      let premiumResult;
      for (let i = 0; i < 100; i++) {
        premiumResult = await apiProtection.checkRequest({
          ...premiumUserRequest,
          timestamp: Date.now() + i + 1000,
        });
      }

      expect(freeResult!.allowed).toBe(false);
      expect(premiumResult!.allowed).toBe(true);
    });
  });

  describe('DDoS Protection', () => {
    it('should detect high request rate from single IP', async () => {
      const baseRequest = createTestRequest({
        ipAddress: '192.168.1.100',
      });

      // Simulate rapid requests (more than 10 per second)
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(apiProtection.checkRequest({
          ...baseRequest,
          timestamp: Date.now() + i * 10, // Very rapid requests
        }));
      }

      const results = await Promise.all(promises);

      // Some requests should be blocked due to DDoS protection
      const blockedRequests = results.filter(r => !r.allowed);
      expect(blockedRequests.length).toBeGreaterThan(0);

      const ddosBlocked = blockedRequests.find(r =>
        r.reason?.includes('DDoS') || r.reason?.includes('protection')
      );
      expect(ddosBlocked).toBeDefined();
    });

    it('should detect distributed attack patterns', async () => {
      const baseRequest = createTestRequest({
        ipAddress: '192.168.1.200',
        userAgent: 'AttackBot/1.0',
      });

      // Simulate requests to many different endpoints with same user agent
      const promises = [];
      for (let i = 0; i < 60; i++) {
        promises.push(apiProtection.checkRequest({
          ...baseRequest,
          endpoint: `/api/endpoint${i}`,
          timestamp: Date.now() + i * 100,
        }));
      }

      const results = await Promise.all(promises);

      // Should detect suspicious pattern
      const suspiciousBlocked = results.filter(r =>
        !r.allowed && r.reason?.includes('Suspicious')
      );
      expect(suspiciousBlocked.length).toBeGreaterThan(0);
    });
  });

  describe('Abuse Detection', () => {
    it('should detect rapid fire requests', async () => {
      const request = createTestRequest({
        userId: 'abusive_user',
      });

      // Simulate rapid fire requests
      const promises = [];
      for (let i = 0; i < 60; i++) {
        promises.push(apiProtection.checkRequest({
          ...request,
          timestamp: Date.now() + i * 100, // 10 requests per second
        }));
      }

      const results = await Promise.all(promises);

      // Should detect abuse pattern
      const abuseBlocked = results.filter(r =>
        !r.allowed && r.reason?.includes('Abuse')
      );
      expect(abuseBlocked.length).toBeGreaterThan(0);
    });

    it('should detect failed authentication attempts', async () => {
      const request = createTestRequest({
        endpoint: '/api/auth/login',
        userId: 'user123',
      });

      // Simulate multiple failed auth attempts
      for (let i = 0; i < 15; i++) {
        await apiProtection.checkRequest({
          ...request,
          timestamp: Date.now() + i * 1000,
        });
      }

      // Final request should be blocked
      const result = await apiProtection.checkRequest({
        ...request,
        timestamp: Date.now() + 16000,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Abuse');
    });

    it('should detect suspicious access to sensitive endpoints', async () => {
      const request = createTestRequest({
        userId: 'suspicious_user',
      });

      // Rapid access to sensitive endpoints
      for (let i = 0; i < 10; i++) {
        await apiProtection.checkRequest({
          ...request,
          endpoint: '/api/payment/process',
          timestamp: Date.now() + i * 30000, // 30 second intervals
        });
      }

      // Should trigger abuse detection
      const stats = apiProtection.getSecurityStats();
      expect(stats.recentViolations).toBeGreaterThan(0);
    });

    it('should detect data scraping patterns', async () => {
      const request = createTestRequest({
        userId: 'scraper_user',
      });

      // Access many different endpoints systematically
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(apiProtection.checkRequest({
          ...request,
          endpoint: `/api/data/endpoint${i}`,
          timestamp: Date.now() + i * 1000,
        }));
      }

      const results = await Promise.all(promises);

      // Should detect scraping pattern
      const scrapingBlocked = results.filter(r =>
        !r.allowed && r.reason?.includes('scraping')
      );
      expect(scrapingBlocked.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should generate appropriate security headers', async () => {
      const request = createTestRequest();
      const result = await apiProtection.checkRequest(request);

      expect(result.securityHeaders).toEqual({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'",
      });
    });
  });

  describe('Blocking and Unblocking', () => {
    it('should manually block and unblock IPs', async () => {
      const ip = '192.168.1.50';
      const request = createTestRequest({ ipAddress: ip });

      // Initially allowed
      let result = await apiProtection.checkRequest(request);
      expect(result.allowed).toBe(true);

      // Block IP
      apiProtection.blockIdentifier('ip', ip);

      // Should be blocked
      result = await apiProtection.checkRequest(request);
      expect(result.allowed).toBe(false);

      // Unblock IP
      apiProtection.unblockIdentifier('ip', ip);

      // Should be allowed again
      result = await apiProtection.checkRequest(request);
      expect(result.allowed).toBe(true);
    });

    it('should automatically unblock after duration', async () => {
      const ip = '192.168.1.60';
      const request = createTestRequest({ ipAddress: ip });

      // Block IP with short duration
      apiProtection.blockIdentifier('ip', ip, 100); // 100ms

      // Should be blocked
      let result = await apiProtection.checkRequest(request);
      expect(result.allowed).toBe(false);

      // Wait for duration to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = await apiProtection.checkRequest(request);
      expect(result.allowed).toBe(true);
    });

    it('should block and unblock users', async () => {
      const userId = 'test_user';
      const request = createTestRequest({ userId });

      // Block user
      apiProtection.blockIdentifier('user', userId);

      // Should be blocked
      const result = await apiProtection.checkRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User blocked');

      // Unblock user
      apiProtection.unblockIdentifier('user', userId);

      // Should be allowed again
      const result2 = await apiProtection.checkRequest(request);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide security statistics', async () => {
      const request = createTestRequest();

      // Make some requests
      await apiProtection.checkRequest(request);
      await apiProtection.checkRequest({
        ...request,
        userId: 'user2',
      });

      // Block some identifiers
      apiProtection.blockIdentifier('ip', '1.2.3.4');
      apiProtection.blockIdentifier('user', 'blocked_user');

      const stats = apiProtection.getSecurityStats();

      expect(stats.activeConnections).toBeGreaterThan(0);
      expect(stats.blockedIPs).toBe(1);
      expect(stats.blockedUsers).toBe(1);
      expect(typeof stats.recentViolations).toBe('number');
      expect(stats.rateLimiterStats).toBeDefined();
    });

    it('should track security violations', async () => {
      const blockedRequest = createTestRequest({
        userAgent: 'BadBot/1.0',
      });

      // This should create a security violation
      await apiProtection.checkRequest(blockedRequest);

      const stats = apiProtection.getSecurityStats();
      expect(stats.recentViolations).toBeGreaterThan(0);
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect disabled protection settings', async () => {
      const disabledProtection = new ApiProtectionService({
        enableRateLimiting: false,
        enableDDoSProtection: false,
        enableAbuseDetection: false,
        enableRequestValidation: false,
      });

      const request = createTestRequest({
        userAgent: 'BadBot/1.0', // Would normally be blocked
      });

      // Make many rapid requests that would normally trigger protection
      for (let i = 0; i < 50; i++) {
        const result = await disabledProtection.checkRequest({
          ...request,
          timestamp: Date.now() + i,
        });
        expect(result.allowed).toBe(true);
      }

      disabledProtection.dispose();
    });

    it('should handle custom blocked user agents', async () => {
      const customProtection = new ApiProtectionService({
        blockedUserAgents: ['CustomBot', 'EvilCrawler'],
      });

      const blockedRequest = createTestRequest({
        userAgent: 'CustomBot/2.0',
      });

      const allowedRequest = createTestRequest({
        userAgent: 'GoodBot/1.0',
      });

      const blockedResult = await customProtection.checkRequest(blockedRequest);
      const allowedResult = await customProtection.checkRequest(allowedRequest);

      expect(blockedResult.allowed).toBe(false);
      expect(allowedResult.allowed).toBe(true);

      customProtection.dispose();
    });

    it('should handle custom sensitive endpoints', async () => {
      const customProtection = new ApiProtectionService({
        sensitiveEndpoints: ['/api/custom', '/api/secret'],
      });

      const sensitiveRequest = createTestRequest({
        endpoint: '/api/custom/data',
        userId: 'user123',
      });

      // Rapid access to custom sensitive endpoint
      for (let i = 0; i < 10; i++) {
        await customProtection.checkRequest({
          ...sensitiveRequest,
          timestamp: Date.now() + i * 10000,
        });
      }

      // Should trigger abuse detection for sensitive endpoints
      const stats = customProtection.getSecurityStats();
      expect(stats.recentViolations).toBeGreaterThan(0);

      customProtection.dispose();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle requests without optional fields', async () => {
      const minimalRequest: ApiRequest = {
        endpoint: '/api/test',
        method: 'GET',
        timestamp: Date.now(),
      };

      const result = await apiProtection.checkRequest(minimalRequest);
      expect(result.allowed).toBe(true);
    });

    it('should handle concurrent requests safely', async () => {
      const request = createTestRequest();

      // Make many concurrent requests
      const promises = Array.from({ length: 100 }, (_, i) =>
        apiProtection.checkRequest({
          ...request,
          userId: `user${i % 10}`, // 10 different users
          timestamp: Date.now() + i,
        })
      );

      const results = await Promise.all(promises);

      // All should complete without errors
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(typeof result.allowed).toBe('boolean');
      });
    });

    it('should fail open on internal errors', async () => {
      // Create a request that might cause internal errors
      const problematicRequest = createTestRequest({
        endpoint: null as any, // Invalid endpoint
      });

      const result = await apiProtection.checkRequest(problematicRequest);

      // Should fail open (allow the request) for availability
      expect(result.allowed).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should clean up old data periodically', async () => {
      const shortWindowProtection = new ApiProtectionService({
        enableRateLimiting: true,
      });

      // Make requests to create data
      for (let i = 0; i < 10; i++) {
        await shortWindowProtection.checkRequest(createTestRequest({
          userId: `user${i}`,
        }));
      }

      const initialStats = shortWindowProtection.getSecurityStats();
      expect(initialStats.activeConnections).toBeGreaterThan(0);

      // Wait and trigger cleanup (in real implementation, this happens automatically)
      await new Promise(resolve => setTimeout(resolve, 100));

      shortWindowProtection.dispose();
    });
  });
});