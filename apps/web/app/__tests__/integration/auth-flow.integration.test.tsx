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

    // Register and login pages call fetch() directly (not supabase.auth methods)
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/register') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: (_name: string) => 'application/json' },
          json: () => Promise.resolve({ user: { id: 'user-1', role: 'homeowner' } }),
        });
      }
      if (url === '/api/auth/login') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: (_name: string) => 'application/json' },
          json: () => Promise.resolve({ user: { id: 'user-1', role: 'homeowner', email: 'user@example.com' } }),
        });
      }
      return Promise.reject(new Error(`Unmocked fetch: ${url}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Sign Up Flow', () => {
    it('creates new account with valid email and password', async () => {
      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      // Fill sign up form (register page uses fetch('/api/auth/register'), not supabase.auth.signUp)
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Smith');
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
      // Role defaults to 'homeowner' — no need to interact with RoleToggle
      // Accept terms checkbox
      await user.click(screen.getByRole('checkbox'));

      // Submit
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Verify fetch was called with the registration endpoint
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/register',
          expect.objectContaining({ method: 'POST' })
        );
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
        const errorElement = screen.getByText('Password must be at least 8 characters');
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
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
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

    it('shows success message after successful signup', async () => {
      // Register page uses fetch('/api/auth/register') not supabase.auth.signUp
      // Default fetch mock returns success — no need to override

      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
      await user.click(screen.getByRole('checkbox'));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Register page shows "Registration Successful!" on success
      await waitFor(() => {
        expect(screen.getByText(/Registration Successful/i)).toBeInTheDocument();
      });
    });

    it('shows error for already registered email', async () => {
      // Override fetch mock to return 400 error (register page uses fetch, not supabase.auth.signUp)
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: { get: (_name: string) => 'application/json' },
        json: () => Promise.resolve({ error: 'User already registered' }),
      });

      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
      await user.click(screen.getByRole('checkbox'));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show error from API response
      await waitFor(() => {
        expect(screen.getByText(/already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('Login Flow', () => {
    it('logs in successfully with correct credentials', async () => {
      // Login page uses fetch('/api/auth/login') not supabase.auth.signInWithPassword
      // Default fetch mock returns homeowner user — already set in beforeEach

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      // Use exact match to avoid matching "Show password" aria-label button
      await user.type(screen.getByLabelText(/^password$/i), 'CorrectPassword123!');

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify fetch was called with login endpoint
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({ method: 'POST' })
        );
      });

      // Should redirect to homeowner dashboard after 500ms timeout
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      }, { timeout: 2000 });
    });

    it('shows error with incorrect password', async () => {
      // Override fetch to return 401 error (login page uses fetch not supabase.auth.signInWithPassword)
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: (_name: string) => 'application/json' },
        json: () => Promise.resolve({ error: 'Invalid login credentials' }),
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'WrongPassword');

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // 'Invalid login credentials' contains 'invalid' -> shows "Incorrect password..." message
      await waitFor(() => {
        expect(screen.getByText(/incorrect password/i)).toBeInTheDocument();
      });

      // Should NOT redirect
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('prevents login for unverified email', async () => {
      // Override fetch to return 401 with email confirmation error
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: (_name: string) => 'application/json' },
        json: () => Promise.resolve({ error: 'Email not confirmed' }),
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'unverified@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // 'Email not confirmed' contains 'confirm' -> shows "Please verify your email address..."
      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
      });
    });

    it('provides "Forgot password" link', async () => {
      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      // The login page has a "Forgot password?" link
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      // Login page has "Forgot password?" link at /forgot-password (not /auth/forgot-password)
      expect(forgotPasswordLink.closest('a')).toHaveAttribute(
        'href',
        '/forgot-password'
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

      // Login page uses fetch('/api/auth/login') — default mock returns homeowner role
      // No need to override; default beforeEach mock returns { user: { role: 'homeowner' } }

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), homeowner.email);
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Homeowner goes to /dashboard after 500ms timeout
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      }, { timeout: 2000 });
    });

    it('redirects contractor to contractor dashboard after login', async () => {
      const contractor = createTestContractor();

      // Override fetch mock to return contractor role
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (_name: string) => 'application/json' },
        json: () => Promise.resolve({ user: { id: contractor.id, role: 'contractor', email: contractor.email } }),
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), contractor.email);
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Contractor goes to /contractor/dashboard-enhanced (not /contractor/dashboard)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/contractor/dashboard-enhanced');
      }, { timeout: 2000 });
    });
  });
});
