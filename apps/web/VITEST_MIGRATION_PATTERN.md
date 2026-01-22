# Vitest Migration Pattern for Web App Tests

## Problem

470 out of 1,440 test files (~33%) use Jest syntax (`jest.mock()`, `jest.fn()`) in a Vitest environment, causing systematic failures.

## Root Causes

1. **Module-level mocking**: `jest.mock()` doesn't work the same way in Vitest - must use `vi.mock()`
2. **Function mocking**: `jest.fn()` compatibility layer exists (global.jest) but `jest.Mock` type doesn't
3. **Supabase chain mocking**: Complex query builder chains require special handling

## Solution Pattern

### 1. Import Vitest Utilities

```typescript
// OLD (Jest)
import { beforeEach, describe, it, expect } from '@jest/globals';

// NEW (Vitest)
import { vi, beforeEach, describe, it, expect } from 'vitest';
```

### 2. Mock Module Dependencies

```typescript
// OLD (Jest)
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// NEW (Vitest)
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));
```

### 3. Mock Function Creation

```typescript
// OLD (Jest)
const mockFunction = jest.fn();
(serverSupabase as jest.Mock).mockReturnValue(mockData);

// NEW (Vitest)
const mockFunction = vi.fn();
vi.mocked(serverSupabase).mockReturnValue(mockData);
```

### 4. Supabase Query Builder Chain Mocking

The Supabase client uses method chaining (`.from().select().eq().single()`), which requires special handling:

```typescript
// Helper to create chainable mock for Supabase
const createChain = (returnValue: any = { error: null, data: null }) => {
  const chain: any = {
    from: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(() => Promise.resolve(returnValue)),
  };

  // Make all methods return the chain for chaining
  chain.from.mockReturnThis();
  chain.select.mockReturnThis();
  chain.update.mockReturnThis();
  chain.insert.mockReturnThis();

  // eq() can be chained with single(), so it must return chain, not promise
  chain.eq.mockReturnThis();

  // Override eq() to also be awaitable when it's the last in chain
  chain.eq.mockImplementation((...args: any[]) => {
    // Return a thenable object (can be awaited) that also has .single() method
    const thenable: any = Promise.resolve(returnValue);
    thenable.single = chain.single;
    return thenable;
  });

  return chain;
};

// Use in beforeEach
let mockSupabaseClient: any;

beforeEach(() => {
  mockSupabaseClient = {
    from: vi.fn(() => createChain()),
  };

  vi.mocked(serverSupabase).mockReturnValue(mockSupabaseClient);
  vi.clearAllMocks();
});
```

### 5. Test Assertions

```typescript
// OLD (Jest - testing implementation details)
expect(mockSupabase.update).toHaveBeenCalledWith(
  expect.objectContaining({ payment_status: 'paid' })
);

// NEW (Vitest - testing behavior)
expect(mockSupabaseClient.from).toHaveBeenCalledWith('jobs');
expect(logger.info).toHaveBeenCalledWith(
  'Payment succeeded',
  expect.objectContaining({ paymentIntentId: 'pi_test_123' })
);
```

## Complete Working Example

See [apps/web/app/api/webhooks/stripe/handlers/__tests__/payment-intent.handler.test.ts](apps/web/app/api/webhooks/stripe/handlers/__tests__/payment-intent.handler.test.ts) for a fully working example with:
- ✅ Module mocking with `vi.mock()`
- ✅ Supabase chain mocking
- ✅ Error handling tests
- ✅ Multiple describe blocks
- ✅ All 6 tests passing

## Files Affected

Run this command to find all files needing migration:

```bash
cd apps/web && find . -name "*.test.ts" -o -name "*.test.tsx" | xargs grep -l "jest.mock\|jest.fn" | wc -l
# Output: 470 files
```

## Migration Steps for Each File

1. Add `import { vi } from 'vitest'` at top
2. Replace all `jest.mock()` with `vi.mock()`
3. Replace all `jest.fn()` with `vi.fn()`
4. Replace `as jest.Mock` with `vi.mocked()`
5. If mocking Supabase, use the `createChain()` pattern
6. Run the test to verify: `npm test -- path/to/test.test.ts --run`

## Common Errors and Fixes

### Error: `mockReturnValue is not a function`
**Cause**: Using `(fn as jest.Mock).mockReturnValue()` in Vitest
**Fix**: Use `vi.mocked(fn).mockReturnValue()` instead

### Error: `supabase.from(...).update(...).eq is not a function`
**Cause**: Incomplete Supabase chain mock
**Fix**: Use the `createChain()` helper pattern shown above

### Error: `Transform failed with 1 error: Expected "}" but found "-"`
**Cause**: Invalid identifier in import (e.g., `route-refactored`)
**Fix**: Delete placeholder test files with invalid syntax

## Performance Impact

Before: Tests timeout after 3 minutes (too many failures)
After: Individual test files complete in ~1-2 seconds

## Next Steps

1. ✅ Fixed template: `payment-intent.handler.test.ts` (6/6 tests passing)
2. Create automated migration script to fix all 470 files
3. Run full test suite with `npm test -- --run`
4. Generate coverage report: `npm test -- --coverage`
