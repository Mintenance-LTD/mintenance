/**
 * E2E Test Helpers
 * Shared utilities for end-to-end payment flow testing
 */

import { waitFor } from '@testing-library/react-native';

/**
 * Mock user for testing
 */
export const MOCK_TEST_USER = {
  id: 'test-user-123',
  email: 'test@mintenance.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'homeowner' as const,
  phone: '+1234567890',
  createdAt: new Date().toISOString(),
};

/**
 * Mock contractor for testing
 */
export const MOCK_TEST_CONTRACTOR = {
  id: 'test-contractor-456',
  email: 'contractor@mintenance.com',
  firstName: 'Pro',
  lastName: 'Contractor',
  role: 'contractor' as const,
  phone: '+0987654321',
  createdAt: new Date().toISOString(),
};

/**
 * Mock job for payment testing
 */
export const MOCK_TEST_JOB = {
  id: 'test-job-789',
  title: 'Kitchen Renovation',
  description: 'Complete kitchen renovation including cabinets and countertops',
  status: 'in_progress' as const,
  homeownerId: MOCK_TEST_USER.id,
  contractorId: MOCK_TEST_CONTRACTOR.id,
  amount: 5000,
  createdAt: new Date().toISOString(),
};

/**
 * Wait for async state updates with timeout
 */
export async function waitForAsync(
  callback: () => void | Promise<void>,
  timeout = 3000
): Promise<void> {
  await waitFor(callback, { timeout });
}

/**
 * Mock successful Stripe SetupIntent response
 */
export function mockSuccessfulSetupIntent() {
  return {
    setupIntent: {
      id: 'seti_test_success_123',
      status: 'succeeded' as const,
      paymentMethodId: 'pm_test_success_456',
      clientSecret: 'seti_test_success_123_secret_abc',
      created: Date.now() / 1000,
      livemode: false,
    },
    error: null,
  };
}

/**
 * Mock 3D Secure required SetupIntent response
 */
export function mock3DSRequiredSetupIntent() {
  return {
    setupIntent: {
      id: 'seti_test_3ds_123',
      status: 'requires_action' as const,
      nextAction: {
        type: 'use_stripe_sdk' as const,
      },
      paymentMethodId: 'pm_test_3ds_456',
      clientSecret: 'seti_test_3ds_123_secret_abc',
      created: Date.now() / 1000,
      livemode: false,
    },
    error: null,
  };
}

/**
 * Mock 3D Secure completed SetupIntent response
 */
export function mock3DSCompletedSetupIntent() {
  return {
    setupIntent: {
      id: 'seti_test_3ds_123',
      status: 'succeeded' as const,
      paymentMethodId: 'pm_test_3ds_456',
      clientSecret: 'seti_test_3ds_123_secret_abc',
      created: Date.now() / 1000,
      livemode: false,
    },
    error: null,
  };
}

/**
 * Mock card declined SetupIntent error
 */
export function mockCardDeclinedError() {
  return {
    setupIntent: null,
    error: {
      code: 'Failed' as const,
      message: 'Your card was declined.',
      type: 'card_error' as const,
      declineCode: 'generic_decline',
    },
  };
}

/**
 * Mock authentication canceled error
 */
export function mockAuthCanceledError() {
  return {
    setupIntent: null,
    error: {
      code: 'Canceled' as const,
      message: 'The payment was canceled',
      type: 'user_action_required' as const,
    },
  };
}

/**
 * Mock successful PaymentIntent response
 */
export function mockSuccessfulPaymentIntent(amount: number) {
  return {
    paymentIntent: {
      id: 'pi_test_success_123',
      status: 'succeeded' as const,
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      paymentMethodId: 'pm_test_success_456',
      clientSecret: 'pi_test_success_123_secret_abc',
      created: Date.now() / 1000,
      livemode: false,
    },
    error: null,
  };
}

/**
 * Mock payment method list response
 */
export function mockPaymentMethodsList() {
  return {
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
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pm_test_2',
        type: 'card',
        card: {
          brand: 'mastercard',
          last4: '5555',
          expiryMonth: 6,
          expiryYear: 2029,
        },
        isDefault: false,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Mock API base URL for testing
 */
export const MOCK_API_BASE_URL = 'https://test.mintenance.com';

/**
 * Mock successful API response
 */
export function mockApiSuccess<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  } as Response;
}

/**
 * Mock API error response
 */
export function mockApiError(status: number, error: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error }),
  } as Response;
}

/**
 * Mock Supabase auth session
 */
export function mockAuthSession() {
  return {
    data: {
      session: {
        access_token: 'mock_access_token_abc123',
        refresh_token: 'mock_refresh_token_xyz789',
        expires_in: 3600,
        token_type: 'bearer',
        user: MOCK_TEST_USER,
      },
    },
    error: null,
  };
}

/**
 * Sleep utility for testing async flows
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Validate payment method ID format
 */
export function isValidPaymentMethodId(id: string): boolean {
  return /^pm_[a-zA-Z0-9]+$/.test(id);
}

/**
 * Validate setup intent ID format
 */
export function isValidSetupIntentId(id: string): boolean {
  return /^seti_[a-zA-Z0-9]+$/.test(id);
}

/**
 * Validate payment intent ID format
 */
export function isValidPaymentIntentId(id: string): boolean {
  return /^pi_[a-zA-Z0-9]+$/.test(id);
}

/**
 * Mock console methods to suppress logs in tests
 */
export function suppressConsoleLogs() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  return originalConsole;
}

/**
 * Assert that no card details are exposed in logs
 */
export function assertNoCardDataInLogs(logCalls: any[][]) {
  const sensitivePatterns = [
    /\d{13,19}/, // Card numbers
    /\d{3,4}/, // CVCs (context-dependent)
    /4242.*4242/, // Test card numbers
  ];

  logCalls.forEach(call => {
    const logString = JSON.stringify(call);
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(logString)) {
        throw new Error(`Sensitive card data found in logs: ${logString}`);
      }
    });
  });
}
