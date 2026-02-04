import { vi, beforeEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerificationBanner } from '../VerificationBanner';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { surface: '#ffffff', border: '#e5e7eb', primary: '#4f46e5', warning: '#f59e0b', text: '#111827' },
    spacing: { 2: '8px', 3: '12px', 4: '16px', 6: '24px' },
  },
}));

vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ csrfToken: 'mock-csrf-token' }),
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

global.fetch = vi.fn();

describe('VerificationBanner', () => {
  const defaultProps = {
    verificationStatus: {
      emailVerified: false,
      phoneVerified: false,
      canPostJobs: false,
      missingRequirements: ['Verify email address', 'Verify phone number'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should display verification required heading', () => {
      render(<VerificationBanner {...defaultProps} />);
      expect(screen.getByText('Verification Required')).toBeInTheDocument();
    });

    it('should display all missing requirements', () => {
      render(<VerificationBanner {...defaultProps} />);
      expect(screen.getByText('Verify email address')).toBeInTheDocument();
      expect(screen.getByText('Verify phone number')).toBeInTheDocument();
    });

    it('should show resend email button when email not verified', () => {
      render(<VerificationBanner {...defaultProps} />);
      expect(screen.getByText('Resend Email Verification')).toBeInTheDocument();
    });

    it('should show verify phone link when phone not verified', () => {
      render(<VerificationBanner {...defaultProps} />);
      const phoneLink = screen.getByText('Verify Phone Number');
      expect(phoneLink).toBeInTheDocument();
      expect(phoneLink.closest('a')).toHaveAttribute('href', '/verify-phone');
    });
  });

  describe('Email Verification', () => {
    it('should not show resend email button when email is verified', () => {
      const props = {
        verificationStatus: {
          emailVerified: true,
          phoneVerified: false,
          canPostJobs: false,
          missingRequirements: ['Verify phone number'],
        },
      };
      render(<VerificationBanner {...props} />);
      expect(screen.queryByText('Resend Email Verification')).not.toBeInTheDocument();
    });

    it('should call resend API when resend button clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Verification email sent!' }),
      });

      render(<VerificationBanner {...defaultProps} />);
      const resendButton = screen.getByText('Resend Email Verification');

      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': 'mock-csrf-token',
          },
          credentials: 'include',
        });
      });
    });

    it('should show success message after successful resend', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Verification email sent! Please check your inbox.' }),
      });

      render(<VerificationBanner {...defaultProps} />);
      const resendButton = screen.getByText('Resend Email Verification');

      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText('Verification email sent! Please check your inbox.')).toBeInTheDocument();
      });
    });

    it('should show Inbucket link when provided in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Verification email sent!',
          inbucketUrl: 'http://localhost:54324/inbucket',
        }),
      });

      render(<VerificationBanner {...defaultProps} />);
      const resendButton = screen.getByText('Resend Email Verification');

      fireEvent.click(resendButton);

      await waitFor(() => {
        const inbucketLink = screen.getByText('Open Inbucket Email Viewer →');
        expect(inbucketLink).toBeInTheDocument();
        expect(inbucketLink.closest('a')).toHaveAttribute('href', 'http://localhost:54324/inbucket');
      });
    });

    it('should show error message when resend fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      render(<VerificationBanner {...defaultProps} />);
      const resendButton = screen.getByText('Resend Email Verification');

      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<VerificationBanner {...defaultProps} />);
      const resendButton = screen.getByText('Resend Email Verification');

      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });

    it('should disable button and show "Sending..." while request is in progress', async () => {
      let resolvePromise: any;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as any).mockReturnValueOnce(fetchPromise);

      render(<VerificationBanner {...defaultProps} />);
      const resendButton = screen.getByText('Resend Email Verification') as HTMLButtonElement;

      fireEvent.click(resendButton);

      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(resendButton).toBeDisabled();

      resolvePromise({ ok: true, json: async () => ({ message: 'Sent' }) });

      await waitFor(() => {
        expect(screen.getByText('Resend Email Verification')).toBeInTheDocument();
      });
    });

    it('should show error when CSRF token is not available', async () => {
      vi.mocked(await import('@/lib/hooks/useCSRF')).useCSRF = () => ({ csrfToken: null });

      render(<VerificationBanner {...defaultProps} />);
      const resendButton = screen.getByText('Resend Email Verification');

      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText('Security token not available. Please refresh the page.')).toBeInTheDocument();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Phone Verification', () => {
    it('should not show verify phone link when phone is verified', () => {
      const props = {
        verificationStatus: {
          emailVerified: false,
          phoneVerified: true,
          canPostJobs: false,
          missingRequirements: ['Verify email address'],
        },
      };
      render(<VerificationBanner {...props} />);
      expect(screen.queryByText('Verify Phone Number')).not.toBeInTheDocument();
    });
  });

  describe('Fully Verified', () => {
    it('should show only remaining requirements', () => {
      const props = {
        verificationStatus: {
          emailVerified: true,
          phoneVerified: true,
          canPostJobs: true,
          missingRequirements: [],
        },
      };
      render(<VerificationBanner {...props} />);

      expect(screen.queryByText('Verify email address')).not.toBeInTheDocument();
      expect(screen.queryByText('Verify phone number')).not.toBeInTheDocument();
      expect(screen.queryByText('Resend Email Verification')).not.toBeInTheDocument();
      expect(screen.queryByText('Verify Phone Number')).not.toBeInTheDocument();
    });
  });
});