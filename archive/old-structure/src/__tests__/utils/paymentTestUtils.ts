/**
 * Payment Test Utilities
 * Shared utilities, mocks, and helpers for payment testing
 */

import { PaymentService } from '../../services/PaymentService';

// Test data generators
export const generateTestPaymentIntent = (overrides: any = {}) => ({
  id: 'pi_test_' + Math.random().toString(36).substr(2, 9),
  client_secret: 'pi_test_' + Math.random().toString(36).substr(2, 9) + '_secret_' + Math.random().toString(36).substr(2, 9),
  amount: 15000, // $150.00
  currency: 'usd',
  status: 'requires_payment_method',
  ...overrides,
});

export const generateTestPaymentMethod = (overrides: any = {}) => ({
  id: 'pm_test_' + Math.random().toString(36).substr(2, 9),
  card: {
    brand: 'visa',
    last4: '4242',
    exp_month: 12,
    exp_year: 2025,
    ...overrides.card,
  },
  ...overrides,
});

export const generateTestEscrowTransaction = (overrides: any = {}) => ({
  id: 'escrow_' + Math.random().toString(36).substr(2, 9),
  job_id: 'job_' + Math.random().toString(36).substr(2, 9),
  payer_id: 'homeowner_' + Math.random().toString(36).substr(2, 9),
  payee_id: 'contractor_' + Math.random().toString(36).substr(2, 9),
  amount: 150,
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Stripe test card numbers
export const TEST_CARDS = {
  VALID: '4242424242424242',
  DECLINED: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  EXPIRED: '4000000000000069',
  INCORRECT_CVC: '4000000000000127',
  PROCESSING_ERROR: '4000000000000119',
  THREE_D_SECURE: '4000000000003155',
  THREE_D_SECURE_REQUIRED: '4000002500003155',
};

// Mock Stripe responses
export const createMockStripeSuccess = () => ({
  paymentIntent: generateTestPaymentIntent({ status: 'succeeded' }),
  error: null,
});

export const createMockStripeError = (errorType: string, message: string) => ({
  paymentIntent: null,
  error: {
    type: errorType,
    code: errorType.replace('_error', ''),
    message,
  },
});

export const createMockStripe3DS = () => ({
  paymentIntent: generateTestPaymentIntent({
    status: 'requires_action',
    next_action: {
      type: 'use_stripe_sdk',
    },
  }),
  error: null,
});

// Supabase mock helpers
export const createMockSupabaseSuccess = (data: any) => ({
  data,
  error: null,
});

export const createMockSupabaseError = (message: string, code?: string) => ({
  data: null,
  error: {
    message,
    code,
  },
});

// Payment flow test helpers
export class PaymentTestHelper {
  private mockStripe: jest.Mocked<any>;
  private mockSupabase: jest.Mocked<any>;

  constructor(mockStripe: any, mockSupabase: any) {
    this.mockStripe = mockStripe;
    this.mockSupabase = mockSupabase;
  }

  /**
   * Setup successful payment flow mocks
   */
  setupSuccessfulPaymentFlow(
    amount: number = 150,
    jobId: string = 'job-test',
    contractorId: string = 'contractor-test'
  ) {
    const clientSecret = 'pi_test_success_secret';
    const paymentMethodId = 'pm_test_success';
    const paymentIntentId = 'pi_test_success';

    // Mock payment initialization
    this.mockSupabase.functions.invoke.mockResolvedValueOnce(
      createMockSupabaseSuccess({ client_secret: clientSecret })
    );

    // Mock payment method creation
    this.mockStripe.createPaymentMethod.mockResolvedValueOnce({
      paymentMethod: generateTestPaymentMethod({ id: paymentMethodId }),
      error: null,
    });

    // Mock payment confirmation
    this.mockStripe.confirmPayment.mockResolvedValueOnce({
      paymentIntent: generateTestPaymentIntent({
        id: paymentIntentId,
        status: 'succeeded',
        amount: amount * 100,
      }),
      error: null,
    });

    return {
      clientSecret,
      paymentMethodId,
      paymentIntentId,
      amount,
      jobId,
      contractorId,
    };
  }

  /**
   * Setup payment flow with 3D Secure
   */
  setup3DSPaymentFlow() {
    const clientSecret = 'pi_test_3ds_secret';
    const paymentMethodId = 'pm_test_3ds';

    // Mock payment initialization
    this.mockSupabase.functions.invoke.mockResolvedValueOnce(
      createMockSupabaseSuccess({ client_secret: clientSecret })
    );

    // Mock payment method creation
    this.mockStripe.createPaymentMethod.mockResolvedValueOnce({
      paymentMethod: generateTestPaymentMethod({ id: paymentMethodId }),
      error: null,
    });

    // First confirmation requires action
    this.mockStripe.confirmPayment.mockResolvedValueOnce(createMockStripe3DS());

    // Handle card action
    this.mockStripe.handleCardAction.mockResolvedValueOnce({
      paymentIntent: generateTestPaymentIntent({
        status: 'requires_confirmation',
      }),
      error: null,
    });

    // Final confirmation succeeds
    this.mockStripe.confirmPayment.mockResolvedValueOnce(createMockStripeSuccess());

    return { clientSecret, paymentMethodId };
  }

  /**
   * Setup failed payment flow
   */
  setupFailedPaymentFlow(errorType: string = 'card_error', errorMessage: string = 'Your card was declined.') {
    const clientSecret = 'pi_test_failed_secret';
    const paymentMethodId = 'pm_test_failed';

    // Mock payment initialization
    this.mockSupabase.functions.invoke.mockResolvedValueOnce(
      createMockSupabaseSuccess({ client_secret: clientSecret })
    );

    // Mock payment method creation
    this.mockStripe.createPaymentMethod.mockResolvedValueOnce({
      paymentMethod: generateTestPaymentMethod({ id: paymentMethodId }),
      error: null,
    });

    // Mock payment confirmation failure
    this.mockStripe.confirmPayment.mockResolvedValueOnce(
      createMockStripeError(errorType, errorMessage)
    );

    return { clientSecret, paymentMethodId };
  }

  /**
   * Setup escrow workflow mocks
   */
  setupEscrowWorkflow() {
    const transactionId = 'escrow_test_123';
    const mockTransaction = generateTestEscrowTransaction({ id: transactionId });

    // Mock escrow creation
    this.mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(createMockSupabaseSuccess(mockTransaction)),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue(createMockSupabaseSuccess(null)),
    } as any);

    // Mock escrow release
    this.mockSupabase.functions.invoke.mockResolvedValueOnce(
      createMockSupabaseSuccess({ success: true, transfer_id: 'tr_test_123' })
    );

    return { transactionId, mockTransaction };
  }

  /**
   * Setup contractor payout mocks
   */
  setupContractorPayoutMocks(hasAccount: boolean = false, accountComplete: boolean = false) {
    if (hasAccount) {
      this.mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createMockSupabaseSuccess({
            contractor_id: 'contractor-test',
            stripe_account_id: 'acct_test_123',
            account_complete: accountComplete,
          })
        ),
      } as any);
    } else {
      this.mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createMockSupabaseError('No rows returned', 'PGRST116')
        ),
      } as any);
    }

    // Mock payout setup
    this.mockSupabase.functions.invoke.mockResolvedValueOnce(
      createMockSupabaseSuccess({
        accountUrl: 'https://connect.stripe.com/express/onboarding/acct_test_123',
      })
    );
  }

  /**
   * Reset all mocks
   */
  resetMocks() {
    jest.clearAllMocks();
  }
}

