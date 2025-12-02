# Testing Guide - Mintenance

## Table of Contents
1. [Testing Philosophy](#testing-philosophy)
2. [Test Types](#test-types)
3. [Testing Pyramid](#testing-pyramid)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [E2E Testing](#e2e-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [Best Practices](#best-practices)
10. [Common Patterns](#common-patterns)

---

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Tests should survive refactoring

2. **Write Tests First (TDD)**
   - Red → Green → Refactor
   - Better design through testability

3. **Maintain High Coverage**
   - Web: ≥80% coverage
   - Mobile: ≥70% coverage
   - Critical paths: ≥95% coverage

4. **Fast Feedback Loop**
   - Unit tests: < 5 seconds
   - Integration tests: < 30 seconds
   - E2E tests: < 5 minutes

---

## Test Types

| Type | Purpose | Speed | Coverage | Cost |
|------|---------|-------|----------|------|
| **Unit** | Test individual functions/components | 🚀 Fast | High | Low |
| **Integration** | Test component interactions | ⚡ Medium | Medium | Medium |
| **E2E** | Test complete user flows | 🐌 Slow | Low | High |
| **Performance** | Test speed/load handling | 🐌 Slow | N/A | High |
| **Security** | Test vulnerabilities | ⚡ Medium | N/A | Medium |

---

## Testing Pyramid

```
         /\
        /  \  E2E Tests (10%)
       /____\
      /      \  Integration Tests (30%)
     /________\
    /          \  Unit Tests (60%)
   /____________\
```

**Ideal Distribution:**
- 60% Unit Tests
- 30% Integration Tests
- 10% E2E Tests

---

## Unit Testing

### Setup

**Web:**
```bash
cd apps/web
npm run test
```

**Mobile:**
```bash
cd apps/mobile
npm run test
```

### Structure

```typescript
// ComponentName.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<ComponentName />);
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });

    it('should render with custom props', () => {
      render(<ComponentName title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle button click', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(<ComponentName onClick={handleClick} />);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', () => {
      render(<ComponentName data={[]} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle error state', () => {
      render(<ComponentName error="Error message" />);
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });
});
```

### Testing React Components

#### 1. Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply variant styling', () => {
    const { container } = render(<Button variant="primary">Click</Button>);
    expect(container.firstChild).toHaveClass('btn-primary');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### 2. Component with State

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter', () => {
  it('should increment counter', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole('button', { name: /increment/i });
    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    await user.click(button);
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('should decrement counter', async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={5} />);

    await user.click(screen.getByRole('button', { name: /decrement/i }));
    expect(screen.getByText('Count: 4')).toBeInTheDocument();
  });
});
```

#### 3. Component with API Calls

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';
import { fetchUser } from '@/lib/api';

jest.mock('@/lib/api');
const mockFetchUser = fetchUser as jest.MockedFunction<typeof fetchUser>;

describe('UserProfile', () => {
  beforeEach(() => {
    mockFetchUser.mockClear();
  });

  it('should display loading state', () => {
    mockFetchUser.mockImplementation(() => new Promise(() => {}));
    render(<UserProfile userId="123" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display user data', async () => {
    mockFetchUser.mockResolvedValue({
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    });

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should handle error state', async () => {
    mockFetchUser.mockRejectedValue(new Error('Failed to fetch'));

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useJobs } from './useJobs';

describe('useJobs', () => {
  it('should fetch jobs', async () => {
    const { result } = renderHook(() => useJobs());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.jobs).toHaveLength(10);
  });

  it('should refetch on parameter change', async () => {
    const { result, rerender } = renderHook(
      ({ filter }) => useJobs(filter),
      { initialProps: { filter: 'active' } }
    );

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(5);
    });

    rerender({ filter: 'completed' });

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(3);
    });
  });
});
```

### Testing Services

```typescript
import { JobService } from './JobService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a job successfully', async () => {
      const mockJob = {
        title: 'Test Job',
        description: 'Test Description',
        user_id: '123'
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: '456', ...mockJob },
              error: null
            })
          })
        })
      });

      const result = await JobService.createJob(mockJob);

      expect(result).toMatchObject({
        id: '456',
        ...mockJob
      });
    });

    it('should handle validation errors', async () => {
      await expect(
        JobService.createJob({ title: '' })
      ).rejects.toThrow('Title is required');
    });

    it('should handle database errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      await expect(
        JobService.createJob({ title: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });
});
```

---

## Integration Testing

### API Route Testing

```typescript
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/jobs/route';

describe('/api/jobs', () => {
  describe('POST /api/jobs', () => {
    it('should create a job', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test Job',
          description: 'Description',
          location: 'New York'
        },
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(JSON.parse(res._getData())).toMatchObject({
        title: 'Test Job',
        description: 'Description'
      });
    });

    it('should require authentication', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { title: 'Test' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should validate input', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { title: '' },
        headers: { authorization: 'Bearer valid-token' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });
});
```

### Database Integration Tests

```typescript
import { createClient } from '@supabase/supabase-js';

describe('Database Integration', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('test_jobs').delete().gte('id', 0);
  });

  it('should create and retrieve job', async () => {
    const jobData = {
      title: 'Test Job',
      description: 'Test Description',
      user_id: 'test-user-id'
    };

    const { data: created, error: createError } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();

    expect(createError).toBeNull();
    expect(created).toMatchObject(jobData);

    const { data: retrieved, error: retrieveError } = await supabase
      .from('jobs')
      .select()
      .eq('id', created!.id)
      .single();

    expect(retrieveError).toBeNull();
    expect(retrieved).toMatchObject(jobData);
  });

  it('should enforce RLS policies', async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select()
      .eq('user_id', 'other-user-id');

    // Should not return jobs from other users
    expect(data).toEqual([]);
  });
});
```

---

## E2E Testing

### Playwright Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Job Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a job successfully', async ({ page }) => {
    // Navigate to job creation
    await page.goto('/jobs/create');

    // Fill form
    await page.fill('input[name="title"]', 'Plumbing Repair');
    await page.fill('textarea[name="description"]', 'Need urgent plumbing repair');
    await page.fill('input[name="location"]', 'New York, NY');

    // Upload photo
    await page.setInputFiles(
      'input[type="file"]',
      'tests/fixtures/test-image.jpg'
    );

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect
    await expect(page).toHaveURL(/\/jobs\/\d+/);

    // Verify job details
    await expect(page.getByText('Plumbing Repair')).toBeVisible();
    await expect(page.getByText('Need urgent plumbing repair')).toBeVisible();
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/jobs/create');

    // Submit without filling form
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.getByText(/title is required/i)).toBeVisible();
    await expect(page.getByText(/description is required/i)).toBeVisible();
  });

  test('should handle file upload errors', async ({ page }) => {
    await page.goto('/jobs/create');

    // Try to upload invalid file
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/invalid.txt');

    await expect(page.getByText(/invalid file type/i)).toBeVisible();
  });
});
```

### Page Object Pattern

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async expectError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}

// Test using page object
test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');

  await expect(page).toHaveURL('/dashboard');
});
```

