# Testing Best Practices - Mintenance Mobile

**Goal**: Write tests that verify production code behavior, not mock behavior

---

## The Problem We're Solving

### ❌ BAD: Mock-Only Tests (0% Coverage)

```typescript
// This test has 0% coverage because it only tests mocks
it('creates payment intent successfully', async () => {
  mockSupabase.functions.invoke.mockResolvedValue({
    data: { client_secret: 'secret' }
  });

  await PaymentService.initializePayment({ amount: 150 });

  expect(mockSupabase.functions.invoke).toHaveBeenCalled();  // ← Testing mock!
});
```

**Why it's bad**:
- Doesn't verify PaymentService logic
- Doesn't test amount conversion
- Doesn't test validation
- Doesn't test error handling
- **Coverage: 0%**

### ✅ GOOD: Hybrid Tests (Real Logic + Mocked I/O)

```typescript
describe('PaymentService.initializePayment', () => {
  it('validates amount is positive', async () => {
    await expect(
      PaymentService.initializePayment({ amount: -100 })
    ).rejects.toThrow('Amount must be positive');
    // ✅ Tests actual validation logic
  });

  it('converts dollars to cents correctly', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
      data: { client_secret: 'secret' }
    });

    await PaymentService.initializePayment({ amount: 150.50 });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
      'create-payment-intent',
      expect.objectContaining({
        body: expect.objectContaining({
          amount: 15050  // ✅ Verifies conversion logic
        })
      })
    );
  });

  it('retries on network failure', async () => {
    mockSupabase.functions.invoke
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({ data: { client_secret: 'secret' } });

    const result = await PaymentService.initializePayment({ amount: 150 });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);
    expect(result.clientSecret).toBe('secret');
    // ✅ Tests retry logic + final result
  });
});
```

**Why it's good**:
- Tests actual validation
- Tests conversion logic
- Tests retry behavior
- Tests error handling
- **Coverage: 80%+**

---

## Golden Rules

### Rule 1: Mock External I/O, Not Business Logic

**✅ DO Mock**:
- Database calls (Supabase)
- API calls (Stripe, external services)
- File system
- Network requests
- System time (`Date.now()`)

**❌ DON'T Mock**:
- Your own service methods
- Utility functions
- Validation logic
- Data transformations
- Business rules

### Rule 2: Test Behavior, Not Implementation

**❌ BAD** (tests implementation):
```typescript
it('calls Supabase', async () => {
  await PaymentService.createPayment();
  expect(mockSupabase.from).toHaveBeenCalled();  // Who cares?
});
```

**✅ GOOD** (tests behavior):
```typescript
it('creates payment with correct data', async () => {
  const payment = await PaymentService.createPayment({
    amount: 100,
    currency: 'usd'
  });

  expect(payment.amount).toBe(10000);  // Converted to cents
  expect(payment.currency).toBe('usd');
  expect(payment.status).toBe('pending');
});
```

### Rule 3: Every Test Must Increase Coverage

**Before writing a test**:
```bash
# Check current coverage
npm test -- --coverage PaymentService.test.ts

# Note the percentage (e.g., 45%)
```

**After writing a test**:
```bash
# Run again
npm test -- --coverage PaymentService.test.ts

# Coverage should increase (e.g., 45% → 52%)
```

**If coverage didn't increase**: Your test is mock-only or redundant!

### Rule 4: Test Edge Cases, Not Just Happy Path

**❌ Incomplete**:
```typescript
it('creates payment', async () => {
  const payment = await PaymentService.createPayment({ amount: 100 });
  expect(payment).toBeDefined();
});
```

