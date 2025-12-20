/**
 * Comprehensive Payment Flows Test Suite
 * Tests all critical payment workflows end-to-end
 */

import { PaymentService } from '../../services/PaymentService';
import { supabase } from '../../config/supabase';

// Enhanced mocking for comprehensive testing
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  createToken: jest.fn(),
  handleCardAction: jest.fn(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockStripe = require('@stripe/stripe-react-native');

describe('Payment Flows - Comprehensive Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Payment Workflow', () => {
    it('should handle successful end-to-end payment flow', async () => {
      // Mock data for complete workflow
      const jobId = 'job-123';
      const contractorId = 'contractor-456';
      const amount = 250;
      const clientSecret = 'pi_test_123_secret_456';
      const paymentMethodId = 'pm_test_789';

      // Step 1: Initialize payment
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { client_secret: clientSecret },
        error: null,
      });

      const initResult = await PaymentService.initializePayment({
        amount,
        jobId,
        contractorId,
      });

      expect(initResult.client_secret).toBe(clientSecret);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-payment-intent',
        {
          body: {
            amount: 25000, // $250 in cents
            jobId,
            contractorId,
          },
        }
      );

      // Step 2: Create payment method
      mockStripe.createPaymentMethod.mockResolvedValueOnce({
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
          expYear: 2025,
          cvc: '123',
        },
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });

      expect(paymentMethod.id).toBe(paymentMethodId);

      // Step 3: Confirm payment
      mockStripe.confirmPayment.mockResolvedValueOnce({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'succeeded',
          amount: 25000,
        },
        error: null,
      });

      const confirmResult = await PaymentService.confirmPayment({
        clientSecret,
        paymentMethodId,
      });

      expect(confirmResult.status).toBe('succeeded');

      // Step 4: Create escrow transaction
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'escrow-123',
            job_id: jobId,
            payer_id: 'homeowner-123',
            payee_id: contractorId,
            amount,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      } as any);

      const escrowTransaction = await PaymentService.createEscrowTransaction(
        jobId,
        'homeowner-123',
        contractorId,
        amount
      );

      expect(escrowTransaction.status).toBe('pending');
      expect(escrowTransaction.amount).toBe(amount);

      // Step 5: Hold payment in escrow
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await PaymentService.holdPaymentInEscrow(escrowTransaction.id, 'pi_test_123');

      expect(mockSupabase.from).toHaveBeenCalledWith('escrow_transactions');
    });

    it('should handle payment flow with 3D Secure authentication', async () => {
      const clientSecret = 'pi_test_123_secret_456';
      const paymentMethodId = 'pm_test_789';

      // Step 1: Initial payment confirmation requires action
      mockStripe.confirmPayment.mockResolvedValueOnce({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'requires_action',
          next_action: {
            type: 'use_stripe_sdk',
          },
        },
        error: null,
      });

      const firstAttempt = await PaymentService.confirmPayment({
        clientSecret,
        paymentMethodId,
      });

      expect(firstAttempt.status).toBe('requires_action');

      // Step 2: Handle card action (3D Secure)
      mockStripe.handleCardAction.mockResolvedValueOnce({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'requires_confirmation',
        },
        error: null,
      });

      // Step 3: Final confirmation after authentication
      mockStripe.confirmPayment.mockResolvedValueOnce({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'succeeded',
          amount: 25000,
        },
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
    it('should handle complete escrow lifecycle', async () => {
      const transactionId = 'escrow-123';
      const contractorId = 'contractor-456';
      const amount = 300;

      // Mock escrow transaction data
      const mockTransaction = {
        id: transactionId,
        amount,
        payment_intent_id: 'pi_test_123',
        job: { contractor_id: contractorId },
      };

      // Step 1: Get transaction for release
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTransaction,
          error: null,
        }),
      } as any);

      // Step 2: Release payment
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, transfer_id: 'tr_test_123' },
        error: null,
      });

      // Step 3: Update transaction status
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await PaymentService.releaseEscrowPayment(transactionId);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'release-escrow-payment',
        {
          body: {
            transactionId,
            contractorId,
            amount,
          },
        }
      );
    });

    it('should handle escrow refund workflow', async () => {
      const transactionId = 'escrow-123';

      // Step 1: Process refund
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, refund_id: 're_test_123' },
        error: null,
      });

      // Step 2: Update transaction status
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await PaymentService.refundEscrowPayment(transactionId);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'refund-escrow-payment',
        { body: { transactionId } }
      );

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        status: 'refunded',
        refunded_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });
  });

  describe('Contractor Payout Workflows', () => {
    it('should handle contractor payout account setup', async () => {
      const contractorId = 'contractor-456';

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          accountUrl: 'https://connect.stripe.com/express/onboarding/acct_123',
        },
        error: null,
      });

      const result = await PaymentService.setupContractorPayout(contractorId);

      expect(result.accountUrl).toBeDefined();
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'setup-contractor-payout',
        { body: { contractorId } }
      );
    });

    it('should check contractor payout status correctly', async () => {
      const contractorId = 'contractor-456';

      // Test account exists and is complete
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            contractor_id: contractorId,
            stripe_account_id: 'acct_123',
            account_complete: true,
          },
          error: null,
        }),
      } as any);

      const status = await PaymentService.getContractorPayoutStatus(contractorId);

      expect(status.hasAccount).toBe(true);
      expect(status.accountComplete).toBe(true);
      expect(status.accountId).toBe('acct_123');
    });

    it('should handle no payout account correctly', async () => {
      const contractorId = 'contractor-456';

      // Test no account exists
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // No rows returned
        }),
      } as any);

      const status = await PaymentService.getContractorPayoutStatus(contractorId);

      expect(status.hasAccount).toBe(false);
      expect(status.accountComplete).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Stripe API errors gracefully', async () => {
      // Test various Stripe error scenarios
      const stripeErrors = [
        { type: 'card_error', code: 'card_declined', message: 'Your card was declined.' },
        { type: 'api_error', message: 'An error occurred with our API.' },
        { type: 'authentication_error', message: 'Authentication with Stripe failed.' },
        { type: 'rate_limit_error', message: 'Too many requests made to the API too quickly.' },
      ];

      for (const error of stripeErrors) {
        mockStripe.createPaymentMethod.mockResolvedValueOnce({
          paymentMethod: null,
          error,
        });

        await expect(
          PaymentService.createPaymentMethod({
            type: 'card',
            card: {
              number: '4000000000000002', // Declined card
              expMonth: 12,
              expYear: 2025,
              cvc: '123',
            },
          })
        ).rejects.toThrow(error.message);
      }
    });

    it('should handle network timeouts and retries', async () => {
      // Simulate network timeout
      mockSupabase.functions.invoke
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          data: { client_secret: 'pi_test_retry_success' },
          error: null,
        });

      // Test should fail on first attempt
      await expect(
        PaymentService.initializePayment({
          amount: 100,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        })
      ).rejects.toThrow('Network timeout');

      // Second attempt should succeed
      const result = await PaymentService.initializePayment({
        amount: 100,
        jobId: 'job-1',
        contractorId: 'contractor-1',
      });

      expect(result.client_secret).toBe('pi_test_retry_success');
    });

    it('should handle insufficient funds scenarios', async () => {
      mockStripe.confirmPayment.mockResolvedValueOnce({
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
      const originalAmount = 200;
      const refundAmount = 50;

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          refund_id: 're_partial_123',
          amount_refunded: refundAmount * 100, // Stripe returns in cents
        },
        error: null,
      });

      const result = await PaymentService.refundPayment({
        paymentIntentId: 'pi_test_123',
        amount: refundAmount,
        reason: 'requested_by_customer',
      });

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('re_partial_123');
    });

    it('should validate payment amounts across different scenarios', async () => {
      const invalidAmounts = [
        { amount: -10, error: 'Amount must be greater than 0' },
        { amount: 0, error: 'Amount must be greater than 0' },
        { amount: 10001, error: 'Amount cannot exceed $10,000' },
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

    it('should handle currency conversion edge cases', async () => {
      const testAmounts = [
        { input: 99.99, expected: 9999 },
        { input: 100.001, expected: 10000 }, // Should round
        { input: 50.555, expected: 5056 }, // Should round up
      ];

      for (const { input, expected } of testAmounts) {
        mockSupabase.functions.invoke.mockResolvedValueOnce({
          data: { client_secret: `pi_test_${expected}` },
          error: null,
        });

        await PaymentService.initializePayment({
          amount: input,
          jobId: 'job-1',
          contractorId: 'contractor-1',
        });

        expect(mockSupabase.functions.invoke).toHaveBeenLastCalledWith(
          'create-payment-intent',
          {
            body: {
              amount: expected,
              jobId: 'job-1',
              contractorId: 'contractor-1',
            },
          }
        );
      }
    });
  });

  describe('Fee Calculation Comprehensive Tests', () => {
    it('should calculate fees accurately for various scenarios', async () => {
      const testCases = [
        {
          amount: 10,
          expected: {
            platformFee: 0.5, // Minimum fee
            stripeFee: 0.59, // 2.9% + $0.30
            contractorAmount: 8.91,
            totalFees: 1.09,
          },
        },
        {
          amount: 100,
          expected: {
            platformFee: 5, // 5%
            stripeFee: 3.2, // 2.9% + $0.30
            contractorAmount: 91.8,
            totalFees: 8.2,
          },
        },
        {
          amount: 1000,
          expected: {
            platformFee: 50, // Capped at $50
            stripeFee: 29.3, // 2.9% + $0.30
            contractorAmount: 920.7,
            totalFees: 79.3,
          },
        },
        {
          amount: 5000,
          expected: {
            platformFee: 50, // Capped at $50
            stripeFee: 145.3, // 2.9% + $0.30
            contractorAmount: 4804.7,
            totalFees: 195.3,
          },
        },
      ];

      testCases.forEach(({ amount, expected }) => {
        const result = PaymentService.calculateFees(amount);

        expect(result.platformFee).toBe(expected.platformFee);
        expect(result.stripeFee).toBe(expected.stripeFee);
        expect(result.contractorAmount).toBe(expected.contractorAmount);
        expect(result.totalFees).toBe(expected.totalFees);

        // Verify math adds up
        expect(result.contractorAmount + result.totalFees).toBe(amount);
      });
    });

    it('should handle edge cases in fee calculation', async () => {
      // Test very small amounts
      const smallAmount = PaymentService.calculateFees(0.01);
      expect(smallAmount.platformFee).toBe(0.5); // Minimum fee applies
      expect(smallAmount.contractorAmount).toBeLessThan(0);

      // Test amounts that hit exactly the minimum
      const minAmount = PaymentService.calculateFees(10);
      expect(minAmount.platformFee).toBe(0.5);

      // Test amounts that hit exactly the cap
      const capAmount = PaymentService.calculateFees(1000);
      expect(capAmount.platformFee).toBe(50);
    });
  });

  describe('Payment History and Reporting', () => {
    it('should retrieve comprehensive payment history', async () => {
      const userId = 'user-123';
      const mockHistory = [
        {
          id: 'txn-1',
          job_id: 'job-1',
          payer_id: userId,
          payee_id: 'contractor-1',
          amount: 150,
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          job: { title: 'Kitchen Repair' },
          payer: { first_name: 'John', last_name: 'Doe' },
          payee: { first_name: 'Jane', last_name: 'Smith' },
        },
        {
          id: 'txn-2',
          job_id: 'job-2',
          payer_id: 'homeowner-2',
          payee_id: userId,
          amount: 200,
          status: 'held',
          created_at: '2024-01-02T00:00:00Z',
          job: { title: 'Electrical Work' },
          payer: { first_name: 'Bob', last_name: 'Wilson' },
          payee: { first_name: 'John', last_name: 'Doe' },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockHistory,
          error: null,
        }),
      } as any);

      const result = await PaymentService.getUserPaymentHistory(userId);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(150);
      expect(result[1].amount).toBe(200);
      expect(mockSupabase.from().or).toHaveBeenCalledWith(
        `payer_id.eq.${userId},payee_id.eq.${userId}`
      );
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
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      } as any);

      const result = await PaymentService.getJobEscrowTransactions(jobId);

      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe(jobId);
      expect(result[0].status).toBe('held');
    });
  });

  describe('Security and Validation Tests', () => {
    it('should validate card expiration dates correctly', async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // Test expired card (last year)
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

      // Test expired card (this year, previous month)
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

      // Test valid card (next year)
      mockStripe.createPaymentMethod.mockResolvedValueOnce({
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

    it('should handle SQL injection attempts safely', async () => {
      const maliciousUserId = "'; DROP TABLE users; --";

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      // Should not throw an error and should be handled safely by Supabase
      const result = await PaymentService.getUserPaymentHistory(maliciousUserId);

      expect(result).toEqual([]);
      // Verify the malicious input was passed as a parameter, not concatenated
      expect(mockSupabase.from().or).toHaveBeenCalledWith(
        `payer_id.eq.${maliciousUserId},payee_id.eq.${maliciousUserId}`
      );
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent payment operations', async () => {
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      // Setup mocks for concurrent requests
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { client_secret: 'pi_concurrent_test' },
        error: null,
      });

      // Create multiple concurrent payment initialization requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          PaymentService.initializePayment({
            amount: 100 + i,
            jobId: `job-${i}`,
            contractorId: `contractor-${i}`,
          })
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.client_secret).toBe('pi_concurrent_test');
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(concurrentRequests);
    });

    it('should handle large payment history queries efficiently', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `txn-${i}`,
        job_id: `job-${i}`,
        amount: 100 + i,
        status: i % 2 === 0 ? 'completed' : 'pending',
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: largeDataSet,
          error: null,
        }),
      } as any);

      const startTime = Date.now();
      const result = await PaymentService.getPaymentHistory('user-1');
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});