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
  useParams: () => ({
    id: 'test-id',
    jobId: 'test-job-id',
    contractorId: 'test-contractor-id',
    featureId: 'test-feature-id',
    slug: 'test-slug',
  }),
  redirect: vi.fn(),
  notFound: vi.fn(),
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

// Mock next/image to prevent image optimization errors
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', { src, alt, ...props });
  },
}));

// Mock Next.js dynamic imports
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<any>) => {
    const Component = React.lazy(fn);
    return Component;
  },
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
    useInfiniteQuery: vi.fn().mockReturnValue({
      data: { pages: [], pageParams: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
      isFetching: false,
      status: 'success',
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    }),
    useQueryClient: vi.fn().mockReturnValue({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn().mockReturnValue([]),
      prefetchQuery: vi.fn(),
      cancelQueries: vi.fn(),
      clear: vi.fn(),
    }),
    QueryClient: class MockQueryClient {
      defaultOptions: Record<string, unknown>;
      constructor(opts?: Record<string, unknown>) {
        this.defaultOptions = opts?.defaultOptions as Record<string, unknown> ?? {};
      }
      invalidateQueries = vi.fn();
      setQueryData = vi.fn();
      getQueryData = vi.fn().mockReturnValue([]);
      prefetchQuery = vi.fn();
      cancelQueries = vi.fn();
      clear = vi.fn();
      getDefaultOptions() { return this.defaultOptions; }
    },
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock @/lib/react-query-client so hook files importing queryKeys don't trigger real QueryClient
vi.mock('@/lib/react-query-client', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn().mockReturnValue([]),
    prefetchQuery: vi.fn(),
    cancelQueries: vi.fn(),
    clear: vi.fn(),
  },
  queryKeys: {
    user: {
      profile: (id: string) => ['user', 'profile', id],
      stats: (id: string) => ['user', 'stats', id],
      preferences: (id: string) => ['user', 'preferences', id],
      contractors: (id: string) => ['user', 'contractors', id],
    },
    jobs: {
      all: ['jobs'],
      lists: () => ['jobs', 'list'],
      list: (f?: string) => ['jobs', 'list', f],
      details: (id: string) => ['jobs', 'detail', id],
      bids: (id: string) => ['jobs', 'bids', id],
      payments: (id: string) => ['jobs', 'payments', id],
    },
    contractors: {
      all: ['contractors'],
      lists: () => ['contractors', 'list'],
      list: (f?: string) => ['contractors', 'list', f],
      details: (id: string) => ['contractors', 'detail', id],
      reviews: (id: string) => ['contractors', 'reviews', id],
      gallery: (id: string) => ['contractors', 'gallery', id],
    },
    messages: {
      all: ['messages'],
      conversations: () => ['messages', 'conversations'],
      conversation: (id: string) => ['messages', 'conversation', id],
      thread: (id: string) => ['messages', 'thread', id],
    },
    payments: {
      all: ['payments'],
      intents: (id: string) => ['payments', 'intents', id],
      methods: (id: string) => ['payments', 'methods', id],
      transactions: (id: string) => ['payments', 'transactions', id],
    },
    search: {
      all: ['search'],
      contractors: (q: string, f?: string) => ['search', 'contractors', q, f],
      jobs: (q: string, f?: string) => ['search', 'jobs', q, f],
      services: (q: string) => ['search', 'services', q],
    },
    analytics: {
      all: ['analytics'],
      dashboard: (id: string) => ['analytics', 'dashboard', id],
      revenue: (id: string, p?: string) => ['analytics', 'revenue', id, p],
      performance: (id: string) => ['analytics', 'performance', id],
    },
  },
  queryUtils: {
    invalidateUser: vi.fn(),
    invalidateJobs: vi.fn(),
    invalidateContractors: vi.fn(),
    invalidatePayments: vi.fn(),
    invalidateAll: vi.fn(),
    prefetchUserProfile: vi.fn(),
    setJobData: vi.fn(),
  },
  default: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn().mockReturnValue([]),
    prefetchQuery: vi.fn(),
    cancelQueries: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock environment variables (NODE_ENV is already 'test' in test environment)
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

// Mock window.matchMedia (direct implementation to survive vi.clearAllMocks())
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
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
    };

    return supabaseClient;
  }),
}));

// Mock @/lib/api/supabaseServer for server-side Supabase usage
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
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
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
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
    },
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  })),
}));

// Reset Supabase singleton after each test
afterEach(() => {
  supabaseClient = null;
});

