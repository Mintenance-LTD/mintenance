import React from 'react';
import { PaymentService } from '../../services/PaymentService';
import { supabase } from '../../config/supabase';

// Mock Stripe
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
  retrievePaymentIntent: jest.fn(),
}));

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    },
    from: jest.fn()
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockStripe = require('@stripe/stripe-react-native');

const mockPaymentIntent = {
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret_456',
  amount: 15000, // $150.00
  currency: 'usd',
  status: 'requires_payment_method'
};

const mockPaymentMethod = {
  id: 'pm_test_123',
  card: {
    brand: 'visa',
    last4: '4242',
    exp_month: 12,
    exp_year: 2025
  }
};

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePayment', () => {
    it('creates payment intent successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { client_secret: mockPaymentIntent.client_secret },
        error: null
      });

      const result = await PaymentService.initializePayment({
        amount: 150,
        jobId: 'job-1',
        contractorId: 'contractor-1'
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
        body: {
          amount: 15000,
          jobId: 'job-1',
          contractorId: 'contractor-1'
        }
      });

      expect(result.client_secret).toBe(mockPaymentIntent.client_secret);
    });

    it('handles payment intent creation errors', async () => {
      const error = { message: 'Invalid amount' };
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error
      });

      await expect(PaymentService.initializePayment({
        amount: 150,
        jobId: 'job-1',
        contractorId: 'contractor-1'
      })).rejects.toThrow('Invalid amount');
    });

    it('validates payment amount', async () => {
      await expect(PaymentService.initializePayment({
        amount: 0,
        jobId: 'job-1',
        contractorId: 'contractor-1'
      })).rejects.toThrow('Amount must be greater than 0');

      await expect(PaymentService.initializePayment({
        amount: 10001,
        jobId: 'job-1',
        contractorId: 'contractor-1'
      })).rejects.toThrow('Amount cannot exceed $10,000');
    });
  });

  describe('confirmPayment', () => {
    it('confirms payment successfully', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: { ...mockPaymentIntent, status: 'succeeded' },
        error: null
      });

      const result = await PaymentService.confirmPayment({
        clientSecret: mockPaymentIntent.client_secret,
        paymentMethodId: mockPaymentMethod.id
      });

      expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
        mockPaymentIntent.client_secret,
        {
          paymentMethodType: 'Card',
          paymentMethodData: {
            paymentMethodId: mockPaymentMethod.id
          }
        }
      );

      expect(result.status).toBe('succeeded');
    });

    it('handles payment confirmation errors', async () => {
      const error = { message: 'Your card was declined' };
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: null,
        error
      });

      await expect(PaymentService.confirmPayment({
        clientSecret: mockPaymentIntent.client_secret,
        paymentMethodId: mockPaymentMethod.id
      })).rejects.toThrow('Your card was declined');
    });

    it('handles authentication required status', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: { ...mockPaymentIntent, status: 'requires_action' },
        error: null
      });

      const result = await PaymentService.confirmPayment({
        clientSecret: mockPaymentIntent.client_secret,
        paymentMethodId: mockPaymentMethod.id
      });

      expect(result.status).toBe('requires_action');
    });
  });

  describe('createPaymentMethod', () => {
    it('creates payment method with card details', async () => {
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: mockPaymentMethod,
        error: null
      });

      const result = await PaymentService.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2025,
          cvc: '123'
        },
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      });

      expect(result.id).toBe(mockPaymentMethod.id);
      expect(result.card?.last4).toBe('4242');
    });

    it('handles invalid card errors', async () => {
      const error = { message: 'Your card number is invalid' };
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: null,
        error
      });

      await expect(PaymentService.createPaymentMethod({
        type: 'card',
        card: {
          number: '1234567890123456',
          expMonth: 12,
          expYear: 2025,
          cvc: '123'
        }
      })).rejects.toThrow('Your card number is invalid');
    });

    it('validates card expiration', async () => {
      await expect(PaymentService.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 1,
          expYear: 2020,
          cvc: '123'
        }
      })).rejects.toThrow('Card has expired');
    });
  });

  describe('releaseEscrow', () => {
    it('releases payment to contractor successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, transfer_id: 'tr_test_123' },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      } as any);

      const result = await PaymentService.releaseEscrow({
        paymentIntentId: 'pi_test_123',
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 150
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('release-escrow-payment', {
        body: {
          paymentIntentId: 'pi_test_123',
          jobId: 'job-1',
          contractorId: 'contractor-1',
          amount: 150
        }
      });

      expect(result.success).toBe(true);
    });

    it('handles escrow release errors', async () => {
      const error = { message: 'Payment not found' };
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error
      });

      await expect(PaymentService.releaseEscrow({
        paymentIntentId: 'pi_test_123',
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 150
      })).rejects.toThrow('Payment not found');
    });

    it('updates job status after successful release', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, transfer_id: 'tr_test_123' },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      } as any);

      await PaymentService.releaseEscrow({
        paymentIntentId: 'pi_test_123',
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 150
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ 
        status: 'completed',
        payment_released: true 
      });
    });
  });

  describe('getPaymentHistory', () => {
    it('fetches payment history for user', async () => {
      const mockPayments = [
        {
          id: 'pay-1',
          amount: 150,
          status: 'completed',
          job_title: 'Kitchen Faucet Repair',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'pay-2',
          amount: 200,
          status: 'pending',
          job_title: 'Electrical Work',
          created_at: '2024-01-02T00:00:00Z'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPayments, error: null })
      } as any);

      const result = await PaymentService.getPaymentHistory('user-1');

      expect(result).toEqual(mockPayments);
      expect(mockSupabase.from).toHaveBeenCalledWith('payments');
    });

    it('filters payments by status', async () => {
      await PaymentService.getPaymentHistory('user-1', 'completed');

      const mockQuery = mockSupabase.from().select().eq();
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'completed');
    });
  });

  describe('refundPayment', () => {
    it('processes refund successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, refund_id: 're_test_123' },
        error: null
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: 150,
        reason: 'requested_by_customer'
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-refund', {
        body: {
          paymentIntentId: 'pi_test_123',
          amount: 150,
          reason: 'requested_by_customer'
        }
      });

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('re_test_123');
    });

    it('handles partial refunds', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, refund_id: 're_test_124' },
        error: null
      });

      await PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: 75, // Partial refund
        reason: 'requested_by_customer'
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-refund', {
        body: {
          paymentIntentId: 'pi_test_123',
          amount: 75,
          reason: 'requested_by_customer'
        }
      });
    });

    it('validates refund amount', async () => {
      await expect(PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: 0,
        reason: 'requested_by_customer'
      })).rejects.toThrow('Refund amount must be greater than 0');
    });
  });

  describe('calculateFees', () => {
    it('calculates platform fees correctly', () => {
      const result = PaymentService.calculateFees(100);

      expect(result.platformFee).toBe(5); // 5% of $100
      expect(result.stripeFee).toBe(3.20); // 2.9% + $0.30
      expect(result.contractorAmount).toBe(91.80);
      expect(result.totalFees).toBe(8.20);
    });

    it('handles minimum fee amounts', () => {
      const result = PaymentService.calculateFees(10); // Low amount

      expect(result.platformFee).toBe(0.50); // Minimum $0.50
      expect(result.contractorAmount).toBeLessThan(10);
    });

    it('applies fee caps for large amounts', () => {
      const result = PaymentService.calculateFees(5000); // Large amount

      expect(result.platformFee).toBe(50); // Cap at $50
      expect(result.contractorAmount).toBeGreaterThan(4800); // More realistic expectation
    });
  });
});
