# Testing Guide - Mintenance Next.js 16 App

## Overview

This guide covers testing strategies, best practices, and examples for the Mintenance platform using **Vitest** + **React Testing Library** for Next.js 16.

## Why Vitest?

- **Faster than Jest**: 10-20x faster for large codebases
- **Native ESM support**: Better for Next.js 16
- **Vite-powered**: Same tool as development
- **Jest-compatible API**: Easy migration
- **Better DX**: Built-in UI, instant HMR for tests

## Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Unit Tests** | Vitest + RTL | Functions, hooks, utilities |
| **Component Tests** | Vitest + RTL | Client Components |
| **Integration Tests** | Vitest | API routes, services |
| **E2E Tests** | Playwright | Critical user flows |
| **Mocking** | MSW | API request mocking |

## Project Structure

```
apps/web/
├── test/
│   ├── setup.ts              # Global test setup
│   ├── utils.tsx             # Test utilities & factories
│   └── examples/             # Example tests
│       ├── hook.test.ts      # Hook testing patterns
│       ├── component.test.tsx # Component testing patterns
│       └── api.test.ts       # API testing patterns
├── __tests__/                # Test files (collocated or here)
├── vitest.config.mts         # Vitest configuration
└── TESTING_GUIDE.md          # This file
```

## Quick Start

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --grep "JobCard"
```

### Writing Your First Test

```typescript
// components/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

## Testing Patterns

### 1. Component Testing (Client Components Only)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { JobCard } from './JobCard';

describe('JobCard', () => {
  it('should render job information', () => {
    const job = { title: 'Fix leak', budget: 150 };
    renderWithProviders(<JobCard job={job} />);

    expect(screen.getByText('Fix leak')).toBeInTheDocument();
    expect(screen.getByText('£150')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<JobCard job={job} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalled();
  });
});
```

### 2. Hook Testing (React Query Hooks)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useJobs } from '@/hooks/useJobs';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useJobs', () => {
  it('should fetch jobs', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => ({ jobs: [{ id: '1' }] }) })
    );

    const { result } = renderHook(() => useJobs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.jobs).toHaveLength(1);
  });
});
```

### 3. API Route Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '@/app/api/jobs/route';

vi.mock('@/lib/api/supabaseServer');

describe('Jobs API', () => {
  it('should return jobs', async () => {
    const request = new Request('http://localhost/api/jobs');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.jobs).toBeDefined();
  });

  it('should create a job', async () => {
    const body = {
      title: 'Fix leak',
      category: 'plumbing',
      budget: 150,
    };

    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
  });
});
```

### 4. Utility Function Testing

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency, calculateDistance } from '@/lib/utils';

describe('formatCurrency', () => {
  it('should format GBP correctly', () => {
    expect(formatCurrency(150)).toBe('£150');
    expect(formatCurrency(1250.50)).toBe('£1,250.50');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('£0');
  });
});

describe('calculateDistance', () => {
  it('should calculate distance between coordinates', () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const paris = { lat: 48.8566, lng: 2.3522 };

    const distance = calculateDistance(london, paris);

    expect(distance).toBeCloseTo(343, 0); // ~343 km
  });
});
```

## Mock Data Factories

Use the built-in factories from `test/utils.tsx`:

```typescript
import { mockUser, mockJob, mockBid } from '@/test/utils';

// Create mock data with defaults
const homeowner = mockUser.homeowner();
const contractor = mockUser.contractor({ rating: 5.0 });
const job = mockJob({ title: 'Custom title', budget: 200 });
const bid = mockBid({ amount: 180 });
```

## Mocking Strategies

### Mock Supabase

```typescript
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));
```

### Mock Next.js Router

```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/test',
}));
```

### Mock API with MSW

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/jobs', () => {
    return HttpResponse.json({ jobs: [mockJob()] });
  }),

  http.post('/api/jobs', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ job: { id: '123', ...body } }, { status: 201 });
  }),
];

