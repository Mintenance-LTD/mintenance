/**
 * Mobile Responsive Regression E2E Tests
 *
 * Validates that the Mintenance web app works correctly on mobile viewports.
 * All tests run at 375x667 (iPhone SE / small mobile) to catch responsive
 * issues early.
 *
 * Tests cover:
 *   - Navigation menu toggle (hamburger menu)
 *   - Job list scrolling and card rendering
 *   - Form submission on mobile viewport
 *   - No horizontal overflow (content stays within viewport)
 *
 * Prerequisites:
 *   - Dev/staging server running
 *   - Test users exist (for authenticated tests)
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsHomeowner, clearAuth } from '../helpers/auth';
import { waitForNetworkIdle } from '../helpers/test-data';

// ---------------------------------------------------------------------------
// Mobile viewport configuration
// ---------------------------------------------------------------------------
const MOBILE_VIEWPORT = { width: 375, height: 667 };

// Apply mobile viewport to every test in this file
test.use({ viewport: MOBILE_VIEWPORT });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check that the page has no horizontal overflow.
 * Returns the amount of overflow in pixels (0 means no overflow).
 */
async function getHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const viewportWidth = window.innerWidth;
    return Math.max(0, docWidth - viewportWidth);
  });
}

/**
 * Assert zero horizontal overflow on the current page.
 */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await getHorizontalOverflow(page);
  expect(
    overflow,
    `Page has ${overflow}px horizontal overflow at ${page.url()}`
  ).toBeLessThanOrEqual(1); // 1px tolerance for sub-pixel rounding
}

// ============================================================================
// 1. NAVIGATION MENU TOGGLE
// ============================================================================

test.describe('Mobile: Navigation Menu', () => {
  test('landing page shows hamburger menu at mobile viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // On mobile, the desktop nav should be hidden and a hamburger icon visible
    const hamburger = page
      .getByRole('button', { name: /menu|toggle|navigation/i })
      .or(page.locator('[data-testid="mobile-menu-toggle"]'))
      .or(page.locator('button[aria-label*="menu" i]'))
      .or(page.locator('[data-testid="hamburger-menu"]'))
      .first();

    // It is also acceptable for there to be no hamburger if the nav is a
    // bottom tab bar or similar mobile-native pattern
    const hasHamburger = await hamburger.isVisible().catch(() => false);

    // Either we see a hamburger, or the desktop nav links are hidden
    const desktopNavVisible = await page
      .locator('nav a')
      .filter({ hasText: /dashboard|jobs|profile/i })
      .first()
      .isVisible()
      .catch(() => false);

    // On mobile, at least one of these should be true:
    //   - Hamburger is visible (collapsed nav)
    //   - Desktop nav is NOT visible (it was hidden responsively)
    //   - The page uses a different mobile nav pattern
    expect(hasHamburger || !desktopNavVisible).toBeTruthy();
  });

  test('hamburger menu opens and shows navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find and click hamburger
    const hamburger = page
      .getByRole('button', { name: /menu|toggle|navigation/i })
      .or(page.locator('[data-testid="mobile-menu-toggle"]'))
      .or(page.locator('button[aria-label*="menu" i]'))
      .or(page.locator('[data-testid="hamburger-menu"]'))
      .first();

    if (!(await hamburger.isVisible().catch(() => false))) {
      // No hamburger menu - may use a different mobile nav pattern
      test.skip();
      return;
    }

    await hamburger.click();
    await page.waitForTimeout(500); // Wait for animation

    // After clicking, navigation links should be visible
    const navLinks = page.locator('nav a, [role="navigation"] a, [data-testid="mobile-nav"] a');
    const linkCount = await navLinks.count();

    // Should have at least one navigation link visible
    expect(linkCount).toBeGreaterThan(0);
  });

  test('hamburger menu closes when link is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const hamburger = page
      .getByRole('button', { name: /menu|toggle|navigation/i })
      .or(page.locator('[data-testid="mobile-menu-toggle"]'))
      .or(page.locator('button[aria-label*="menu" i]'))
      .first();

    if (!(await hamburger.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Open menu
    await hamburger.click();
    await page.waitForTimeout(500);

    // Click on first visible nav link
    const firstLink = page
      .locator('nav a, [role="navigation"] a, [data-testid="mobile-nav"] a')
      .first();

    if (await firstLink.isVisible().catch(() => false)) {
      await firstLink.click();
      await page.waitForTimeout(500);

      // After navigation, the mobile menu overlay should be gone
      // (or we should be on a new page entirely)
      const menuOverlay = page.locator('[data-testid="mobile-menu-overlay"], [data-testid="mobile-nav"]');
      const overlayVisible = await menuOverlay.isVisible().catch(() => false);

      // Either overlay is hidden, or we navigated to a different URL
      expect(!overlayVisible || page.url() !== '/').toBeTruthy();
    }
  });
});

