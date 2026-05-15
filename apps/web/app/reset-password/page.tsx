'use client';

// Reads the recovery token via useSearchParams + the URL hash at
// render time — no benefit from static pre-rendering. The layout
// supplies the Suspense boundary required by Next 16 + Turbopack.
export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

/**
 * /reset-password — Direction A · Mint Editorial.
 *
 * 2026-05-15 design-system rebuild. Centered single-column card on the
 * Mint Editorial `--me-*` tokens. The token-resolution logic (hash vs
 * query param, recovery-type validation) and the platform password
 * complexity rules are preserved verbatim from the pre-redesign page.
 */

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/** Brand leaf mark — inherits the caller's text colour. */
function LeafMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox='0 0 24 24'
      width={size}
      height={size}
      fill='none'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M12 21c-2-5 1-12 9-13-1 7-4 11-9 13z' />
      <path d='M12 21c-1-3 1-7 5-9' />
    </svg>
  );
}

const passwordToggleStyle: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 30,
  height: 30,
  display: 'grid',
  placeItems: 'center',
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
  color: 'var(--me-ink-3)',
  borderRadius: 6,
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--me-ink-2)',
  marginBottom: 6,
};

const fieldErrorStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: 12,
  color: 'var(--me-err-fg)',
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = React.useState('');
  const [submitStatus, setSubmitStatus] = React.useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const type = params.get('type');

      if (!token || type !== 'recovery') {
        setSubmitStatus('error');
        setErrorMessage(
          'Invalid or expired reset link. Please request a new one.'
        );
      } else {
        setAccessToken(token);
      }
    } else {
      const token =
        searchParams.get('token') || searchParams.get('access_token');
      if (token) {
        setAccessToken(token);
      } else {
        setSubmitStatus('error');
        setErrorMessage(
          'No reset token found. Please check your email for the reset link.'
        );
      }
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!accessToken) {
      setErrorMessage(
        'No reset token found. Please check your email for the reset link.'
      );
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, password: data.password }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to reset password');
      }

      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to reset password. Please try again.'
      );
      setSubmitStatus('error');
    }
  };

  return (
    <div
      data-theme='mint-editorial'
      className='me-root'
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background: 'var(--me-bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link
            href='/'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              color: 'var(--me-ink)',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <LeafMark />
            </span>
            <span
              style={{
                fontFamily: 'var(--me-font-display)',
                fontSize: 21,
                letterSpacing: '-0.01em',
              }}
            >
              Mintenance
            </span>
          </Link>
        </div>

        {/* Card */}
        <div
          className='card'
          style={{ padding: 28, boxShadow: 'var(--me-shadow-pop)' }}
        >
          {submitStatus === 'success' ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 9999,
                  background: 'var(--me-ok-bg)',
                  color: 'var(--me-ok-fg)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 className='w-7 h-7' />
              </div>
              <h1 className='t-h2' style={{ marginBottom: 8 }}>
                Password reset
              </h1>
              <p
                className='t-body'
                style={{ margin: 0, color: 'var(--me-ink-2)' }}
              >
                Your password has been updated. Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <h1 className='t-h2' style={{ marginBottom: 6 }}>
                Create a new password
              </h1>
              <p
                className='t-body'
                style={{ marginBottom: 22, color: 'var(--me-ink-2)' }}
              >
                Your new password must be different from previously used
                passwords.
              </p>

              {submitStatus === 'error' && errorMessage && (
                <div
                  role='alert'
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '12px 14px',
                    marginBottom: 18,
                    borderRadius: 'var(--me-radius-input)',
                    background: 'var(--me-err-bg)',
                    color: 'var(--me-err-fg)',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <AlertCircle
                    className='w-4 h-4'
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* New password */}
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor='reset-password' style={fieldLabelStyle}>
                    New password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id='reset-password'
                      type={showPassword ? 'text' : 'password'}
                      className='field'
                      placeholder='At least 8 characters'
                      autoComplete='new-password'
                      autoFocus
                      disabled={isSubmitting || !accessToken}
                      aria-invalid={!!errors.password}
                      style={{ paddingRight: 44 }}
                      {...register('password')}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      style={passwordToggleStyle}
                    >
                      {showPassword ? (
                        <EyeOff className='w-4 h-4' />
                      ) : (
                        <Eye className='w-4 h-4' />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p role='alert' style={fieldErrorStyle}>
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor='reset-confirmPassword'
                    style={fieldLabelStyle}
                  >
                    Confirm new password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id='reset-confirmPassword'
                      type={showConfirm ? 'text' : 'password'}
                      className='field'
                      placeholder='Re-enter your password'
                      autoComplete='new-password'
                      disabled={isSubmitting || !accessToken}
                      aria-invalid={!!errors.confirmPassword}
                      style={{ paddingRight: 44 }}
                      {...register('confirmPassword')}
                    />
                    <button
                      type='button'
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={
                        showConfirm ? 'Hide password' : 'Show password'
                      }
                      style={passwordToggleStyle}
                    >
                      {showConfirm ? (
                        <EyeOff className='w-4 h-4' />
                      ) : (
                        <Eye className='w-4 h-4' />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p role='alert' style={fieldErrorStyle}>
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type='submit'
                  className='btn btn-primary btn-lg'
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={isSubmitting || !accessToken}
                >
                  {isSubmitting ? 'Resetting password…' : 'Reset password'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <Link
                  href='/login'
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--me-ink-2)',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft className='w-4 h-4' />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Security note */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 18,
            padding: '12px 14px',
            borderRadius: 'var(--me-radius-card)',
            background: 'var(--me-bg-2)',
            color: 'var(--me-ink-2)',
          }}
        >
          <ShieldCheck
            className='w-4 h-4'
            style={{ flexShrink: 0, marginTop: 1, color: 'var(--me-brand)' }}
          />
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
            Use a strong password with at least 8 characters, including upper
            and lower case letters, a number, and a special character.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            fontSize: 12,
            color: 'var(--me-ink-3)',
          }}
        >
          <Link
            href='/terms'
            style={{ color: 'var(--me-ink-3)', textDecoration: 'none' }}
          >
            Terms
          </Link>
          <span aria-hidden='true'>·</span>
          <Link
            href='/privacy'
            style={{ color: 'var(--me-ink-3)', textDecoration: 'none' }}
          >
            Privacy
          </Link>
          <span aria-hidden='true'>·</span>
          <Link
            href='/help'
            style={{ color: 'var(--me-ink-3)', textDecoration: 'none' }}
          >
            Help
          </Link>
        </div>
      </div>
    </div>
  );
}
