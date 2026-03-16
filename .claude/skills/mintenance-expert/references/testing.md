# Mintenance Testing Reference

## Test Configuration

### Vitest (Web)
**File**: `apps/web/vitest.config.ts`

Key settings:
```typescript
{
  environment: 'happy-dom',
  globals: true,          // beforeEach, afterEach, vi, expect are global
  setupFiles: ['./test/setup.ts'],
  testTimeout: 15000,
  clearMocks: true,
  restoreMocks: true,
  mockReset: true,        // CRITICAL: clears ALL mock implementations between tests
  reporters: ['verbose'],
}
```

**`mockReset: true` is the most important setting.** It means every mock function's implementation is cleared after each test. If you define mocks in a `vi.mock()` factory without `vi.hoisted()`, they become `undefined` in the next test.

### Test Location
```
apps/web/__tests__/         # Web test files
apps/web/test/setup.ts      # Global test setup (702 lines)
apps/mobile/src/__tests__/  # Mobile test files
```

## The vi.hoisted() Pattern (CRITICAL)

Because of `mockReset: true`, ALL mock implementations that need to persist across tests must use `vi.hoisted()`:

```typescript
// CORRECT: Mocks survive mockReset
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  supabaseFrom: vi.fn(),
  requireCSRF: vi.fn(),
  stripeCreate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: mocks.supabaseFrom,
  },
}));

// WRONG: Mock becomes undefined after first test
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: vi.fn(), // <-- cleared by mockReset!
}));
```

## Global Test Setup (test/setup.ts)

The setup file (702 lines) provides default mocks for the entire test suite:

### Next.js Mocks
```typescript
// Navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Headers
vi.mock('next/headers', () => ({
  cookies: () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
  headers: () => new Map(),
}));

// Image
vi.mock('next/image', () => ({ default: (props) => <img {...props} /> }));
```

### Supabase Mocks
```typescript
// Returns chainable query builder
// .from('table').select('*').eq('id', '1').single()
// All resolve to { data: null, error: null } by default
```

### Stripe Mocks
```typescript
// Class-based mock with nested methods:
// stripe.paymentIntents.create/retrieve/update/confirm/cancel
// stripe.refunds.create
// stripe.transfers.create
// stripe.customers.create/retrieve/list
// stripe.paymentMethods.attach/detach
// All resolve to { id: 'pi_test' } or similar
```

### Environment Variables
```typescript
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-testing';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
process.env.STRIPE_SECRET_KEY = 'sk_test_...';
// etc.
```

## Writing API Route Tests

### Standard Pattern
```typescript
import { NextRequest } from 'next/server';

// 1. Hoisted mocks
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  supabaseFrom: vi.fn(),
  requireCSRF: vi.fn().mockResolvedValue(undefined),
}));

// 2. Module mocks
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.supabaseFrom },
  createServerSupabaseClient: vi.fn(() => ({ from: mocks.supabaseFrom })),
}));

vi.mock('@/lib/middleware/csrf', () => ({
  requireCSRF: mocks.requireCSRF,
}));

// 3. Import the route handler AFTER mocks
const { POST } = await import('@/app/api/example/route');

// 4. Tests
describe('POST /api/example', () => {
  beforeEach(() => {
    // Setup default mock state (mockReset clears between tests)
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'homeowner',
    });
  });

  it('should create an example', async () => {
    // Arrange: mock Supabase response
    mocks.supabaseFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'new-123', name: 'Test' },
        error: null,
      }),
    });

    // Act
    const request = new NextRequest(
      new URL('http://localhost:3000/api/example'),
      {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
        headers: { 'content-type': 'application/json' },
      }
    );
    const response = await POST(request, { params: Promise.resolve({}) });

    // Assert
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.id).toBe('new-123');
  });

  it('should reject unauthenticated requests', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const request = new NextRequest(
      new URL('http://localhost:3000/api/example'),
      { method: 'POST', body: JSON.stringify({ name: 'Test' }) }
    );
    const response = await POST(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
  });
});
```

### Chaining Supabase Mocks

For complex queries with multiple chained methods:

```typescript
mocks.supabaseFrom.mockReturnValue({
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
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: '123' }, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
});
```

### Testing Multiple Supabase Calls

When a handler calls `.from()` multiple times (different tables):

```typescript
mocks.supabaseFrom
  .mockReturnValueOnce({
    // First call: from('jobs')
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'job-1', status: 'posted' },
      error: null,
    }),
  })
  .mockReturnValueOnce({
    // Second call: from('bids')
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'bid-1', amount: 500 },
      error: null,
    }),
  });
```

