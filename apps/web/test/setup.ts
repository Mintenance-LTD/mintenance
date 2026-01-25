/**
 * Vitest Global Setup Configuration
 * Sets up the test environment, mocks, and utilities
 */

import '@testing-library/jest-dom';
import React from 'react';
import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Jest compatibility layer - make jest globals available for tests written for Jest
// This allows tests using jest.fn(), jest.mock(), etc. to work with Vitest
const jest = {
  fn: vi.fn,
  mock: vi.mock,
  spyOn: vi.spyOn,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
  runAllTimers: vi.runAllTimers,
  runOnlyPendingTimers: vi.runOnlyPendingTimers,
  setSystemTime: vi.setSystemTime,
  getMockName: vi.getMockName,
  isMockFunction: vi.isMockFunction,
  mocked: vi.mocked,
  requireActual: vi.importActual,
  requireMock: vi.importMock,
};

// Make jest available globally
(globalThis as any).jest = jest;

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.resetAllMocks();
});

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

// Mock @tanstack/react-query for components using React Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: [], // Return empty array instead of undefined to prevent .flatMap/.reduce errors
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
      isFetching: false,
      status: 'success',
    }),
    useMutation: vi.fn().mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({}),
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      status: 'idle',
      reset: vi.fn(),
    }),
    useQueryClient: vi.fn().mockReturnValue({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn().mockReturnValue([]),
      prefetchQuery: vi.fn(),
      cancelQueries: vi.fn(),
      clear: vi.fn(),
    }),
    QueryClient: vi.fn().mockImplementation(() => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn().mockReturnValue([]),
      prefetchQuery: vi.fn(),
      cancelQueries: vi.fn(),
      clear: vi.fn(),
    })),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock environment variables
process.env.NODE_ENV = 'test';
// JWT_SECRET must be at least 64 characters and look random (no weak patterns like 'test-jwt', 'placeholder', etc.)
process.env.JWT_SECRET = 'aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8gH9iJ0kL1mN2oP3qR4s';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
process.env.STRIPE_SECRET_KEY = 'sk_test_51Abc123Def456Ghi789Jkl012Mno345Pqr678Stu901Vwx234';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_abcdef123456ghijkl789012mnopqr345678stuvwx';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_51Abc123Def456Ghi789Jkl012Mno345Pqr678Stu901Vwx234';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock DOMPurify for sanitizer tests
// The mock must return the sanitize function directly when called without arguments
// and also work when called as a constructor with window
vi.mock('dompurify', async () => {
  const { createMockDOMPurify } = await import('./mocks/dompurify');
  const mockDOMPurify = createMockDOMPurify();

  // Create a callable function that also has all properties of mockDOMPurify
  const DOMPurifyMock = Object.assign(
    (window?: unknown) => mockDOMPurify,
    mockDOMPurify
  );

  return {
    default: DOMPurifyMock,
  };
});

// Mock crypto for consistent testing
const mockCrypto = {
  randomUUID: () => `test-uuid-${Date.now()}`,
  randomBytes: (size: number) => Buffer.alloc(size, 'test'),
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as Response)
);

// Mock Stripe.js to prevent script loading errors
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    confirmCardPayment: vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_test' }, error: null }),
    createPaymentMethod: vi.fn().mockResolvedValue({ paymentMethod: { id: 'pm_test' }, error: null }),
    confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_test' }, error: null }),
    elements: vi.fn().mockReturnValue({
      create: vi.fn().mockReturnValue({
        mount: vi.fn(),
        unmount: vi.fn(),
        destroy: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      }),
    }),
  }),
}));

// Mock Stripe React components
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  useStripe: () => ({
    confirmCardPayment: vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_test' }, error: null }),
    createPaymentMethod: vi.fn().mockResolvedValue({ paymentMethod: { id: 'pm_test' }, error: null }),
  }),
  useElements: () => ({
    getElement: vi.fn().mockReturnValue({}),
  }),
  CardElement: () => null,
  PaymentElement: () => null,
}));

// Mock Upstash Redis to prevent connection errors
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    exists: vi.fn().mockResolvedValue(0),
    ttl: vi.fn().mockResolvedValue(-1),
    keys: vi.fn().mockResolvedValue([]),
    scan: vi.fn().mockResolvedValue([0, []]),
  })),
}));

// Mock Supabase to prevent multiple client instances
let supabaseClient: any = null;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => {
    if (supabaseClient) return supabaseClient;

    supabaseClient = {
      auth: {
        signIn: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
          download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
          remove: vi.fn().mockResolvedValue({ data: null, error: null }),
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
        }),
      },
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    return supabaseClient;
  }),
}));

// Reset Supabase singleton after each test
afterEach(() => {
  supabaseClient = null;
});

// Suppress console errors in tests (unless debugging)
const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Ignore specific React warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('Warning: useLayoutEffect') ||
      args[0].includes('Warning: An update to') ||
      args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
      args[0].includes('Multiple GoTrueClient instances') ||
      args[0].includes('Failed to load script'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
