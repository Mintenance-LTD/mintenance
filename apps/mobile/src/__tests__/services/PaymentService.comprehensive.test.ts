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

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
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

describe('PaymentService - Comprehensive', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('createPaymentIntent', () => {
    it('creates a payment intent when authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token-123' } },
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ clientSecret: 'pi_123_secret' }),
      });

      const result = await PaymentService.createPaymentIntent('job-123', 1000, 'pm_123');

      expect(result.clientSecret).toBe('pi_123_secret');
      expect(result.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/payments/create-intent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-123',
          },
          body: JSON.stringify({
            jobId: 'job-123',
            amount: 1000,
            paymentMethodId: 'pm_123',
          }),
        }
      );
    });

    it('returns an error when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } } as any);

      const result = await PaymentService.createPaymentIntent('job-123', 1000, 'pm_123');

      expect(result.clientSecret).toBeUndefined();
      expect(result.error).toContain('Not authenticated');
    });

    it('returns an error when API responds with failure', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token-123' } },
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Failed to create payment intent' }),
      });

      const result = await PaymentService.createPaymentIntent('job-123', 1000, 'pm_123');

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
    it('processes a refund via edge function', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, refund_id: 'rf_123' },
        error: null,
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_123',
        amount: 500,
        reason: 'requested_by_customer',
      });

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('rf_123');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-refund', {
        body: {
          paymentIntentId: 'pi_123',
          amount: 500,
          reason: 'requested_by_customer',
        },
      });
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
      expect(result.totalFees).toBeCloseTo(result.platformFee + result.stripeFee);
    });
  });
});
