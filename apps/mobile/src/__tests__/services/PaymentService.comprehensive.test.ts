import { PaymentService } from '../../services/PaymentService';
import { supabase } from '../../config/supabase';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('@stripe/stripe-react-native', () => ({
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
}));

jest.mock('../../config/environment', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000',
  },
}));

jest.mock('../../config/supabase', () => {
  const contractChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };
  return {
    supabase: {
      auth: {
        getSession: jest.fn(),
      },
      functions: {
        invoke: jest.fn(),
      },
      from: jest.fn(() => contractChain),
      __contractChain: contractChain,
    },
  };
});

// PaymentService now routes all HTTP through mobileApiClient (post/get), not
// global.fetch or supabase.functions.invoke. Mock it so service tests assert
// against the current network boundary.
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
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

const stripe = require('@stripe/stripe-react-native');
const { mobileApiClient } = require('../../utils/mobileApiClient');

describe('PaymentService - Comprehensive', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  // The service was refactored (audit-19/audit-53): createPaymentIntent now
  // (1) gates on a signed ('accepted') contract via supabase.from('contracts'),
  // (2) requires a contractorId so the server can resolve payee_id, and
  // (3) routes through mobileApiClient.post (not global.fetch). It returns a
  // structured response and never throws — failures come back as { error }.
  const setAcceptedContract = () => {
    (mockSupabase as any).__contractChain.single.mockResolvedValue({
      data: { id: 'contract-1', status: 'accepted' },
      error: null,
    });
  };

  describe('createPaymentIntent', () => {
    it('creates a payment intent when the contract is signed', async () => {
      setAcceptedContract();
      mobileApiClient.post.mockResolvedValue({
        clientSecret: 'pi_123_secret',
        paymentIntentId: 'pi_123',
        escrowTransactionId: 'esc_123',
      });

      const result = await PaymentService.createPaymentIntent(
        'job-123',
        1000,
        'pm_123',
        'contractor-1'
      );

      expect(result.clientSecret).toBe('pi_123_secret');
      expect(result.paymentIntentId).toBe('pi_123');
      expect(result.escrowTransactionId).toBe('esc_123');
      expect(result.error).toBeUndefined();
      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/payments/create-intent',
        {
          jobId: 'job-123',
          amount: 1000,
          paymentMethodId: 'pm_123',
          contractorId: 'contractor-1',
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        })
      );
    });

    it('returns an error when the contract is not signed', async () => {
      (mockSupabase as any).__contractChain.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows' },
      });

      const result = await PaymentService.createPaymentIntent(
        'job-123',
        1000,
        'pm_123',
        'contractor-1'
      );

      expect(result.clientSecret).toBeUndefined();
      expect(result.error).toContain(
        'Contract must be signed by both parties before payment'
      );
      expect(mobileApiClient.post).not.toHaveBeenCalled();
    });

    it('returns an error when contractorId is missing', async () => {
      setAcceptedContract();

      const result = await PaymentService.createPaymentIntent(
        'job-123',
        1000,
        'pm_123'
      );

      expect(result.clientSecret).toBeUndefined();
      expect(result.error).toContain('Contractor ID is required');
      expect(mobileApiClient.post).not.toHaveBeenCalled();
    });

    it('returns an error when the API call fails', async () => {
      setAcceptedContract();
      mobileApiClient.post.mockRejectedValue(
        new Error('Failed to create payment intent')
      );

      const result = await PaymentService.createPaymentIntent(
        'job-123',
        1000,
        'pm_123',
        'contractor-1'
      );

      expect(result.clientSecret).toBeUndefined();
      expect(result.error).toContain('Failed to create payment intent');
    });
  });

  describe('confirmPayment', () => {
    it('confirms payment intent successfully', async () => {
      stripe.confirmPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
        error: null,
      });

      const result = await PaymentService.confirmPayment({
        clientSecret: 'pi_123_secret',
        paymentMethodId: 'pm_123',
      });

      expect(result.status).toBe('succeeded');
      expect(stripe.confirmPayment).toHaveBeenCalledWith('pi_123_secret', {
        paymentMethodType: 'Card',
        paymentMethodData: { paymentMethodId: 'pm_123' },
      });
    });

    it('throws when confirmation fails', async () => {
      stripe.confirmPayment.mockResolvedValue({
        paymentIntent: null,
        error: { message: 'Card declined' },
      });

      await expect(
        PaymentService.confirmPayment({
          clientSecret: 'pi_123_secret',
          paymentMethodId: 'pm_123',
        })
      ).rejects.toThrow('Card declined');
    });
  });

  describe('createPaymentMethod', () => {
    it('creates a payment method when card is valid', async () => {
      const futureYear = new Date().getFullYear() + 1;
      stripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: 'pm_123', card: { last4: '4242' } },
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
      });

      expect(result.id).toBe('pm_123');
      expect(result.card?.last4).toBe('4242');
    });

    it('rejects expired cards', async () => {
      const currentYear = new Date().getFullYear();

      await expect(
        PaymentService.createPaymentMethod({
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 1,
            expYear: currentYear - 1,
            cvc: '123',
          },
        })
      ).rejects.toThrow('Card has expired');
    });
  });

  describe('refundPayment', () => {
    it('processes a refund via the refund API route', async () => {
      // refundPayment now goes through mobileApiClient.post('/api/payments/refund')
      // instead of supabase.functions.invoke('process-refund') (edge fn removed).
      mobileApiClient.post.mockResolvedValue({
        success: true,
        refund_id: 'rf_123',
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_123',
        amount: 500,
        reason: 'requested_by_customer',
      });

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('rf_123');
      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/payments/refund',
        {
          paymentIntentId: 'pi_123',
          amount: 500,
          reason: 'requested_by_customer',
        }
      );
    });

    it('rejects invalid refund amounts', async () => {
      await expect(
        PaymentService.refundPayment({
          paymentIntentId: 'pi_123',
          amount: 0,
          reason: 'requested_by_customer',
        })
      ).rejects.toThrow('Refund amount must be greater than 0');
    });
  });

  describe('calculateFees', () => {
    it('calculates platform and stripe fees', () => {
      const result = PaymentService.calculateFees(100);

      expect(result.platformFee).toBeGreaterThan(0);
      expect(result.stripeFee).toBeGreaterThan(0);
      expect(result.contractorAmount).toBeLessThan(100);
      expect(result.totalFees).toBeCloseTo(
        result.platformFee + result.stripeFee
      );
    });
  });
});
