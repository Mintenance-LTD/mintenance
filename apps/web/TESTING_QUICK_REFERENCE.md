# Testing Quick Reference

## Commands

```bash
npm test                    # Run tests in watch mode
npm run test:run           # Run once (CI)
npm run test:ui            # Interactive UI
npm run test:coverage      # Generate coverage
npm run test:debug         # Debug mode
```

## Basic Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Feature', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should handle click', async () => {
  const onClick = vi.fn();
  const user = userEvent.setup();

  render(<Button onClick={onClick}>Click</Button>);
  await user.click(screen.getByRole('button'));

  expect(onClick).toHaveBeenCalledOnce();
});
```

## Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

it('should fetch data', async () => {
  const { result } = renderHook(() => useData(), { wrapper });

  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

## API Testing

```typescript
import { GET, POST } from './route';

it('should return data', async () => {
  const request = new Request('http://localhost/api/data');
  const response = await GET(request);

  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data).toBeDefined();
});
```

## Mocking

### Mock Functions
```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));
```

### Mock Modules
```typescript
vi.mock('module-name', () => ({
  exportedFunction: vi.fn(),
}));
```

### Mock Next.js
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));
```

## Assertions

### Basic
```typescript
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();
```

### Numbers
```typescript
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(3.14, 2);
```

### Strings
```typescript
expect(text).toContain('substring');
expect(text).toMatch(/regex/);
```

### Arrays
```typescript
expect(array).toHaveLength(3);
expect(array).toContain(item);
expect(array).toEqual([1, 2, 3]);
```

### Objects
```typescript
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });
```

### Functions
```typescript
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenLastCalledWith(arg);
```

### Errors
```typescript
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('message');
expect(() => fn()).toThrow(Error);
```

### DOM (Testing Library)
```typescript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveFocus();
expect(element).toHaveClass('className');
expect(element).toHaveAttribute('attr', 'value');
expect(element).toHaveTextContent('text');
expect(element).toHaveValue('input value');
```

## Queries (Testing Library)

### Priority Order (Use in this order)
1. `getByRole` - Accessibility
2. `getByLabelText` - Form fields
3. `getByPlaceholderText` - Inputs
4. `getByText` - Text content
5. `getByDisplayValue` - Current input value
6. `getByAltText` - Images
7. `getByTitle` - Title attribute
8. `getByTestId` - Last resort

### Query Variants
- `getBy...` - Throws if not found
- `queryBy...` - Returns null if not found
- `findBy...` - Async, waits for element

### Multiple Elements
- `getAllBy...` - Array of elements
- `queryAllBy...` - Empty array if not found
- `findAllBy...` - Async array

## User Interactions

```typescript
const user = userEvent.setup();

await user.click(element);
await user.dblClick(element);
await user.type(input, 'text');
await user.clear(input);
await user.selectOptions(select, 'option');
await user.tab();
await user.keyboard('{Enter}');
await user.hover(element);
await user.upload(input, file);
```

## Async Testing

### Wait For
```typescript
await waitFor(() => {
  expect(screen.getByText('loaded')).toBeInTheDocument();
});
```

### Wait For Options
```typescript
await waitFor(() => {
  expect(condition).toBe(true);
}, {
  timeout: 3000,
  interval: 100,
});
```

### Find Queries (Built-in wait)
```typescript
const element = await screen.findByText('text');
```

## Test Lifecycle

```typescript
import { beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // Runs once before all tests in suite
});

beforeEach(() => {
  // Runs before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Runs after each test
  cleanup();
});

afterAll(() => {
  // Runs once after all tests in suite
});
```

## Timers

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('should debounce', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 1000);

  debounced();
  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1000);
  expect(fn).toHaveBeenCalledOnce();
});
```

## Test Utilities (Custom)

### Mock Data
```typescript
import { mockUser, mockJob, mockBid } from '@/test/utils';

const user = mockUser.homeowner();
const job = mockJob({ title: 'Custom' });
```

### Render with Providers
```typescript
import { renderWithProviders } from '@/test/utils';

renderWithProviders(<Component />);
```

### API Mocking
```typescript
import { mockApiResponse } from '@/test/utils';

global.fetch = vi.fn(() =>
  Promise.resolve(mockApiResponse.success({ data }))
);
```

## Common Patterns

### Form Testing
```typescript
it('should submit form', async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();

  render(<Form onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'John');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({ name: 'John' });
});
```

### Modal Testing
```typescript
it('should close on escape', async () => {
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(<Modal open onClose={onClose} />);

  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});
```

### Loading States
```typescript
it('should show loading state', () => {
  render(<Component isLoading />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### Error States
```typescript
it('should display error', () => {
  render(<Component error="Failed to load" />);
  expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
});
```

## Coverage

### View Coverage
```bash
npm run test:coverage
open coverage/index.html
```

### Coverage Comments
```typescript
/* istanbul ignore next */
function devOnlyFunction() {
  // This won't count against coverage
}
```

## Debugging

### Debug Output
```typescript
import { screen } from '@testing-library/react';

screen.debug(); // Print entire DOM
screen.debug(element); // Print specific element
```

### VS Code Debugger
Add breakpoint and run:
```bash
npm run test:debug
```

### Isolate Tests
```typescript
it.only('should run only this test', () => {
  // Only this test runs
});

it.skip('should skip this test', () => {
  // This test is skipped
});
```

## Performance

### Parallel Tests (Default)
```typescript
// Tests run in parallel by default
```

### Sequential Tests
```typescript
describe.sequential('Sequential tests', () => {
  // These run one after another
});
```

### Concurrent Tests
```typescript
it.concurrent('test 1', async () => {
  // Runs concurrently with other concurrent tests
});
```

## Tips

1. **Use userEvent over fireEvent** for realistic interactions
2. **Await all user interactions** (`await user.click()`)
3. **Use waitFor for async** assertions
4. **Query by role** for accessibility
5. **Test behavior, not implementation**
6. **Mock external dependencies**
7. **Keep tests focused** (one concept per test)
8. **Use descriptive test names**
9. **Clean up after tests** (automatic with RTL)
10. **Don't test library code** (React Query, etc.)

## File Locations

- **Config**: `vitest.config.mts`
- **Setup**: `test/setup.ts`
- **Utils**: `test/utils.tsx`
- **Examples**: `test/examples/`
- **Docs**: `TESTING_GUIDE.md`
