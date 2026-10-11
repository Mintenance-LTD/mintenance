'use client';

import React from 'react';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@mintenance/shared';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { isAllowedRedirect } from '@/lib/utils/safe-redirect';

/**
 * Login form schema + submit logic, extracted from LoginForm so the
 * presentational component stays under the 500-line per-file cap.
 *
 * All of this is the pre-2026-05-13-redesign auth behaviour preserved
 * verbatim — CSRF gating, the MFA pre-token redirect, the
 * open-redirect allowlist, and the enumeration-safe 401 handling.
 */

export const loginFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

/** API errors may be strings or structured { code, message } objects. */
export function loginErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const data = payload as { error?: unknown; message?: unknown };
  const nested = data.error && typeof data.error === 'object'
    ? (data.error as { message?: unknown }).message : undefined;
  for (const value of [data.error, nested, data.message]) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

export type SubmitStatus = 'idle' | 'success' | 'error';

export function useLoginSubmit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const [submitStatus, setSubmitStatus] = React.useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  // Store redirect URL from searchParams to avoid hook closure issues
  const redirectParam = React.useMemo(() => {
    return searchParams?.get('redirect') || null;
  }, [searchParams]);

  // SECURITY: Open-redirect allowlist lives in `@/lib/utils/safe-redirect`
  // so /login and /auth/mfa-verify share one source of truth.
  const onSubmit = async (data: LoginFormData) => {
    if (!csrfToken) {
      setErrorMessage('Security token not available. Please refresh the page.');
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        logger.error(
          'Non-JSON response from login API',
          new Error('Invalid response format'),
          {
            service: 'login',
            responsePreview: text.substring(0, 500),
          }
        );
        throw new Error(
          'Server error: Invalid response format. Please try again.'
        );
      }

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            'Too many login attempts. Please wait a few minutes and try again.'
          );
        } else if (response.status === 401) {
          // 2026-05-13 login audit — account-enumeration fix.
          //
          // This block previously string-matched the server error and
          // rewrote it into "No account found with this email" or
          // "Incorrect password". Both LEAK account existence: an
          // attacker probing emails learns which are registered. The
          // server's `mapLoginAuthError` deliberately returns a single
          // generic "Invalid email or password" for both the
          // wrong-password and unknown-email cases (Supabase itself
          // never distinguishes them), plus a safe, well-worded
          // verify-your-email message when that's the actual cause.
          //
          // So the correct client behaviour is to display the server's
          // message verbatim — it is already user-safe — rather than
          // second-guessing it with fragile `includes()` matching that
          // re-introduces the enumeration signal and can be flat wrong
          // (claiming "incorrect password" when the email was bad).
          const safeError = loginErrorMessage(responseData,
            'Invalid email or password. Please check your credentials and try again.');
          throw new Error(safeError);
        } else if (response.status === 403) {
          throw new Error(
            'Access denied. Please refresh the page and try again.'
          );
        } else if (response.status === 400) {
          throw new Error(
            loginErrorMessage(responseData, 'Invalid request. Please check your email and password format.')
          );
        } else {
          throw new Error(
            loginErrorMessage(responseData, 'Login failed. Please try again or contact support if the problem persists.')
          );
        }
      }

      // Check if MFA is required
      if (responseData.requiresMfa && responseData.preMfaToken) {
        // Redirect to MFA verification page
        const mfaUrl = `/auth/mfa-verify?token=${responseData.preMfaToken}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`;
        router.push(mfaUrl);
        return;
      }

      setSubmitStatus('success');
      // Use the stored redirectParam value
      setTimeout(() => {
        // SECURITY: Validate redirect URL before using it
        if (redirectParam && isAllowedRedirect(redirectParam)) {
          router.push(redirectParam);
        } else if (responseData.user?.role === 'contractor') {
          router.push('/contractor/dashboard-enhanced');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }, 500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      );
      setSubmitStatus('error');
    }
  };

  return {
    csrfToken,
    csrfLoading,
    submitStatus,
    errorMessage,
    onSubmit,
  };
}