// test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## Best Practices

### 1. Test File Naming

```
✅ Good:
- Button.test.tsx
- useJobs.test.ts
- jobs.api.test.ts

❌ Bad:
- button_test.tsx
- test-use-jobs.ts
- jobsSpec.ts
```

### 2. Test Organization (AAA Pattern)

```typescript
it('should create a job', () => {
  // Arrange
  const jobData = mockJob();

  // Act
  const result = createJob(jobData);

  // Assert
  expect(result.id).toBeDefined();
});
```

### 3. Descriptive Test Names

```typescript
✅ Good:
describe('JobCard', () => {
  describe('when user is homeowner', () => {
    it('should display "View Bids" button', () => {
      // test
    });
  });
});

❌ Bad:
describe('JobCard', () => {
  it('test1', () => {
    // test
  });
});
```

### 4. Avoid Testing Implementation Details

```typescript
❌ Bad (testing internal state):
expect(component.state.isOpen).toBe(true);

✅ Good (testing user-facing behavior):
expect(screen.getByRole('dialog')).toBeVisible();
```

### 5. Use Testing Library Queries

**Query Priority:**
1. `getByRole` - Best for accessibility
2. `getByLabelText` - Good for form fields
3. `getByPlaceholderText` - Form inputs
4. `getByText` - Text content
5. `getByTestId` - Last resort

```typescript
// Prefer this:
screen.getByRole('button', { name: /submit/i });

// Over this:
screen.getByTestId('submit-button');
```

## Testing Server Components

**Important**: You CANNOT unit test Server Components with RTL. They must be tested via E2E tests with Playwright.

```typescript
// ❌ Cannot test Server Component this way
import ServerComponent from './ServerComponent'; // Server Component
render(<ServerComponent />); // Will fail

// ✅ Use Playwright for Server Components
test('should display jobs list', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
});
```

## Coverage Requirements

Target coverage thresholds:

```json
{
  "global": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  }
}
```

Higher thresholds for critical paths:
- Auth: 95%
- Payment: 95%
- API routes: 85%
- UI components: 80%

## Debugging Tests

### Run Single Test

```bash
npm test -- --run components/Button.test.tsx
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:debug"],
  "console": "integratedTerminal"
}
```

### Use Test UI

```bash
npm run test:ui
```

Opens a browser with interactive test explorer.

### Print Debug Info

```typescript
import { screen, logRoles } from '@testing-library/react';

// Log all roles
logRoles(container);

// Debug current DOM
screen.debug();

// Debug specific element
screen.debug(screen.getByRole('button'));
```

## Common Pitfalls

### 1. Not Waiting for Async Updates

```typescript
❌ Bad:
const { result } = renderHook(() => useJobs());
expect(result.current.jobs).toBeDefined(); // Will fail

✅ Good:
const { result } = renderHook(() => useJobs());
await waitFor(() => {
  expect(result.current.jobs).toBeDefined();
});
```

### 2. Not Using `userEvent`

```typescript
❌ Bad:
fireEvent.click(button); // Doesn't simulate real user

✅ Good:
const user = userEvent.setup();
await user.click(button); // Simulates full user interaction
```

### 3. Querying After Element is Gone

```typescript
❌ Bad:
await user.click(deleteButton);
expect(screen.getByText('Item')).not.toBeInTheDocument(); // Throws error

✅ Good:
await user.click(deleteButton);
expect(screen.queryByText('Item')).not.toBeInTheDocument(); // Returns null
```

## Next Steps

1. **Review examples**: Check `test/examples/` folder
2. **Write tests**: Start with critical paths (auth, payments)
3. **Check coverage**: Run `npm run test:coverage`
4. **Set up CI**: Tests run automatically on PRs

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MSW Documentation](https://mswjs.io/)

## Support

Questions? Check existing tests in `__tests__/` or ask the team in #engineering.
