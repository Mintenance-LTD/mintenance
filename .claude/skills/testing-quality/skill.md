# Testing & Quality Assurance Skill

## Skill Overview
Expert knowledge for testing the Mintenance platform. Covers unit tests, integration tests, E2E tests, test coverage, and quality assurance practices for both web and mobile applications.

## Testing Stack

### Web Application

```typescript
// Test frameworks and tools
{
  "framework": "Vitest",           // Unit/Integration tests
  "e2e": "Playwright",             // End-to-end tests
  "component": "React Testing Library",
  "mocking": "@vitest/spy",
  "coverage": "v8" // Built into Vitest
}
```

### Mobile Application

```typescript
// Test frameworks and tools
{
  "framework": "Jest",             // Unit tests
  "preset": "jest-expo",           // Expo configuration
  "component": "React Native Testing Library",
  "mocking": "@jest/globals"
}
```

## Current Test Coverage

**Web Application:** 87.7% coverage (804/917 tests passing)

```
Coverage Summary:
- Lines: 87.7%
- Statements: 88.2%
- Functions: 84.3%
- Branches: 82.1%
```

## Unit Testing Patterns

### Pattern 1: Testing API Routes

```typescript
// __tests__/api/jobs/create.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/jobs/route';
import { NextRequest } from 'next/server';
import { serverSupabase } from '@/lib/supabase-server';

// Mock dependencies
vi.mock('@/lib/supabase-server');
vi.mock('@/lib/csrf');
vi.mock('@/lib/auth');

describe('POST /api/jobs', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Setup fresh mocks
    vi.clearAllMocks();

    // Mock authenticated user
    vi.mocked(getCurrentUserFromCookies).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'homeowner',
    });

    // Mock CSRF validation
    vi.mocked(requireCSRF).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a job successfully', async () => {
    // Arrange
    const jobData = {
      title: 'Fix leaking faucet',
      description: 'Kitchen faucet is leaking',
      budget_min: 100,
      budget_max: 200,
      address: '123 Main St',
    };

    mockRequest = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });

    vi.mocked(serverSupabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'job-123', ...jobData },
            error: null,
          }),
        }),
      }),
    } as any);

    // Act
    const response = await POST(mockRequest);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(json.data).toHaveProperty('id');
    expect(json.data.title).toBe(jobData.title);
  });

  it('should reject unauthenticated requests', async () => {
    // Arrange
    vi.mocked(getCurrentUserFromCookies).mockResolvedValue(null);

    mockRequest = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    // Act
    const response = await POST(mockRequest);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('should validate input data', async () => {
    // Arrange - Invalid data (missing required fields)
    mockRequest = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ title: 'Too short' }), // Missing description, budget, etc.
    });

    // Act
    const response = await POST(mockRequest);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(json.details).toBeDefined();
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    const jobData = {
      title: 'Valid job',
      description: 'Valid description',
      budget_min: 100,
      budget_max: 200,
      address: '123 Main St',
    };

    mockRequest = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });

    vi.mocked(serverSupabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      }),
    } as any);

    // Act
    const response = await POST(mockRequest);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(json.error).toBe('Internal server error');
  });
});
```

### Pattern 2: Testing Services

```typescript
// __tests__/services/WeatherService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherService } from '@/lib/services/weather/WeatherService';

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(() => {
    service = WeatherService.getInstance();
    vi.clearAllMocks();
  });

  it('should fetch weather data for coordinates', async () => {
    // Arrange
    const latitude = 51.5074;
    const longitude = -0.1278;

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        temperature: 15,
        condition: 'cloudy',
        humidity: 75,
      }),
    });

    // Act
    const weather = await service.getWeather(latitude, longitude);

    // Assert
    expect(weather).toHaveProperty('temperature');
    expect(weather.temperature).toBe(15);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('weather.api')
    );
  });

  it('should handle API errors', async () => {
    // Arrange
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Act & Assert
    await expect(service.getWeather(0, 0)).rejects.toThrow('Network error');
  });

  it('should cache weather data', async () => {
    // Arrange
    const coords = { lat: 51.5074, lng: -0.1278 };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ temperature: 15 }),
    });

    // Act
    await service.getWeather(coords.lat, coords.lng);
    await service.getWeather(coords.lat, coords.lng);

    // Assert - Should only call API once due to caching
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
```

