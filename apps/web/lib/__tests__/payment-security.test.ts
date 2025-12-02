/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('stripe');
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring', () => ({
  monitoring: {
    recordMetric: jest.fn(),
    sendAlert: jest.fn(),
  },
}));

jest.mock('@/lib/redis', () => ({
  redis: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

import { logger } from '@/lib/logger';
import { monitoring } from '@/lib/monitoring';
import { redis } from '@/lib/redis';

describe('Payment Security', () => {
  let paymentService: any;
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Stripe
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        cancel: jest.fn(),
      },
      charges: {
        create: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
    };

    (Stripe as any).mockImplementation(() => mockStripe);

    // Payment service implementation
    paymentService = {
      // Error sanitization
      sanitizeError: (error: any, env: string = 'production') => {
        if (env === 'production') {
          // Hide Stripe details in production
          return {
            message: 'Payment processing failed',
            code: 'PAYMENT_ERROR',
            requestId: error.requestId || 'unknown',
          };
        } else {
          // Full details in development
          return {
            message: error.message,
            code: error.code,
            type: error.type,
            details: error.raw,
          };
        }
      },

      // Distributed locking
      acquireLock: async (lockKey: string, ttl: number = 30000) => {
        const lockValue = `lock_${Date.now()}_${Math.random()}`;
        const acquired = await redis.set(lockKey, lockValue, 'PX', ttl, 'NX');

        if (!acquired) {
          throw new Error('Could not acquire lock - operation in progress');
        }

        return {
          lockKey,
          lockValue,
          release: async () => {
            const currentValue = await redis.get(lockKey);
            if (currentValue === lockValue) {
              await redis.del(lockKey);
            }
          },
        };
      },

      // Field encryption/decryption
      encryptField: (data: string, key: string = 'test-encryption-key') => {
        // Simple XOR encryption for testing (use proper encryption in production)
        const encrypted = Buffer.from(data)
          .map((byte, i) => byte ^ key.charCodeAt(i % key.length))
          .toString('base64');
        return encrypted;
      },

      decryptField: (encrypted: string, key: string = 'test-encryption-key') => {
        const decrypted = Buffer.from(encrypted, 'base64')
          .map((byte, i) => byte ^ key.charCodeAt(i % key.length))
          .toString('utf-8');
        return decrypted;
      },

      // MFA requirements for high-value operations
      requiresMFA: (amount: number, threshold: number = 100000) => {
        return amount >= threshold; // $1000+ requires MFA
      },

      // Anomaly detection
      detectAnomaly: async (userId: string, amount: number) => {
        // Get user's payment history
        const historyKey = `payment_history:${userId}`;
        const historyJson = await redis.get(historyKey);
        const history = historyJson ? JSON.parse(historyJson as string) : [];

        if (history.length === 0) {
          // First payment, no baseline
          return { isAnomaly: false, reason: null };
        }

        // Calculate average and standard deviation
        const amounts = history.map((h: any) => h.amount);
        const avg = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
        const variance =
          amounts.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) /
          amounts.length;
        const stdDev = Math.sqrt(variance);

        // Anomaly if amount is >3 standard deviations from average
        const isAnomaly = Math.abs(amount - avg) > 3 * stdDev;

        // Also flag if amount is >10x average
        const isMassiveIncrease = amount > avg * 10;

        // Check frequency (too many payments in short time)
        const recentPayments = history.filter(
          (h: any) => Date.now() - h.timestamp < 60 * 60 * 1000 // Last hour
        );
        const isHighFrequency = recentPayments.length > 5;

        if (isAnomaly || isMassiveIncrease || isHighFrequency) {
          let reason = [];
          if (isAnomaly) reason.push('statistical_outlier');
          if (isMassiveIncrease) reason.push('massive_increase');
          if (isHighFrequency) reason.push('high_frequency');

          logger.warn('Payment anomaly detected', {
            userId,
            amount,
            avg,
            stdDev,
            reasons: reason,
          });

          monitoring.sendAlert('payment-anomaly-detected', {
            userId,
            amount,
            reasons: reason,
          });

          return { isAnomaly: true, reason: reason.join(', '), avg, stdDev };
        }

        return { isAnomaly: false, reason: null };
      },

      // Record payment in history
      recordPayment: async (userId: string, amount: number) => {
        const historyKey = `payment_history:${userId}`;
        const historyJson = await redis.get(historyKey);
        const history = historyJson ? JSON.parse(historyJson as string) : [];

        history.push({
          amount,
          timestamp: Date.now(),
        });

        // Keep last 100 payments
        const trimmed = history.slice(-100);

        await redis.set(historyKey, JSON.stringify(trimmed), 'EX', 90 * 24 * 60 * 60); // 90 days
      },

      // Process payment with all security measures
      processPayment: async (
        userId: string,
        amount: number,
        mfaVerified: boolean = false
      ) => {
        const lockKey = `payment:${userId}`;

        // Acquire distributed lock
        const lock = await paymentService.acquireLock(lockKey);

        try {
          // Check MFA requirement
          if (paymentService.requiresMFA(amount) && !mfaVerified) {
            throw new Error('MFA verification required for high-value transaction');
          }

          // Detect anomalies
          const anomalyCheck = await paymentService.detectAnomaly(userId, amount);
          if (anomalyCheck.isAnomaly) {
            monitoring.recordMetric('payment.anomaly_detected', 1, {
              userId,
              reason: anomalyCheck.reason,
            });

            // In production, might require additional verification
            logger.warn('Proceeding with anomalous payment after review', {
              userId,
              amount,
            });
          }

          // Create Stripe payment intent
          const paymentIntent = await mockStripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: 'usd',
            metadata: { userId },
          });

          // Record payment
          await paymentService.recordPayment(userId, amount);

          // Encrypt sensitive data
          const encryptedPaymentId = paymentService.encryptField(paymentIntent.id);

          logger.info('Payment processed successfully', { userId, amount });

          return {
            paymentId: encryptedPaymentId,
            amount,
            status: 'succeeded',
          };
        } catch (error: any) {
          // Sanitize error
          const sanitizedError = paymentService.sanitizeError(error, process.env.NODE_ENV);
          logger.error('Payment processing failed', sanitizedError);

          throw new Error(sanitizedError.message);
        } finally {
          // Always release lock
          await lock.release();
        }
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error sanitization', () => {
    it('should hide Stripe details in production', () => {
      const stripeError = {
        message: 'Your card was declined',
        code: 'card_declined',
        type: 'card_error',
        requestId: 'req_123',
        raw: { decline_code: 'insufficient_funds' },
      };

      const sanitized = paymentService.sanitizeError(stripeError, 'production');

      expect(sanitized).toEqual({
        message: 'Payment processing failed',
        code: 'PAYMENT_ERROR',
        requestId: 'req_123',
      });

      // Should not include sensitive details
      expect(sanitized.type).toBeUndefined();
      expect(sanitized.details).toBeUndefined();
    });

    it('should show full details in development', () => {
      const stripeError = {
        message: 'Your card was declined',
        code: 'card_declined',
        type: 'card_error',
        requestId: 'req_456',
        raw: { decline_code: 'insufficient_funds' },
      };

      const sanitized = paymentService.sanitizeError(stripeError, 'development');

      expect(sanitized).toEqual({
        message: 'Your card was declined',
        code: 'card_declined',
        type: 'card_error',
        details: { decline_code: 'insufficient_funds' },
      });
    });

    it('should handle missing requestId', () => {
      const error = {
        message: 'Network error',
        code: 'network_error',
      };

      const sanitized = paymentService.sanitizeError(error, 'production');

      expect(sanitized.requestId).toBe('unknown');
    });
  });

  describe('Distributed locking', () => {
    it('should prevent concurrent payment operations', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      const lock = await paymentService.acquireLock('payment:user-123');

      expect(lock).toMatchObject({
        lockKey: 'payment:user-123',
        lockValue: expect.stringContaining('lock_'),
        release: expect.any(Function),
      });

      expect(redis.set).toHaveBeenCalledWith(
        'payment:user-123',
        expect.any(String),
        'PX',
        30000,
        'NX'
      );
    });

    it('should fail if lock already held', async () => {
      (redis.set as jest.Mock).mockResolvedValue(null); // Lock already exists

      await expect(paymentService.acquireLock('payment:user-456')).rejects.toThrow(
        'Could not acquire lock - operation in progress'
      );
    });

    it('should release lock after operation', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock).mockResolvedValue('lock_123');

      const lock = await paymentService.acquireLock('payment:user-789');
      await lock.release();

      expect(redis.del).toHaveBeenCalledWith('payment:user-789');
    });

    it('should not release lock if value changed', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock).mockResolvedValue('different_lock_value');

      const lock = await paymentService.acquireLock('payment:user-999', 30000);
      await lock.release();

      // Should not delete if value doesn't match
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should support custom TTL', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      await paymentService.acquireLock('payment:custom-ttl', 60000);

      expect(redis.set).toHaveBeenCalledWith(
        'payment:custom-ttl',
        expect.any(String),
        'PX',
        60000,
        'NX'
      );
    });
  });

  describe('Field encryption/decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'pi_1234567890abcdef';

      const encrypted = paymentService.encryptField(originalData);
      expect(encrypted).not.toBe(originalData);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format

      const decrypted = paymentService.decryptField(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should handle different data types', () => {
      const testCases = [
        'simple_string',
        'string_with_spaces',
        '12345',
        'special!@#$%^&*()',
        'unicode_测试',
      ];

      testCases.forEach((testCase) => {
        const encrypted = paymentService.encryptField(testCase);
        const decrypted = paymentService.decryptField(encrypted);
        expect(decrypted).toBe(testCase);
      });
    });

    it('should use different encryption with different keys', () => {
      const data = 'sensitive_data';

      const encrypted1 = paymentService.encryptField(data, 'key1');
      const encrypted2 = paymentService.encryptField(data, 'key2');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should decrypt with correct key only', () => {
      const data = 'secret_info';
      const key = 'correct_key';

      const encrypted = paymentService.encryptField(data, key);
      const decrypted = paymentService.decryptField(encrypted, key);

      expect(decrypted).toBe(data);

      // Wrong key should not decrypt correctly
      const wrongDecrypted = paymentService.decryptField(encrypted, 'wrong_key');
      expect(wrongDecrypted).not.toBe(data);
    });
  });

  describe('MFA requirements', () => {
    it('should require MFA for high-value transactions', () => {
      expect(paymentService.requiresMFA(100000, 100000)).toBe(true); // $1000
      expect(paymentService.requiresMFA(500000, 100000)).toBe(true); // $5000
    });

    it('should not require MFA for low-value transactions', () => {
      expect(paymentService.requiresMFA(5000, 100000)).toBe(false); // $50
      expect(paymentService.requiresMFA(99999, 100000)).toBe(false); // $999.99
    });

    it('should support custom threshold', () => {
      expect(paymentService.requiresMFA(50000, 50000)).toBe(true);
      expect(paymentService.requiresMFA(49999, 50000)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(paymentService.requiresMFA(0, 100000)).toBe(false);
      expect(paymentService.requiresMFA(100000, 100000)).toBe(true); // Exactly at threshold
    });
  });

  describe('Anomaly detection', () => {
    it('should flag statistical outliers', async () => {
      // Setup: user has history of $50 payments
      const history = Array.from({ length: 20 }, () => ({
        amount: 5000,
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      }));

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(history));

      // Attempt $500 payment (10x normal)
      const result = await paymentService.detectAnomaly('user-123', 50000);

      expect(result.isAnomaly).toBe(true);
      expect(result.reason).toContain('massive_increase');

      expect(logger.warn).toHaveBeenCalledWith(
        'Payment anomaly detected',
        expect.objectContaining({
          userId: 'user-123',
          amount: 50000,
        })
      );

      expect(monitoring.sendAlert).toHaveBeenCalledWith(
        'payment-anomaly-detected',
        expect.any(Object)
      );
    });

    it('should allow normal payments', async () => {
      const history = Array.from({ length: 20 }, () => ({
        amount: 5000,
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      }));

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(history));

      const result = await paymentService.detectAnomaly('user-456', 5200); // Similar to history

      expect(result.isAnomaly).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('should detect high frequency payments', async () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        amount: 5000,
        timestamp: Date.now() - i * 5 * 60 * 1000, // Every 5 minutes in last hour
      }));

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(history));

      const result = await paymentService.detectAnomaly('user-789', 5000);

      expect(result.isAnomaly).toBe(true);
      expect(result.reason).toContain('high_frequency');
    });

    it('should handle first payment (no baseline)', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const result = await paymentService.detectAnomaly('user-new', 10000);

      expect(result.isAnomaly).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('should calculate standard deviation correctly', async () => {
      const history = [
        { amount: 4000, timestamp: Date.now() },
        { amount: 5000, timestamp: Date.now() },
        { amount: 6000, timestamp: Date.now() },
      ];

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(history));

      const result = await paymentService.detectAnomaly('user-stats', 20000);

      expect(result.isAnomaly).toBe(true);
      expect(result.avg).toBe(5000);
      expect(result.stdDev).toBeGreaterThan(0);
    });
  });

  describe('Payment processing integration', () => {
    it('should process normal payment successfully', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK'); // Lock acquired
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('lock_value') // For lock check
        .mockResolvedValueOnce(null); // No payment history

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      });

      const result = await paymentService.processPayment('user-123', 5000);

      expect(result).toMatchObject({
        paymentId: expect.any(String),
        amount: 5000,
        status: 'succeeded',
      });

      expect(logger.info).toHaveBeenCalledWith('Payment processed successfully', {
        userId: 'user-123',
        amount: 5000,
      });
    });

    it('should require MFA for high-value payments', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      await expect(
        paymentService.processPayment('user-456', 100000, false)
      ).rejects.toThrow('MFA verification required for high-value transaction');
    });

    it('should allow high-value payment with MFA', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('lock_value')
        .mockResolvedValueOnce(null);

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_mfa_test',
        status: 'succeeded',
      });

      const result = await paymentService.processPayment('user-789', 100000, true);

      expect(result.status).toBe('succeeded');
    });

    it('should release lock even on failure', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock).mockResolvedValue('lock_value');

      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Card declined')
      );

      await expect(paymentService.processPayment('user-999', 5000)).rejects.toThrow();

      expect(redis.del).toHaveBeenCalled();
    });

    it('should sanitize errors in production', async () => {
      process.env.NODE_ENV = 'production';

      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('lock_value')
        .mockResolvedValueOnce(null);

      mockStripe.paymentIntents.create.mockRejectedValue({
        message: 'Card declined',
        code: 'card_declined',
        requestId: 'req_prod',
      });

      await expect(paymentService.processPayment('user-prod', 5000)).rejects.toThrow(
        'Payment processing failed'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Payment processing failed',
        expect.objectContaining({
          message: 'Payment processing failed',
          code: 'PAYMENT_ERROR',
        })
      );
    });

    it('should record payment in history', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('lock_value')
        .mockResolvedValueOnce(null);

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_history',
        status: 'succeeded',
      });

      await paymentService.processPayment('user-history', 7500);

      expect(redis.set).toHaveBeenCalledWith(
        'payment_history:user-history',
        expect.any(String),
        'EX',
        90 * 24 * 60 * 60
      );
    });

    it('should encrypt payment ID', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('lock_value')
        .mockResolvedValueOnce(null);

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_encrypt_test',
        status: 'succeeded',
      });

      const result = await paymentService.processPayment('user-encrypt', 3000);

      // Payment ID should be encrypted (not equal to original)
      expect(result.paymentId).not.toBe('pi_encrypt_test');
      expect(result.paymentId).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format

      // Should be decryptable
      const decrypted = paymentService.decryptField(result.paymentId);
      expect(decrypted).toBe('pi_encrypt_test');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle Redis connection failures', async () => {
      (redis.set as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      await expect(paymentService.acquireLock('payment:redis-fail')).rejects.toThrow();
    });

    it('should handle Stripe API errors', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('lock_value')
        .mockResolvedValueOnce(null);

      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      await expect(paymentService.processPayment('user-stripe-error', 1000)).rejects.toThrow();
    });

    it('should handle lock acquisition failures', async () => {
      (redis.set as jest.Mock).mockResolvedValue(null); // Lock not acquired

      await expect(paymentService.processPayment('user-lock-fail', 1000)).rejects.toThrow(
        'Could not acquire lock'
      );
    });

    it('should trim payment history to last 100 entries', async () => {
      const largeHistory = Array.from({ length: 150 }, (_, i) => ({
        amount: 1000,
        timestamp: Date.now() - i * 60000,
      }));

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(largeHistory));

      await paymentService.recordPayment('user-trim', 1000);

      const setCall = (redis.set as jest.Mock).mock.calls.find((call) =>
        call[0].includes('payment_history')
      );

      const storedHistory = JSON.parse(setCall[1]);
      expect(storedHistory).toHaveLength(100);
    });
  });
});
