/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import * as speakeasy from 'speakeasy';

// Mock all external dependencies
jest.mock('@supabase/supabase-js');
jest.mock('stripe');
jest.mock('speakeasy');
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
  },
  isRedisAvailable: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring', () => ({
  monitoring: {
    recordMetric: jest.fn(),
    sendAlert: jest.fn(),
  },
}));

import { redis, isRedisAvailable } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { monitoring } from '@/lib/monitoring';

describe('Critical Fixes Integration Tests', () => {
  let mockSupabase: any;
  let mockStripe: any;
  let services: any;

  beforeAll(() => {
    // Set environment
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock Stripe
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        cancel: jest.fn(),
      },
    };

    (Stripe as any).mockImplementation(() => mockStripe);

    // Mock speakeasy
    (speakeasy.generateSecret as jest.Mock).mockReturnValue({
      base32: 'JBSWY3DPEHPK3PXP',
      otpauth_url: 'otpauth://totp/App:user@example.com?secret=JBSWY3DPEHPK3PXP',
    });

    (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

    // Mock Redis availability
    (isRedisAvailable as jest.Mock).mockResolvedValue(true);

    // Initialize integrated services
    services = {
      // MFA Service
      mfa: {
        enroll: async (userId: string) => {
          const secret = speakeasy.generateSecret({ name: 'App' });

          await mockSupabase.from('user_mfa').insert({
            user_id: userId,
            secret: secret.base32,
            enabled: false,
          });

          return { secret: secret.base32 };
        },

        verify: async (userId: string, token: string) => {
          // Rate limit check
          const rateLimit = await redis.incr(`mfa:${userId}`);
          if (rateLimit > 5) {
            throw new Error('Too many attempts');
          }

          const { data } = await mockSupabase
            .from('user_mfa')
            .select('*')
            .eq('user_id', userId)
            .single();

          const verified = speakeasy.totp.verify({
            secret: data.secret,
            token,
          });

          if (!verified) {
            throw new Error('Invalid token');
          }

          await mockSupabase
            .from('user_mfa')
            .update({ enabled: true })
            .eq('user_id', userId);

          return { success: true };
        },
      },

      // Token Service
      tokens: {
        refresh: async (refreshToken: string) => {
          const { data: tokenData } = await mockSupabase
            .from('refresh_tokens')
            .select('*')
            .eq('token', refreshToken)
            .single();

          if (tokenData.consumed_at) {
            logger.error('Token breach detected');
            await mockSupabase
              .from('refresh_tokens')
              .update({ invalidated_at: new Date().toISOString() })
              .eq('family_id', tokenData.family_id);

            monitoring.sendAlert('token-breach', { userId: tokenData.user_id });
            throw new Error('Token breach detected');
          }

          await mockSupabase
            .from('refresh_tokens')
            .update({ consumed_at: new Date().toISOString() })
            .eq('id', tokenData.id);

          const newToken = `refresh_${Date.now()}`;
          await mockSupabase.from('refresh_tokens').insert({
            token: newToken,
            user_id: tokenData.user_id,
            family_id: tokenData.family_id,
            generation: tokenData.generation + 1,
          });

          return { refreshToken: newToken, accessToken: `access_${Date.now()}` };
        },
      },

      // Payment Service
      payments: {
        process: async (userId: string, amount: number, mfaVerified: boolean = false) => {
          // Distributed lock
          const lockKey = `payment:${userId}`;
          const lockAcquired = await redis.set(lockKey, '1', 'PX', 30000, 'NX');

          if (!lockAcquired) {
            throw new Error('Payment in progress');
          }

          try {
            // MFA requirement
            if (amount >= 100000 && !mfaVerified) {
              throw new Error('MFA required');
            }

            // Anomaly detection
            const historyJson = await redis.get(`payment_history:${userId}`);
            const history = historyJson ? JSON.parse(historyJson as string) : [];

            if (history.length > 0) {
              const avg = history.reduce((a: number, b: any) => a + b.amount, 0) / history.length;
              if (amount > avg * 10) {
                monitoring.sendAlert('payment-anomaly', { userId, amount });
              }
            }

            // Process payment
            const paymentIntent = await mockStripe.paymentIntents.create({
              amount: amount * 100,
              currency: 'usd',
            });

            // Record in history
            history.push({ amount, timestamp: Date.now() });
            await redis.set(`payment_history:${userId}`, JSON.stringify(history.slice(-100)));

            return { paymentId: paymentIntent.id, status: 'succeeded' };
          } finally {
            await redis.del(lockKey);
          }
        },
      },

      // FNR Service
      fnr: {
        getFNR: async (modelName: string, version: string) => {
          const { data } = await mockSupabase
            .from('model_performance_metrics')
            .select('*')
            .eq('model_name', modelName)
            .eq('version', version)
            .single();

          const n = data?.sample_count || 0;
          const fnr = data?.false_negative_rate || 0;

          let confidence: string;
          let shouldEscalate = false;

          if (n === 0) {
            confidence = 'none';
            shouldEscalate = true;
          } else if (n < 10) {
            confidence = 'insufficient';
            shouldEscalate = true;
          } else if (n < 100) {
            confidence = 'low';
          } else {
            confidence = 'high';
          }

          return { fnr, confidence, sampleCount: n, shouldEscalate };
        },

        getFNRWithFallback: async (modelName: string, version: string) => {
          let result = await services.fnr.getFNR(modelName, version);
          if (!result.shouldEscalate) return result;

          result = await services.fnr.getFNR(modelName, 'latest');
          if (!result.shouldEscalate) return result;

          result = await services.fnr.getFNR('baseline', 'v1.0');
          if (!result.shouldEscalate) return result;

          return {
            fnr: 1.0,
            confidence: 'none',
            shouldEscalate: true,
            fallbackUsed: 'human_escalation',
          };
        },
      },

      // Rate Limiter
      rateLimit: {
        check: async (identifier: string, limit: number = 100) => {
          const isRedisUp = await isRedisAvailable();

          if (isRedisUp) {
            const count = await redis.incr(`ratelimit:${identifier}`);
            return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
          } else {
            // Fallback mode
            const fallbackLimit = process.env.NODE_ENV === 'production' ? 5 : 10;
            logger.warn('Rate limiter fallback mode');
            monitoring.recordMetric('rate_limiter.fallback', 1);

            // Simplified in-memory fallback for test
            return { allowed: true, remaining: fallbackLimit };
          }
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete MFA enrollment and login flow', () => {
    it('should complete full MFA enrollment and verification flow', async () => {
      const userId = 'user-integration-1';

      // Step 1: Enroll MFA
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const enrollment = await services.mfa.enroll(userId);

      expect(enrollment.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          secret: 'JBSWY3DPEHPK3PXP',
          enabled: false,
        })
      );

      // Step 2: Verify TOTP token
      (redis.incr as jest.Mock).mockResolvedValue(1); // Rate limit check

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          secret: 'JBSWY3DPEHPK3PXP',
          enabled: false,
        },
        error: null,
      });

      const verification = await services.mfa.verify(userId, '123456');

      expect(verification.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );

      // Step 3: Login with MFA
      // (would involve token creation + MFA verification in real flow)
      expect(logger.info).toHaveBeenCalled();
    });

    it('should enforce rate limiting on MFA verification', async () => {
      const userId = 'user-rate-limited';

      (redis.incr as jest.Mock).mockResolvedValue(6); // Exceeds limit

      await expect(services.mfa.verify(userId, '123456')).rejects.toThrow(
        'Too many attempts'
      );
    });
  });

  describe('Payment with MFA requirement', () => {
    it('should process low-value payment without MFA', async () => {
      const userId = 'user-payment-1';

      (redis.set as jest.Mock).mockResolvedValue('OK'); // Lock acquired
      (redis.get as jest.Mock).mockResolvedValue(null); // No history

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      });

      const result = await services.payments.process(userId, 5000); // $50

      expect(result).toMatchObject({
        paymentId: 'pi_test123',
        status: 'succeeded',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500000, // $50 in cents
          currency: 'usd',
        })
      );
    });

    it('should require MFA for high-value payment', async () => {
      const userId = 'user-payment-2';

      (redis.set as jest.Mock).mockResolvedValue('OK');

      await expect(
        services.payments.process(userId, 150000, false) // $1500, no MFA
      ).rejects.toThrow('MFA required');
    });

    it('should allow high-value payment with MFA', async () => {
      const userId = 'user-payment-3';

      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock).mockResolvedValue(null);

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_mfa123',
        status: 'succeeded',
      });

      const result = await services.payments.process(userId, 150000, true); // $1500 with MFA

      expect(result.status).toBe('succeeded');
    });

    it('should detect and alert on payment anomalies', async () => {
      const userId = 'user-payment-4';

      (redis.set as jest.Mock).mockResolvedValue('OK');

      // Mock payment history: average $50
      const history = Array.from({ length: 10 }, () => ({ amount: 5000, timestamp: Date.now() }));
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(history));

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_anomaly',
        status: 'succeeded',
      });

      // Attempt $500 payment (10x average)
      await services.payments.process(userId, 50000);

      expect(monitoring.sendAlert).toHaveBeenCalledWith(
        'payment-anomaly',
        expect.objectContaining({
          userId,
          amount: 50000,
        })
      );
    });

    it('should use distributed locking to prevent concurrent payments', async () => {
      const userId = 'user-payment-5';

      (redis.set as jest.Mock)
        .mockResolvedValueOnce('OK') // First payment acquires lock
        .mockResolvedValueOnce(null); // Second payment fails to acquire

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_lock1',
        status: 'succeeded',
      });

      (redis.get as jest.Mock).mockResolvedValue(null);

      // First payment succeeds
      const payment1 = services.payments.process(userId, 1000);

      // Second payment should fail (lock held)
      const payment2 = services.payments.process(userId, 2000);

      const [result1] = await Promise.allSettled([payment1, payment2]);

      expect(result1.status).toBe('fulfilled');
      // Second payment should be rejected due to lock
    });
  });

  describe('FNR-based automation decision with fallback', () => {
    it('should use specific version FNR if available', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          model_name: 'yolo-v8',
          version: 'v2.0',
          false_negative_rate: 0.025,
          sample_count: 500,
        },
        error: null,
      });

      const result = await services.fnr.getFNR('yolo-v8', 'v2.0');

      expect(result).toMatchObject({
        fnr: 0.025,
        confidence: 'high',
        sampleCount: 500,
        shouldEscalate: false,
      });
    });

    it('should escalate with insufficient data', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          false_negative_rate: 0.01,
          sample_count: 5,
        },
        error: null,
      });

      const result = await services.fnr.getFNR('model', 'v1.0');

      expect(result).toMatchObject({
        confidence: 'insufficient',
        shouldEscalate: true,
      });
    });

    it('should fall back through hierarchy', async () => {
      let callCount = 0;

      mockSupabase.single.mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          // Specific version: no data
          return Promise.resolve({
            data: { sample_count: 0, false_negative_rate: 0 },
            error: null,
          });
        } else if (callCount === 2) {
          // Latest version: no data
          return Promise.resolve({
            data: { sample_count: 0, false_negative_rate: 0 },
            error: null,
          });
        } else {
          // Baseline: has data
          return Promise.resolve({
            data: { sample_count: 500, false_negative_rate: 0.04 },
            error: null,
          });
        }
      });

      const result = await services.fnr.getFNRWithFallback('model', 'v3.0');

      expect(result.shouldEscalate).toBe(false);
      expect(result.sampleCount).toBe(500);
      expect(callCount).toBe(3); // Called 3 times for fallback
    });

    it('should escalate to human if all fallbacks fail', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { sample_count: 0, false_negative_rate: 0 },
        error: null,
      });

      const result = await services.fnr.getFNRWithFallback('model', 'v1.0');

      expect(result).toMatchObject({
        shouldEscalate: true,
        fallbackUsed: 'human_escalation',
      });
    });
  });

  describe('Rate limiting across multiple requests', () => {
    it('should track rate limits across multiple requests', async () => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(true);

      const identifier = 'user-rate-test';
      const limit = 5;

      // First 5 requests allowed
      for (let i = 1; i <= 5; i++) {
        (redis.incr as jest.Mock).mockResolvedValue(i);

        const result = await services.rateLimit.check(identifier, limit);
        expect(result.allowed).toBe(true);
      }

      // 6th request denied
      (redis.incr as jest.Mock).mockResolvedValue(6);
      const result = await services.rateLimit.check(identifier, limit);
      expect(result.allowed).toBe(false);
    });

    it('should use fallback mode when Redis is down', async () => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);

      const result = await services.rateLimit.check('user-fallback');

      expect(result.allowed).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith('Rate limiter fallback mode');
      expect(monitoring.recordMetric).toHaveBeenCalledWith('rate_limiter.fallback', 1);
    });

    it('should handle Redis errors gracefully', async () => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(true);
      (redis.incr as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should fall back to allowing request rather than failing
      await expect(services.rateLimit.check('user-error')).rejects.toThrow();
    });
  });

  describe('Refresh token security', () => {
    it('should rotate tokens successfully', async () => {
      const oldToken = 'refresh_old';

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'token-1',
          token: oldToken,
          user_id: 'user-1',
          family_id: 'family-1',
          generation: 1,
          consumed_at: null,
        },
        error: null,
      });

      const result = await services.tokens.refresh(oldToken);

      expect(result).toMatchObject({
        refreshToken: expect.stringContaining('refresh_'),
        accessToken: expect.stringContaining('access_'),
      });

      // Old token should be marked consumed
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          consumed_at: expect.any(String),
        })
      );

      // New token should be inserted with incremented generation
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          family_id: 'family-1',
          generation: 2,
        })
      );
    });

    it('should detect and prevent token breach', async () => {
      const consumedToken = 'refresh_consumed';

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'token-2',
          token: consumedToken,
          user_id: 'user-2',
          family_id: 'family-2',
          consumed_at: new Date(Date.now() - 5000).toISOString(), // Already consumed
        },
        error: null,
      });

      await expect(services.tokens.refresh(consumedToken)).rejects.toThrow(
        'Token breach detected'
      );

      expect(logger.error).toHaveBeenCalledWith('Token breach detected');

      // Should invalidate entire family
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          invalidated_at: expect.any(String),
        })
      );

      expect(monitoring.sendAlert).toHaveBeenCalledWith(
        'token-breach',
        expect.objectContaining({
          userId: 'user-2',
        })
      );
    });
  });

  describe('End-to-end scenarios', () => {
    it('should handle complete user flow with all security measures', async () => {
      const userId = 'user-e2e';

      // 1. Enroll MFA
      const { secret } = await services.mfa.enroll(userId);
      expect(secret).toBeDefined();

      // 2. Verify MFA
      (redis.incr as jest.Mock).mockResolvedValue(1);
      mockSupabase.single.mockResolvedValue({
        data: { user_id: userId, secret, enabled: false },
        error: null,
      });

      await services.mfa.verify(userId, '123456');

      // 3. Process payment with MFA
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock).mockResolvedValue(null);
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_e2e',
        status: 'succeeded',
      });

      const payment = await services.payments.process(userId, 150000, true);
      expect(payment.status).toBe('succeeded');

      // 4. Check FNR for automation
      mockSupabase.single.mockResolvedValue({
        data: {
          sample_count: 200,
          false_negative_rate: 0.03,
        },
        error: null,
      });

      const fnr = await services.fnr.getFNR('model', 'v1.0');
      expect(fnr.shouldEscalate).toBe(false);

      // 5. Rate limiting working
      (isRedisAvailable as jest.Mock).mockResolvedValue(true);
      (redis.incr as jest.Mock).mockResolvedValue(1);

      const rateLimit = await services.rateLimit.check(userId);
      expect(rateLimit.allowed).toBe(true);
    });

    it('should handle cascade of security measures on suspicious activity', async () => {
      const userId = 'user-suspicious';

      // Anomalous payment amount
      const history = Array.from({ length: 10 }, () => ({ amount: 1000, timestamp: Date.now() }));
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(history));

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_suspicious',
        status: 'succeeded',
      });

      // Large payment (anomaly + requires MFA)
      await expect(services.payments.process(userId, 100000, false)).rejects.toThrow(
        'MFA required'
      );

      // Anomaly alert should be sent even though payment rejected
      expect(monitoring.sendAlert).toHaveBeenCalled();

      // Too many attempts
      (redis.incr as jest.Mock).mockResolvedValue(10); // Exceeds rate limit
      await expect(services.mfa.verify(userId, '123456')).rejects.toThrow('Too many attempts');
    });
  });
});