**✅ Complete**:
```typescript
describe('PaymentService.createPayment', () => {
  it('succeeds with valid amount', async () => {
    const payment = await PaymentService.createPayment({ amount: 100 });
    expect(payment.status).toBe('pending');
  });

  it('throws on negative amount', async () => {
    await expect(
      PaymentService.createPayment({ amount: -100 })
    ).rejects.toThrow('Amount must be positive');
  });

  it('throws on zero amount', async () => {
    await expect(
      PaymentService.createPayment({ amount: 0 })
    ).rejects.toThrow('Amount must be positive');
  });

  it('handles amounts with decimals', async () => {
    const payment = await PaymentService.createPayment({ amount: 99.99 });
    expect(payment.amountCents).toBe(9999);
  });

  it('throws on excessively large amount', async () => {
    await expect(
      PaymentService.createPayment({ amount: 1000000 })
    ).rejects.toThrow('Amount exceeds maximum');
  });
});
```

---

## Test Structure Template

```typescript
import { ServiceUnderTest } from '../ServiceUnderTest';
import { externalDependency } from '../external';

// Mock ONLY external I/O
jest.mock('../external', () => ({
  externalDependency: {
    call: jest.fn(),
  },
}));

describe('ServiceUnderTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    // Happy path
    it('succeeds with valid input', async () => {
      // Arrange: Setup mocks for external I/O
      (externalDependency.call as jest.Mock).mockResolvedValue({
        data: 'success'
      });

      // Act: Call the actual service method
      const result = await ServiceUnderTest.methodName('validInput');

      // Assert: Verify BEHAVIOR (not just mock calls)
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
    });

    // Edge cases
    it('throws on invalid input', async () => {
      await expect(
        ServiceUnderTest.methodName(null)
      ).rejects.toThrow('Input required');
    });

    // Error handling
    it('handles external service failure', async () => {
      (externalDependency.call as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(
        ServiceUnderTest.methodName('validInput')
      ).rejects.toThrow('Service unavailable');
    });

    // Business logic
    it('transforms data correctly', async () => {
      (externalDependency.call as jest.Mock).mockResolvedValue({
        raw_value: '100'
      });

      const result = await ServiceUnderTest.methodName('validInput');

      expect(result.processedValue).toBe(100);  // Verify transformation
    });
  });
});
```

---

## Coverage Targets

### Service Files
- **Minimum**: 60%
- **Good**: 75%
- **Excellent**: 85%+

### Utility Files
- **Minimum**: 80%
- **Good**: 90%
- **Excellent**: 95%+

### Component Files
- **Minimum**: 40% (harder to test UI)
- **Good**: 60%
- **Excellent**: 75%+

---

## Common Patterns

### Pattern 1: Testing Validation

```typescript
describe('validateEmail', () => {
  it.each([
    ['user@example.com', true],
    ['invalid', false],
    ['', false],
    [null, false],
    ['@example.com', false],
    ['user@', false],
  ])('validates "%s" as %s', (email, expected) => {
    if (expected) {
      expect(() => validateEmail(email)).not.toThrow();
    } else {
      expect(() => validateEmail(email)).toThrow();
    }
  });
});
```

### Pattern 2: Testing Async Operations

```typescript
it('waits for async operation', async () => {
  mockApi.fetch.mockResolvedValue({ data: 'result' });

  const promise = ServiceUnderTest.fetchData();

  // Don't forget to await!
  const result = await promise;

  expect(result).toEqual({ data: 'result' });
});
```

### Pattern 3: Testing Error Handling

```typescript
it('handles and logs errors', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation();
  mockApi.fetch.mockRejectedValue(new Error('API Error'));

  await expect(
    ServiceUnderTest.fetchData()
  ).rejects.toThrow('Failed to fetch data');

  expect(consoleError).toHaveBeenCalledWith(
    expect.stringContaining('API Error')
  );

  consoleError.mockRestore();
});
```

### Pattern 4: Testing Retry Logic