// Fee calculation test helpers
export const testFeeCalculations = [
  {
    amount: 10,
    expected: {
      platformFee: 0.5,
      stripeFee: 0.59,
      contractorAmount: 8.91,
      totalFees: 1.09,
    },
  },
  {
    amount: 100,
    expected: {
      platformFee: 5,
      stripeFee: 3.2,
      contractorAmount: 91.8,
      totalFees: 8.2,
    },
  },
  {
    amount: 1000,
    expected: {
      platformFee: 50,
      stripeFee: 29.3,
      contractorAmount: 920.7,
      totalFees: 79.3,
    },
  },
];

// Validation test cases
export const validationTestCases = {
  invalidAmounts: [
    { amount: -10, error: 'Amount must be greater than 0' },
    { amount: 0, error: 'Amount must be greater than 0' },
    { amount: 10001, error: 'Amount cannot exceed $10,000' },
  ],
  expiredCards: [
    {
      card: {
        number: '4242424242424242',
        expMonth: 1,
        expYear: 2020,
        cvc: '123',
      },
      error: 'Card has expired',
    },
  ],
  invalidCardNumbers: [
    {
      card: {
        number: '1234567890123456',
        expMonth: 12,
        expYear: 2025,
        cvc: '123',
      },
      error: 'Your card number is invalid',
    },
  ],
};