## Writing Component Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('MyComponent', () => {
  it('renders and handles click', async () => {
    render(<MyComponent jobId="123" />);

    expect(screen.getByText('Job Details')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

## Running Tests

```bash
# Run all web tests
cd apps/web && npx vitest run

# Run specific test file
npx vitest run __tests__/api/jobs/create.test.ts

# Run tests matching pattern
npx vitest run --grep "payment"

# Run with coverage
npx vitest run --coverage

# Watch mode
npx vitest watch

# Mobile tests (Jest)
cd apps/mobile && npx jest
```

## Testing withApiHandler Routes

Routes using `withApiHandler` need specific mock patterns:

```typescript
// The handler provides: user (auth), CSRF check, rate limiting
// Your test must mock the auth and CSRF layers:

const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  supabaseFrom: vi.fn(),
  requireCSRF: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));

vi.mock('@/lib/middleware/csrf', () => ({
  requireCSRF: mocks.requireCSRF,
}));

// For role-restricted routes:
beforeEach(() => {
  mocks.getCurrentUserFromCookies.mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    role: 'contractor', // Must match route's `roles` config
  });
});
```

## Testing Stripe Integration

```typescript
const mocks = vi.hoisted(() => ({
  stripePaymentIntentsCreate: vi.fn(),
  stripeRefundsCreate: vi.fn(),
  stripeTransfersCreate: vi.fn(),
  stripeCustomersList: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  default: {
    paymentIntents: { create: mocks.stripePaymentIntentsCreate },
    refunds: { create: mocks.stripeRefundsCreate },
    transfers: { create: mocks.stripeTransfersCreate },
    customers: { list: mocks.stripeCustomersList },
  },
}));

// In test:
mocks.stripePaymentIntentsCreate.mockResolvedValue({
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret_xxx',
  status: 'requires_payment_method',
});
```

## Testing Cron Jobs (withCronHandler)

```typescript
// Cron routes use GET with secret auth header
const request = new NextRequest(
  new URL('http://localhost:3000/api/cron/my-job'),
  {
    method: 'GET',
    headers: { 'authorization': `Bearer ${process.env.CRON_SECRET}` },
  }
);

// Mock the cron handler:
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: vi.fn((name, handler) => handler),
}));
```

## Testing Services (No Route)

```typescript
// When testing service classes directly:
const mocks = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.supabaseFrom },
}));

const { EscrowService } = await import('@/lib/services/escrow/EscrowService');

it('should release escrow', async () => {
  mocks.supabaseFrom
    .mockReturnValueOnce({ /* escrow query */ })
    .mockReturnValueOnce({ /* update query */ });

  const result = await EscrowService.release('escrow-123');
  expect(result).toBeDefined();
});
```

## Mobile Testing (Jest)

### Configuration
- Uses Jest (not Vitest) with `@testing-library/react-native`
- 597 test files, ~93.8% pass rate
- `__mocks__/` directories for native module mocks

### Mock Patterns
```typescript
// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn() },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

// Test with navigation context
import { NavigationContainer } from '@react-navigation/native';

const renderWithNavigation = (component) => {
  return render(
    <NavigationContainer>{component}</NavigationContainer>
  );
};
```

### Running Mobile Tests
```bash
cd apps/mobile && npx jest
npx jest --testPathPattern="screens/HomeScreen"
npx jest --coverage
```

## Common Pitfalls

1. **Forgetting vi.hoisted()**: Mock becomes undefined after first test due to mockReset
2. **Not mocking CSRF**: Add `requireCSRF: vi.fn().mockResolvedValue(undefined)` or tests get 403
3. **Params as Promise**: Next.js App Router params are Promises: `{ params: Promise.resolve({ id: '123' }) }`
4. **Fetch mock**: Must include `ok: true, status: 200` for components checking `res.ok`
5. **Stripe default export**: Mock as `{ default: vi.fn().mockImplementation(() => ({...})) }`
6. **ConfigManager**: Mock as `{ getInstance: () => ({ get: mockGet, getRequired: mockGetRequired }) }`
7. **Cookie names**: `isDevelopment = process.env.NODE_ENV !== 'production'` (test counts as dev)
8. **Dynamic imports**: Route handlers must use `await import()` AFTER `vi.mock()` declarations
9. **Supabase chain order**: Mock methods must match exact chain order in source code
10. **Multiple .from() calls**: Use `.mockReturnValueOnce()` for each sequential table query