### Pattern 3: Testing React Hooks

```typescript
// __tests__/hooks/useJobs.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJobs } from '@/lib/hooks/useJobs';

// Setup React Query wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useJobs', () => {
  it('should fetch jobs successfully', async () => {
    // Mock API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: '1', title: 'Job 1' },
          { id: '2', title: 'Job 2' },
        ],
      }),
    });

    // Render hook with wrapper
    const { result } = renderHook(() => useJobs(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check data
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].title).toBe('Job 1');
  });

  it('should handle errors', async () => {
    // Mock API error
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useJobs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

### Pattern 4: Testing React Components (Web)

```typescript
// __tests__/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');
  });
});
```

### Pattern 5: Testing React Native Components

```typescript
// __tests__/components/Button.native.test.tsx
import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button (Native)', () => {
  it('renders children correctly', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Click me</Button>);

    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button disabled onPress={onPress} testID="button">
        Click me
      </Button>
    );

    fireEvent.press(getByTestId('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows activity indicator when loading', () => {
    const { getByTestId } = render(
      <Button loading testID="button">Click me</Button>
    );
    // ActivityIndicator should be present
    expect(getByTestId('button')).toBeTruthy();
  });
});
```

## User Flow Testing

### User Journey Reference
For complete context on workflows being tested, see: [USER_INTERACTION_FLOW_COMPLETE.md](../../../USER_INTERACTION_FLOW_COMPLETE.md)

### Critical User Flow Tests

#### Homeowner Complete Journey Test

```typescript
// __tests__/integration/homeowner-job-flow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestClient } from '@/test/utils/test-client';
import { createTestUser } from '@/test/utils/test-fixtures';

