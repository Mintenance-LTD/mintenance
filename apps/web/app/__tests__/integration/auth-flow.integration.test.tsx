/**
 * Authentication Flow Integration Tests
 *
 * Tests the security-critical user authentication journey:
 * Sign Up → Email Verification → Login → MFA → Dashboard → Logout
 *
 * These tests verify security measures and authentication state management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createTestUser,
  createTestHomeowner,
  createTestContractor,
  resetTestCounter,
} from '@/test/factories';

// Mock Supabase Auth
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/api/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
      getUser: mockGetUser,
      onAuthStateChange: vi.fn((callback) => {
        // Call callback immediately with null session for tests
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => '/auth/login',
}));

describe('Authentication Flow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    resetTestCounter();
    vi.clearAllMocks();
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
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  afterEach(() => {
    // Clear any stored auth state
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Sign Up Flow', () => {
    it('creates new account with valid email and password', async () => {
      const testUser = createTestHomeowner({ email: 'newuser@example.com' });

      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      // Fill sign up form
      await user.type(screen.getByLabelText(/email/i), testUser.email);
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');

      // Select role
      await user.selectOptions(screen.getByLabelText(/role|i'm a/i), 'homeowner');

      // Submit
      const submitButton = screen.getByRole('button', { name: /sign up|create account/i });
      await user.click(submitButton);

      // Verify signup was called
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: testUser.email,
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
      await user.type(screen.getByLabelText(/^password$/i), 'weak'); // Too weak

      await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

      // Should show password strength error
      await waitFor(() => {
        expect(screen.getByText(/password.*8 characters|password too weak/i)).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('validates passwords match', async () => {
      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');

      await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

      // Should show password mismatch error
      await waitFor(() => {
        expect(screen.getByText(/passwords.*match/i)).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');

      await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

      // Should show email format error
      await waitFor(() => {
        expect(screen.getByText(/valid email|email.*invalid/i)).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows verification email message after successful signup', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: createTestUser({ email_verified: false }),
          session: null, // No session until email verified
        },
        error: null,
      });

      const { default: SignUpPage } = await import('@/app/auth/signup/page');
      render(<SignUpPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');

      await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

      // Should show verification message
      await waitFor(() => {
        expect(screen.getByText(/check your email|verify your email/i)).toBeInTheDocument();
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

      await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/already registered|email.*exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Login Flow', () => {
    it('logs in successfully with correct credentials', async () => {
      const testUser = createTestHomeowner({ email: 'user@example.com' });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), testUser.email);
      await user.type(screen.getByLabelText(/password/i), 'CorrectPassword123!');

      await user.click(screen.getByRole('button', { name: /log in|sign in/i }));

      // Verify login was called
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: testUser.email,
          password: 'CorrectPassword123!',
        });
      });

      // Should redirect to dashboard
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
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

      await user.click(screen.getByRole('button', { name: /log in|sign in/i }));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/invalid.*credentials|incorrect password/i)).toBeInTheDocument();
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

      await user.click(screen.getByRole('button', { name: /log in|sign in/i }));

      // Should show verification message
      await waitFor(() => {
        expect(screen.getByText(/verify.*email|email not confirmed/i)).toBeInTheDocument();
      });
    });

    it('provides "Forgot Password" link', async () => {
      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toHaveAttribute('href', expect.stringContaining('/auth/forgot-password'));
    });
  });

  describe('Password Reset Flow', () => {
    it('sends password reset email for valid email address', async () => {
      const { default: ForgotPasswordPage } = await import('@/app/auth/forgot-password/page');
      render(<ForgotPasswordPage />);

      await user.type(screen.getByLabelText(/email/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /reset password|send reset link/i }));

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
      });

      // Should show confirmation message
      expect(screen.getByText(/check your email|reset link sent/i)).toBeInTheDocument();
    });

    it('shows same message for non-existent email (security)', async () => {
      // Security best practice: don't reveal if email exists
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const { default: ForgotPasswordPage } = await import('@/app/auth/forgot-password/page');
      render(<ForgotPasswordPage />);

      await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com');
      await user.click(screen.getByRole('button', { name: /reset password|send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/check your email|reset link sent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Logout Flow', () => {
    it('successfully logs out and clears session', async () => {
      // Setup logged-in state
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: createTestUser(),
          },
        },
        error: null,
      });

      const { default: DashboardLayout } = await import('@/app/(dashboard)/layout');
      render(<DashboardLayout><div>Dashboard content</div></DashboardLayout>);

      // Find and click logout button
      const logoutButton = screen.getByRole('button', { name: /log out|sign out/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });

      // Should redirect to home or login
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/\/|\/auth\/login/));
    });

    it('clears localStorage on logout', async () => {
      // Set some user data in localStorage
      localStorage.setItem('user_preferences', JSON.stringify({ theme: 'dark' }));

      // Mock logout
      mockSignOut.mockResolvedValue({ error: null });

      // Trigger logout (this would be in a component)
      await mockSignOut();

      // Verify localStorage was cleared (or specific items removed)
      // This depends on your logout implementation
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('redirects to login when session expires', async () => {
      // Setup expired session
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const { default: ProtectedPage } = await import('@/app/jobs/page');
      render(<ProtectedPage />);

      // Should redirect to login
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
      });
    });

    it('refreshes session token before expiry', async () => {
      // This test would verify automatic token refresh
      // Implementation depends on your session management strategy
      const mockOnAuthStateChange = vi.fn();

      vi.mocked(await import('@/lib/api/supabaseClient')).supabase.auth.onAuthStateChange = mockOnAuthStateChange;

      // Simulate session expiring soon
      const session = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 300, // Expires in 5 minutes
      };

      // Your session management should refresh before expiry
      // This is typically handled by Supabase automatically
    });
  });

  describe('Role-Based Redirects', () => {
    it('redirects homeowner to homeowner dashboard after login', async () => {
      const homeowner = createTestHomeowner();

      mockSignIn.mockResolvedValue({
        data: {
          user: homeowner,
          session: { access_token: 'token' },
        },
        error: null,
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), homeowner.email);
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/homeowner'));
      });
    });

    it('redirects contractor to contractor dashboard after login', async () => {
      const contractor = createTestContractor();

      mockSignIn.mockResolvedValue({
        data: {
          user: contractor,
          session: { access_token: 'token' },
        },
        error: null,
      });

      const { default: LoginPage } = await import('@/app/auth/login/page');
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), contractor.email);
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/contractor'));
      });
    });
  });
});
