/**
 * PaymentService — payment processing operations (money-critical).
 *
 * The mobile payment services route HTTP through `mobileApiClient`; the legacy
 * `create-payment-intent` / `release-escrow-payment` / `process-refund` Supabase
 * edge functions were deleted 2026-05-10. Fees are GBP-only: a flat 12% platform
 * rate, 1.5% + £0.20 Stripe rate, £0.50 minimum platform fee, and no maximum cap
 * (the £50 cap was removed 2026-05-22 with the tiered-fee rollout).
 */

import { PaymentService } from '../../services/PaymentService';
import { supabase } from '../../config/supabase';
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

// Supabase is still used directly for the getPaymentHistory string-path read.
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

const mockPaymentMethod = {
  id: 'pm_test_123',
  card: {
    brand: 'visa',
    last4: '4242',
  },
};

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePayment', () => {
    it('creates payment intent successfully (no cents conversion)', async () => {
      mockApi.post.mockResolvedValue({ clientSecret: 'pi_test_secret' });

      const result = await PaymentService.initializePayment({
        amount: 150,
        jobId: 'job-1',
        contractorId: 'contractor-1',
      });

      // Server takes GBP units — the client does NOT multiply by 100.
      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/create-intent', {
        amount: 150,
        jobId: 'job-1',
        contractorId: 'contractor-1',
      });
      expect(result.client_secret).toBe('pi_test_secret');
    });

    it('handles payment intent creation errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Invalid amount'));

      await expect(
        PaymentService.initializePayment({
          amount: 150,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        })
      ).rejects.toThrow('Invalid amount');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize payment',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('validates payment amount', async () => {
      await expect(
        PaymentService.initializePayment({
          amount: 0,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        })
      ).rejects.toThrow('Amount must be greater than 0');

      // GBP cap is £100,000 (no USD $10,000 cap anymore).
      await expect(
        PaymentService.initializePayment({
          amount: 100001,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        })
      ).rejects.toThrow('Amount cannot exceed £100,000');
    });

    it('passes decimal amounts through unchanged', async () => {
      mockApi.post.mockResolvedValue({ clientSecret: 'pi_secret_test' });

      const result = await PaymentService.initializePayment({
        amount: 99.99,
        jobId: 'job-1',
        contractorId: 'contractor-1',
      });

      expect(result.client_secret).toBe('pi_secret_test');
      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/create-intent', {
        amount: 99.99,
        jobId: 'job-1',
        contractorId: 'contractor-1',
      });
    });

    it('rejects negative amounts', async () => {
      await expect(
        PaymentService.initializePayment({
          amount: -100,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('rejects NaN amounts', async () => {
      await expect(
        PaymentService.initializePayment({
          amount: NaN,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('rejects Infinity amounts', async () => {
      // Number.isFinite(Infinity) === false → caught by the first guard.
      await expect(
        PaymentService.initializePayment({
          amount: Infinity,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });
  });

  describe('confirmPayment', () => {
    it('confirms payment successfully', async () => {
      const paymentIntent = { id: 'pi_test_123', status: 'succeeded' };
      (stripeConfirmPayment as jest.Mock).mockResolvedValue({
        paymentIntent,
        error: null,
      });

      const result = await PaymentService.confirmPayment({
        clientSecret: 'pi_test_secret',
        paymentMethodId: mockPaymentMethod.id,
      });

      expect(stripeConfirmPayment).toHaveBeenCalledWith('pi_test_secret', {
        paymentMethodType: 'Card',
        paymentMethodData: {
          paymentMethodId: mockPaymentMethod.id,
        },
      });
      expect(result.status).toBe('succeeded');
    });

    it('handles payment confirmation errors', async () => {
      (stripeConfirmPayment as jest.Mock).mockResolvedValue({
        paymentIntent: null,
        error: { message: 'Your card was declined' },
      });

      await expect(
        PaymentService.confirmPayment({
          clientSecret: 'pi_test_secret',
          paymentMethodId: mockPaymentMethod.id,
        })
      ).rejects.toThrow('Your card was declined');
    });

    it('returns requires_action status when 3D Secure is needed', async () => {
      (stripeConfirmPayment as jest.Mock).mockResolvedValue({
        paymentIntent: { id: 'pi_test_123', status: 'requires_action' },
        error: null,
      });

      const result = await PaymentService.confirmPayment({
        clientSecret: 'pi_test_secret',
        paymentMethodId: mockPaymentMethod.id,
      });

      expect(result.status).toBe('requires_action');
    });
  });

  describe('createPaymentMethod', () => {
    it('creates payment method with card details', async () => {
      const futureYear = new Date().getFullYear() + 1;
      (stripeCreatePaymentMethod as jest.Mock).mockResolvedValue({
        paymentMethod: mockPaymentMethod,
        error: null,
      });

      const result = await PaymentService.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: futureYear,
          cvc: '123',
        },
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });

      expect(result.id).toBe(mockPaymentMethod.id);
      expect(result.card?.last4).toBe('4242');
    });

    it('handles invalid card errors', async () => {
      const futureYear = new Date().getFullYear() + 1;
      (stripeCreatePaymentMethod as jest.Mock).mockResolvedValue({
        paymentMethod: null,
        error: { message: 'Your card number is invalid' },
      });

      await expect(
        PaymentService.createPaymentMethod({
          type: 'card',
          card: {
            number: '1234567890123456',
            expMonth: 12,
            expYear: futureYear,
            cvc: '123',
          },
        })
      ).rejects.toThrow('Your card number is invalid');
    });

    it('validates card expiration (past year)', async () => {
      await expect(
        PaymentService.createPaymentMethod({
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 1,
            expYear: 2020,
            cvc: '123',
          },
        })
      ).rejects.toThrow('Card has expired');
    });
  });

  describe('releaseEscrow', () => {
    it('releases payment to contractor successfully', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        transfer_id: 'tr_test_123',
      });

      const result = await PaymentService.releaseEscrow({
        paymentIntentId: 'pi_test_123',
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 150,
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/payments/release-escrow',
        {
          paymentIntentId: 'pi_test_123',
          jobId: 'job-1',
          contractorId: 'contractor-1',
          amount: 150,
        }
      );
      expect(result.success).toBe(true);
      expect(result.transfer_id).toBe('tr_test_123');
    });

    it('handles escrow release errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Payment not found'));

      await expect(
        PaymentService.releaseEscrow({
          paymentIntentId: 'pi_test_123',
          jobId: 'job-1',
          contractorId: 'contractor-1',
          amount: 150,
        })
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('getPaymentHistory', () => {
    it('fetches payment history for a user', async () => {
      const mockPayments = [
        {
          id: 'pay-1',
          amount: 150,
          status: 'completed',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'pay-2',
          amount: 200,
          status: 'pending',
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPayments, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.getPaymentHistory('user-1');

      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(result).toEqual(mockPayments);
    });

    it('filters payments by status', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await PaymentService.getPaymentHistory('user-1', 'completed');

      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'completed');
    });

    it('returns empty array on database error', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.getPaymentHistory('user-1');

      expect(result).toEqual([]);
    });

    it('fetches paginated history via mobileApiClient (numeric path)', async () => {
      mockApi.get.mockResolvedValue({ payments: [{ id: 'pay-1' }], total: 10 });

      const result = await PaymentService.getPaymentHistory(5, 10);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/payments/history?limit=5&offset=10'
      );
      expect(result).toEqual({ payments: [{ id: 'pay-1' }], total: 10 });
    });
  });

  describe('refundPayment', () => {
    it('processes refund successfully', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        refund_id: 're_test_123',
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: 150,
        reason: 'requested_by_customer',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/refund', {
        paymentIntentId: 'pi_test_123',
        amount: 150,
        reason: 'requested_by_customer',
      });
      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('re_test_123');
    });

    it('processes partial refunds with the correct amount', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        refund_id: 're_test_124',
        amount_refunded: 75,
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: 75,
        reason: 'requested_by_customer',
      });

      expect(result.success).toBe(true);
      expect(result.amount_refunded).toBe(75);
      expect(mockApi.post).toHaveBeenCalledWith('/api/payments/refund', {
        paymentIntentId: 'pi_test_123',
        amount: 75,
        reason: 'requested_by_customer',
      });
    });

    it('validates refund amount (zero)', async () => {
      await expect(
        PaymentService.refundPayment({
          paymentIntentId: 'pi_test_123',
          amount: 0,
          reason: 'requested_by_customer',
        })
      ).rejects.toThrow('Refund amount must be greater than 0');
    });

    it('validates refund amount (negative)', async () => {
      await expect(
        PaymentService.refundPayment({
          paymentIntentId: 'pi_test_123',
          amount: -50,
          reason: 'requested_by_customer',
        })
      ).rejects.toThrow('Refund amount must be greater than 0');
    });

    it('handles refund processing errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Refund already processed'));

      await expect(
        PaymentService.refundPayment({
          paymentIntentId: 'pi_test_123',
          amount: 100,
          reason: 'requested_by_customer',
        })
      ).rejects.toThrow('Refund already processed');
    });
  });

  describe('calculateFees', () => {
    it('calculates GBP platform + Stripe fees for a standard amount', () => {
      const result = PaymentService.calculateFees(100);

      expect(result.platformFee).toBe(12); // 12% of £100
      expect(result.stripeFee).toBe(1.7); // 1.5% of £100 + £0.20
      expect(result.contractorAmount).toBe(86.3);
      expect(result.totalFees).toBe(13.7);
    });

    it('applies the £0.50 minimum platform fee for small amounts', () => {
      const result = PaymentService.calculateFees(2);

      expect(result.platformFee).toBe(0.5); // 12% of £2 = £0.24 → £0.50 floor
      expect(result.contractorAmount).toBeLessThan(2);
    });

    it('scales the platform fee linearly with no maximum cap', () => {
      const result = PaymentService.calculateFees(2000);

      expect(result.platformFee).toBe(240); // 12% of £2000, no £50 cap
      expect(result.contractorAmount).toBeGreaterThan(1700);
    });

    it('returns fees with at most two decimal places', () => {
      const result = PaymentService.calculateFees(123.45);

      expect(
        result.platformFee.toString().split('.')[1]?.length || 0
      ).toBeLessThanOrEqual(2);
      expect(
        result.stripeFee.toString().split('.')[1]?.length || 0
      ).toBeLessThanOrEqual(2);
      expect(
        result.contractorAmount.toString().split('.')[1]?.length || 0
      ).toBeLessThanOrEqual(2);
      expect(
        result.totalFees.toString().split('.')[1]?.length || 0
      ).toBeLessThanOrEqual(2);
    });

    it('reconstructs the gross amount from contractorAmount + totalFees', () => {
      const amount = 100;
      const result = PaymentService.calculateFees(amount);

      const reconstructed = result.contractorAmount + result.totalFees;
      expect(Math.abs(reconstructed - amount)).toBeLessThan(0.01);
    });
  });
});
