/**
 * Shared E2E test helpers for Mintenance Detox tests.
 *
 * These helpers abstract common sequences (login, navigation, waits)
 * so individual test files stay concise and readable.
 */

// Test user credentials (must exist in the Supabase test database)
export const TEST_HOMEOWNER = {
  email: 'test-homeowner@example.com',
  password: 'Test1234!',
};

const TEST_CONTRACTOR = {
  email: 'test-contractor@example.com',
  password: 'Test1234!',
};

// Test job ID for flows that require an existing job (must exist in test DB)
const TEST_JOB_ID = 'e2e-test-job-001';

/**
 * Log in as a specific user via the login screen.
 * Assumes the app starts on the login screen or is already logged out.
 */
async function loginAs(email: string, password: string) {
  await waitFor(element(by.id('login-screen')))
    .toBeVisible()
    .withTimeout(10000);

  await element(by.id('email-input')).clearText();
  await element(by.id('email-input')).typeText(email);

  await element(by.id('password-input')).clearText();
  await element(by.id('password-input')).typeText(password);

  // Dismiss keyboard before tapping login
  await element(by.id('password-input')).tapReturnKey();

  // Tap the login button — look for the button by text since testID may vary
  try {
    await element(by.text('Sign In')).tap();
  } catch {
    // Fallback: some variants use "Log In"
    await element(by.text('Log In')).tap();
  }

  // Wait for the home screen to appear (indicates successful login)
  await waitFor(element(by.id('home-screen')))
    .toBeVisible()
    .withTimeout(15000);
}

/**
 * Log in as the test homeowner.
 */
export async function loginAsHomeowner() {
  await loginAs(TEST_HOMEOWNER.email, TEST_HOMEOWNER.password);
}

/**
 * Log in as the test contractor.
 */
export async function loginAsContractor() {
  await loginAs(TEST_CONTRACTOR.email, TEST_CONTRACTOR.password);
}

/**
 * Navigate to a bottom tab by its testID or label.
 */
export async function navigateToTab(tabLabel: string) {
  await element(by.text(tabLabel)).tap();
  // Brief pause for navigation animation
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Scroll down in a scrollable view until an element is visible.
 */
async function scrollToElement(
  elementMatcher: Detox.NativeMatcher,
  scrollViewId: string,
  direction: 'up' | 'down' = 'down',
  pixels = 200
) {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .whileElement(by.id(scrollViewId))
    .scroll(pixels, direction);
}

/**
 * Tap a text element with fallback to an alternative label.
 * Useful when button text varies between builds or locales.
 */
export async function tapText(primary: string, fallback?: string) {
  try {
    await element(by.text(primary)).tap();
  } catch {
    if (fallback) {
      await element(by.text(fallback)).tap();
    } else {
      throw new Error(`Could not find element with text "${primary}"`);
    }
  }
}

/**
 * Wait for any visible element matching the given text.
 * Returns true if found within the timeout, false otherwise.
 */
export async function waitForText(
  text: string,
  timeout = 10000
): Promise<boolean> {
  try {
    await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

/**
 * Navigate to Profile tab and then into a sub-screen by tapping a menu item.
 */
export async function navigateToProfileSubScreen(menuItemText: string) {
  await navigateToTab('Profile');
  await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.text(menuItemText)).tap();
  await new Promise((r) => setTimeout(r, 500));
}