---

## Performance Testing

### Load Testing with k6

```javascript
// load-tests/critical-endpoints.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Test GET /api/jobs
  const jobsRes = http.get('http://localhost:3000/api/jobs');
  check(jobsRes, {
    'jobs status is 200': (r) => r.status === 200,
    'jobs response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test POST /api/jobs
  const payload = JSON.stringify({
    title: 'Test Job',
    description: 'Description',
    location: 'New York'
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const createRes = http.post(
    'http://localhost:3000/api/jobs',
    payload,
    params
  );

  check(createRes, {
    'create status is 201': (r) => r.status === 201,
  });

  sleep(1);
}
```

### Performance Budget Tests

```typescript
// performance.test.ts
describe('Performance Budgets', () => {
  it('should meet bundle size budget', async () => {
    const bundleSize = await getBundleSize();
    expect(bundleSize.main).toBeLessThan(512 * 1024); // 512KB
    expect(bundleSize.total).toBeLessThan(2 * 1024 * 1024); // 2MB
  });

  it('should meet rendering performance', async () => {
    const metrics = await measurePageLoad();
    expect(metrics.fcp).toBeLessThan(1800); // First Contentful Paint
    expect(metrics.tti).toBeLessThan(3500); // Time to Interactive
    expect(metrics.tbt).toBeLessThan(300);  // Total Blocking Time
  });
});
```

