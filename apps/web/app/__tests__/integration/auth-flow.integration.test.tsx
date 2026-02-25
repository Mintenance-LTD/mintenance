/**
 * Authentication Flow Integration Tests
 *
 * Tests the security-critical user authentication journey:
 * Sign Up -> Email Verification -> Login -> Dashboard -> Logout
 *
 * These tests verify security measures and authentication state management.
 */

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createTestUser,
  createTestHomeowner,
  createTestContractor,
  resetTestCounter,
} from '@/test/factories';

// Hoist mock functions so they survive mockReset
const {
  mockSignUp,
  mockSignIn,
  mockSignOut,
  mockResetPasswordForEmail,
  mockGetSession,
  mockPush,
  mockRefresh,
} = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignIn: vi.fn(),
  mockSignOut: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockGetSession: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

// Mock @/lib/supabase (the actual module imported by auth pages)
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      getSession: mockGetSession,
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
  isSupabaseConfigured: true,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/auth/login',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// Mock @/lib/logger to prevent side effects
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock @mintenance/shared logger (used by /register and /login pages)
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock useCSRF hook (used by /register and /login pages)
vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({
    csrfToken: 'test-csrf-token',
    loading: false,
    error: null,
    refresh: vi.fn(),
    getCsrfHeaders: () => ({ 'x-csrf-token': 'test-csrf-token' }),
  }),
}));

// The /auth/signup/page and /auth/login/page are now redirect stubs that call
// redirect('/register') and redirect('/login'). Tests that import these pages
// must be rewritten to import from @/app/register/page and @/app/login/page
// and updated to match the current form UI (RoleToggle vs select, etc.)
// TODO: Rewrite auth integration tests for current register/login page UI
vi.mock('@/app/auth/signup/page', async () => {
  const actual = await import('@/app/register/page');
  return actual;
});

vi.mock('@/app/auth/login/page', async () => {
  const actual = await import('@/app/login/page');
  return actual;
});

describe('Authentication Flow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    resetTestCounter();
    user = userEvent.setup();

    // Setup successful auth by default
    mockSignUp.mockResolvedValue({
      data: {
        user: createTestUser(),
        session: { access_token: 'test-token', refresh_token: 'test-refresh' },
      },
      error: null,
    });

    mockSignIn.mockResolvedValue({
      data: {
        user: createTestUser(),
        session: { access_token: 'test-token', refresh_token: 'test-refresh' },
      },
      error: null,
    });

    mockSignOut.mockResolvedValue({ error: null });
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Sign Up Flow', () => {
    it('creates new account with valid email and password', async () => {
      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      // Fill sign up form
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');

      // Select role using the "I'm a" label
      await user.selectOptions(screen.getByLabelText(/I'm a/i), 'homeowner');

      // Submit
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Verify signup was called
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          options: expect.objectContaining({
            data: expect.objectContaining({
              role: 'homeowner',
            }),
          }),
        });
      });
    });

    it('validates password strength requirements', async () => {
      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'weak');
      await user.type(screen.getByLabelText(/confirm password/i), 'weak');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show password strength error (use getAllByText since helper text also matches)
      await waitFor(() => {
        const errorElement = screen.getByText('Password must be at least 8 characters long');
        expect(errorElement).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('validates passwords match', async () => {
      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show password mismatch error
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      // Use fireEvent.change to bypass HTML5 email input restrictions in happy-dom
      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      // Set value directly to bypass HTML5 email validation
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set?.call(emailInput, 'invalid-email');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));

      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');

      // Submit the form directly to bypass HTML5 validation
      const form = screen.getByRole('button', { name: /create account/i }).closest('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Should show email format error
      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows verification email message after successful signup', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: createTestUser({ email_verified: false }),
          session: null,
        },
        error: null,
      });

      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show verification message (the success page says "check your email")
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('shows error for already registered email', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', code: 'user_already_exists' },
      });

      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('Login Flow', () => {
    it('logs in successfully with correct credentials', async () => {
      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'CorrectPassword123!');

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify login was called
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'CorrectPassword123!',
        });
      });

      // Should redirect to dashboard (homeowner default)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('shows error with incorrect password', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/password/i), 'WrongPassword');

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Should NOT redirect
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('prevents login for unverified email', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'unverified@example.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should show verification message
      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
      });
    });

    it('provides "Forgot password" link', async () => {
      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      // The login page has a "Forgot password?" link
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      expect(forgotPasswordLink.closest('a')).toHaveAttribute(
        'href',
        '/auth/forgot-password'
      );
    });
  });

  describe('Password Reset Flow', () => {
    it('sends password reset email for valid email address', async () => {
      const { default: ForgotPasswordPage } = await import(
        '@/app/auth/forgot-password/page'
      );
      render(<ForgotPasswordPage />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.click(
        screen.getByRole('button', { name: /send reset link/i })
      );

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
          'user@example.com',
          expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/reset-password'),
          })
        );
      });

      // Should show confirmation message
      await waitFor(() => {
        expect(
          screen.getByText(/password reset link sent/i)
        ).toBeInTheDocument();
      });
    });

    it('shows same message for non-existent email (security)', async () => {
      // Security best practice: don't reveal if email exists
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const { default: ForgotPasswordPage } = await import(
        '@/app/auth/forgot-password/page'
      );
      render(<ForgotPasswordPage />);

      await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com');
      await user.click(
        screen.getByRole('button', { name: /send reset link/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText(/password reset link sent/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Redirects', () => {
    it('redirects homeowner to homeowner dashboard after login', async () => {
      const homeowner = createTestHomeowner();

      mockSignIn.mockResolvedValue({
        data: {
          user: {
            ...homeowner,
            user_metadata: { role: 'homeowner' },
          },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), homeowner.email);
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Homeowner goes to /dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('redirects contractor to contractor dashboard after login', async () => {
      const contractor = createTestContractor();

      mockSignIn.mockResolvedValue({
        data: {
          user: {
            ...contractor,
            user_metadata: { role: 'contractor' },
          },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), contractor.email);
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Contractor goes to /contractor/dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/contractor/dashboard');
      });
    });
  });
});
