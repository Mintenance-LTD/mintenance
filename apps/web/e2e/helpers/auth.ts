/**
 * Authentication Helpers for Playwright E2E Tests
 *
 * These helpers allow tests to authenticate as different user types
 * and test protected routes without manually logging in each time.
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'homeowner' | 'contractor' | 'admin';
}

/**
 * Test user credentials (these should exist in your test database)
 *
 * To set up test users:
 * 1. Create these accounts in Supabase manually or via seed script
 * 2. Or use the signUpAndLogin helper to create them on-the-fly
 */
export const TEST_USERS = {
  homeowner: {
    email: 'test-homeowner@example.com',
    password: 'TestHomeowner123!',
    role: 'homeowner' as const,
  },
  contractor: {
    email: 'test-contractor@example.com',
    password: 'TestContractor123!',
    role: 'contractor' as const,
  },
  admin: {
    email: 'test-admin@example.com',
    password: 'TestAdmin123!',
    role: 'admin' as const,
  },
};

/**
 * Login as Homeowner
 *
 * Use this before tests that require homeowner authentication.
 *
 * @example
 * test('homeowner can create job', async ({ page }) => {
 *   await loginAsHomeowner(page);
 *   await page.goto('/jobs/create');
 *   // ... test job creation
 * });
 */
export async function loginAsHomeowner(page: Page): Promise<void> {
  await login(page, TEST_USERS.homeowner);

  // Verify we're on dashboard (homeowners use /dashboard)
  await page.waitForURL(/\/(dashboard|jobs)/, { timeout: 10000 });
}

/**
 * Login as Contractor
 *
 * Use this before tests that require contractor authentication.
 *
 * @example
 * test('contractor can view jobs', async ({ page }) => {
 *   await loginAsContractor(page);
 *   await page.goto('/contractor/discover');
 *   // ... test job discovery
 * });
 */
export async function loginAsContractor(page: Page): Promise<void> {
  await login(page, TEST_USERS.contractor);

  // Verify we're on contractor dashboard or appropriate page
  await page.waitForURL(/\/contractor/, { timeout: 10000 });
}

/**
 * Login as Admin
 *
 * Use this before tests that require admin authentication.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, TEST_USERS.admin);

  // Verify we're on admin dashboard
  await page.waitForURL(/\/admin/, { timeout: 10000 });
}

/**
 * Generic login function
 *
 * Handles the login flow for any user type.
 * Waits for navigation after successful login.
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  // Navigate to login page
  await page.goto('/auth/login');

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Dismiss any modals that might be blocking (version update, cookie consent, etc.)
  // Try to click "Later" on version update modal
  const laterButton = page.getByRole('button', { name: /later/i });
  if (await laterButton.isVisible().catch(() => false)) {
    await laterButton.click();
    await page.waitForTimeout(500);
  }

  // Try to click "Accept All" or "Essential Only" on cookie consent
  const acceptCookies = page.getByRole('button', { name: /accept all|essential only/i }).first();
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
    await page.waitForTimeout(500);
  }

  // Fill in credentials
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);

  // Submit form and wait for navigation
  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 30000 }),
    page.getByRole('button', { name: /log in|sign in/i }).click(),
  ]);

  // Wait for any additional navigation/redirects to complete
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Ignore timeout - page might already be loaded
  });

  // CRITICAL: Wait for Supabase session to be fully established
  // This ensures localStorage/cookies are properly set before proceeding
  await page.waitForTimeout(2000);

  // Verify authentication persisted by checking if user data exists in localStorage
  const hasSession = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys.some(key => key.includes('supabase.auth.token') || key.includes('sb-'));
  });

  if (!hasSession) {
    throw new Error('Authentication session not established - localStorage empty');
  }
}

/**
 * Logout
 *
 * Logs out the current user.
 * Verifies redirect to login or home page.
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button/link
  const logoutButton = page.getByRole('button', { name: /log out|sign out/i });
  const logoutLink = page.getByRole('link', { name: /log out|sign out/i });

  // Click whichever is available
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
  } else if (await logoutLink.isVisible().catch(() => false)) {
    await logoutLink.click();
  } else {
    // May need to open profile menu first
    const profileButton = page.getByRole('button', { name: /profile|account|menu/i });
    if (await profileButton.isVisible().catch(() => false)) {
      await profileButton.click();
      await page.waitForTimeout(500); // Wait for menu animation

      // Try logout again
      const menuLogout = page.getByRole('button', { name: /log out|sign out/i });
      await menuLogout.click();
    }
  }

  // Wait for redirect to login or home
  await page.waitForURL(url =>
    url.pathname.includes('/auth/login') || url.pathname === '/',
    { timeout: 5000 }
  );
}

/**
 * Sign up and login (for creating test users on-the-fly)
 *
 * Creates a new user account and logs in.
 * Useful for tests that need a fresh user.
 *
 * @example
 * test('new user can complete onboarding', async ({ page }) => {
 *   const timestamp = Date.now();
 *   await signUpAndLogin(page, {
 *     email: `newuser${timestamp}@example.com`,
 *     password: 'NewUser123!',
 *     role: 'homeowner',
 *   });
 *   // ... test onboarding flow
 * });
 */
export async function signUpAndLogin(page: Page, user: TestUser): Promise<void> {
  // Navigate to signup page
  await page.goto('/auth/signup');

  // Fill in signup form
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill(user.password);
  await page.getByLabel(/confirm password/i).fill(user.password);

  // Select role if radio buttons are present
  const roleRadio = page.getByRole('radio', { name: new RegExp(user.role, 'i') });
  if (await roleRadio.isVisible().catch(() => false)) {
    await roleRadio.check();
  }

  // Submit form
  await page.getByRole('button', { name: /sign up|create account/i }).click();

  // For real apps, you'd need to verify email first
  // For testing, we assume email verification is disabled or auto-verified

  // Wait for success or redirect
  await page.waitForTimeout(2000);

  // If we're on a "check your email" page, skip to login
  // (In a real test environment, you'd use a test email service or disable email verification)
  const currentUrl = page.url();
  if (!currentUrl.includes('dashboard') && !currentUrl.includes(user.role)) {
    await login(page, user);
  }
}

/**
 * Check if user is authenticated
 *
 * Verifies that a user is logged in by checking for common auth indicators.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for common authenticated state indicators
  const hasLogoutButton = await page.getByRole('button', { name: /log out|sign out/i }).isVisible().catch(() => false);
  const hasProfileButton = await page.getByRole('button', { name: /profile|account/i }).isVisible().catch(() => false);
  const hasUserMenu = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);

  return hasLogoutButton || hasProfileButton || hasUserMenu;
}

/**
 * Get current user's role from the page
 *
 * Attempts to determine the user's role based on the current URL.
 */
export async function getCurrentUserRole(page: Page): Promise<'homeowner' | 'contractor' | 'admin' | 'guest'> {
  const url = page.url();

  if (url.includes('/contractor')) return 'contractor';
  if (url.includes('/homeowner')) return 'homeowner';
  if (url.includes('/admin')) return 'admin';

  const authenticated = await isAuthenticated(page);
  return authenticated ? 'homeowner' : 'guest'; // Default to homeowner if authenticated but path unclear
}

/**
 * Clear authentication (reset browser state)
 *
 * Clears cookies and local storage to start fresh.
 * Use this in beforeEach if you want tests to be completely independent.
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
