/**
 * Jest Setup Configuration
 * Global test setup and mocks
 */

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.headers = new Map();
      this.cookies = new Map();
      this.method = init.method || 'GET';
      
      // Set headers from init
      if (init.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }
    
    headers = {
      get: jest.fn((name) => this.headers.get(name.toLowerCase())),
      set: jest.fn((name, value) => this.headers.set(name.toLowerCase(), value))
    };
    
    cookies = {
      get: jest.fn((name) => this.cookies.get(name)),
      set: jest.fn((name, value) => this.cookies.set(name, value))
    };
  },
  
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      json: () => Promise.resolve(data),
      status: init.status || 200,
      headers: init.headers || {}
    })),
    next: jest.fn(() => ({ status: 200 })),
    redirect: jest.fn(() => ({ status: 302 }))
  }
}));

// Mock crypto for consistent testing
const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-1234'),
  randomBytes: jest.fn(() => Buffer.from('test-bytes'))
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

// Mock Supabase client
jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(() => ({
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } }
      }))
    },
    paymentIntents: {
      create: jest.fn(() => Promise.resolve({ id: 'pi_test' })),
      retrieve: jest.fn(() => Promise.resolve({ id: 'pi_test', status: 'succeeded' }))
    }
  }));
});

// Mock logger
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Global test utilities
global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: 'https://test.com',
    headers: new Map(),
    cookies: new Map(),
    ...overrides
  }),
  
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'homeowner',
    ...overrides
  }),
  
  createMockJob: (overrides = {}) => ({
    id: 'test-job-id',
    title: 'Test Job',
    description: 'Test Description',
    homeowner_id: 'test-user-id',
    status: 'posted',
    ...overrides
  })
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset crypto mocks
  mockCrypto.randomUUID.mockReturnValue('test-uuid-1234');
  mockCrypto.randomBytes.mockReturnValue(Buffer.from('test-bytes'));
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});
