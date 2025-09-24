/**
 * Payment Test Setup
 * Global setup for payment-related tests
 */

import { setupTestEnvironment } from '../utils/paymentTestUtils';

// Setup test environment
setupTestEnvironment();

// Mock Stripe globally for payment tests
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn().mockResolvedValue(undefined),
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  createToken: jest.fn(),
  handleCardAction: jest.fn(),
  presentPaymentSheet: jest.fn(),
  confirmPaymentSheetPayment: jest.fn(),
}));

// Mock Supabase for payment tests
jest.mock('../../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    }),
  },
}));

// Mock React Navigation for payment screen tests
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      amount: 150,
      jobId: 'test-job-123',
      contractorId: 'test-contractor-456',
    },
  }),
  useFocusEffect: jest.fn(),
}));

// Mock React Query for payment tests
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

// Mock AsyncStorage for payment data persistence
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock device security features
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock network state for offline payment testing
jest.mock('@react-native-netinfo/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
  configure: jest.fn(),
}));

// Global test constants
global.__PAYMENT_TEST_CONSTANTS__ = {
  TEST_AMOUNTS: {
    SMALL: 10,
    MEDIUM: 150,
    LARGE: 1000,
    EXCEEDS_LIMIT: 10001,
  },
  TEST_CARDS: {
    VALID: '4242424242424242',
    DECLINED: '4000000000000002',
    INSUFFICIENT_FUNDS: '4000000000009995',
    THREE_D_SECURE: '4000000000003155',
  },
  TEST_USERS: {
    HOMEOWNER: {
      id: 'homeowner-test-123',
      email: 'homeowner@test.com',
      role: 'homeowner',
    },
    CONTRACTOR: {
      id: 'contractor-test-456',
      email: 'contractor@test.com',
      role: 'contractor',
    },
  },
};

// Performance testing helpers
global.__PAYMENT_PERFORMANCE__ = {
  startTime: Date.now(),
  markStart: (label: string) => {
    global.__PAYMENT_PERFORMANCE__[`${label}_start`] = Date.now();
  },
  markEnd: (label: string) => {
    const startTime = global.__PAYMENT_PERFORMANCE__[`${label}_start`];
    if (startTime) {
      global.__PAYMENT_PERFORMANCE__[`${label}_duration`] = Date.now() - startTime;
    }
  },
  getDuration: (label: string) => {
    return global.__PAYMENT_PERFORMANCE__[`${label}_duration`] || 0;
  },
};

// Security testing flags
global.__PAYMENT_SECURITY_TEST__ = process.env.NODE_ENV === 'test';

// Setup console override for payment tests
const originalConsole = { ...console };

beforeEach(() => {
  // Reset performance markers
  Object.keys(global.__PAYMENT_PERFORMANCE__).forEach(key => {
    if (key.endsWith('_start') || key.endsWith('_duration')) {
      delete global.__PAYMENT_PERFORMANCE__[key];
    }
  });
});

afterEach(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

// Test utilities available globally
global.__PAYMENT_TEST_UTILS__ = {
  waitForPaymentProcessing: (timeout = 5000) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  },

  generateTestPaymentData: (overrides = {}) => ({
    amount: 150,
    jobId: 'test-job-' + Date.now(),
    contractorId: 'test-contractor-' + Date.now(),
    ...overrides,
  }),

  validatePaymentResponse: (response: any) => {
    expect(response).toBeDefined();
    expect(response).toHaveProperty('client_secret');
    expect(typeof response.client_secret).toBe('string');
    expect(response.client_secret).toMatch(/^pi_test_/);
  },
};

export {};