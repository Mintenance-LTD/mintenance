/**
 * Test Data Factories
 *
 * Create realistic test data for integration and E2E tests.
 * Use these instead of inline mock data for consistency.
 */

import { vi } from 'vitest';

// Counter for unique IDs
let testCounter = 0;
const getTestId = () => ++testCounter;

// ============================================================================
// USER FACTORIES
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  role: 'homeowner' | 'contractor' | 'admin';
  first_name: string;
  last_name: string;
  phone: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => {
  const id = `user-test-${getTestId()}`;
  return {
    id,
    email: `test${getTestId()}@example.com`,
    role: 'homeowner',
    first_name: 'Test',
    last_name: 'User',
    phone: null,
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

export const createTestHomeowner = (overrides: Partial<TestUser> = {}): TestUser => {
  return createTestUser({ role: 'homeowner', ...overrides });
};

export const createTestContractor = (overrides: Partial<TestUser> = {}): TestUser => {
  return createTestUser({
    role: 'contractor',
    first_name: 'Contractor',
    last_name: 'Pro',
    ...overrides
  });
};

export const createTestAdmin = (overrides: Partial<TestUser> = {}): TestUser => {
  return createTestUser({
    role: 'admin',
    first_name: 'Admin',
    last_name: 'User',
    ...overrides
  });
};

// ============================================================================
// JOB FACTORIES
// ============================================================================

export interface TestJob {
  id: string;
  homeowner_id: string;
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
  budget_min: number;
  budget_max: number;
  budget: number;
  urgency: 'normal' | 'urgent' | 'flexible';
  location: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export const createTestJob = (overrides: Partial<TestJob> = {}): TestJob => {
  const id = `job-test-${getTestId()}`;
  const budget = overrides.budget ?? 150;

  return {
    id,
    homeowner_id: overrides.homeowner_id ?? `user-test-${getTestId()}`,
    title: 'Fix leaking kitchen tap',
    description: 'Kitchen tap has been dripping for a week. Needs repair or replacement.',
    category: 'plumbing',
    status: 'open',
    budget_min: budget * 0.8,
    budget_max: budget * 1.2,
    budget,
    urgency: 'normal',
    location: 'London, SW1A 1AA',
    postcode: 'SW1A 1AA',
    latitude: 51.5074,
    longitude: -0.1278,
    photos: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

export const createTestJobWithPhotos = (photoCount = 3): TestJob => {
  return createTestJob({
    photos: Array.from({ length: photoCount }, (_, i) =>
      `https://example.com/job-photos/test-photo-${i + 1}.jpg`
    ),
  });
};

export const createTestUrgentJob = (overrides: Partial<TestJob> = {}): TestJob => {
  return createTestJob({
    urgency: 'urgent',
    title: 'URGENT: Burst pipe flooding bathroom',
    description: 'Emergency! Water is flooding the bathroom. Need immediate help.',
    ...overrides,
  });
};

// ============================================================================
// BID FACTORIES
// ============================================================================

export interface TestBid {
  id: string;
  job_id: string;
  contractor_id: string;
  quote_amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  estimated_duration: string;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

export const createTestBid = (overrides: Partial<TestBid> = {}): TestBid => {
  const id = `bid-test-${getTestId()}`;

  return {
    id,
    job_id: overrides.job_id ?? `job-test-${getTestId()}`,
    contractor_id: overrides.contractor_id ?? `user-test-${getTestId()}`,
    quote_amount: 150,
    message: 'I can fix this for you. I have 5 years of plumbing experience.',
    status: 'pending',
    estimated_duration: '2 hours',
    start_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

export const createTestAcceptedBid = (overrides: Partial<TestBid> = {}): TestBid => {
  return createTestBid({
    status: 'accepted',
    start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    ...overrides,
  });
};

// ============================================================================
// PAYMENT FACTORIES
// ============================================================================

export interface TestPayment {
  id: string;
  job_id: string;
  homeowner_id: string;
  contractor_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id: string;
  stripe_payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

export const createTestPayment = (overrides: Partial<TestPayment> = {}): TestPayment => {
  const id = `payment-test-${getTestId()}`;

  return {
    id,
    job_id: overrides.job_id ?? `job-test-${getTestId()}`,
    homeowner_id: overrides.homeowner_id ?? `user-test-${getTestId()}`,
    contractor_id: overrides.contractor_id ?? `user-test-${getTestId()}`,
    amount: 150,
    status: 'pending',
    stripe_payment_intent_id: `pi_test_${getTestId()}`,
    stripe_payment_method_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

export const createTestCompletedPayment = (overrides: Partial<TestPayment> = {}): TestPayment => {
  return createTestPayment({
    status: 'completed',
    stripe_payment_method_id: `pm_test_${getTestId()}`,
    ...overrides,
  });
};

// ============================================================================
// STRIPE TEST CARDS
// ============================================================================

export const STRIPE_TEST_CARDS = {
  SUCCESS: {
    number: '4242424242424242',
    exp_month: 12,
    exp_year: 2030,
    cvc: '123',
  },
  DECLINE: {
    number: '4000000000000002',
    exp_month: 12,
    exp_year: 2030,
    cvc: '123',
  },
  INSUFFICIENT_FUNDS: {
    number: '4000000000009995',
    exp_month: 12,
    exp_year: 2030,
    cvc: '123',
  },
  EXPIRED: {
    number: '4000000000000069',
    exp_month: 12,
    exp_year: 2030,
    cvc: '123',
  },
  PROCESSING_ERROR: {
    number: '4000000000000119',
    exp_month: 12,
    exp_year: 2030,
    cvc: '123',
  },
};

// ============================================================================
// PROFILE FACTORIES
// ============================================================================

export interface TestContractorProfile {
  id: string;
  user_id: string;
  company_name: string;
  bio: string;
  skills: string[];
  experience_years: number;
  rating: number;
  reviews_count: number;
  jobs_completed: number;
  response_time_hours: number;
  verified: boolean;
  insurance_verified: boolean;
  dbs_checked: boolean;
  phone: string;
  postcode: string;
  service_areas: string[];
  created_at: string;
  updated_at: string;
}

export const createTestContractorProfile = (
  overrides: Partial<TestContractorProfile> = {}
): TestContractorProfile => {
  const id = `profile-test-${getTestId()}`;

  return {
    id,
    user_id: overrides.user_id ?? `user-test-${getTestId()}`,
    company_name: 'Test Plumbing Services Ltd',
    bio: 'Professional plumber with 10 years experience.',
    skills: ['plumbing', 'heating', 'boiler-repair'],
    experience_years: 10,
    rating: 4.5,
    reviews_count: 42,
    jobs_completed: 156,
    response_time_hours: 2,
    verified: true,
    insurance_verified: true,
    dbs_checked: true,
    phone: '+44 7700 900000',
    postcode: 'SW1A 1AA',
    service_areas: ['London', 'Surrey', 'Kent'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Reset test counter (use in beforeEach for consistent IDs)
 */
export const resetTestCounter = () => {
  testCounter = 0;
};

/**
 * Create a complete test scenario with user, job, bid, and payment
 */
export const createTestJobScenario = () => {
  const homeowner = createTestHomeowner();
  const contractor = createTestContractor();
  const job = createTestJob({ homeowner_id: homeowner.id });
  const bid = createTestBid({ job_id: job.id, contractor_id: contractor.id });
  const payment = createTestPayment({
    job_id: job.id,
    homeowner_id: homeowner.id,
    contractor_id: contractor.id,
    amount: bid.quote_amount,
  });

  return { homeowner, contractor, job, bid, payment };
};

/**
 * Create a complete accepted job scenario
 */
export const createTestAcceptedJobScenario = () => {
  const scenario = createTestJobScenario();
  return {
    ...scenario,
    job: { ...scenario.job, status: 'in_progress' as const },
    bid: createTestAcceptedBid({
      job_id: scenario.job.id,
      contractor_id: scenario.contractor.id,
      quote_amount: scenario.bid.quote_amount,
    }),
    payment: createTestCompletedPayment({
      job_id: scenario.job.id,
      homeowner_id: scenario.homeowner.id,
      contractor_id: scenario.contractor.id,
      amount: scenario.bid.quote_amount,
    }),
  };
};
