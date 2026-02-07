/**
 * Tests for PaymentService - Payment Processing Operations
 * Critical service handling real money transactions - comprehensive testing required
 */

// Mock Stripe first
import { PaymentService } from '../PaymentService';
import {
  confirmPayment as stripeConfirmPayment,
  createPaymentMethod as stripeCreatePaymentMethod,
} from '@stripe/stripe-react-native';

import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { config } from '../../config/environment';

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(() => Promise.resolve()),
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
  presentPaymentSheet: jest.fn(() => Promise.resolve({ error: null })),
  createTokenWithCard: jest.fn(() => Promise.resolve({
    token: { id: 'tok_test' },
    error: null,
  })),
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

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock config
jest.mock('../../config/environment', () => ({
  config: {
    apiBaseUrl: 'https://api.mintenance.com',
  },
}));

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
    amount: 10000, // $100 in cents
    client_secret: 'pi_test_secret',
  };

  const mockEscrowTransaction = {
    id: 'escrow-123',
    job_id: 'job-123',
    payer_id: 'user-123',
    payee_id: 'contractor-123',
    amount: 100,
    status: 'pending',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('initializePayment', () => {
    it('should initialize payment with valid amount', async () => {
      const mockResponse = { client_secret: 'pi_test_secret' };
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await PaymentService.initializePayment({
        amount: 100,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
        body: {
          amount: 10000, // Amount in cents
          jobId: 'job-123',
          contractorId: 'contractor-123',
        },
      });
      expect(result).toEqual(mockResponse);
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
          amount: 10001,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow('Amount cannot exceed $10,000');
    });

    it('should handle API error', async () => {
      const error = new Error('Payment initialization failed');
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: error.message },
      });

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

    it('should round amount to nearest cent', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { client_secret: 'pi_test_secret' },
        error: null,
      });

      await PaymentService.initializePayment({
        amount: 99.999,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
        body: {
          amount: 10000, // Rounded to 100.00
          jobId: 'job-123',
          contractorId: 'contractor-123',
        },
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
          expYear: 2026,
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
          expYear: 2026,
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
            expMonth: currentMonth - 1,
            expYear: currentYear,
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
            expYear: 2026,
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
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEscrowTransaction,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.createEscrowTransaction(
        'job-123',
        'user-123',
        'contractor-123',
        100
      );

      expect(supabase.from).toHaveBeenCalledWith('escrow_transactions');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        job_id: 'job-123',
        payer_id: 'user-123',
        payee_id: 'contractor-123',
        amount: 100,
        status: 'pending',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(result).toEqual(mockEscrowTransaction);
    });

    it('should handle database error', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(
        PaymentService.createEscrowTransaction('job-123', 'user-123', 'contractor-123', 100)
      ).rejects.toThrow('Database error');
    });
  });

  describe('holdPaymentInEscrow', () => {
    it('should hold payment in escrow successfully', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await PaymentService.holdPaymentInEscrow('escrow-123', 'pi_test_123');

      expect(supabase.from).toHaveBeenCalledWith('escrow_transactions');
      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'held',
        payment_intent_id: 'pi_test_123',
        updated_at: expect.any(String),
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'escrow-123');
    });

    it('should handle update error', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(
        PaymentService.holdPaymentInEscrow('escrow-123', 'pi_test_123')
      ).rejects.toThrow('Update failed');
    });
  });

  describe('releaseEscrowPayment', () => {
    it('should release escrow payment successfully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'escrow-123',
            amount: 100,
            payment_intent_id: 'pi_test_123',
            job: { contractor_id: 'contractor-123' },
          },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      };

      const mockUpdate = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockFrom) // First call for select
        .mockReturnValueOnce({ update: jest.fn().mockReturnValue(mockUpdate) }); // Second call for update

      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        error: null,
      });

      await PaymentService.releaseEscrowPayment('escrow-123');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('release-escrow-payment', {
        body: {
          transactionId: 'escrow-123',
          contractorId: 'contractor-123',
          amount: 100,
        },
      });
    });

    it('should handle transaction not found error', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(PaymentService.releaseEscrowPayment('escrow-123')).rejects.toThrow('Not found');
    });
  });

  describe('refundEscrowPayment', () => {
    it('should refund escrow payment successfully', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        error: null,
      });

      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await PaymentService.refundEscrowPayment('escrow-123');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('refund-escrow-payment', {
        body: { transactionId: 'escrow-123' },
      });
      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'refunded',
        refunded_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should handle refund error', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        error: { message: 'Refund failed' },
      });

      await expect(PaymentService.refundEscrowPayment('escrow-123')).rejects.toThrow(
        'Refund failed'
      );
    });
  });

  describe('refundPayment', () => {
    it('should process refund with valid amount', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { success: true, refund_id: 'refund-123' },
        error: null,
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: 50,
        reason: 'Customer requested refund',
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('process-refund', {
        body: {
          paymentIntentId: 'pi_test_123',
          amount: 50,
          reason: 'Customer requested refund',
        },
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
        platformFee: 5, // 5% of $100
        stripeFee: 3.2, // 2.9% + $0.30
        contractorAmount: 91.8, // $100 - $5 - $3.20
        totalFees: 8.2,
      });
    });

    it('should apply minimum platform fee', () => {
      const fees = PaymentService.calculateFees(5);

      expect(fees).toEqual({
        platformFee: 0.5, // Minimum $0.50
        stripeFee: 0.45, // 2.9% of $5 + $0.30
        contractorAmount: 4.05,
        totalFees: 0.95,
      });
    });

    it('should apply maximum platform fee', () => {
      const fees = PaymentService.calculateFees(2000);

      expect(fees).toEqual({
        platformFee: 50, // Maximum $50
        stripeFee: 58.3, // 2.9% of $2000 + $0.30
        contractorAmount: 1891.7,
        totalFees: 108.3,
      });
    });

    it('should handle decimal amounts correctly', () => {
      const fees = PaymentService.calculateFees(99.99);

      expect(fees.platformFee).toBeCloseTo(5, 2);
      expect(fees.stripeFee).toBeCloseTo(3.2, 2);
      expect(fees.totalFees).toBeCloseTo(8.2, 2);
      expect(fees.contractorAmount).toBeCloseTo(91.79, 2);
    });
  });

  describe('getPaymentMethods', () => {
    it('should fetch payment methods successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      const mockMethods = [
        {
          id: 'pm_1',
          type: 'card',
          card: {
            brand: 'Visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2025,
          },
          isDefault: true,
          createdAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'pm_2',
          type: 'card',
          card: {
            brand: 'Mastercard',
            last4: '5555',
            expiryMonth: 6,
            expiryYear: 2026,
          },
          isDefault: false,
          createdAt: '2025-01-02T00:00:00Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ methods: mockMethods }),
      });

      const result = await PaymentService.getPaymentMethods();

      expect(fetch).toHaveBeenCalledWith(`${config.apiBaseUrl}/api/payments/methods`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockSession.session.access_token}`,
        },
      });
      expect(result).toEqual({ methods: mockMethods });
    });

    it('should handle authentication error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      const result = await PaymentService.getPaymentMethods();

      expect(result).toEqual({ error: 'Not authenticated' });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch payment methods',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should handle API error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const result = await PaymentService.getPaymentMethods();

      expect(result).toEqual({ error: 'Server error' });
    });
  });

  describe('savePaymentMethod', () => {
    it('should save payment method successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await PaymentService.savePaymentMethod('pm_test_123', true);

      expect(fetch).toHaveBeenCalledWith(`${config.apiBaseUrl}/api/payments/save-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockSession.session.access_token}`,
        },
        body: JSON.stringify({
          paymentMethodId: 'pm_test_123',
          setAsDefault: true,
        }),
      });
      expect(result).toEqual({ success: true });
      expect(logger.info).toHaveBeenCalledWith('Payment method saved successfully', {
        paymentMethodId: 'pm_test_123',
      });
    });

    it('should handle save error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Failed to save' }),
      });

      const result = await PaymentService.savePaymentMethod('pm_test_123');

      expect(result).toEqual({
        success: false,
        error: 'Failed to save',
      });
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete payment method successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await PaymentService.deletePaymentMethod('pm_test_123');

      expect(fetch).toHaveBeenCalledWith(
        `${config.apiBaseUrl}/api/payments/methods/pm_test_123`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mockSession.session.access_token}`,
          },
        }
      );
      expect(result).toEqual({ success: true });
      expect(logger.info).toHaveBeenCalledWith('Payment method deleted successfully', {
        paymentMethodId: 'pm_test_123',
      });
    });

    it('should handle deletion error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Cannot delete default method' }),
      });

      const result = await PaymentService.deletePaymentMethod('pm_test_123');

      expect(result).toEqual({
        success: false,
        error: 'Cannot delete default method',
      });
    });
  });

  describe('processJobPayment', () => {
    it('should process payment successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          paymentIntentId: 'pi_test_123',
        }),
      });

      const result = await PaymentService.processJobPayment('job-123', 100, 'pm_test_123', true);

      expect(fetch).toHaveBeenCalledWith(
        `${config.apiBaseUrl}/api/payments/process-job-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockSession.session.access_token}`,
          },
          body: JSON.stringify({
            jobId: 'job-123',
            amount: 100,
            paymentMethodId: 'pm_test_123',
            saveForFuture: true,
          }),
        }
      );
      expect(result).toEqual({
        success: true,
        paymentIntentId: 'pi_test_123',
      });
      expect(logger.info).toHaveBeenCalledWith('Payment processed successfully', {
        jobId: 'job-123',
        amount: 100,
      });
    });

    it('should handle 3D Secure authentication requirement', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          requiresAction: true,
          clientSecret: 'pi_test_secret',
          paymentIntentId: 'pi_test_123',
        }),
      });

      const result = await PaymentService.processJobPayment('job-123', 100, 'pm_test_123');

      expect(result).toEqual({
        success: false,
        requiresAction: true,
        clientSecret: 'pi_test_secret',
        paymentIntentId: 'pi_test_123',
      });
      expect(logger.info).toHaveBeenCalledWith('Payment requires 3D Secure authentication', {
        jobId: 'job-123',
      });
    });

    it('should handle payment processing error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Insufficient funds' }),
      });

      const result = await PaymentService.processJobPayment('job-123', 100, 'pm_test_123');

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
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', { ascending: false });
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
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      const mockPayments = {
        payments: [
          { id: 'payment-1', amount: 100 },
          { id: 'payment-2', amount: 200 },
        ],
        total: 10,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPayments,
      });

      const result = await PaymentService.getPaymentHistory(5, 10);

      expect(fetch).toHaveBeenCalledWith(
        `${config.apiBaseUrl}/api/payments/history?limit=5&offset=10`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockSession.session.access_token}`,
          },
        }
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
    it('should fetch payment history for user as payer and payee', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          amount: 100,
          status: 'completed',
          payer_id: 'user-123',
          payee_id: 'contractor-456',
          job: { title: 'Fix plumbing' },
          payer: { first_name: 'John', last_name: 'Doe' },
          payee: { first_name: 'Jane', last_name: 'Smith' },
        },
      ];

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.getUserPaymentHistory('user-123');

      expect(supabase.from).toHaveBeenCalledWith('escrow_transactions');
      expect(mockFrom.or).toHaveBeenCalledWith('payer_id.eq.user-123,payee_id.eq.user-123');
      expect(result).toEqual(mockTransactions);
    });

    it('should return empty array on error', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.getUserPaymentHistory('user-123');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch user payment history',
        expect.objectContaining({ userId: 'user-123' })
      );
    });
  });

  describe('getContractorPayoutStatus', () => {
    it('should return payout status for contractor with account', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            contractor_id: 'contractor-123',
            stripe_account_id: 'acct_123',
            account_complete: true,
          },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.getContractorPayoutStatus('contractor-123');

      expect(result).toEqual({
        hasAccount: true,
        accountComplete: true,
        accountId: 'acct_123',
      });
    });

    it('should return no account status when contractor not found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await PaymentService.getContractorPayoutStatus('contractor-123');

      expect(result).toEqual({
        hasAccount: false,
        accountComplete: false,
      });
    });

    it('should throw error for other database errors', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(PaymentService.getContractorPayoutStatus('contractor-123')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('requestRefund', () => {
    it('should request refund successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          refundId: 'refund-123',
        }),
      });

      const result = await PaymentService.requestRefund('payment-123', 'Service not delivered');

      expect(fetch).toHaveBeenCalledWith(`${config.apiBaseUrl}/api/payments/payment-123/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockSession.session.access_token}`,
        },
        body: JSON.stringify({ reason: 'Service not delivered' }),
      });
      expect(result).toEqual({
        success: true,
        refundId: 'refund-123',
      });
      expect(logger.info).toHaveBeenCalledWith('Refund requested successfully', {
        paymentId: 'payment-123',
        refundId: 'refund-123',
      });
    });

    it('should handle refund request error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Refund period expired' }),
      });

      const result = await PaymentService.requestRefund('payment-123', 'Late request');

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
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { client_secret: 'pi_test_secret' },
        error: null,
      });

      await PaymentService.initializePayment({
        amount: 0.01,
        jobId: 'job-123',
        contractorId: 'contractor-123',
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
        body: {
          amount: 1, // $0.01 in cents
          jobId: 'job-123',
          contractorId: 'contractor-123',
        },
      });
    });

    it('should sanitize error messages before logging', async () => {
      const sensitiveError = new Error('Error: stripe_sk_live_123456');
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: sensitiveError.message },
      });

      await expect(
        PaymentService.initializePayment({
          amount: 100,
          jobId: 'job-123',
          contractorId: 'contractor-123',
        })
      ).rejects.toThrow();

      // Ensure sensitive data is not logged
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle network timeout gracefully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: mockSession,
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await PaymentService.getPaymentMethods();

      expect(result).toEqual({ error: 'Network timeout' });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch payment methods',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should validate card expiry date against current date', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Card expiring this month should be valid
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

      // Card expired last month should fail
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
    });
  });
});