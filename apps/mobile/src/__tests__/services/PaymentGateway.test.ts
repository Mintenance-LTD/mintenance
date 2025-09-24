import { PaymentGateway } from '../../services/PaymentGateway';
import { logger } from '../../utils/logger';

// Mock Stripe
const mockStripe = {
  accounts: {
    retrieve: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    confirm: jest.fn(),
    list: jest.fn(),
  },
  paymentMethods: {
    attach: jest.fn(),
    retrieve: jest.fn(),
  },
  transfers: {
    create: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
  },
  invoices: {
    create: jest.fn(),
  },
  invoiceItems: {
    create: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
  prices: {
    list: jest.fn(),
    create: jest.fn(),
  },
};

// Mock Stripe constructor
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock circuit breaker
jest.mock('../../utils/circuitBreaker', () => ({
  circuitBreakerManager: {
    execute: jest.fn().mockImplementation(async (fn) => await fn()),
  },
}));

describe('PaymentGateway', () => {
  let paymentGateway: PaymentGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentGateway = new PaymentGateway();
    // Reset initialization state
    (paymentGateway as any).isInitialized = false;
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_test' });

      await paymentGateway.initialize();

      expect(mockStripe.accounts.retrieve).toHaveBeenCalled();
      expect((paymentGateway as any).isInitialized).toBe(true);
    });

    it('should handle initialization failure', async () => {
      const error = new Error('Stripe connection failed');
      mockStripe.accounts.retrieve.mockRejectedValue(error);

      await expect(paymentGateway.initialize()).rejects.toThrow(
        'Payment gateway initialization failed'
      );
      expect((paymentGateway as any).isInitialized).toBe(false);
    });

    it('should not initialize twice', async () => {
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_test' });

      await paymentGateway.initialize();
      await paymentGateway.initialize(); // Second call

      expect(mockStripe.accounts.retrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('createJobPayment', () => {
    const mockPaymentParams = {
      amount: 100,
      currency: 'gbp',
      customerId: 'customer_123',
      contractorId: 'contractor_123',
      jobId: 'job_123',
      jobTitle: 'Plumbing Repair',
      jobCategory: 'plumbing',
      paymentType: 'completion' as const,
      paymentMethodId: 'pm_test',
    };

    beforeEach(() => {
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_test' });
      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_test',
        email: 'user-customer_123@mintenance.app',
      });
    });

    it('should create job payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 10000,
        currency: 'gbp',
        status: 'succeeded',
        metadata: {
          jobId: 'job_123',
          customerId: 'customer_123',
          contractorId: 'contractor_123',
          jobTitle: 'Plumbing Repair',
          jobCategory: 'plumbing',
          paymentType: 'completion',
        },
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await paymentGateway.createJobPayment(mockPaymentParams);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000, // £100 in pence
        currency: 'gbp',
        customer: 'cus_test',
        payment_method: 'pm_test',
        confirmation_method: 'manual',
        confirm: true,
        capture_method: 'automatic',
        metadata: {
          jobId: 'job_123',
          jobTitle: 'Plumbing Repair',
          jobCategory: 'plumbing',
          customerId: 'customer_123',
          contractorId: 'contractor_123',
          paymentType: 'completion',
          platform: 'mintenance',
        },
        description: 'Mintenance Job Payment: Plumbing Repair',
        statement_descriptor_suffix: 'Mintenance',
        transfer_data: {
          destination: 'acct_contractor_contractor_123',
          amount: 9500, // 95% after 5% platform fee
        },
      });

      expect(result).toEqual({
        id: 'pi_test123',
        amount: 100,
        currency: 'gbp',
        status: 'succeeded',
        jobId: 'job_123',
        customerId: 'customer_123',
        contractorId: 'contractor_123',
        metadata: {
          jobTitle: 'Plumbing Repair',
          jobCategory: 'plumbing',
          paymentType: 'completion',
        },
      });
    });

    it('should handle payment creation failure', async () => {
      const error = new Error('Insufficient funds');
      mockStripe.paymentIntents.create.mockRejectedValue(error);

      await expect(
        paymentGateway.createJobPayment(mockPaymentParams)
      ).rejects.toThrow('Payment creation failed: Insufficient funds');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create job payment',
        error
      );
    });

    it('should create escrow transaction for completion payments', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 10000,
        currency: 'gbp',
        status: 'succeeded',
        metadata: mockPaymentParams,
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Spy on the private method
      const storeEscrowSpy = jest.spyOn(
        paymentGateway as any,
        'storeEscrowTransaction'
      );
      storeEscrowSpy.mockResolvedValue(undefined);

      await paymentGateway.createJobPayment(mockPaymentParams);

      expect(storeEscrowSpy).toHaveBeenCalled();
    });

    it('should not create escrow for non-completion payments', async () => {
      const depositParams = { ...mockPaymentParams, paymentType: 'deposit' as const };
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 10000,
        currency: 'gbp',
        status: 'succeeded',
        metadata: depositParams,
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const storeEscrowSpy = jest.spyOn(
        paymentGateway as any,
        'storeEscrowTransaction'
      );
      storeEscrowSpy.mockResolvedValue(undefined);

      await paymentGateway.createJobPayment(depositParams);

      expect(storeEscrowSpy).not.toHaveBeenCalled();
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const mockConfirmedPayment = {
        id: 'pi_test123',
        amount: 10000,
        currency: 'gbp',
        status: 'succeeded',
        metadata: {
          jobId: 'job_123',
          customerId: 'customer_123',
          contractorId: 'contractor_123',
          jobTitle: 'Plumbing Repair',
          jobCategory: 'plumbing',
          paymentType: 'completion',
        },
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedPayment);

      const result = await paymentGateway.confirmPayment('pi_test123', 'pm_test');

      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith(
        'pi_test123',
        {
          payment_method: 'pm_test',
          return_url: `${process.env.APP_URL}/payment/success`,
        }
      );

      expect(result).toEqual({
        id: 'pi_test123',
        amount: 100,
        currency: 'gbp',
        status: 'succeeded',
        jobId: 'job_123',
        customerId: 'customer_123',
        contractorId: 'contractor_123',
        metadata: {
          jobTitle: 'Plumbing Repair',
          jobCategory: 'plumbing',
          paymentType: 'completion',
        },
      });
    });

    it('should handle payment confirmation failure', async () => {
      const error = new Error('Card declined');
      mockStripe.paymentIntents.confirm.mockRejectedValue(error);

      await expect(
        paymentGateway.confirmPayment('pi_test123')
      ).rejects.toThrow('Payment confirmation failed: Card declined');
    });
  });

  describe('createContractorSubscription', () => {
    beforeEach(() => {
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_test' });
      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_contractor123',
        email: 'user-contractor_123@mintenance.app',
      });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
    });

    it('should create basic subscription successfully', async () => {
      const mockPrice = {
        id: 'price_basic_test',
        currency: 'gbp',
        unit_amount: 1999,
      };
      const mockSubscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_start: 1640995200, // Jan 1, 2022
        current_period_end: 1643673600, // Feb 1, 2022
      };

      mockStripe.prices.create.mockResolvedValue(mockPrice);
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await paymentGateway.createContractorSubscription(
        'contractor_123',
        'basic'
      );

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_contractor123',
        items: [{ price: 'price_basic_test' }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          contractorId: 'contractor_123',
          plan: 'basic',
          platform: 'mintenance',
        },
      });

      expect(result).toEqual({
        id: 'sub_test123',
        contractorId: 'contractor_123',
        plan: 'basic',
        status: 'active',
        currentPeriodStart: new Date('2022-01-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2022-02-01T00:00:00.000Z'),
        amount: 19.99,
        currency: 'gbp',
        features: {
          maxJobs: 10,
          prioritySupport: false,
          advancedAnalytics: false,
          customBranding: false,
          apiAccess: false,
        },
      });
    });

    it('should create enterprise subscription with all features', async () => {
      const mockPrice = {
        id: 'price_enterprise_test',
        currency: 'gbp',
        unit_amount: 9999,
      };
      const mockSubscription = {
        id: 'sub_enterprise123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
      };

      mockStripe.prices.create.mockResolvedValue(mockPrice);
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await paymentGateway.createContractorSubscription(
        'contractor_123',
        'enterprise'
      );

      expect(result.features).toEqual({
        maxJobs: -1, // Unlimited
        prioritySupport: true,
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: true,
      });
    });
  });

  describe('processRefund', () => {
    it('should process full refund successfully', async () => {
      const mockRefund = {
        id: 'rf_test123',
        amount: 10000,
        status: 'succeeded',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      await paymentGateway.processRefund('pi_test123');

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: undefined, // Full refund
        reason: 'requested_by_customer',
        metadata: {
          platform: 'mintenance',
          refundReason: 'Job canceled',
        },
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Refund processed successfully',
        {
          refundId: 'rf_test123',
          amount: 100,
          paymentIntentId: 'pi_test123',
        }
      );
    });

    it('should process partial refund with custom reason', async () => {
      const mockRefund = {
        id: 'rf_partial123',
        amount: 5000,
        status: 'succeeded',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      await paymentGateway.processRefund(
        'pi_test123',
        50,
        'Partial work completed'
      );

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: 5000, // £50 in pence
        reason: 'Partial work completed',
        metadata: {
          platform: 'mintenance',
          refundReason: 'Partial work completed',
        },
      });
    });

    it('should handle refund failure', async () => {
      const error = new Error('Refund not allowed');
      mockStripe.refunds.create.mockRejectedValue(error);

      await expect(
        paymentGateway.processRefund('pi_test123')
      ).rejects.toThrow('Refund processing failed: Refund not allowed');
    });
  });

  describe('savePaymentMethod', () => {
    beforeEach(() => {
      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_test',
        email: 'user-customer_123@mintenance.app',
      });
    });

    it('should save payment method successfully', async () => {
      const mockPaymentMethod = {
        id: 'pm_test123',
        type: 'card',
        card: {
          last4: '4242',
          brand: 'visa',
          exp_month: 12,
          exp_year: 2025,
        },
      };

      mockStripe.paymentMethods.attach.mockResolvedValue(undefined);
      mockStripe.paymentMethods.retrieve.mockResolvedValue(mockPaymentMethod);

      const result = await paymentGateway.savePaymentMethod(
        'customer_123',
        'pm_test123',
        true
      );

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith(
        'pm_test123',
        { customer: 'cus_test' }
      );

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test', {
        invoice_settings: {
          default_payment_method: 'pm_test123',
        },
      });

      expect(result).toEqual({
        id: 'pm_test123',
        type: 'card',
        isDefault: true,
        details: {
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
        },
        customerId: 'customer_123',
      });
    });
  });

  describe('getPaymentHistory', () => {
    it('should retrieve customer payment history', async () => {
      const mockPaymentIntents = {
        data: [
          {
            id: 'pi_customer1',
            amount: 10000,
            currency: 'gbp',
            status: 'succeeded',
            metadata: {
              customerId: 'customer_123',
              contractorId: 'contractor_456',
              jobId: 'job_789',
              jobTitle: 'Plumbing Repair',
              jobCategory: 'plumbing',
              paymentType: 'completion',
            },
          },
          {
            id: 'pi_other',
            amount: 5000,
            currency: 'gbp',
            status: 'succeeded',
            metadata: {
              customerId: 'other_customer',
              contractorId: 'contractor_456',
              jobId: 'job_999',
              jobTitle: 'Electrical Work',
              jobCategory: 'electrical',
              paymentType: 'deposit',
            },
          },
        ],
      };

      mockStripe.paymentIntents.list.mockResolvedValue(mockPaymentIntents);

      const result = await paymentGateway.getPaymentHistory(
        'customer_123',
        'customer',
        10
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'pi_customer1',
        amount: 100,
        currency: 'gbp',
        status: 'succeeded',
        jobId: 'job_789',
        customerId: 'customer_123',
        contractorId: 'contractor_456',
        metadata: {
          jobTitle: 'Plumbing Repair',
          jobCategory: 'plumbing',
          paymentType: 'completion',
        },
      });
    });

    it('should retrieve contractor payment history', async () => {
      const mockPaymentIntents = {
        data: [
          {
            id: 'pi_contractor1',
            amount: 15000,
            currency: 'gbp',
            status: 'succeeded',
            metadata: {
              customerId: 'customer_123',
              contractorId: 'contractor_456',
              jobId: 'job_789',
              jobTitle: 'Kitchen Renovation',
              jobCategory: 'renovation',
              paymentType: 'milestone',
            },
          },
        ],
      };

      mockStripe.paymentIntents.list.mockResolvedValue(mockPaymentIntents);

      const result = await paymentGateway.getPaymentHistory(
        'contractor_456',
        'contractor',
        5
      );

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(150);
      expect(result[0].contractorId).toBe('contractor_456');
    });
  });

  describe('helper methods', () => {
    it('should map Stripe status correctly', async () => {
      const mapStatus = (paymentGateway as any).mapStripeStatus;

      expect(mapStatus('requires_payment_method')).toBe('pending');
      expect(mapStatus('requires_confirmation')).toBe('pending');
      expect(mapStatus('requires_action')).toBe('processing');
      expect(mapStatus('processing')).toBe('processing');
      expect(mapStatus('succeeded')).toBe('succeeded');
      expect(mapStatus('requires_capture')).toBe('succeeded');
      expect(mapStatus('canceled')).toBe('canceled');
      expect(mapStatus('payment_failed')).toBe('failed');
      expect(mapStatus('unknown_status')).toBe('pending');
    });

    it('should map subscription status correctly', async () => {
      const mapStatus = (paymentGateway as any).mapSubscriptionStatus;

      expect(mapStatus('active')).toBe('active');
      expect(mapStatus('canceled')).toBe('canceled');
      expect(mapStatus('incomplete')).toBe('unpaid');
      expect(mapStatus('incomplete_expired')).toBe('canceled');
      expect(mapStatus('past_due')).toBe('past_due');
      expect(mapStatus('unpaid')).toBe('unpaid');
      expect(mapStatus('paused')).toBe('canceled');
      expect(mapStatus('unknown_status')).toBe('unpaid');
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      mockStripe.accounts.retrieve.mockRejectedValue(networkError);

      await expect(paymentGateway.initialize()).rejects.toThrow(
        'Payment gateway initialization failed'
      );
    });

    it('should handle Stripe API errors', async () => {
      // First set up successful initialization
      mockStripe.accounts.retrieve.mockResolvedValue({ id: 'acct_test' });

      const stripeError = {
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined.',
      };

      // Mock customer operations for the payment flow
      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_test',
        email: 'user-customer_123@mintenance.app',
      });

      // Mock the payment intent creation to fail
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      await expect(
        paymentGateway.createJobPayment({
          amount: 100,
          currency: 'gbp',
          customerId: 'customer_123',
          contractorId: 'contractor_123',
          jobId: 'job_123',
          jobTitle: 'Test Job',
          jobCategory: 'test',
          paymentType: 'completion',
        })
      ).rejects.toThrow('Payment creation failed: Your card was declined.');
    });
  });
});