// Mock useReducedMotion hook to prevent matchMedia errors
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock framer-motion to strip animation props and prevent matchMedia errors
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, className, style, onClick, onMouseEnter, onMouseLeave, id, ...props }: any, ref: any) =>
      React.createElement('div', { ref, className, style, onClick, onMouseEnter, onMouseLeave, id, 'data-testid': props['data-testid'] }, children)
    ),
    button: React.forwardRef(({ children, className, style, onClick, type, disabled, id, ...props }: any, ref: any) =>
      React.createElement('button', { ref, className, style, onClick, type, disabled, id, 'data-testid': props['data-testid'] }, children)
    ),
    span: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('span', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    p: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('p', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    h1: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('h1', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    h2: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('h2', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    h3: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('h3', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    section: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('section', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    article: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('article', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    nav: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('nav', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    ul: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('ul', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    li: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('li', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    a: React.forwardRef(({ children, className, style, href, onClick, id, ...props }: any, ref: any) =>
      React.createElement('a', { ref, className, style, href, onClick, id, 'data-testid': props['data-testid'] }, children)
    ),
    img: React.forwardRef(({ src, alt, className, style, id, ...props }: any, ref: any) =>
      React.createElement('img', { ref, src, alt, className, style, id, 'data-testid': props['data-testid'] })
    ),
    form: React.forwardRef(({ children, className, style, onSubmit, id, ...props }: any, ref: any) =>
      React.createElement('form', { ref, className, style, onSubmit, id, 'data-testid': props['data-testid'] }, children)
    ),
    input: React.forwardRef(({ className, style, type, value, onChange, placeholder, id, ...props }: any, ref: any) =>
      React.createElement('input', { ref, className, style, type, value, onChange, placeholder, id, 'data-testid': props['data-testid'] })
    ),
    svg: React.forwardRef(({ children, className, style, viewBox, id, ...props }: any, ref: any) =>
      React.createElement('svg', { ref, className, style, viewBox, id, 'data-testid': props['data-testid'] }, children)
    ),
    g: React.forwardRef(({ children, className, style, id, ...props }: any, ref: any) =>
      React.createElement('g', { ref, className, style, id, 'data-testid': props['data-testid'] }, children)
    ),
    circle: React.forwardRef(({ cx, cy, r, fill, stroke, className, id, ...props }: any, ref: any) =>
      React.createElement('circle', { ref, cx, cy, r, fill, stroke, className, id, 'data-testid': props['data-testid'] })
    ),
    path: React.forwardRef(({ d, fill, stroke, className, id, ...props }: any, ref: any) =>
      React.createElement('path', { ref, d, fill, stroke, className, id, 'data-testid': props['data-testid'] })
    ),
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: any) => ({
    get: () => initial,
    set: vi.fn(),
    onChange: vi.fn(),
  }),
  useTransform: (value: any, input: any, output: any) => value,
  useSpring: (value: any) => value,
  useScroll: () => ({
    scrollX: { get: () => 0, set: vi.fn() },
    scrollY: { get: () => 0, set: vi.fn() },
    scrollXProgress: { get: () => 0, set: vi.fn() },
    scrollYProgress: { get: () => 0, set: vi.fn() },
  }),
  useInView: () => true,
  useAnimationControls: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
}));

// Mock service classes and agents
vi.mock('@/lib/services/building-surveyor/HybridInferenceService', () => ({
  HybridInferenceService: {
    resetYoloSavingsMetrics: vi.fn().mockResolvedValue(undefined),
    analyzeImage: vi.fn().mockResolvedValue({ success: true, results: [] }),
    getStats: vi.fn().mockResolvedValue({ totalAnalyses: 0, savings: 0 }),
  },
}));

vi.mock('@/lib/services/agents/PricingAgent', () => ({
  PricingAgent: {
    getPricingRecommendation: vi.fn().mockResolvedValue({
      suggestedPrice: 1000,
      confidence: 0.85,
      factors: [],
    }),
    analyzePricing: vi.fn().mockResolvedValue({ isCompetitive: true }),
  },
}));

vi.mock('@/lib/services/agents/JobStatusAgent', () => ({
  JobStatusAgent: {
    updateJobStatus: vi.fn().mockResolvedValue({ success: true }),
    getJobStatus: vi.fn().mockResolvedValue({ status: 'pending' }),
  },
}));

vi.mock('@/lib/services/MeetingService', () => ({
  MeetingService: {
    createMeeting: vi.fn().mockResolvedValue({ id: 'meeting-1', url: 'https://example.com' }),
    getMeeting: vi.fn().mockResolvedValue({ id: 'meeting-1', status: 'scheduled' }),
    updateMeeting: vi.fn().mockResolvedValue({ success: true }),
    deleteMeeting: vi.fn().mockResolvedValue({ success: true }),
  },
}));

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
