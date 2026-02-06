# E2E Tests with Playwright

End-to-end tests for the Mintenance web application using Playwright.

## Overview

These tests verify critical user journeys through real browser automation:
- **Authentication Flow** - Sign up, login, password reset
- **Payment Flow** - Checkout, Stripe integration
- **Job Posting Flow** - Job creation, form validation

## Why Playwright Instead of Vitest Integration Tests?

The original integration tests attempted to unit test Next.js Server Components (async pages), which is not supported. Playwright tests the application through the browser, matching real user behavior.

**Benefits:**
- ✅ Tests Server Components, Client Components, and APIs together
- ✅ Tests real user interactions (clicks, form fills, navigation)
- ✅ Catches browser-specific issues
- ✅ More reliable than mocked integration tests
- ✅ Works with Next.js App Router architecture

## Installation

Playwright is already installed. To install browsers:

```bash
npx playwright install chromium
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug mode (step through tests)
```bash
npm run test:e2e:debug
```

### Generate tests with Codegen
```bash
npm run playwright:codegen
```

## Test Files

- `auth-flow.spec.ts` - Authentication and user signup (10 tests)
- `payment-flow.spec.ts` - Payment and checkout flow (6 tests)
- `job-posting-flow.spec.ts` - Job creation and management (9 tests)

**Total: 25 E2E tests**

## Configuration

Tests are configured in `playwright.config.ts`:
- **Browser**: Chromium (can add Firefox, Safari)
- **Base URL**: http://localhost:3000
- **Timeout**: 30 seconds per test
- **Screenshots**: Captured on failure
- **Video**: Recorded on failure
- **Trace**: Captured on retry

## Test Strategy

### What These Tests Cover

✅ **Critical User Paths:**
- User can sign up with valid details
- User can log in
- Password reset flow works
- Checkout page displays correctly
- Job creation form has required fields
- Form validation prevents invalid submissions

✅ **Real Browser Behavior:**
- Page navigation and routing
- Form interactions
- Link navigation
- Error message display
- Redirect behavior

### What These Tests Don't Cover

❌ **Unit-level logic** - Use Vitest for this
❌ **Component props** - Use React Testing Library
❌ **API mocking** - These test real endpoints
❌ **Database state** - Tests are stateless (for now)

## Authentication in Tests

Current tests assume **unauthenticated** state. Tests will:
- Navigate to pages that require auth → Expect redirect to login
- Test login/signup flows → Verify success messages
- Test public pages → Verify they load

**Future Enhancement:** Add authentication helpers:
```typescript
// test/helpers/auth.ts
export async function loginAsHomeowner(page: Page) {
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/homeowner/dashboard');
}
```

## Test Data Strategy

Tests use **realistic data** without database setup:
- Random emails with timestamps to avoid conflicts
- Valid but fake Stripe test card numbers
- Realistic job descriptions and budgets

**Current Approach:** Stateless tests that verify UI and navigation
**Future Enhancement:** Set up test database for end-to-end data verification

## Debugging Failed Tests

### View test report
```bash
npx playwright show-report
```

### Screenshots and videos
Failed tests automatically capture:
- Screenshots → `playwright-report/screenshots/`
- Videos → `playwright-report/videos/`
- Traces → `playwright-report/traces/`

### Debug a specific test
```bash
npx playwright test --debug -g "user can create new account"
```

## CI/CD Integration

To run in CI:
```yaml
# .github/workflows/e2e-tests.yml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

## Adding New Tests

### 1. Create new spec file
```bash
touch e2e/feature-name.spec.ts
```

### 2. Use test template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path');
    await expect(page.getByText('Expected Text')).toBeVisible();
  });
});
```

### 3. Run your test
```bash
npm run test:e2e -- feature-name.spec.ts
```

## Best Practices

✅ **Use semantic locators**
```typescript
// Good
await page.getByRole('button', { name: /submit/i })
await page.getByLabel(/email/i)

// Avoid
await page.locator('#submit-btn')
await page.locator('.email-input')
```

✅ **Wait for content, not arbitrary delays**
```typescript
// Good
await expect(page.getByText('Success')).toBeVisible()

// Avoid
await page.waitForTimeout(3000)
```

✅ **Test behavior, not implementation**
```typescript
// Good
await expect(page).toHaveURL(/dashboard/)

// Avoid
await expect(page.locator('.user-id')).toHaveText('123')
```

✅ **Keep tests independent**
- Each test should work in isolation
- Don't rely on test execution order
- Clean up test data if needed

## Performance

E2E tests are slower than unit tests:
- **Unit test**: ~10ms per test
- **E2E test**: ~2-5 seconds per test

**Optimization tips:**
- Run tests in parallel (configured by default)
- Use `test.skip()` for tests that require specific setup
- Focus on critical paths, not every edge case

## Next Steps

1. ✅ Run tests to verify they pass
2. ⚠️ Set up test database for data verification
3. ⚠️ Add authentication helpers
4. ⚠️ Add tests for contractor flows
5. ⚠️ Integrate with CI/CD pipeline

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