describe('Homeowner Complete Job Flow', () => {
  let client: TestClient;
  let homeowner: TestUser;
  let contractor: TestUser;

  beforeEach(async () => {
    client = await createTestClient();
    homeowner = await createTestUser('homeowner');
    contractor = await createTestUser('contractor', { admin_verified: true });
  });

  it('should complete full job lifecycle: create → bid → accept → work → pay → review', async () => {
    // STEP 1: Homeowner creates job
    const jobResponse = await client.post('/api/jobs', {
      title: 'Fix leaking kitchen tap',
      description: 'Tap has been dripping for a week',
      photos: ['photo1.jpg', 'photo2.jpg'],
      category: 'plumbing',
      budget: 350,
      urgency: 'medium',
    }, { auth: homeowner.token });

    expect(jobResponse.status).toBe(201);
    const jobId = jobResponse.data.id;
    expect(jobResponse.data.status).toBe('posted');

    // STEP 2: Contractor discovers job on map
    const discoverResponse = await client.get('/api/contractor/discover/jobs', {
      params: {
        latitude: 51.5014,
        longitude: -0.1419,
        radius: 10,
        categories: ['plumbing']
      },
      auth: contractor.token
    });

    expect(discoverResponse.data).toContainEqual(
      expect.objectContaining({ id: jobId })
    );

    // STEP 3: Contractor submits bid
    const bidResponse = await client.post('/api/bids', {
      job_id: jobId,
      bid_amount: 375,
      proposal_text: '15 years experience...',
      line_items: [
        { description: 'Call-out', quantity: 1, unit_price: 50 },
        { description: 'Labour', quantity: 2, unit_price: 80 }
      ],
      estimated_duration: 2,
      proposed_start_date: '2025-01-16'
    }, { auth: contractor.token });

    expect(bidResponse.status).toBe(201);
    const bidId = bidResponse.data.id;

    // STEP 4: Homeowner accepts bid
    const acceptResponse = await client.post(
      `/api/jobs/${jobId}/bids/${bidId}/accept`,
      {},
      { auth: homeowner.token }
    );

    expect(acceptResponse.status).toBe(200);

    // Verify job status changed
    const jobCheck1 = await client.get(`/api/jobs/${jobId}`, { auth: homeowner.token });
    expect(jobCheck1.data.status).toBe('assigned');
    expect(jobCheck1.data.contractor_id).toBe(contractor.id);

    // STEP 5: Contractor starts work
    const startResponse = await client.put(
      `/api/jobs/${jobId}/start`,
      {},
      { auth: contractor.token }
    );

    expect(startResponse.status).toBe(200);

    const jobCheck2 = await client.get(`/api/jobs/${jobId}`, { auth: contractor.token });
    expect(jobCheck2.data.status).toBe('in_progress');

    // STEP 6: Contractor uploads before/after photos
    await client.post(`/api/jobs/${jobId}/photos/before`, {
      photos: ['before1.jpg', 'before2.jpg']
    }, { auth: contractor.token });

    await client.post(`/api/jobs/${jobId}/photos/after`, {
      photos: ['after1.jpg', 'after2.jpg']
    }, { auth: contractor.token });

    // STEP 7: Contractor marks complete
    const completeResponse = await client.post(
      `/api/jobs/${jobId}/complete`,
      { completion_notes: 'Tap fixed, tested for 15 minutes' },
      { auth: contractor.token }
    );

    expect(completeResponse.status).toBe(200);

    const jobCheck3 = await client.get(`/api/jobs/${jobId}`, { auth: homeowner.token });
    expect(jobCheck3.data.status).toBe('completed');

    // STEP 8: Homeowner confirms completion
    const confirmResponse = await client.post(
      `/api/jobs/${jobId}/confirm-completion`,
      {},
      { auth: homeowner.token }
    );

    expect(confirmResponse.status).toBe(200);

    // STEP 9: Homeowner makes payment (escrow)
    const paymentResponse = await client.post('/api/payments/create-intent', {
      job_id: jobId,
      amount: 41250, // £412.50 in pence
      contractor_id: contractor.id
    }, { auth: homeowner.token });

    expect(paymentResponse.status).toBe(200);
    expect(paymentResponse.data).toHaveProperty('client_secret');

    // STEP 10: Both parties leave reviews
    const homeownerReviewResponse = await client.post('/api/reviews', {
      job_id: jobId,
      rating: 5,
      comment: 'Excellent work!',
      categories: { quality: 5, timeliness: 4, communication: 5 }
    }, { auth: homeowner.token });

    expect(homeownerReviewResponse.status).toBe(201);

    const contractorReviewResponse = await client.post('/api/reviews', {
      job_id: jobId,
      rating: 5,
      comment: 'Great homeowner, paid promptly!'
    }, { auth: contractor.token });

    expect(contractorReviewResponse.status).toBe(201);

    // Verify contractor rating updated
    const contractorProfile = await client.get(`/api/users/${contractor.id}`);
    expect(contractorProfile.data.rating).toBeGreaterThan(0);
    expect(contractorProfile.data.review_count).toBeGreaterThan(0);
  });
});
```

#### Contractor Bid Workflow Test

```typescript
// __tests__/integration/contractor-bid-flow.test.ts
describe('Contractor Bid & Work Flow', () => {
  it('should allow contractor to discover, bid, and complete job', async () => {
    // Setup: Homeowner creates job
    const job = await createTestJob({ status: 'posted' });

    // DISCOVERY: Contractor finds job on map
    const mapJobs = await client.get('/api/contractor/discover/jobs', {
      params: { latitude: 51.5, longitude: -0.14, radius: 10 },
      auth: contractor.token
    });

    expect(mapJobs.data).toContainEqual(
      expect.objectContaining({ id: job.id })
    );

    // SAVE JOB: Contractor saves for later (swipe right)
    await client.post('/api/contractor/saved-jobs', {
      job_id: job.id
    }, { auth: contractor.token });

    const savedJobs = await client.get('/api/contractor/saved-jobs', {
      auth: contractor.token
    });

    expect(savedJobs.data).toContainEqual(
      expect.objectContaining({ job_id: job.id })
    );

    // BID: Contractor submits detailed bid
    const bid = await client.post('/api/bids', {
      job_id: job.id,
      bid_amount: 375,
      proposal_text: 'Experienced plumber...',
      line_items: [
        { description: 'Materials', quantity: 1, unit_price: 120 },
        { description: 'Labour', quantity: 2, unit_price: 80 }
      ]
    }, { auth: contractor.token });

    expect(bid.status).toBe(201);

    // WAIT: Homeowner accepts bid (simulated)
    await client.post(`/api/jobs/${job.id}/bids/${bid.data.id}/accept`,
      {}, { auth: homeowner.token });

    // WORK: Contractor performs work
    await client.put(`/api/jobs/${job.id}/start`, {}, { auth: contractor.token });
    await client.post(`/api/jobs/${job.id}/photos/before`,
      { photos: ['b1.jpg'] }, { auth: contractor.token });
    await client.post(`/api/jobs/${job.id}/photos/after`,
      { photos: ['a1.jpg'] }, { auth: contractor.token });
    await client.post(`/api/jobs/${job.id}/complete`,
      { completion_notes: 'Done!' }, { auth: contractor.token });

    // Verify job completed
    const finalJob = await client.get(`/api/jobs/${job.id}`, { auth: contractor.token });
    expect(finalJob.data.status).toBe('completed');
  });
});
```

#### Escrow & Payment Flow Test

```typescript
// __tests__/integration/escrow-flow.test.ts
describe('Escrow & Payment Flow', () => {
  it('should hold payment in escrow and release after 7 days', async () => {
    // Setup completed job
    const job = await createCompletedJob();

    // Homeowner pays (escrow)
    const payment = await client.post('/api/payments/create-intent', {
      job_id: job.id,
      amount: 37500, // £375
      contractor_id: job.contractor_id
    }, { auth: homeowner.token });

    expect(payment.data).toHaveProperty('client_secret');

    // Verify escrow created
    const escrow = await db.query(
      'SELECT * FROM escrow_transactions WHERE job_id = $1',
      [job.id]
    );

    expect(escrow.rows[0].status).toBe('held');
    expect(escrow.rows[0].amount).toBe(375);

    // Simulate 7 days passing (mock date)
    await advanceTime({ days: 7 });

    // Run escrow release cron
    const cronResponse = await client.get('/api/cron/release-escrow', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }
    });

    expect(cronResponse.data.released).toBeGreaterThan(0);

    // Verify escrow released
    const releasedEscrow = await db.query(
      'SELECT * FROM escrow_transactions WHERE job_id = $1',
      [job.id]
    );

    expect(releasedEscrow.rows[0].status).toBe('released');
    expect(releasedEscrow.rows[0]).toHaveProperty('stripe_transfer_id');
  });
});
```

## Integration Testing

### Pattern: Testing Complete User Flows

```typescript
// __tests__/integration/job-creation-flow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestClient } from '@/test/utils/test-client';
import { createTestUser } from '@/test/utils/test-fixtures';

