import { vi } from 'vitest';
/**
 * Integration Tests for Phase 1 Migrated Routes
 * Tests both old and new controller paths with feature flags
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as featureFlags from '@/lib/feature-flags';

// Import route handlers
import * as jobsRoute from '@/app/api/jobs/route';
import * as notificationsRoute from '@/app/api/notifications/route';
import * as messagesRoute from '@/app/api/messages/threads/route';
import * as analyticsRoute from '@/app/api/analytics/insights/route';
import * as webhooksRoute from '@/app/api/webhooks/stripe/route';
import * as featureFlagsRoute from '@/app/api/feature-flags/route';
import * as aiSearchRoute from '@/app/api/ai/search-suggestions/route';
import * as bidsRoute from '@/app/api/contractor/bids/route';
import * as paymentMethodsRoute from '@/app/api/payments/methods/route';
import * as dashboardMetricsRoute from '@/app/api/admin/dashboard/metrics/route';

describe('Phase 1 Route Migration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset mocks
    vi.clearAllMocks();

    // Mock user authentication
    vi.spyOn(require('@/lib/auth'), 'getCurrentUserFromCookies').mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'homeowner'
    });
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('Emergency Kill Switch', () => {
    it('should use old handler when kill switch is active', async () => {
      // Activate kill switch
      process.env.EMERGENCY_KILL_SWITCH = 'true';

      const request = new NextRequest('http://localhost/api/jobs');
      const response = await jobsRoute.GET(request);

      expect(response.status).toBe(200);
      // Verify it used old handler (check for specific old handler behavior/headers)
    });

    it('should check feature flags when kill switch is inactive', async () => {
      // Deactivate kill switch
      delete process.env.EMERGENCY_KILL_SWITCH;

      const spy = vi.spyOn(featureFlags, 'useNewController');

      const request = new NextRequest('http://localhost/api/jobs');
      await jobsRoute.GET(request);

      expect(spy).toHaveBeenCalledWith('JOBS', 'test-user-id');
    });
  });

  describe('GET /api/jobs', () => {
    it('should return job listings with new controller', async () => {
      // Force new controller
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/jobs?status=open');
      const response = await jobsRoute.GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('jobs');
      expect(Array.isArray(data.jobs)).toBe(true);
    });

    it('should fallback to old handler on new controller error', async () => {
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      // Mock controller to throw error
      vi.spyOn(require('@mintenance/api-services').jobController, 'listJobs')
        .mockRejectedValue(new Error('Controller error'));

      const request = new NextRequest('http://localhost/api/jobs');
      const response = await jobsRoute.GET(request);

      // Should still succeed due to fallback
      expect(response.status).toBe(200);
    });

    it('should log controller usage', async () => {
      const logSpy = vi.spyOn(featureFlags, 'logControllerUsage');

      const request = new NextRequest('http://localhost/api/jobs');
      await jobsRoute.GET(request);

      expect(logSpy).toHaveBeenCalledWith(
        'jobs',
        expect.any(Boolean),
        'test-user-id',
        expect.objectContaining({
          endpoint: 'GET /api/jobs',
          url: expect.any(String)
        })
      );
    });
  });

  describe('GET /api/notifications', () => {
    it('should return notifications with new controller', async () => {
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/notifications');
      const response = await notificationsRoute.GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('notifications');
    });

    it('should respect feature flag rollout percentage', async () => {
      // Test with different user IDs to verify consistent hashing
      const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
      const results = [];

      for (const userId of userIds) {
        vi.spyOn(require('@/lib/auth'), 'getCurrentUserFromCookies').mockResolvedValue({
          id: userId,
          email: `${userId}@example.com`,
          role: 'homeowner'
        });

        // Use actual feature flag logic (not mocked)
        const useNew = await featureFlags.useNewController('NOTIFICATIONS', userId);
        results.push(useNew);
      }

      // With 5% rollout, expect 0-1 users to get new controller
      const newControllerCount = results.filter(r => r).length;
      expect(newControllerCount).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    it('should have 0% rollout for critical webhook', async () => {
      // Webhook should always use old handler initially (0% rollout)
      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test-signature'
        },
        body: JSON.stringify({ type: 'payment_intent.succeeded' })
      });

      // Don't mock feature flag - use actual implementation
      const response = await webhooksRoute.POST(request);

      // Should use old handler (0% rollout)
      expect(response.status).toBe(200);
    });

    it('should force new controller with environment override', async () => {
      process.env.FORCE_NEW_WEBHOOK_HANDLER = 'true';

      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test-signature'
        }
      });

      const spy = vi.spyOn(require('@mintenance/api-services').webhookController, 'handleStripeWebhook');
      await webhooksRoute.POST(request);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('GET /api/feature-flags', () => {
    it('should return feature flag configurations', async () => {
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/feature-flags?flag=JOBS');
      const response = await featureFlagsRoute.GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('flag');
    });

    it('should support POST for updating flags', async () => {
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/feature-flags', {
        method: 'POST',
        body: JSON.stringify({
          flag: 'JOBS',
          rolloutPercentage: 10
        })
      });

      const response = await featureFlagsRoute.POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/payments/methods', () => {
    it('should return payment methods for authenticated user', async () => {
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/payments/methods');
      const response = await paymentMethodsRoute.GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('methods');
    });

    it('should support adding new payment method', async () => {
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          type: 'card',
          token: 'tok_visa'
        })
      });

      const response = await paymentMethodsRoute.POST(request);
      expect(response.status).toBe(200);
    });

    it('should support removing payment method', async () => {
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/payments/methods?id=pm_123', {
        method: 'DELETE'
      });

      const response = await paymentMethodsRoute.DELETE(request);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/admin/dashboard/metrics', () => {
    it('should require admin role', async () => {
      // Mock non-admin user
      vi.spyOn(require('@/lib/auth'), 'getCurrentUserFromCookies').mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'homeowner' // Not admin
      });

      const request = new NextRequest('http://localhost/api/admin/dashboard/metrics');
      const response = await dashboardMetricsRoute.GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return metrics for admin user', async () => {
      // Mock admin user
      vi.spyOn(require('@/lib/auth'), 'getCurrentUserFromCookies').mockResolvedValue({
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin'
      });

      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/admin/dashboard/metrics');
      const response = await dashboardMetricsRoute.GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('metrics');
    });
  });

  describe('Performance Tests', () => {
    it('should respond within 200ms for all routes', async () => {
      const routes = [
        { handler: jobsRoute.GET, url: '/api/jobs' },
        { handler: notificationsRoute.GET, url: '/api/notifications' },
        { handler: messagesRoute.GET, url: '/api/messages/threads' },
        { handler: analyticsRoute.GET, url: '/api/analytics/insights' },
        { handler: featureFlagsRoute.GET, url: '/api/feature-flags' },
        { handler: aiSearchRoute.GET, url: '/api/ai/search-suggestions' },
        { handler: bidsRoute.GET, url: '/api/contractor/bids' },
        { handler: paymentMethodsRoute.GET, url: '/api/payments/methods' }
      ];

      for (const route of routes) {
        const start = Date.now();
        const request = new NextRequest(`http://localhost${route.url}`);
        await route.handler(request);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(200);
      }
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log successful controller usage', async () => {
      const logSpy = vi.spyOn(featureFlags, 'logControllerUsage');
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/ai/search-suggestions?q=test');
      await aiSearchRoute.GET(request);

      // Should log initial usage
      expect(logSpy).toHaveBeenCalledWith(
        'ai-search-suggestions',
        true,
        'test-user-id',
        expect.any(Object)
      );

      // Should log success
      expect(logSpy).toHaveBeenCalledWith(
        'ai-search-suggestions-success',
        true,
        'test-user-id',
        expect.any(Object)
      );
    });

    it('should log fallback when new controller fails', async () => {
      const logSpy = vi.spyOn(featureFlags, 'logControllerUsage');
      vi.spyOn(featureFlags, 'useNewController').mockResolvedValue(true);

      // Force controller to fail
      vi.spyOn(require('@mintenance/api-services').bidController, 'listBids')
        .mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost/api/contractor/bids');
      await bidsRoute.GET(request);

      // Should log fallback
      expect(logSpy).toHaveBeenCalledWith(
        'contractor-bids-fallback',
        true,
        'test-user-id',
        expect.objectContaining({
          error: 'Test error'
        })
      );
    });
  });
});

describe('Feature Flag Consistent Hashing', () => {
  it('should consistently assign same user to same bucket', async () => {
    const userId = 'consistent-user-123';
    const results = [];

    // Run multiple times to ensure consistency
    for (let i = 0; i < 10; i++) {
      const useNew = await featureFlags.useNewController('JOBS', userId);
      results.push(useNew);
    }

    // All results should be the same
    const allSame = results.every(r => r === results[0]);
    expect(allSame).toBe(true);
  });

  it('should distribute users according to rollout percentage', async () => {
    // Test with 100 users
    const results = [];
    for (let i = 0; i < 100; i++) {
      const userId = `user-${i}`;
      const useNew = await featureFlags.useNewController('ANALYTICS_INSIGHTS', userId);
      results.push(useNew);
    }

    // With 10% rollout for analytics, expect 5-15 users (allowing for variance)
    const newControllerCount = results.filter(r => r).length;
    expect(newControllerCount).toBeGreaterThanOrEqual(5);
    expect(newControllerCount).toBeLessThanOrEqual(15);
  });
});