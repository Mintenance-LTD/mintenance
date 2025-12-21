/**
 * Payment API Integration Tests
 *
 * Tests integration with backend payment APIs
 * Validates request/response contracts and error handling
 *
 * @group e2e
 * @group api-integration
 */

import { PaymentService } from '../../src/services/PaymentService';
import { supabase } from '../../src/lib/supabase';
import { API_BASE_URL } from '../../src/config/environment';
import {
  MOCK_TEST_USER,
  MOCK_TEST_JOB,
  mockApiSuccess,
  mockApiError,
  mockAuthSession,
  suppressConsoleLogs,
  isValidPaymentMethodId,
  isValidSetupIntentId,
  isValidPaymentIntentId,
} from './test-helpers';

// Mock dependencies
jest.mock('../../src/lib/supabase');
jest.mock('../../src/config/environment', () => ({
  API_BASE_URL: 'https://test.mintenance.com',
}));

global.fetch = jest.fn();

describe('Payment API Integration Tests', () => {
  suppressConsoleLogs();

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue(mockAuthSession());
  });

  describe('POST /api/payments/create-setup-intent', () => {
    it('should create setup intent successfully', async () => {
      const mockResponse = {
        clientSecret: 'seti_test_123_secret_abc',
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockApiSuccess(mockResponse));

      const result = await PaymentService.createSetupIntent();

      expect(result.setupIntentClientSecret).toBe('seti_test_123_secret_abc');
      expect(result.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/create-setup-intent`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
        })
      );
    });

    it('should handle 401 unauthorized error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(401, 'Unauthorized')
      );

      const result = await PaymentService.createSetupIntent();

      expect(result.error).toContain('Unauthorized');
      expect(result.setupIntentClientSecret).toBeUndefined();
    });

    it('should handle 500 server error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(500, 'Internal server error')
      );

      const result = await PaymentService.createSetupIntent();

      expect(result.error).toBeTruthy();
      expect(result.setupIntentClientSecret).toBeUndefined();
    });

    it('should handle network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await PaymentService.createSetupIntent();

      expect(result.error).toContain('Network timeout');
      expect(result.setupIntentClientSecret).toBeUndefined();
    });
  });

  describe('POST /api/payments/save-method', () => {
    it('should save payment method successfully', async () => {
      const paymentMethodId = 'pm_test_save_123';
      const setAsDefault = true;

      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiSuccess({ success: true })
      );

      const result = await PaymentService.savePaymentMethod(
        paymentMethodId,
        setAsDefault
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/save-method`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
          body: JSON.stringify({
            paymentMethodId,
            setAsDefault: setAsDefault,
          }),
        })
      );
    });

    it('should validate payment method ID format', () => {
      expect(isValidPaymentMethodId('pm_123abc')).toBe(true);
      expect(isValidPaymentMethodId('pm_test_valid_456')).toBe(true);
      expect(isValidPaymentMethodId('invalid_id')).toBe(false);
      expect(isValidPaymentMethodId('pi_123')).toBe(false); // PaymentIntent, not PaymentMethod
    });

    it('should handle duplicate payment method error', async () => {
      const paymentMethodId = 'pm_test_duplicate_123';

      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(400, 'Payment method already exists')
      );

      const result = await PaymentService.savePaymentMethod(paymentMethodId, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('GET /api/payments/methods', () => {
    it('should fetch payment methods successfully', async () => {
      const mockMethods = {
        methods: [
          {
            id: 'pm_test_1',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              expiryMonth: 12,
              expiryYear: 2030,
            },
            isDefault: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockApiSuccess(mockMethods));

      const result = await PaymentService.getPaymentMethods();

      expect(result.methods).toHaveLength(1);
      expect(result.methods![0].id).toBe('pm_test_1');
      expect(result.methods![0].card?.brand).toBe('visa');
      expect(result.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/methods`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
        })
      );
    });

    it('should handle no payment methods found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiSuccess({ methods: [] })
      );

      const result = await PaymentService.getPaymentMethods();

      expect(result.methods).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('should handle unauthorized access', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await PaymentService.getPaymentMethods();

      expect(result.error).toContain('Not authenticated');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/payments/methods/:id', () => {
    it('should delete payment method successfully', async () => {
      const paymentMethodId = 'pm_test_delete_123';

      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(null, { status: 200 })
      );

      const result = await PaymentService.deletePaymentMethod(paymentMethodId);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/methods/${paymentMethodId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
        })
      );
    });

    it('should handle payment method not found', async () => {
      const paymentMethodId = 'pm_test_not_found_123';

      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(404, 'Payment method not found')
      );

      const result = await PaymentService.deletePaymentMethod(paymentMethodId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should prevent deleting default payment method if only one exists', async () => {
      const paymentMethodId = 'pm_test_only_one_123';

      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(400, 'Cannot delete your only payment method')
      );

      const result = await PaymentService.deletePaymentMethod(paymentMethodId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('only payment method');
    });
  });

  describe('PUT /api/payments/methods/:id/default', () => {
    it('should set default payment method successfully', async () => {
      const paymentMethodId = 'pm_test_set_default_123';

      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(null, { status: 200 })
      );

      const result = await PaymentService.setDefaultPaymentMethod(paymentMethodId);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/methods/${paymentMethodId}/default`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
        })
      );
    });

    it('should handle payment method not found', async () => {
      const paymentMethodId = 'pm_test_not_found_123';

      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(404, 'Payment method not found')
      );

      const result = await PaymentService.setDefaultPaymentMethod(paymentMethodId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('POST /api/payments/create-intent', () => {
    it('should create payment intent successfully', async () => {
      const jobId = MOCK_TEST_JOB.id;
      const amount = 5000;
      const paymentMethodId = 'pm_test_payment_123';

      const mockResponse = {
        clientSecret: 'pi_test_123_secret_abc',
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockApiSuccess(mockResponse));

      const result = await PaymentService.createPaymentIntent(
        jobId,
        amount,
        paymentMethodId
      );

      expect(result.clientSecret).toBe('pi_test_123_secret_abc');
      expect(result.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/create-intent`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
          body: JSON.stringify({
            jobId,
            amount,
            paymentMethodId,
          }),
        })
      );
    });

    it('should validate payment intent ID format', () => {
      expect(isValidPaymentIntentId('pi_123abc')).toBe(true);
      expect(isValidPaymentIntentId('pi_test_valid_456')).toBe(true);
      expect(isValidPaymentIntentId('invalid_id')).toBe(false);
      expect(isValidPaymentIntentId('pm_123')).toBe(false); // PaymentMethod, not Intent
    });

    it('should handle invalid amount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(400, 'Amount must be greater than 0')
      );

      const result = await PaymentService.createPaymentIntent(
        MOCK_TEST_JOB.id,
        -100,
        'pm_test_123'
      );

      expect(result.error).toContain('Amount must be greater than 0');
    });
  });

  describe('POST /api/payments/process-job-payment', () => {
    it('should process job payment successfully', async () => {
      const jobId = MOCK_TEST_JOB.id;
      const amount = 5000;
      const paymentMethodId = 'pm_test_job_payment_123';

      const mockResponse = {
        success: true,
        paymentIntentId: 'pi_test_job_123',
        requiresAction: false,
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockApiSuccess(mockResponse));

      const result = await PaymentService.processJobPayment(
        jobId,
        amount,
        paymentMethodId,
        false
      );

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe('pi_test_job_123');
      expect(result.requiresAction).toBe(false);

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/process-job-payment`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
          body: JSON.stringify({
            jobId,
            amount,
            paymentMethodId,
            saveForFuture: false,
          }),
        })
      );
    });

    it('should handle 3D Secure required response', async () => {
      const mockResponse = {
        success: false,
        requiresAction: true,
        clientSecret: 'pi_test_3ds_secret',
        paymentIntentId: 'pi_test_3ds_123',
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockApiSuccess(mockResponse));

      const result = await PaymentService.processJobPayment(
        MOCK_TEST_JOB.id,
        5000,
        'pm_test_3ds_123',
        false
      );

      expect(result.requiresAction).toBe(true);
      expect(result.clientSecret).toBe('pi_test_3ds_secret');
      expect(result.paymentIntentId).toBe('pi_test_3ds_123');
    });

    it('should handle payment declined', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(400, 'Payment was declined')
      );

      const result = await PaymentService.processJobPayment(
        MOCK_TEST_JOB.id,
        5000,
        'pm_test_declined_123',
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('declined');
    });

    it('should handle job not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(404, 'Job not found')
      );

      const result = await PaymentService.processJobPayment(
        'invalid-job-id',
        5000,
        'pm_test_123',
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('GET /api/payments/history', () => {
    it('should fetch payment history successfully', async () => {
      const mockHistory = {
        payments: [
          {
            id: 'pi_test_1',
            amount: 5000,
            status: 'succeeded',
            created: 1234567890,
          },
          {
            id: 'pi_test_2',
            amount: 3000,
            status: 'succeeded',
            created: 1234567800,
          },
        ],
        total: 2,
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockApiSuccess(mockHistory));

      const result = await PaymentService.getPaymentHistory(20, 0);

      expect(result.payments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/history?limit=20&offset=0`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const mockHistory = {
        payments: [],
        total: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockApiSuccess(mockHistory));

      await PaymentService.getPaymentHistory(10, 20);

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/history?limit=10&offset=20`,
        expect.any(Object)
      );
    });
  });

  describe('POST /api/payments/:id/refund', () => {
    it('should request refund successfully', async () => {
      const paymentId = 'pi_test_refund_123';
      const reason = 'requested_by_customer';

      const mockResponse = {
        success: true,
        refundId: 're_test_123',
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockApiSuccess(mockResponse));

      const result = await PaymentService.requestRefund(paymentId, reason);

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('re_test_123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/payments/${paymentId}/refund`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_access_token_abc123',
          }),
          body: JSON.stringify({ reason }),
        })
      );
    });

    it('should handle refund not allowed', async () => {
      const paymentId = 'pi_test_old_123';

      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(400, 'Refund window has expired')
      );

      const result = await PaymentService.requestRefund(paymentId, 'duplicate');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await PaymentService.createSetupIntent();

      expect(result.error).toBeTruthy();
    });

    it('should handle network disconnection', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch')
      );

      const result = await PaymentService.createSetupIntent();

      expect(result.error).toContain('Failed to fetch');
    });

    it('should include auth token in all requests', async () => {
      const endpoints = [
        {
          method: PaymentService.createSetupIntent,
          path: '/api/payments/create-setup-intent',
        },
        {
          method: () => PaymentService.savePaymentMethod('pm_123', false),
          path: '/api/payments/save-method',
        },
        {
          method: PaymentService.getPaymentMethods,
          path: '/api/payments/methods',
        },
      ];

      for (const { method, path } of endpoints) {
        (global.fetch as jest.Mock).mockClear();
        (global.fetch as jest.Mock).mockResolvedValue(
          mockApiSuccess({ success: true })
        );

        await method();

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(path),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock_access_token_abc123',
            }),
          })
        );
      }
    });

    it('should handle rate limiting', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiError(429, 'Too many requests')
      );

      const result = await PaymentService.createSetupIntent();

      expect(result.error).toContain('Too many requests');
    });
  });
});
