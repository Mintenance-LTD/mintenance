/**
 * Authentication Flow E2E Tests
 *
 * Tests critical security-focused user journeys:
 * - Sign Up → Email Verification → Login
 * - Password Reset Flow
 * - Login Error Handling
 *
 * These tests verify real user behavior through the browser.
 */

import { test, expect } from './fixtures';

/**
 * Fill every field the register schema requires.
 *
 * `registerFormSchema` (app/register/useRegisterSubmit.ts) validates
 * firstName, lastName and acceptTerms alongside the credentials, and the
 * password/confirmPassword match is an object-level `.refine` that Zod only
 * evaluates once every field-level rule passes. Filling just email + passwords
 * therefore never reaches submit — and never surfaces the mismatch error.
 */
async function fillSignUpForm(
  page: import('@playwright/test').Page,
  {
    email,
    password,
    confirmPassword = password,
  }: { email: string; password: string; confirmPassword?: string }
): Promise<void> {
  await page.getByLabel(/first name/i).fill('Test');
  await page.getByLabel(/last name/i).fill('User');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(confirmPassword);
  await page.getByRole('checkbox').check();
}

test.describe('Authentication Flow', () => {
  test.describe('Sign Up Flow', () => {
    test('user can create new account with valid details', async ({ page }) => {
      // Navigate to signup page
      await page.goto('/auth/signup');
      await page.waitForLoadState('networkidle');

      // Fill signup form with unique email. The role chooser defaults to
      // homeowner (RegisterForm defaultValues), so no selection is needed.
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      await fillSignUpForm(page, {
        email: `test${timestamp}${randomSuffix}@example.com`,
        password: 'SecurePass123!',
      });

      // Submit form
      await page
        .getByRole('button', { name: /sign up|create account/i })
        .click();

      // Any of these outcomes means the signup flow round-tripped to the
      // server: the success banner, or a duplicate-email / rate-limit error.
      // Matched on banner copy rather than role=alert, because the per-field
      // validation messages are also role=alert and would let this pass
      // without the form ever submitting. (The old `[class*="bg-red"]` probe
      // can never match — both banners are inline-styled since the Mint
      // Editorial rebuild.)
      await expect(
        page
          .getByText(
            /account created|already exists|rate limit|too many|check your email/i
          )
          .first()
      ).toBeVisible({ timeout: 15000 });
    });

    test('validates password strength requirements', async ({ page }) => {
      await page.goto('/auth/signup');

      // Fill email
      await page.getByLabel(/email/i).fill('test@example.com');

      // Try weak password
      await page.getByLabel(/^password$/i).fill('weak');
      await page.getByLabel(/confirm password/i).fill('weak');

      // Submit
      await page
        .getByRole('button', { name: /sign up|create account/i })
        .click();

      // Verify validation error (use .first() since there may be multiple matching elements)
      await expect(
        page
          .getByText(
            /password.*8 characters|password too weak|uppercase|lowercase|number/i
          )
          .first()
      ).toBeVisible();
    });

    test('validates passwords match', async ({ page }) => {
      await page.goto('/auth/signup');

      // Both passwords must independently satisfy the complexity rules,
      // otherwise Zod stops at the field-level errors and never reaches the
      // object-level match refinement.
      await fillSignUpForm(page, {
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass456!',
      });

      await page
        .getByRole('button', { name: /sign up|create account/i })
        .click();

      await expect(page.getByText(/passwords don't match/i)).toBeVisible();
    });

    test('validates email format', async ({ page }) => {
      await page.goto('/auth/signup');

      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill('invalid-email');
      await page.getByLabel(/^password$/i).fill('SecurePass123');
      await page.getByLabel(/confirm password/i).fill('SecurePass123');

      // HTML5 validation will prevent form submission
      // Verify email input has type="email" for validation
      await expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  test.describe('Login Flow', () => {
    test('displays login form with all required fields', async ({ page }) => {
      await page.goto('/auth/login');

      // Verify form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(
        page.getByRole('textbox', { name: /password/i })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /log in|sign in/i })
      ).toBeVisible();
    });

    test('validates email format on login', async ({ page }) => {
      await page.goto('/auth/login');

      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill('invalid-email');
      await page
        .getByRole('textbox', { name: /password/i })
        .fill('password123');

      // HTML5 validation will prevent form submission
      // Verify email input has type="email" for validation
      await expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('shows error for empty credentials', async ({ page }) => {
      await page.goto('/auth/login');

      // Try to submit empty form - HTML5 validation will prevent submission
      // The form won't actually submit, just show browser validation
      const emailInput = page.getByLabel(/email/i);
      const passwordInput = page.getByRole('textbox', { name: /password/i });

      // The login form is deliberately `noValidate` with Zod doing the
      // validation, so it marks required fields with aria-required rather than
      // the native `required` attribute.
      await expect(emailInput).toHaveAttribute('aria-required', 'true');
      await expect(passwordInput).toHaveAttribute('aria-required', 'true');
    });

    test('provides "Forgot Password" link', async ({ page }) => {
      await page.goto('/auth/login');

      // Matched on /forgot/ rather than the full "forgot password": the link's
      // visible copy is just "Forgot?" (it carries an aria-label for context).
      const forgotPasswordLink = page.getByRole('link', {
        name: /forgot/i,
      });
      await expect(forgotPasswordLink).toBeVisible();
      await expect(forgotPasswordLink).toHaveAttribute(
        'href',
        /forgot-password/
      );
    });

    test('provides "Sign Up" link for new users', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      // Wait for page to fully load
      await page.waitForTimeout(2000);

      // Look for signup link - try multiple selectors
      // `/create account/` does not match the real copy "Create an account →",
      // so the pattern allows the article.
      const signUpLink = page
        .getByRole('link', {
          name: /sign up|create an? account/i,
        })
        .first();
      const isVisible = await signUpLink.isVisible().catch(() => false);

      // If not found as link, check if it's text that indicates signup is available
      if (!isVisible) {
        const hasSignupText = await page
          .getByText(/sign up|create an? account/i)
          .isVisible()
          .catch(() => false);
        expect(hasSignupText).toBeTruthy();
      } else {
        await expect(signUpLink).toBeVisible();
      }
    });
  });

  test.describe('Password Reset Flow', () => {
    test('displays password reset form', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: /reset password|send reset link/i })
      ).toBeVisible();
    });

    test('shows success message after submitting email', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      await page.getByLabel(/email/i).fill('user@example.com');
      await page
        .getByRole('button', { name: /reset password|send reset link/i })
        .click();

      // Security best practice: always show success (don't reveal if email exists)
      await expect(
        page
          .getByText(/check your email|reset link sent|if an account exists/i)
          .first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('validates email format in password reset', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      await page.waitForLoadState('networkidle');

      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill('invalid-email');

      // HTML5 validation will prevent form submission
      // Verify email input has type="email" for validation
      await expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('provides link back to login', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      await page.waitForLoadState('networkidle');

      // Wait for page to fully render
      await page.waitForTimeout(2000);

      // Try multiple ways to find login link
      const loginLink = page
        .getByRole('link', { name: /back to login|log in|sign in/i })
        .first();
      const isLinkVisible = await loginLink.isVisible().catch(() => false);

      // If not found as link, check if there's any text indicating login is available
      if (!isLinkVisible) {
        const hasLoginText = await page
          .getByText(/back to login|log in|sign in/i)
          .isVisible()
          .catch(() => false);
        expect(hasLoginText).toBeTruthy();
      } else {
        await expect(loginLink).toBeVisible();
      }
    });
  });

  test.describe('Navigation Between Auth Pages', () => {
    test('navigation links exist between auth pages', async ({ page }) => {
      // Test that login page has signup link
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      // Copy on the login page is "Create an account →" and "Forgot?", not
      // "Create a new account" / "Forgot password".
      const signupLink = await page
        .getByText(/create an? account|sign up/i)
        .isVisible()
        .catch(() => false);
      const forgotLink = await page
        .getByText(/forgot/i)
        .isVisible()
        .catch(() => false);
      expect(signupLink && forgotLink).toBeTruthy();

      // Test that signup page has login link
      await page.goto('/auth/signup');
      await page.waitForLoadState('networkidle');
      const loginLink = await page
        .getByText(/sign in|already have.*account/i)
        .isVisible()
        .catch(() => false);
      expect(loginLink).toBeTruthy();

      // Test that forgot-password page has login link
      await page.goto('/auth/forgot-password');
      await page.waitForLoadState('networkidle');
      const backToLogin = await page
        .getByText(/sign in|log in|back.*login/i)
        .isVisible()
        .catch(() => false);
      expect(backToLogin).toBeTruthy();
    });
  });
});