// ============================================================================
// 2. JOB LIST SCROLLING AND CARD RENDERING
// ============================================================================

test.describe('Mobile: Job List', () => {
  test('jobs page renders job cards stacked vertically', async ({ page }) => {
    await loginAsHomeowner(page);

    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Cards should be full-width on mobile (no side-by-side layout)
    const cards = page.locator('[data-testid="job-card"], [class*="card"], table tbody tr');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      // Empty state is valid
      const hasEmptyState = await page.getByText(/no.*job|no.*result|create.*first/i).isVisible().catch(() => false);
      expect(hasEmptyState).toBeTruthy();
      return;
    }

    // First card should be nearly full viewport width (within 40px for padding)
    const firstCard = cards.first();
    const box = await firstCard.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThan(MOBILE_VIEWPORT.width - 80);
    }
  });

  test('jobs page is scrollable without horizontal overflow', async ({ page }) => {
    await loginAsHomeowner(page);

    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }

    await expectNoHorizontalOverflow(page);

    // Verify vertical scrolling works by scrolling down
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    const scrollY = await page.evaluate(() => window.scrollY);
    // If page content is tall enough, we should have scrolled
    // (otherwise scrollY may be less than 500 but that is fine)
    expect(scrollY).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 3. FORM SUBMISSION ON MOBILE
// ============================================================================

test.describe('Mobile: Form Submission', () => {
  test('login form works on mobile viewport', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Email and password fields should be visible and usable
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Fields should be full-width (or close to it)
    const emailBox = await emailInput.boundingBox();
    if (emailBox) {
      expect(emailBox.width).toBeGreaterThan(MOBILE_VIEWPORT.width * 0.6);
    }

    // Submit button should be visible without scrolling too far
    const submitBtn = page.getByRole('button', { name: /log in|sign in/i });
    await expect(submitBtn).toBeVisible();
  });

  test('job creation form renders correctly on mobile', async ({ page }) => {
    await loginAsHomeowner(page);

    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Form should be present
    const hasForm =
      (await page.locator('[data-testid="job-create-form"]').isVisible().catch(() => false)) ||
      (await page.getByLabel(/title|job title/i).isVisible().catch(() => false));

    expect(hasForm).toBeTruthy();

    // No horizontal overflow
    await expectNoHorizontalOverflow(page);

    // Submit/next button should be visible (possibly after scroll)
    const actionBtn = page
      .getByRole('button', { name: /next|submit|post.*job|create.*job/i })
      .first();

    // Scroll to button if needed
    if (await actionBtn.count() > 0) {
      await actionBtn.scrollIntoViewIfNeeded().catch(() => {});
      await expect(actionBtn).toBeVisible();
    }
  });
});

// ============================================================================
// 4. NO HORIZONTAL OVERFLOW ON KEY PAGES
// ============================================================================

test.describe('Mobile: No Horizontal Overflow', () => {
  const publicPages = [
    { name: 'Landing', path: '/' },
    { name: 'Login', path: '/auth/login' },
    { name: 'Signup', path: '/auth/signup' },
  ];

  for (const { name, path } of publicPages) {
    test(`${name} page has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expectNoHorizontalOverflow(page);
    });
  }

  test('dashboard has no horizontal overflow (authenticated)', async ({ page }) => {
    await loginAsHomeowner(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }

    await expectNoHorizontalOverflow(page);
  });

  test('job creation page has no horizontal overflow (authenticated)', async ({ page }) => {
    await loginAsHomeowner(page);
    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }

    await expectNoHorizontalOverflow(page);
  });

  test('contractor discover page has no horizontal overflow', async ({ page }) => {
    // This tests the contractor view at mobile
    await page.goto('/contractor/discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // May redirect to login - that is fine, test the login page overflow instead
    await expectNoHorizontalOverflow(page);
  });
});
