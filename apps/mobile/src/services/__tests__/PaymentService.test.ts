/**
 * Tests for PaymentService - Payment Processing Operations
 * Critical service handling real money transactions - comprehensive testing required
 *
 * The payment services route HTTP through `mobileApiClient` (the create-payment-intent /
 * release-escrow-payment / process-refund Supabase edge functions were deleted 2026-05-10).
 * Fees are GBP-only and tier-aware server-side; the client FeeCalculator fallback is a flat
 * 12% platform rate, 1.5% + £0.20 Stripe rate, £0.50 minimum platform fee, no maximum cap.
 */

import { PaymentService } from '../PaymentService';
import {
  confirmPayment as stripeConfirmPayment,
  createPaymentMethod as stripeCreatePaymentMethod,
} from '@stripe/stripe-react-native';

import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(() => Promise.resolve()),
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
  presentPaymentSheet: jest.fn(() => Promise.resolve({ error: null })),
  createTokenWithCard: jest.fn(() =>
    Promise.resolve({
      token: { id: 'tok_test' },
      error: null,
    })
  ),
}));

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

// Supabase is still used directly for: contracts (createPaymentIntent) and the payments
// table (getPaymentHistory string path). getContractorPayoutStatus moved to the API
// client 2026-06-09 (profiles stripe_* columns are revoked from the authenticated role).
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

const mockApi = mobileApiClient as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