```typescript
it('retries 3 times before failing', async () => {
  mockApi.fetch
    .mockRejectedValueOnce(new Error('Fail 1'))
    .mockRejectedValueOnce(new Error('Fail 2'))
    .mockRejectedValueOnce(new Error('Fail 3'));

  await expect(
    ServiceUnderTest.fetchWithRetry()
  ).rejects.toThrow();

  expect(mockApi.fetch).toHaveBeenCalledTimes(3);
});

it('succeeds on second retry', async () => {
  mockApi.fetch
    .mockRejectedValueOnce(new Error('Fail 1'))
    .mockResolvedValueOnce({ data: 'success' });

  const result = await ServiceUnderTest.fetchWithRetry();

  expect(result.data).toBe('success');
  expect(mockApi.fetch).toHaveBeenCalledTimes(2);
});
```

---

## Checklist Before Committing Tests

- [ ] Does coverage increase when I run this test?
- [ ] Am I testing actual business logic (not just mocks)?
- [ ] Did I test at least one edge case?
- [ ] Did I test error handling?
- [ ] Would this test catch a real bug if I introduced one?
- [ ] Can I explain what behavior this test verifies?

If you answer "NO" to any of these, **improve the test** before committing.

---

## Tools

### Validate Test Quality
```bash
# Check a single test file
node scripts/validate-test-quality.js apps/mobile/src/__tests__/services/PaymentService.test.ts

# Check all services
node scripts/validate-test-quality.js apps/mobile/src/__tests__/services
```

### Check Coverage
```bash
# Run tests with coverage
npm test -- --coverage

# Check specific file
npm test -- --coverage PaymentService.test.ts

# View HTML report
open coverage/lcov-report/index.html
```

### Watch Mode
```bash
# Re-run tests on file change
npm test -- --watch PaymentService.test.ts
```

---

## Migration Strategy

### For Existing Mock-Only Tests:

1. **Identify** the test's intent
2. **Add** real behavior assertions
3. **Keep** mock setup for I/O
4. **Verify** coverage increases
5. **Commit** with evidence

**Example Migration**:
```diff
  it('creates payment intent successfully', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
      data: { client_secret: 'pi_secret_123' }
    });

    const result = await PaymentService.initializePayment({
      amount: 150,
      jobId: 'job-1'
    });

-   expect(mockSupabase.functions.invoke).toHaveBeenCalled();
+   // Verify actual behavior
+   expect(result.clientSecret).toBe('pi_secret_123');
+   expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
+     'create-payment-intent',
+     expect.objectContaining({
+       body: {
+         amount: 15000,  // Converted to cents
+         jobId: 'job-1',
+       }
+     })
+   );
  });
```

---

## FAQ

### Q: Should I never check if mocks were called?

**A**: You can, but it should be **secondary**. Primary assertion should verify behavior.

**✅ Good**:
```typescript
const result = await service.method();
expect(result.value).toBe(expected);  // ← Primary
expect(mockApi).toHaveBeenCalledWith(correctParams);  // ← Secondary
```

**❌ Bad**:
```typescript
await service.method();
expect(mockApi).toHaveBeenCalled();  // ← Only assertion
```

### Q: How do I test code that uses `Date.now()`?

**A**: Mock the system time:
```typescript
it('creates timestamp', () => {
  jest.spyOn(Date, 'now').mockReturnValue(1609459200000);

  const result = service.createRecord();

  expect(result.timestamp).toBe(1609459200000);
});
```

### Q: How do I test code that uses randomness?

**A**: Mock `Math.random`:
```typescript
it('generates ID', () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.5);

  const id = service.generateId();

  expect(id).toBe('expected-id-based-on-0.5');
});
```

### Q: My test is flaky, what do I do?

**A**: Common causes:
1. **Timing issues**: Use `await` properly, increase timeouts if needed
2. **Shared state**: Reset mocks/state in `beforeEach`
3. **Race conditions**: Mock timers with `jest.useFakeTimers()`
4. **External dependencies**: Ensure all external calls are mocked

---

## Summary

**The One Rule**: Tests should verify that your code does what it's supposed to do, not that mocks behave like mocks.

**Good test**: "When I call `createPayment(100)`, it converts to cents and returns a pending payment"

**Bad test**: "When I call `createPayment()`, the Supabase mock gets called"

**Verify your tests work**: Coverage should go up!
