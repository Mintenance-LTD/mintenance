/**
 * Test Data Helpers for Playwright E2E Tests
 *
 * Provides factory functions to generate realistic test data
 * for jobs, bids, users, etc.
 */

export interface TestJob {
  title: string;
  description: string;
  category: string;
  budget: number;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  postcode?: string;
  location?: string;
}

export interface TestBid {
  quoteAmount: number;
  description: string;
  estimatedDays: number;
}

/**
 * Generate unique email for testing
 * Uses timestamp to ensure uniqueness
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}@example.com`;
}

/**
 * Generate unique job title
 */
export function generateJobTitle(category?: string): string {
  const timestamp = Date.now();
  const titles = [
    'Fix leaking kitchen tap',
    'Install new bathroom fixtures',
    'Repair damaged roof tiles',
    'Paint living room',
    'Replace broken window',
    'Service central heating',
    'Install new door locks',
    'Garden landscaping work',
  ];

  const title = titles[Math.floor(Math.random() * titles.length)];
  return `${title} (Test ${timestamp})`;
}

/**
 * Create test job data
 */
export function createTestJob(overrides: Partial<TestJob> = {}): TestJob {
  const categories = ['plumbing', 'electrical', 'carpentry', 'painting', 'roofing', 'heating', 'cleaning'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];

  return {
    title: generateJobTitle(),
    description: 'Test job description with sufficient detail to pass validation. This is a detailed description of the work that needs to be done, including specific requirements and expectations.',
    category: randomCategory,
    budget: 150,
    urgency: 'medium',
    postcode: 'SW1A 1AA',
    location: 'London, UK',
    ...overrides,
  };
}

/**
 * Create test bid data
 */
export function createTestBid(overrides: Partial<TestBid> = {}): TestBid {
  return {
    quoteAmount: 200,
    description: 'I can complete this work to a high standard. I have 10+ years of experience and all necessary certifications. Materials included in quote.',
    estimatedDays: 3,
    ...overrides,
  };
}

/**
 * Create urgent job (for testing priority handling)
 */
export function createUrgentJob(overrides: Partial<TestJob> = {}): TestJob {
  return createTestJob({
    title: 'URGENT: Emergency plumbing repair',
    urgency: 'emergency',
    budget: 300,
    ...overrides,
  });
}

/**
 * Create high-budget job (for testing budget tiers)
 */
export function createHighBudgetJob(overrides: Partial<TestJob> = {}): TestJob {
  return createTestJob({
    title: 'Complete kitchen renovation',
    budget: 5000,
    description: 'Full kitchen renovation including new units, appliances, flooring, and tiling. This is a large project requiring experienced contractors with portfolio examples of similar work. The kitchen is 4m x 3m and all materials will be provided.',
    ...overrides,
  });
}

/**
 * Stripe test card numbers
 * Use these for payment testing
 */
export const STRIPE_TEST_CARDS = {
  SUCCESS: {
    number: '4242424242424242',
    expMonth: '12',
    expYear: '2030',
    cvc: '123',
  },
  DECLINE: {
    number: '4000000000000002',
    expMonth: '12',
    expYear: '2030',
    cvc: '123',
  },
  INSUFFICIENT_FUNDS: {
    number: '4000000000009995',
    expMonth: '12',
    expYear: '2030',
    cvc: '123',
  },
  AUTHENTICATION_REQUIRED: {
    number: '4000002500003155',
    expMonth: '12',
    expYear: '2030',
    cvc: '123',
  },
};

/**
 * Wait for network idle
 * Useful after form submissions or page navigations
 */
export async function waitForNetworkIdle(page: any, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Fill form with test data
 * Generic helper for filling forms
 */
export async function fillForm(page: any, data: Record<string, string>): Promise<void> {
  for (const [label, value] of Object.entries(data)) {
    const input = page.getByLabel(new RegExp(label, 'i'));
    await input.fill(value);
  }
}
