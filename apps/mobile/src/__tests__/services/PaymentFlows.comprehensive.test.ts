/**
 * Comprehensive Payment Flows Test Suite
 * Tests all critical payment workflows end-to-end.
 *
 * Payment services route HTTP through `mobileApiClient` (the create-payment-intent /
 * release-escrow-payment / process-refund Supabase edge functions were deleted
 * 2026-05-10). Money is GBP-only: 12% platform rate, 1.5% + £0.20 Stripe rate,
 * £0.50 minimum platform fee, no maximum cap (£50 cap removed 2026-05-22).
 */

import { PaymentService } from '../../services/PaymentService';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import {
  createPaymentMethod as stripeCreatePaymentMethod,
  confirmPayment as stripeConfirmPayment,
} from '@stripe/stripe-react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(() => Promise.resolve()),
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  createToken: jest.fn(),
  handleCardAction: jest.fn(),
}));

// Canonical HTTP layer used by every payment service (and apiHelper.apiRequest).
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Supabase mock kept for services that still import it at module level.
// (getContractorPayoutStatus moved to the API client 2026-06-09 — the
// profiles stripe_* columns are revoked from the authenticated role.)
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockApi = mobileApiClient as unknown as Record<string, jest.Mock>;

describe('Payment Flows - Comprehensive Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Payment Workflow', () => {
    it('should handle successful end-to-end payment flow', async () => {
      const futureYear = new Date().getFullYear() + 1;
      const jobId = 'job-123';
      const contractorId = 'contractor-456';
      const amount = 250;
      const clientSecret = 'pi_test_123_secret_456';
      const paymentMethodId = 'pm_test_789';

      // Step 1: Initialize payment (GBP units, no cents conversion).
      mockApi.post.mockResolvedValueOnce({ clientSecret });

      const initResult = await PaymentService.initializePayment({
        amount,
        jobId,
        contractorId,
      });

      expect(initResult.client_secret).toBe(clientSecret);
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/payments/create-intent',
        {
          amount: 250,
          jobId,
          contractorId,
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        })
      );

      // Step 2: Create payment method (Stripe SDK directly).
      (stripeCreatePaymentMethod as jest.Mock).mockResolvedValueOnce({
        paymentMethod: {
          id: paymentMethodId,
          card: { last4: '4242', brand: 'visa' },
        },
        error: null,
      });

      const paymentMethod = await PaymentService.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: futureYear,
          cvc: '123',
        },
        billingDetails: { name: 'John Doe', email: 'john@example.com' },
      });

      expect(paymentMethod.id).toBe(paymentMethodId);

      // Step 3: Confirm payment (Stripe SDK directly).
      (stripeConfirmPayment as jest.Mock).mockResolvedValueOnce({
        paymentIntent: { id: 'pi_test_123', status: 'succeeded', amount: 250 },
        error: null,
      });

      const confirmResult = await PaymentService.confirmPayment({
        clientSecret,
        paymentMethodId,
      });

      expect(confirmResult.status).toBe('succeeded');

      // Step 4: Create escrow transaction via the API.
      mockApi.post.mockResolvedValueOnce({
        id: 'escrow-123',
        status: 'pending',
        amount,
      });

      const escrowTransaction = await PaymentService.createEscrowTransaction(
        jobId,
        'homeowner-123',
        contractorId,
        amount
      );

      expect(escrowTransaction.status).toBe('pending');
      expect(escrowTransaction.amount).toBe(amount);
      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/create-intent', {
        jobId,
        payerId: 'homeowner-123',
        payeeId: contractorId,
        amount,
      });

      // Step 5: Hold payment in escrow (strict { paymentIntentId, jobId } body).
      mockApi.post.mockResolvedValueOnce({});

      await PaymentService.holdPaymentInEscrow(
        escrowTransaction.id,
        'pi_test_123'
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/payments/confirm-intent',
        {
          paymentIntentId: 'pi_test_123',
          jobId: 'escrow-123',
        }
      );
    });

    it('should surface a requires_action status for 3D Secure', async () => {
      const clientSecret = 'pi_test_123_secret_456';
      const paymentMethodId = 'pm_test_789';

      (stripeConfirmPayment as jest.Mock).mockResolvedValueOnce({
        paymentIntent: { id: 'pi_test_123', status: 'requires_action' },
        error: null,
      });

      const firstAttempt = await PaymentService.confirmPayment({
        clientSecret,
        paymentMethodId,
      });
      expect(firstAttempt.status).toBe('requires_action');

      (stripeConfirmPayment as jest.Mock).mockResolvedValueOnce({
        paymentIntent: { id: 'pi_test_123', status: 'succeeded', amount: 250 },
        error: null,
      });

      const finalResult = await PaymentService.confirmPayment({
        clientSecret,
        paymentMethodId,
      });
      expect(finalResult.status).toBe('succeeded');
    });
  });

  describe('Escrow Management Workflows', () => {
    it('should release escrow via the release endpoint with explicit params', async () => {
      const paymentIntentId = 'pi_test_123';
      const jobId = 'job-789';
      const contractorId = 'contractor-456';
      const amount = 300;

      mockApi.post.mockResolvedValueOnce({ success: true });

      await PaymentService.releaseEscrow({
        paymentIntentId,
        jobId,
        contractorId,
        amount,
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/payments/release-escrow',
        {
          paymentIntentId,
          jobId,
          contractorId,
          amount,
        }
      );
    });

    it('should refund escrow via the refund endpoint', async () => {
      const transactionId = 'escrow-123';
      mockApi.post.mockResolvedValueOnce({ success: true });

      await PaymentService.refundEscrowPayment(transactionId);

      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/refund', {
        transactionId,
      });
    });
  });

  describe('Contractor Payout Workflows', () => {
    it('should onboard a contractor via the Stripe Connect endpoint', async () => {
      // setupContractorPayout POSTs to the canonical onboarding route; identity
      // comes from the auth cookie, so the contractorId arg is ignored server-side.
      mockApi.post.mockResolvedValueOnce({
        url: 'https://connect.stripe.com/express/onboarding/acct_123',
      });

      const result =
        await PaymentService.setupContractorPayout('contractor-456');

      expect(result.accountUrl).toBe(
        'https://connect.stripe.com/express/onboarding/acct_123'
      );
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/payments/stripe-connect/onboard',
        undefined
      );
    });

    // 2026-06-09 audit P0: getContractorPayoutStatus moved off the direct
    // profiles select (stripe_* columns are revoked from the authenticated
    // role) to GET /api/payments/stripe-connect/status.
    it('should report a complete payout account from the Connect status endpoint', async () => {
      mockApi.get.mockResolvedValueOnce({
        success: true,
        status: {
          accountId: 'acct_123',
          payoutsEnabled: true,
          transfersActive: true,
          canReceivePayouts: true,
        },
      });

      const status =
        await PaymentService.getContractorPayoutStatus('contractor-456');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/payments/stripe-connect/status'
      );
      expect(status.hasAccount).toBe(true);
      expect(status.accountComplete).toBe(true);
      expect(status.accountId).toBe('acct_123');
    });

    it('should report no payout account when no Connect account exists', async () => {
      mockApi.get.mockResolvedValueOnce({ success: true, status: null });

      const status =
        await PaymentService.getContractorPayoutStatus('contractor-456');

      expect(status.hasAccount).toBe(false);
      expect(status.accountComplete).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should propagate Stripe createPaymentMethod errors', async () => {
      const futureYear = new Date().getFullYear() + 1;
      const stripeErrors = [
        {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        },
        { type: 'api_error', message: 'An error occurred with our API.' },
        {
          type: 'authentication_error',
          message: 'Authentication with Stripe failed.',
        },
        {
          type: 'rate_limit_error',
          message: 'Too many requests made to the API too quickly.',
        },
      ];

      for (const error of stripeErrors) {
        (stripeCreatePaymentMethod as jest.Mock).mockResolvedValueOnce({
          paymentMethod: null,
          error,
        });

        await expect(
          PaymentService.createPaymentMethod({
            type: 'card',
            card: {
              number: '4000000000000002',
              expMonth: 12,
              expYear: futureYear,
              cvc: '123',
            },
          })
        ).rejects.toThrow(error.message);
      }
    });

    it('should retry initializePayment on a transient network error', async () => {
      // initializePayment wraps the API call in withRetry; a single transient
      // failure is retried internally and the one call resolves successfully.
      mockApi.post
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ clientSecret: 'pi_test_retry_success' });

      const result = await PaymentService.initializePayment({
        amount: 100,
        jobId: 'job-1',
        contractorId: 'contractor-1',
      });

      expect(result.client_secret).toBe('pi_test_retry_success');
      expect(mockApi.post).toHaveBeenCalledTimes(2);
    });

    it('should handle insufficient funds on confirmation', async () => {
      (stripeConfirmPayment as jest.Mock).mockResolvedValueOnce({
        paymentIntent: null,
        error: {
          type: 'card_error',
          code: 'insufficient_funds',
          message: 'Your card has insufficient funds.',
        },
      });

      await expect(
        PaymentService.confirmPayment({
          clientSecret: 'pi_test_123',
          paymentMethodId: 'pm_test_456',
        })
      ).rejects.toThrow('Your card has insufficient funds.');
    });

    it('should handle partial refund scenarios', async () => {
      mockApi.post.mockResolvedValueOnce({
        success: true,
        refund_id: 're_partial_123',
        amount_refunded: 50,
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: 50,
        reason: 'requested_by_customer',
      });

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('re_partial_123');
    });

    it('should validate payment amounts across scenarios (GBP cap)', async () => {
      const invalidAmounts = [
        { amount: -10, error: 'Amount must be greater than 0' },
        { amount: 0, error: 'Amount must be greater than 0' },
        { amount: 100001, error: 'Amount cannot exceed £100,000' },
      ];

      for (const { amount, error } of invalidAmounts) {
        await expect(
          PaymentService.initializePayment({
            amount,
            jobId: 'job-1',
            contractorId: 'contractor-1',
          })
        ).rejects.toThrow(error);
      }
    });

    it('should pass through amounts without cents conversion', async () => {
      const testAmounts = [99.99, 100.5, 50.25];

      for (const input of testAmounts) {
        mockApi.post.mockResolvedValueOnce({
          clientSecret: `pi_test_${input}`,
        });

        await PaymentService.initializePayment({
          amount: input,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        });

        expect(mockApi.post).toHaveBeenLastCalledWith(
          '/api/payments/create-intent',
          {
            amount: input,
            jobId: 'job-1',
            contractorId: 'contractor-1',
          },
          expect.objectContaining({
            headers: expect.objectContaining({
              'Idempotency-Key': expect.any(String),
            }),
          })
        );
      }
    });
  });

  describe('Fee Calculation Comprehensive Tests', () => {
    it('should calculate GBP fees accurately with no maximum cap', () => {
      const testCases = [
        {
          amount: 2,
          expected: {
            platformFee: 0.5,
            stripeFee: 0.23,
            contractorAmount: 1.27,
            totalFees: 0.73,
          },
        },
        {
          amount: 100,
          expected: {
            platformFee: 12,
            stripeFee: 1.7,
            contractorAmount: 86.3,
            totalFees: 13.7,
          },
        },
        {
          amount: 1000,
          expected: {
            platformFee: 120,
            stripeFee: 15.2,
            contractorAmount: 864.8,
            totalFees: 135.2,
          },
        },
        {
          amount: 2000,
          expected: {
            platformFee: 240,
            stripeFee: 30.2,
            contractorAmount: 1729.8,
            totalFees: 270.2,
          },
        },
      ];

      testCases.forEach(({ amount, expected }) => {
        const result = PaymentService.calculateFees(amount);

        expect(result.platformFee).toBe(expected.platformFee);
        expect(result.stripeFee).toBe(expected.stripeFee);
        expect(result.contractorAmount).toBe(expected.contractorAmount);
        expect(result.totalFees).toBe(expected.totalFees);

        // gross = contractorAmount + totalFees (allow for 2dp rounding)
        expect(
          Math.abs(result.contractorAmount + result.totalFees - amount)
        ).toBeLessThan(0.01);
      });
    });

    it('should apply the minimum platform fee for tiny amounts', () => {
      const result = PaymentService.calculateFees(2);
      expect(result.platformFee).toBe(0.5);
    });

    it('should scale the platform fee linearly above the old cap', () => {
      // £2000 * 12% = £240 — proves the legacy £50 cap is gone.
      const result = PaymentService.calculateFees(2000);
      expect(result.platformFee).toBe(240);
    });
  });

  describe('Payment History and Reporting', () => {
    it('should retrieve the authenticated user payment history', async () => {
      const userId = 'user-123';
      const mockHistory = [
        { id: 'txn-1', amount: 150, status: 'completed' },
        { id: 'txn-2', amount: 200, status: 'held' },
      ];

      mockApi.get.mockResolvedValueOnce({ payments: mockHistory });

      const result = await PaymentService.getUserPaymentHistory(userId);

      expect(mockApi.get).toHaveBeenCalledWith('/api/payments/history');
      expect(result).toHaveLength(2);
      expect((result[0] as { amount: number }).amount).toBe(150);
    });

    it('should retrieve job-specific escrow transactions', async () => {
      const jobId = 'job-123';
      const mockTransactions = [
        {
          id: 'escrow-1',
          job_id: jobId,
          payer_id: 'homeowner-1',
          payee_id: 'contractor-1',
          amount: 300,
          status: 'held',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ escrow: mockTransactions });

      const result = await PaymentService.getJobEscrowTransactions(jobId);

      expect(mockApi.get).toHaveBeenCalledWith(`/api/jobs/${jobId}/escrow`);
      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe(jobId);
      expect(result[0].status).toBe('held');
    });

    it('should return an empty list when history fetch fails', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Query failed'));

      const result = await PaymentService.getUserPaymentHistory('user-123');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch user payment history',
        expect.objectContaining({ userId: 'user-123' })
      );
    });
  });

  describe('Security and Validation Tests', () => {
    it('should validate card expiration dates correctly', async () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      await expect(
        PaymentService.createPaymentMethod({
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: currentYear - 1,
            cvc: '123',
          },
        })
      ).rejects.toThrow('Card has expired');

      if (currentMonth > 1) {
        await expect(
          PaymentService.createPaymentMethod({
            type: 'card',
            card: {
              number: '4242424242424242',
              expMonth: currentMonth - 1,
              expYear: currentYear,
              cvc: '123',
            },
          })
        ).rejects.toThrow('Card has expired');
      }

      (stripeCreatePaymentMethod as jest.Mock).mockResolvedValueOnce({
        paymentMethod: { id: 'pm_valid', card: { last4: '4242' } },
        error: null,
      });

      const result = await PaymentService.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: currentYear + 1,
          cvc: '123',
        },
      });

      expect(result.id).toBe('pm_valid');
    });

    it('should not forward the caller id to the history endpoint', async () => {
      // The server derives identity from the Bearer token, so a malicious userId
      // is never interpolated into the request URL.
      const maliciousUserId = "'; DROP TABLE users; --";
      mockApi.get.mockResolvedValueOnce({ payments: [] });

      const result =
        await PaymentService.getUserPaymentHistory(maliciousUserId);

      expect(result).toEqual([]);
      expect(mockApi.get).toHaveBeenCalledWith('/api/payments/history');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent payment initializations', async () => {
      const concurrentRequests = 10;
      mockApi.post.mockResolvedValue({ clientSecret: 'pi_concurrent_test' });

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        PaymentService.initializePayment({
          amount: 100 + i,
          jobId: `job-${i}`,
          contractorId: `contractor-${i}`,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result) => {
        expect(result.client_secret).toBe('pi_concurrent_test');
      });
      expect(mockApi.post).toHaveBeenCalledTimes(concurrentRequests);
    });
  });
});
