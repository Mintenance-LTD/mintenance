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

export const TEST_CONTRACTOR = {
  email: 'test-contractor@example.com',
  password: 'Test1234!',
};

/**
 * Log in as a specific user via the login screen.
 * Assumes the app starts on the login screen or is already logged out.
 */
export async function loginAs(email: string, password: string) {
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
export async function scrollToElement(
  elementMatcher: Detox.NativeMatcher,
  scrollViewId: string,
  direction: 'up' | 'down' = 'down',
  pixels = 200,
) {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .whileElement(by.id(scrollViewId))
    .scroll(pixels, direction);
}