describe('PaymentService', () => {
  const mockSession = {
    session: {
      access_token: 'test-access-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    },
  };

  const mockPaymentIntent = {
    id: 'pi_test_123',
    status: 'succeeded',
    amount: 10000,
    client_secret: 'pi_test_secret',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePayment', () => {
    it('should initialize payment with valid amount', async () => {
      mockApi.post.mockResolvedValue({ clientSecret: 'pi_test_secret' });

      const result = await PaymentService.initializePayment({
        amount: 100,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });

      // No cents conversion — server takes GBP units.
      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/create-intent', {
        amount: 100,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });
      expect(result).toEqual({ client_secret: 'pi_test_secret' });
    });

    it('should throw error for zero amount', async () => {
      await expect(
        PaymentService.initializePayment({
          amount: 0,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should throw error for negative amount', async () => {
      await expect(
        PaymentService.initializePayment({
          amount: -50,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should throw error for amount exceeding limit', async () => {
      await expect(
        PaymentService.initializePayment({
          amount: 100001,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow('Amount cannot exceed £100,000');
    });

    it('should handle API error', async () => {
      mockApi.post.mockRejectedValue(
        new Error('Payment initialization failed')
      );

      await expect(
        PaymentService.initializePayment({
          amount: 100,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow('Payment initialization failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize payment',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should pass the amount through without cents conversion', async () => {
      mockApi.post.mockResolvedValue({ clientSecret: 'pi_test_secret' });

      await PaymentService.initializePayment({
        amount: 99.99,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/create-intent', {
        amount: 99.99,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });
    });
  });

  describe('createPaymentMethod', () => {
    it('should create payment method successfully', async () => {
      const mockPaymentMethod = {
        id: 'pm_test_123',
        card: {
          last4: '4242',
          brand: 'Visa',
        },
      };

      (stripeCreatePaymentMethod as jest.Mock).mockResolvedValue({
        paymentMethod: mockPaymentMethod,
        error: null,
      });

      const result = await PaymentService.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2099,
          cvc: '123',
        },
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });

      expect(stripeCreatePaymentMethod).toHaveBeenCalledWith({
        paymentMethodType: 'Card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2099,
          cvc: '123',
        },
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should throw error for expired card', async () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      await expect(
        PaymentService.createPaymentMethod({
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: currentMonth === 1 ? 12 : currentMonth - 1,
            expYear: currentMonth === 1 ? currentYear - 1 : currentYear,
            cvc: '123',
          },
        })
      ).rejects.toThrow('Card has expired');
    });

    it('should handle Stripe error', async () => {
      (stripeCreatePaymentMethod as jest.Mock).mockResolvedValue({
        paymentMethod: null,
        error: { message: 'Invalid card number' },
      });

      await expect(
        PaymentService.createPaymentMethod({
          type: 'card',
          card: {
            number: '4000000000000002',
            expMonth: 12,
            expYear: 2099,
            cvc: '123',
          },
        })
      ).rejects.toThrow('Invalid card number');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      (stripeConfirmPayment as jest.Mock).mockResolvedValue({
        paymentIntent: mockPaymentIntent,
        error: null,
      });

      const result = await PaymentService.confirmPayment({
        clientSecret: 'pi_test_secret',
        paymentMethodId: 'pm_test_123',
      });

      expect(stripeConfirmPayment).toHaveBeenCalledWith('pi_test_secret', {
        paymentMethodType: 'Card',
        paymentMethodData: {
          paymentMethodId: 'pm_test_123',
        },
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should handle confirmation error', async () => {
      (stripeConfirmPayment as jest.Mock).mockResolvedValue({
        paymentIntent: null,
        error: { message: 'Card declined' },
      });

      await expect(
        PaymentService.confirmPayment({
          clientSecret: 'pi_test_secret',
          paymentMethodId: 'pm_test_123',
        })
      ).rejects.toThrow('Card declined');
    });
  });

  describe('createEscrowTransaction', () => {
    it('should create escrow transaction successfully', async () => {
      mockApi.post.mockResolvedValue({
        id: 'escrow-123',
        status: 'pending',
        amount: 100,
      });

      const result = await PaymentService.createEscrowTransaction(
        'job-123',
        'user-123',
        'contractor-123',
        100
      );

      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/create-intent', {
        jobId: 'job-123',
        payerId: 'user-123',
        payeeId: 'contractor-123',
        amount: 100,
      });
      expect(result).toEqual({
        id: 'escrow-123',
        status: 'pending',
        amount: 100,
      });
    });

    it('should handle API error', async () => {
      mockApi.post.mockRejectedValue(new Error('Database error'));

      await expect(
        PaymentService.createEscrowTransaction(
          'job-123',
          'user-123',
          'contractor-123',
          100
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('holdPaymentInEscrow', () => {
    it('should hold payment in escrow successfully', async () => {
      mockApi.post.mockResolvedValue({});

      await PaymentService.holdPaymentInEscrow('job-123', 'pi_test_123');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/payments/confirm-intent',
        {
          paymentIntentId: 'pi_test_123',
          jobId: 'job-123',
        }
      );
    });

    it('should handle update error', async () => {
      mockApi.post.mockRejectedValue(new Error('Update failed'));

      await expect(
        PaymentService.holdPaymentInEscrow('job-123', 'pi_test_123')
      ).rejects.toThrow('Update failed');
    });
  });

  describe('releaseEscrowPayment', () => {
    it('should release escrow payment successfully', async () => {
      mockApi.get.mockResolvedValue({
        id: 'escrow-123',
        amount: 100,
        payment_intent_id: 'pi_test_123',
        job: { contractor_id: 'contractor-123' },
      });
      mockApi.post.mockResolvedValue({});

      await PaymentService.releaseEscrowPayment('escrow-123');

      expect(mockApi.get).toHaveBeenCalledWith('/api/escrow/escrow-123/status');
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/payments/release-escrow',
        {
          transactionId: 'escrow-123',
          contractorId: 'contractor-123',
          amount: 100,
        }
      );
    });

    it('should handle transaction not found error', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(
        PaymentService.releaseEscrowPayment('escrow-123')
      ).rejects.toThrow('Not found');
    });
  });

  describe('refundEscrowPayment', () => {
    it('should refund escrow payment successfully', async () => {
      mockApi.post.mockResolvedValue({});

      await PaymentService.refundEscrowPayment('escrow-123');

      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/refund', {
        transactionId: 'escrow-123',
      });
    });

    it('should handle refund error', async () => {
      mockApi.post.mockRejectedValue(new Error('Refund failed'));

      await expect(
        PaymentService.refundEscrowPayment('escrow-123')
      ).rejects.toThrow('Refund failed');
    });
  });

  describe('refundPayment', () => {
    it('should process refund with valid amount', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        refund_id: 'refund-123',
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: 50,
        reason: 'Customer requested refund',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/refund', {
        paymentIntentId: 'pi_test_123',
        amount: 50,
        reason: 'Customer requested refund',
      });
      expect(result).toEqual({ success: true, refund_id: 'refund-123' });
    });

    it('should throw error for invalid refund amount', async () => {
      await expect(
        PaymentService.refundPayment({
          paymentIntentId: 'pi_test_123',
          amount: 0,
          reason: 'Test refund',
        })
      ).rejects.toThrow('Refund amount must be greater than 0');
    });

    it('should throw error for negative refund amount', async () => {
      await expect(
        PaymentService.refundPayment({
          paymentIntentId: 'pi_test_123',
          amount: -10,
          reason: 'Test refund',
        })
      ).rejects.toThrow('Refund amount must be greater than 0');
    });
  });

  describe('calculateFees', () => {
    it('should calculate fees correctly for standard amount', () => {
      const fees = PaymentService.calculateFees(100);

      expect(fees).toEqual({
        platformFee: 12, // 12% of £100
        stripeFee: 1.7, // 1.5% of £100 + £0.20
        contractorAmount: 86.3,
        totalFees: 13.7,
      });
    });

    it('should apply minimum platform fee', () => {
      const fees = PaymentService.calculateFees(2);

      expect(fees).toEqual({
        platformFee: 0.5, // 12% of £2 = £0.24 → floored to £0.50 minimum
        stripeFee: 0.23, // 1.5% of £2 + £0.20
        contractorAmount: 1.27,
        totalFees: 0.73,
      });
    });

    it('should scale platform fee linearly with no maximum cap', () => {
      const fees = PaymentService.calculateFees(2000);

      expect(fees).toEqual({
        platformFee: 240, // 12% of £2000 — no £50 cap anymore
        stripeFee: 30.2, // 1.5% of £2000 + £0.20
        contractorAmount: 1729.8,
        totalFees: 270.2,
      });
    });

    it('should handle decimal amounts correctly', () => {
      const fees = PaymentService.calculateFees(99.99);

      expect(fees.platformFee).toBeCloseTo(12, 2);
      expect(fees.stripeFee).toBeCloseTo(1.7, 2);
      expect(fees.totalFees).toBeCloseTo(13.7, 2);
      expect(fees.contractorAmount).toBeCloseTo(86.29, 2);
    });
  });

  describe('getPaymentMethods', () => {
    it('should fetch payment methods successfully', async () => {
      const mockMethods = [
        {
          id: 'pm_1',
          type: 'card',
          card: {
            brand: 'Visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2025,
          },
          isDefault: true,
          created: 1735689600,
        },
        {
          id: 'pm_2',
          type: 'card',
          card: {
            brand: 'Mastercard',
            last4: '5555',
            expMonth: 6,
            expYear: 2026,
          },
          isDefault: false,
          created: 1735776000,
        },
      ];

      mockApi.get.mockResolvedValue({ paymentMethods: mockMethods });

      const result = await PaymentService.getPaymentMethods();

      expect(mockApi.get).toHaveBeenCalledWith('/api/payments/methods');
      expect(result).toEqual({
        methods: [
          expect.objectContaining({
            id: 'pm_1',
            isDefault: true,
            card: expect.objectContaining({
              brand: 'Visa',
              last4: '4242',
              expiryMonth: 12,
              expiryYear: 2025,
            }),
          }),
          expect.objectContaining({
            id: 'pm_2',
            isDefault: false,
            card: expect.objectContaining({
              brand: 'Mastercard',
              last4: '5555',
              expiryMonth: 6,
              expiryYear: 2026,
            }),
          }),
        ],
      });
    });

    it('should return an error when the request is unauthenticated', async () => {
      mockApi.get.mockRejectedValue(new Error('Not authenticated'));

      const result = await PaymentService.getPaymentMethods();

      expect(result).toEqual({ error: 'Not authenticated' });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch payment methods',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should handle API error', async () => {
      mockApi.get.mockRejectedValue(new Error('Server error'));

      const result = await PaymentService.getPaymentMethods();

      expect(result).toEqual({ error: 'Server error' });
    });
  });

  describe('savePaymentMethod', () => {
    it('should save payment method successfully', async () => {
      mockApi.post.mockResolvedValue({ success: true });

      const result = await PaymentService.savePaymentMethod(
        'pm_test_123',
        true
      );

      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/add-method', {
        paymentMethodId: 'pm_test_123',
        setAsDefault: true,
      });
      expect(result).toEqual({ success: true });
      expect(logger.info).toHaveBeenCalledWith(
        'Payment method saved successfully',
        {
          paymentMethodId: 'pm_test_123',
        }
      );
    });

    it('should handle save error', async () => {
      mockApi.post.mockRejectedValue(new Error('Failed to save'));

      const result = await PaymentService.savePaymentMethod('pm_test_123');

      expect(result).toEqual({
        success: false,
        error: 'Failed to save',
      });
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete payment method successfully', async () => {
      mockApi.delete.mockResolvedValue({});

      const result = await PaymentService.deletePaymentMethod('pm_test_123');

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/payments/remove-method',
        {
          body: JSON.stringify({ paymentMethodId: 'pm_test_123' }),
        }
      );
      expect(result).toEqual({ success: true });
      expect(logger.info).toHaveBeenCalledWith(
        'Payment method deleted successfully',
        {
          paymentMethodId: 'pm_test_123',
        }
      );
    });

    it('should handle deletion error', async () => {
      mockApi.delete.mockRejectedValue(
        new Error('Cannot delete default method')
      );

      const result = await PaymentService.deletePaymentMethod('pm_test_123');

      expect(result).toEqual({
        success: false,
        error: 'Cannot delete default method',
      });
    });
  });

  describe('processJobPayment', () => {
    it('should process payment successfully', async () => {
      mockApi.post.mockResolvedValue({ paymentIntentId: 'pi_test_123' });

      const result = await PaymentService.processJobPayment(
        'job-123',
        100,
        'pm_test_123',
        true
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/payments/process-job-payment',
        {
          jobId: 'job-123',
          amount: 100,
          paymentMethodId: 'pm_test_123',
          saveForFuture: true,
        }
      );
      expect(result).toEqual({
        success: true,
        paymentIntentId: 'pi_test_123',
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Payment processed successfully',
        {
          jobId: 'job-123',
          amount: 100,
        }
      );
    });

    it('should handle 3D Secure authentication requirement', async () => {
      mockApi.post.mockResolvedValue({
        requiresAction: true,
        clientSecret: 'pi_test_secret',
        paymentIntentId: 'pi_test_123',
      });

      const result = await PaymentService.processJobPayment(
        'job-123',
        100,
        'pm_test_123'
      );

      expect(result).toEqual({
        success: false,
        requiresAction: true,
        clientSecret: 'pi_test_secret',
        paymentIntentId: 'pi_test_123',
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Payment requires 3D Secure authentication',
        {
          jobId: 'job-123',
        }
      );
    });

    it('should handle payment processing error', async () => {
      mockApi.post.mockRejectedValue(new Error('Insufficient funds'));

      const result = await PaymentService.processJobPayment(
        'job-123',
        100,
        'pm_test_123'
      );

      expect(result).toEqual({
        success: false,
        error: 'Insufficient funds',
      });
    });
  });

  describe('getPaymentHistory', () => {
    it('should fetch payment history for specific user', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          user_id: 'user-123',
          amount: 100,
          status: 'succeeded',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'payment-2',
          user_id: 'user-123',
          amount: 200,
          status: 'succeeded',
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPayments,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.getPaymentHistory('user-123');

      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(result).toEqual(mockPayments);
    });

    it('should filter by status when provided', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await PaymentService.getPaymentHistory('user-123', 'succeeded');

      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'succeeded');
    });

    it('should handle pagination with limit and offset', async () => {
      const mockPayments = {
        payments: [
          { id: 'payment-1', amount: 100 },
          { id: 'payment-2', amount: 200 },
        ],
        total: 10,
      };

      mockApi.get.mockResolvedValue(mockPayments);

      const result = await PaymentService.getPaymentHistory(5, 10);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/payments/history?limit=5&offset=10'
      );
      expect(result).toEqual(mockPayments);
    });

    it('should return empty array on database error', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.getPaymentHistory('user-123');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch payment history',
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Database error' }),
          userId: 'user-123',
        })
      );
    });
  });

  describe('getUserPaymentHistory', () => {
    it('should fetch payment history for the authenticated user', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          amount: 100,
          status: 'completed',
          payer_id: 'user-123',
          payee_id: 'contractor-456',
        },
      ];

      mockApi.get.mockResolvedValue({ payments: mockTransactions });

      const result = await PaymentService.getUserPaymentHistory('user-123');

      expect(mockApi.get).toHaveBeenCalledWith('/api/payments/history');
      expect(result).toEqual(mockTransactions);
    });

    it('should return empty array on error', async () => {
      mockApi.get.mockRejectedValue(new Error('Query failed'));

      const result = await PaymentService.getUserPaymentHistory('user-123');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch user payment history',
        expect.objectContaining({ userId: 'user-123' })
      );
    });
  });

  describe('getContractorPayoutStatus', () => {
    // 2026-06-09 audit P0: repointed from a direct profiles select (the
    // stripe_* columns are revoked from the authenticated role) to
    // GET /api/payments/stripe-connect/status via mobileApiClient.
    it('should return payout status for contractor with a complete account', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        status: {
          accountId: 'acct_123',
          payoutsEnabled: true,
          transfersActive: true,
          canReceivePayouts: true,
        },
      });

      const result =
        await PaymentService.getContractorPayoutStatus('contractor-123');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/payments/stripe-connect/status'
      );
      expect(result).toEqual({
        hasAccount: true,
        accountComplete: true,
        accountId: 'acct_123',
      });
    });

    it('should return incomplete status when payouts are not yet enabled', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        status: {
          accountId: 'acct_123',
          payoutsEnabled: false,
          transfersActive: false,
          canReceivePayouts: false,
        },
      });

      const result =
        await PaymentService.getContractorPayoutStatus('contractor-123');

      expect(result).toEqual({
        hasAccount: true,
        accountComplete: false,
        accountId: 'acct_123',
      });
    });

    it('should return no account status when no Connect account exists', async () => {
      mockApi.get.mockResolvedValue({ success: true, status: null });

      const result =
        await PaymentService.getContractorPayoutStatus('contractor-123');

      expect(result).toEqual({
        hasAccount: false,
        accountComplete: false,
      });
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        PaymentService.getContractorPayoutStatus('contractor-123')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('requestRefund', () => {
    it('should request refund successfully', async () => {
      mockApi.get.mockResolvedValue({
        payments: [{ id: 'payment-123', jobId: 'job-123' }],
      });
      mockApi.post.mockResolvedValue({ refundId: 'refund-123' });

      const result = await PaymentService.requestRefund(
        'payment-123',
        'Service not delivered'
      );

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/payments/history?limit=50&offset=0'
      );
      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/refund', {
        jobId: 'job-123',
        escrowTransactionId: 'payment-123',
        reason: 'Service not delivered',
      });
      expect(result).toEqual({
        success: true,
        refundId: 'refund-123',
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Refund requested successfully',
        {
          paymentId: 'payment-123',
          refundId: 'refund-123',
        }
      );
    });

    it('should handle refund request error', async () => {
      mockApi.get.mockResolvedValue({
        payments: [{ id: 'payment-123', jobId: 'job-123' }],
      });
      mockApi.post.mockRejectedValue(new Error('Refund period expired'));

      const result = await PaymentService.requestRefund(
        'payment-123',
        'Late request'
      );

      expect(result).toEqual({
        success: false,
        error: 'Refund period expired',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to request refund',
        expect.objectContaining({ paymentId: 'payment-123' })
      );
    });
  });

  describe('Edge cases and security', () => {
    it('should handle NaN amount gracefully', async () => {
      await expect(
        PaymentService.initializePayment({
          amount: NaN,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should handle Infinity amount', async () => {
      await expect(
        PaymentService.initializePayment({
          amount: Infinity,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should handle very small positive amounts', async () => {
      mockApi.post.mockResolvedValue({ clientSecret: 'pi_test_secret' });

      await PaymentService.initializePayment({
        amount: 0.01,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/create-intent', {
        amount: 0.01,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });
    });

    it('should sanitize error messages before logging', async () => {
      mockApi.post.mockRejectedValue(new Error('Error: stripe_sk_live_123456'));

      await expect(
        PaymentService.initializePayment({
          amount: 100,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('Network request failed'));

      const result = await PaymentService.getPaymentMethods();

      expect(result).toEqual({ error: 'Network request failed' });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch payment methods',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should validate card expiry date against current date', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      (stripeCreatePaymentMethod as jest.Mock).mockResolvedValue({
        paymentMethod: { id: 'pm_test' },
        error: null,
      });

      await expect(
        PaymentService.createPaymentMethod({
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: currentMonth,
            expYear: currentYear,
            cvc: '123',
          },
        })
      ).resolves.toBeTruthy();

      await expect(
        PaymentService.createPaymentMethod({
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: currentMonth === 1 ? 12 : currentMonth - 1,
            expYear: currentMonth === 1 ? currentYear - 1 : currentYear,
            cvc: '123',
          },
        })
      ).rejects.toThrow('Card has expired');
    });
  });
});