describe('Job Creation Flow', () => {
  let client: TestClient;
  let homeowner: TestUser;

  beforeEach(async () => {
    client = await createTestClient();
    homeowner = await createTestUser('homeowner');
  });

  it('should allow homeowner to create and view a job', async () => {
    // 1. Create job
    const jobData = {
      title: 'Fix leaking roof',
      description: 'Roof has been leaking for 2 weeks',
      budget_min: 500,
      budget_max: 1000,
      address: '123 Main St, London',
    };

    const createResponse = await client.post('/api/jobs', jobData, {
      auth: homeowner.token,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty('id');

    const jobId = createResponse.data.id;

    // 2. Retrieve job
    const getResponse = await client.get(`/api/jobs/${jobId}`, {
      auth: homeowner.token,
    });

    expect(getResponse.status).toBe(200);
    expect(getResponse.data.title).toBe(jobData.title);

    // 3. List jobs
    const listResponse = await client.get('/api/jobs', {
      auth: homeowner.token,
    });

    expect(listResponse.status).toBe(200);
    expect(listResponse.data.data).toContainEqual(
      expect.objectContaining({ id: jobId })
    );
  });

  it('should enforce authorization', async () => {
    // Create job as homeowner
    const jobData = { /* ... */ };
    const createResponse = await client.post('/api/jobs', jobData, {
      auth: homeowner.token,
    });

    const jobId = createResponse.data.id;

    // Try to access as different user
    const otherUser = await createTestUser('homeowner');
    const getResponse = await client.get(`/api/jobs/${jobId}`, {
      auth: otherUser.token,
    });

    // Should not be able to view other user's private job
    expect(getResponse.status).toBe(404);
  });
});
```

## End-to-End Testing (Playwright)

### Pattern: E2E Test for Job Posting

```typescript
// __tests__/e2e/job-posting.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Job Posting Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as homeowner
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'homeowner@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
  });

  test('should post a new job', async ({ page }) => {
    // Navigate to job creation
    await page.click('text=Post a Job');
    await expect(page).toHaveURL('http://localhost:3000/jobs/create');

    // Fill out form
    await page.fill('[name="title"]', 'Fix bathroom tiles');
    await page.fill('[name="description"]', 'Several tiles are cracked and need replacement');
    await page.fill('[name="budget_min"]', '200');
    await page.fill('[name="budget_max"]', '500');
    await page.fill('[name="address"]', '456 Oak Ave, Manchester');

    // Upload images
    await page.setInputFiles('[name="photos"]', [
      'test/fixtures/bathroom1.jpg',
      'test/fixtures/bathroom2.jpg',
    ]);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to job details
    await expect(page).toHaveURL(/\/jobs\/[a-z0-9-]+$/);

    // Verify job details are displayed
    await expect(page.locator('h1')).toContainText('Fix bathroom tiles');
    await expect(page.locator('text=Several tiles are cracked')).toBeVisible();
    await expect(page.locator('text=£200 - £500')).toBeVisible();

    // Verify images are uploaded
    const images = page.locator('img[alt*="Job photo"]');
    await expect(images).toHaveCount(2);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('http://localhost:3000/jobs/create');

    // Try to submit without filling form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=Title is required')).toBeVisible();
    await expect(page.locator('text=Description is required')).toBeVisible();
  });
});
```

### Pattern: E2E Test for Bid Submission

```typescript
// __tests__/e2e/bid-submission.spec.ts
import { test, expect } from '@playwright/test';
import { createTestJob } from '../utils/test-fixtures';

