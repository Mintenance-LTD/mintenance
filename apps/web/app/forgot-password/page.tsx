'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useCSRF } from '@/lib/hooks/useCSRF';

/**
 * /forgot-password — Direction A · Mint Editorial.
 *
 * 2026-05-15 design-system rebuild. Centered single-column card on the
 * Mint Editorial `--me-*` tokens (consistent with redesign-v2/auth.html).
 * The reset-request logic (CSRF gating, generic enumeration-safe
 * messaging) is preserved verbatim from the pre-redesign page.
 */

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/** Brand leaf mark — the real Mintenance logo (public/assets/logo-mark.png). */
function LeafMark({ size = 22 }: { size?: number }) {
  return (
    <Image
      src='/assets/logo-mark.png'
      alt='Mintenance'
      width={size}
      height={size}
      priority
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}

export default function ForgotPasswordPage() {
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const [submitStatus, setSubmitStatus] = React.useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [submittedEmail, setSubmittedEmail] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (!csrfToken) {
      setErrorMessage('Security token not available. Please refresh the page.');
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email: data.email }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            'Too many password reset requests. Please try again later.'
          );
        } else if (response.status === 403) {
          throw new Error(
            'Access denied. Please refresh the page and try again.'
          );
        } else if (response.status === 400) {
          throw new Error(
            responseData.error ||
              'Invalid email address. Please check and try again.'
          );
        } else if (response.status === 500 || response.status === 503) {
          throw new Error(
            responseData.error ||
              'Service temporarily unavailable. Please try again later.'
          );
        } else {
          throw new Error(
            responseData.error ||
              'Failed to send reset email. Please try again.'
          );
        }
      }

      if (responseData.success) {
        setSubmittedEmail(data.email);
        setSubmitStatus('success');
      } else {
        throw new Error(
          responseData.error || 'Failed to send reset email. Please try again.'
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to send reset email. Please try again.'
      );
      setSubmitStatus('error');
    }
  };

  const submitting = isSubmitting || csrfLoading;

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
                background: 'var(--me-surface)',
                border: '1px solid var(--me-line)',
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
                Check your email
              </h1>
              <p
                className='t-body'
                style={{ marginBottom: 20, color: 'var(--me-ink-2)' }}
              >
                We&apos;ve sent a password reset link to{' '}
                <strong style={{ color: 'var(--me-ink)' }}>
                  {submittedEmail}
                </strong>
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--me-ink-3)',
                  marginBottom: 18,
                }}
              >
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  type='button'
                  onClick={() => {
                    setSubmitStatus('idle');
                    setSubmittedEmail('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    color: 'var(--me-brand)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontFamily: 'inherit',
                    fontSize: 13,
                  }}
                >
                  try again
                </button>
              </p>
              <Link
                href='/login'
                className='btn btn-primary btn-lg'
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className='t-h2' style={{ marginBottom: 6 }}>
                Forgot your password?
              </h1>
              <p
                className='t-body'
                style={{ marginBottom: 22, color: 'var(--me-ink-2)' }}
              >
                No worries — enter your email and we&apos;ll send reset
                instructions.
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
                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor='forgot-email'
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--me-ink-2)',
                      marginBottom: 6,
                    }}
                  >
                    Email address
                  </label>
                  <input
                    id='forgot-email'
                    type='email'
                    className='field'
                    placeholder='you@home.uk'
                    autoComplete='email'
                    autoFocus
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? 'forgot-email-error' : undefined
                    }
                    {...register('email')}
                  />
                  {errors.email && (
                    <p
                      id='forgot-email-error'
                      role='alert'
                      style={{
                        margin: '6px 0 0',
                        fontSize: 12,
                        color: 'var(--me-err-fg)',
                      }}
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type='submit'
                  className='btn btn-primary btn-lg'
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={submitting || !csrfToken}
                >
                  {isSubmitting ? 'Sending…' : 'Send reset link'}
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
            Reset links expire after 1 hour. If you didn&apos;t request this,
            you can safely ignore any emails you receive.
          </p>
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: 18,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--me-ink-2)',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            href='/register'
            style={{
              color: 'var(--me-brand)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign up for free
          </Link>
        </p>

        <div
          style={{
            marginTop: 16,
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