// Performance test helpers
export const createConcurrentPaymentRequests = (count: number) => {
  const requests = [];
  for (let i = 0; i < count; i++) {
    requests.push({
      amount: 100 + i,
      jobId: `job-${i}`,
      contractorId: `contractor-${i}`,
    });
  }
  return requests;
};

// Security test helpers
export const securityTestCases = {
  sqlInjectionAttempts: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'/*",
    "' UNION SELECT * FROM payments --",
  ],
  xssAttempts: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(1)">',
  ],
};

// Async test helpers
export const waitForAsync = (ms: number = 100) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const waitForMockCall = async (mockFn: jest.Mock, callIndex: number = 0) => {
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max wait

  while (attempts < maxAttempts) {
    if (mockFn.mock.calls[callIndex]) {
      return mockFn.mock.calls[callIndex];
    }
    await waitForAsync(100);
    attempts++;
  }

  throw new Error(`Mock function call ${callIndex} not found after ${maxAttempts * 100}ms`);
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock console methods to reduce test noise
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
    jest.restoreAllMocks();
  });

  // Setup global test timeout
  jest.setTimeout(10000);
};

// Export commonly used test patterns
export const commonTestPatterns = {
  successfulPayment: async (helper: PaymentTestHelper) => {
    const setup = helper.setupSuccessfulPaymentFlow();

    const initResult = await PaymentService.initializePayment({
      amount: setup.amount,
      jobId: setup.jobId,
      contractorId: setup.contractorId,
    });

    const paymentMethod = await PaymentService.createPaymentMethod({
      type: 'card',
      card: {
        number: TEST_CARDS.VALID,
        expMonth: 12,
        expYear: 2025,
        cvc: '123',
      },
    });

    const confirmResult = await PaymentService.confirmPayment({
      clientSecret: initResult.client_secret,
      paymentMethodId: paymentMethod.id,
    });

    return { initResult, paymentMethod, confirmResult };
  },

  failedPayment: async (helper: PaymentTestHelper, errorType?: string, errorMessage?: string) => {
    const setup = helper.setupFailedPaymentFlow(errorType, errorMessage);

    const initResult = await PaymentService.initializePayment({
      amount: 150,
      jobId: 'job-test',
      contractorId: 'contractor-test',
    });

    const paymentMethod = await PaymentService.createPaymentMethod({
      type: 'card',
      card: {
        number: TEST_CARDS.DECLINED,
        expMonth: 12,
        expYear: 2025,
        cvc: '123',
      },
    });

    try {
      await PaymentService.confirmPayment({
        clientSecret: initResult.client_secret,
        paymentMethodId: paymentMethod.id,
      });
    } catch (error) {
      return { initResult, paymentMethod, error };
    }
  },
};