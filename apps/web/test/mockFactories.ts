/**
 * Mock Data Factories
 * Provides standardized mock data for tests to prevent "Cannot destructure property of undefined" errors
 */

import type { User, Job, Contractor, Bid, Profile } from '@mintenance/types';

/**
 * Creates a mock user object with all required fields
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  email: 'test@example.com',
  role: 'homeowner',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock contractor profile with all required fields
 */
export const createMockContractor = (overrides?: Partial<Contractor>): Contractor => ({
  id: 'contractor-123',
  user_id: 'user-123',
  company_name: 'Test Contracting Ltd',
  bio: 'Professional contractor',
  skills: ['plumbing', 'electrical'],
  experience_years: 5,
  rating: 4.5,
  reviews_count: 10,
  jobs_completed: 25,
  response_time_hours: 2,
  verified: true,
  insurance_verified: true,
  dbs_checked: true,
  phone: '+44 7700 900000',
  postcode: 'SW1A 1AA',
  service_areas: ['London', 'Surrey'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock job with all required fields
 */
export const createMockJob = (overrides?: Partial<Job>): Job => ({
  id: 'job-123',
  homeowner_id: 'user-123',
  title: 'Fix leaking tap',
  description: 'Kitchen tap is dripping',
  status: 'open',
  category: 'plumbing',
  location: 'London, SW1A 1AA',
  budget: 150,
  budget_min: 100,
  budget_max: 200,
  show_budget_to_contractors: true,
  urgency: 'normal',
  photos: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock bid with all required fields
 */
export const createMockBid = (overrides?: Partial<Bid>): Bid => ({
  id: 'bid-123',
  job_id: 'job-123',
  contractor_id: 'contractor-123',
  amount: 150,
  message: 'I can fix this for you',
  status: 'pending',
  estimated_duration_hours: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock profile with all required fields
 */
export const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  phone: '+44 7700 900000',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates mock data for useQuery hooks - prevents undefined destructuring errors
 */
export const createMockQueryData = <T>(data: T) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  isSuccess: true,
  isFetching: false,
  status: 'success' as const,
});

/**
 * Creates mock data for useMutation hooks
 */
export const createMockMutationResult = (overrides?: Record<string, unknown>) => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({}),
  isLoading: false,
  isPending: false,
  isError: false,
  error: null,
  isSuccess: false,
  status: 'idle' as const,
  reset: vi.fn(),
  ...overrides,
});

/**
 * Creates mock data for useInfiniteQuery hooks
 */
export const createMockInfiniteQueryData = <T>(pages: T[] = []) => ({
  data: { pages, pageParams: pages.map((_, i) => i === 0 ? undefined : String(i)) },
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  isSuccess: true,
  isFetching: false,
  status: 'success' as const,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
});

/**
 * Helper to reset React Query mocks after vi.clearAllMocks().
 * Use in beforeEach when tests call vi.clearAllMocks().
 *
 * Usage:
 *   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 *   import { resetReactQueryMocks } from '@/test/mockFactories';
 *   beforeEach(() => { vi.clearAllMocks(); resetReactQueryMocks(); });
 */
export const resetReactQueryMocks = () => {
  // Dynamic import to avoid circular dependency issues
  const rq = require('@tanstack/react-query');
  if (rq.useQuery?.mockReturnValue) {
    rq.useQuery.mockReturnValue(createMockQueryData([]));
  }
  if (rq.useMutation?.mockReturnValue) {
    rq.useMutation.mockReturnValue(createMockMutationResult());
  }
  if (rq.useQueryClient?.mockReturnValue) {
    rq.useQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn().mockReturnValue([]),
      prefetchQuery: vi.fn(),
      cancelQueries: vi.fn(),
      clear: vi.fn(),
    });
  }
  if (rq.useInfiniteQuery?.mockReturnValue) {
    rq.useInfiniteQuery.mockReturnValue(createMockInfiniteQueryData());
  }
};

/**
 * Creates mock data for contractor dashboard
 */
export const createMockContractorDashboardData = () => ({
  contractor: createMockContractor(),
  jobs: [createMockJob(), createMockJob({ id: 'job-124', title: 'Paint bedroom' })],
  bids: [createMockBid()],
  stats: {
    activeJobs: 3,
    totalEarnings: 5000,
    avgRating: 4.5,
    responseRate: 95,
  },
});

/**
 * Creates mock data for homeowner dashboard
 */
export const createMockHomeownerDashboardData = () => ({
  user: createMockUser(),
  jobs: [createMockJob()],
  bids: [createMockBid()],
  stats: {
    activeJobs: 1,
    completedJobs: 5,
    totalSpent: 1500,
  },
});

/**
 * Creates mock error for error boundary tests
 */
export const createMockError = (message = 'Test error') => ({
  name: 'Error',
  message,
  stack: 'Error: Test error\n    at test.ts:1:1',
});

/**
 * Creates mock fetch response
 */
export const createMockFetchResponse = <T>(data: T, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  headers: new Headers(),
});

/**
 * Creates mock file for upload tests
 */
export const createMockFile = (name = 'test.jpg', type = 'image/jpeg') => {
  const blob = new Blob(['test'], { type });
  return new File([blob], name, { type });
};

/**
 * Creates mock image list for upload tests
 */
export const createMockImageList = (count = 3) =>
  Array.from({ length: count }, (_, i) => createMockFile(`test-${i + 1}.jpg`));