---

## Security Testing

### Input Validation Tests

```typescript
describe('Security - Input Validation', () => {
  it('should sanitize user input', () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const sanitized = sanitizeInput(maliciousInput);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
  });

  it('should prevent SQL injection', async () => {
    const maliciousQuery = "'; DROP TABLE users; --";

    await expect(
      JobService.searchJobs(maliciousQuery)
    ).resolves.not.toThrow();

    // Verify tables still exist
    const { data } = await supabase.from('users').select('count');
    expect(data).toBeDefined();
  });

  it('should validate email format', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('test@example.com')).toBe(true);
  });
});
```

### Authentication Tests

```typescript
describe('Security - Authentication', () => {
  it('should require authentication', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/jobs'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('should reject invalid tokens', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/jobs',
      headers: {
        authorization: 'Bearer invalid-token'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() =>
      fetch('http://localhost:3000/api/jobs', {
        headers: { authorization: 'Bearer valid-token' }
      })
    );

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
```

---

## Best Practices

### 1. Test Organization

```typescript
describe('ComponentName', () => {
  // Group related tests
  describe('Rendering', () => {
    // Rendering tests
  });

  describe('User Interactions', () => {
    // Interaction tests
  });

  describe('Edge Cases', () => {
    // Edge case tests
  });

  describe('Error Handling', () => {
    // Error tests
  });
});
```

### 2. Setup and Teardown

```typescript
describe('Test Suite', () => {
  let mockData: any[];

  beforeAll(() => {
    // Run once before all tests
  });

  afterAll(() => {
    // Run once after all tests
  });

  beforeEach(() => {
    // Run before each test
    mockData = createMockData();
  });

  afterEach(() => {
    // Run after each test
    jest.clearAllMocks();
  });
});
```

### 3. Meaningful Test Names

```typescript
// ❌ Bad
it('test 1', () => {});
it('works', () => {});

// ✅ Good
it('should display error message when email is invalid', () => {});
it('should disable submit button while form is submitting', () => {});
```

### 4. Arrange-Act-Assert Pattern

```typescript
it('should increment counter', async () => {
  // Arrange - Set up test data and environment
  const user = userEvent.setup();
  render(<Counter initialValue={0} />);

  // Act - Perform the action being tested
  await user.click(screen.getByRole('button', { name: /increment/i }));

  // Assert - Verify the expected outcome
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### 5. Test Isolation

```typescript
// ❌ Bad - Tests depend on each other
describe('Counter', () => {
  let count = 0;

  it('increments', () => {
    count++;
    expect(count).toBe(1);
  });

  it('increments again', () => {
    count++;
    expect(count).toBe(2); // Depends on previous test
  });
});

// ✅ Good - Each test is independent
describe('Counter', () => {
  it('increments from initial value', () => {
    const counter = new Counter(0);
    counter.increment();
    expect(counter.value).toBe(1);
  });

  it('increments from any value', () => {
    const counter = new Counter(5);
    counter.increment();
    expect(counter.value).toBe(6);
  });
});
```

---

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const promise = fetchData();

  // Use waitFor for operations that take time
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });

  // Or wait for specific elements
  const element = await screen.findByText('Data loaded');
  expect(element).toBeInTheDocument();
});
```

### Testing Forms

```typescript
it('should submit form data', async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();

  render(<ContactForm onSubmit={onSubmit} />);

  // Fill form
  await user.type(screen.getByLabelText(/name/i), 'John Doe');
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.type(screen.getByLabelText(/message/i), 'Hello World');

  // Submit
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Verify
  expect(onSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello World'
  });
});
```

### Testing Error Boundaries

```typescript
it('should catch errors and display fallback', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary fallback={<div>Error occurred</div>}>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Error occurred')).toBeInTheDocument();
});
```

### Testing Custom Hooks

```typescript
it('should manage state correctly', () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

---

## Resources

- [Testing Library Docs](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Docs](https://playwright.dev/)
- [k6 Load Testing](https://k6.io/docs/)

---

**Last Updated:** 2025-01-02