test.describe('Contractor Bid Submission', () => {
  let jobId: string;

  test.beforeAll(async () => {
    // Create a job for testing
    jobId = await createTestJob();
  });

  test.beforeEach(async ({ page }) => {
    // Login as contractor
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'contractor@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('should submit a bid on a job', async ({ page }) => {
    // Navigate to job
    await page.goto(`http://localhost:3000/contractor/bid/${jobId}`);

    // Fill bid form
    await page.fill('[name="amount"]', '350');
    await page.fill('[name="message"]', 'I can complete this work in 2 days');
    await page.fill('[name="estimated_duration"]', '2');

    // Submit bid
    await page.click('button:has-text("Submit Bid")');

    // Should show success message
    await expect(page.locator('text=Bid submitted successfully')).toBeVisible();

    // Should show bid in contractor's bids list
    await page.goto('http://localhost:3000/contractor/bids');
    await expect(page.locator(`text=${jobId.slice(0, 8)}`)).toBeVisible();
  });

  test('should prevent duplicate bids', async ({ page }) => {
    await page.goto(`http://localhost:3000/contractor/bid/${jobId}`);

    // First bid
    await page.fill('[name="amount"]', '350');
    await page.click('button:has-text("Submit Bid")');
    await expect(page.locator('text=Bid submitted')).toBeVisible();

    // Try to bid again
    await page.goto(`http://localhost:3000/contractor/bid/${jobId}`);
    await expect(page.locator('text=You have already submitted a bid')).toBeVisible();
  });
});
```

## Test Coverage

### Running Coverage Reports

```bash
# Web - Full coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html

# Mobile - Coverage report
cd apps/mobile
npm run test -- --coverage
```

### Coverage Requirements

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
      ],
    },
  },
});
```

