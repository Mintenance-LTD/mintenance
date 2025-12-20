/**
 * Testing Utilities
 * Reusable test helpers, factories, and custom render functions
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ==================== TEST PROVIDERS ====================

interface AllProvidersProps {
  children: React.ReactNode;
}

/**
 * Wraps components with all necessary providers for testing
 */
export function AllProviders({ children }: AllProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Custom render function that includes providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// ==================== MOCK FACTORIES ====================

export const mockUser = {
  homeowner: (overrides = {}) => ({
    id: 'homeowner-123',
    email: 'homeowner@test.com',
    role: 'homeowner',
    first_name: 'John',
    last_name: 'Doe',
    phone: '07700900000',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
    ...overrides,
  }),

  contractor: (overrides = {}) => ({
    id: 'contractor-123',
    email: 'contractor@test.com',
    role: 'contractor',
    first_name: 'Jane',
    last_name: 'Smith',
    phone: '07700900001',
    business_name: 'Smith Plumbing',
    trade: 'plumbing',
    verified: true,
    rating: 4.8,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
    ...overrides,
  }),

  admin: (overrides = {}) => ({
    id: 'admin-123',
    email: 'admin@mintenance.com',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'User',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
    ...overrides,
  }),
};

export const mockJob = (overrides = {}) => ({
  id: 'job-123',
  title: 'Fix leaking tap',
  description: 'Kitchen tap is leaking constantly',
  category: 'plumbing',
  status: 'posted',
  budget: 150,
  urgency: 'normal',
  homeowner_id: 'homeowner-123',
  property_id: 'property-123',
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date('2024-01-01').toISOString(),
  photos: ['https://example.com/photo1.jpg'],
  location: {
    lat: 51.5074,
    lng: -0.1278,
  },
  ...overrides,
});

export const mockBid = (overrides = {}) => ({
  id: 'bid-123',
  job_id: 'job-123',
  contractor_id: 'contractor-123',
  amount: 120,
  message: 'I can fix this today',
  status: 'pending',
  created_at: new Date('2024-01-01').toISOString(),
  estimated_hours: 2,
  start_date: new Date('2024-01-02').toISOString(),
  ...overrides,
});

export const mockProperty = (overrides = {}) => ({
  id: 'property-123',
  homeowner_id: 'homeowner-123',
  property_name: 'My House',
  address: '123 Main St, London, SW1A 1AA',
  property_type: 'house',
  bedrooms: 3,
  bathrooms: 2,
  photos: ['https://example.com/house1.jpg'],
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date('2024-01-01').toISOString(),
  ...overrides,
});

export const mockPayment = (overrides = {}) => ({
  id: 'payment-123',
  job_id: 'job-123',
  amount: 120,
  status: 'completed',
  stripe_payment_intent_id: 'pi_test123',
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date('2024-01-01').toISOString(),
  ...overrides,
});

export const mockReview = (overrides = {}) => ({
  id: 'review-123',
  job_id: 'job-123',
  contractor_id: 'contractor-123',
  homeowner_id: 'homeowner-123',
  rating: 5,
  comment: 'Excellent work, very professional',
  created_at: new Date('2024-01-01').toISOString(),
  ...overrides,
});

// ==================== API MOCKING HELPERS ====================

export const mockApiResponse = {
  success: (data: any) => ({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }),

  error: (message: string, status = 400) => ({
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
  }),

  notFound: () => ({
    ok: false,
    status: 404,
    json: async () => ({ error: 'Not found' }),
    text: async () => JSON.stringify({ error: 'Not found' }),
  }),

  unauthorized: () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: 'Unauthorized' }),
    text: async () => JSON.stringify({ error: 'Unauthorized' }),
  }),
};

// ==================== SUPABASE MOCK HELPERS ====================

export const mockSupabaseQuery = {
  success: (data: any) => ({
    data,
    error: null,
  }),

  error: (message: string) => ({
    data: null,
    error: { message, code: 'TEST_ERROR' },
  }),

  empty: () => ({
    data: [],
    error: null,
  }),
};

export const mockSupabaseClient = () => ({
  from: (table: string) => ({
    select: () => mockSupabaseQuery.empty(),
    insert: () => mockSupabaseQuery.success({ id: 'new-id' }),
    update: () => mockSupabaseQuery.success({ id: 'updated-id' }),
    delete: () => mockSupabaseQuery.success({ id: 'deleted-id' }),
    eq: (column: string, value: any) => ({
      single: () => mockSupabaseQuery.success({ id: value }),
    }),
  }),
  auth: {
    getUser: () => mockSupabaseQuery.success({ user: mockUser.homeowner() }),
    signIn: () => mockSupabaseQuery.success({ user: mockUser.homeowner() }),
    signOut: () => mockSupabaseQuery.success({}),
  },
  storage: {
    from: (bucket: string) => ({
      upload: () => mockSupabaseQuery.success({ path: 'test-path' }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/test.jpg' } }),
    }),
  },
});

// ==================== WAIT UTILITIES ====================

/**
 * Wait for a condition to be true
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 1000
): Promise<void> => {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

/**
 * Wait for a specific amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ==================== LOCAL STORAGE MOCK ====================

export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
};

// Export all utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