## Test Utilities

### Test Fixtures

```typescript
// test/utils/test-fixtures.ts
import { v4 as uuidv4 } from 'uuid';

export function createTestUser(role: 'homeowner' | 'contractor' | 'admin' = 'homeowner') {
  return {
    id: uuidv4(),
    email: `${role}-${Date.now()}@test.com`,
    name: `Test ${role}`,
    role,
    token: 'test-jwt-token',
    created_at: new Date().toISOString(),
  };
}

export function createTestJob(override?: Partial<Job>) {
  return {
    id: uuidv4(),
    title: 'Test Job',
    description: 'Test description',
    budget_min: 100,
    budget_max: 200,
    status: 'posted' as const,
    homeowner_id: uuidv4(),
    created_at: new Date().toISOString(),
    ...override,
  };
}

export function createTestBid(jobId: string, override?: Partial<Bid>) {
  return {
    id: uuidv4(),
    job_id: jobId,
    contractor_id: uuidv4(),
    amount: 150,
    message: 'I can help with this',
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    ...override,
  };
}
```

### Test Database Setup

```typescript
// test/utils/test-db.ts
import { createClient } from '@supabase/supabase-js';

export async function setupTestDatabase() {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!
  );

  // Clean up existing test data
  await supabase.from('bids').delete().ilike('contractor_id', 'test-%');
  await supabase.from('jobs').delete().ilike('homeowner_id', 'test-%');
  await supabase.from('users').delete().ilike('email', '%@test.com');

  return supabase;
}

export async function teardownTestDatabase() {
  // Cleanup after tests
  await setupTestDatabase(); // Same cleanup
}
```

## Best Practices

### ✅ Test Behavior, Not Implementation

```typescript
// WRONG - Testing implementation details
it('should call setState with correct value', () => {
  const setState = vi.fn();
  render(<Component setState={setState} />);
  expect(setState).toHaveBeenCalledWith('value');
});

// CORRECT - Testing user-facing behavior
it('should display updated value when button is clicked', () => {
  render(<Component />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Updated Value')).toBeVisible();
});
```

### ✅ Use Data-TestID for Complex Queries

```typescript
// Component
<div data-testid="job-card-123">
  <h2>{job.title}</h2>
</div>

// Test
const jobCard = screen.getByTestId('job-card-123');
expect(jobCard).toContainText('Fix roof');
```

### ✅ Mock External Dependencies

```typescript
// Mock Supabase
vi.mock('@/lib/supabase-server', () => ({
  serverSupabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

// Mock Stripe
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn(),
    },
  })),
}));
```

### ✅ Clean Up After Tests

```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await teardownTestDatabase();
});
```

## Common Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test path/to/test.test.ts

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e -- --headed

# Update snapshots
npm run test -- -u
```

## Common Pitfalls

### ❌ Not Waiting for Async Operations

```typescript
// WRONG
it('should fetch data', () => {
  const { result } = renderHook(() => useData());
  expect(result.current.data).toBeDefined(); // Fails - data not loaded yet
});

// CORRECT
it('should fetch data', async () => {
  const { result } = renderHook(() => useData());
  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

### ❌ Testing Multiple Things in One Test

```typescript
// WRONG
it('should handle everything', () => {
  // Test creation
  // Test updating
  // Test deletion
  // Too much in one test!
});

// CORRECT
it('should create item', () => { /* ... */ });
it('should update item', () => { /* ... */ });
it('should delete item', () => { /* ... */ });
```

### ❌ Not Cleaning Up Mocks

```typescript
// WRONG
it('test 1', () => {
  global.fetch = vi.fn(); // Mock persists to next test
});

it('test 2', () => {
  // Still using mocked fetch from test 1!
});

// CORRECT
afterEach(() => {
  vi.restoreAllMocks();
});
```

## When to Use This Skill

Load this skill for:
- Writing unit tests for services/utilities
- Testing API routes
- Testing React components (web and mobile)
- Writing integration tests
- Creating E2E test scenarios
- Improving test coverage
- Debugging failing tests
- Understanding test patterns
- Setting up test infrastructure
