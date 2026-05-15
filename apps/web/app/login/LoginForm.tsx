'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { LeafMark } from './LoginBrandPanel';
import {
  loginFormSchema,
  useLoginSubmit,
  type LoginFormData,
} from './useLoginSubmit';

/**
 * Login form — Direction A · Mint Editorial. Source of truth:
 * redesign-v2/auth.html WebSignIn (form side).
 *
 * Auth logic (CSRF gating, MFA redirect, open-redirect allowlist,
 * enumeration-safe 401 handling) lives in `useLoginSubmit`; this
 * component is the presentation on the `.me-root` primitives +
 * `--me-*` tokens.
 *
 * Deviation from the spec: the spec shows Google/Apple social buttons
 * + an "or with email" divider. The platform has no OAuth backend
 * (no `signInWithOAuth` route anywhere), so shipping those buttons
 * would be dead UI. Omitted until OAuth is actually wired.
 */

export function LoginForm() {
  const { csrfToken, csrfLoading, submitStatus, errorMessage, onSubmit } =
    useLoginSubmit();
  const [mounted, setMounted] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldUnregister: false,
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const submitting = isSubmitting || csrfLoading;
  const showPasswordResetLink =
    errorMessage.toLowerCase().includes('password') ||
    errorMessage.toLowerCase().includes('credentials');

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 32px',
        background: 'var(--me-bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Mobile logo — brand panel is hidden below lg */}
        <Link
          href='/'
          className='login-mobile-logo'
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 10,
            marginBottom: 32,
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
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <LeafMark size={20} color='var(--me-on-brand)' />
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

        <h2 id='login-heading' className='t-h1' style={{ marginBottom: 6 }}>
          Welcome back
        </h2>
        <p
          className='t-body'
          style={{ marginBottom: 28, color: 'var(--me-ink-2)' }}
        >
          Sign in to manage jobs, bids and properties.
        </p>

        {/* Success */}
        {submitStatus === 'success' && (
          <div
            role='status'
            style={{
              display: 'flex',
              gap: 10,
              padding: '12px 14px',
              marginBottom: 20,
              borderRadius: 'var(--me-radius-input)',
              background: 'var(--me-ok-bg)',
              color: 'var(--me-ok-fg)',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <CheckCircle2
              className='w-4 h-4'
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <span>
              <strong>Signed in.</strong> Taking you to your dashboard…
            </span>
          </div>
        )}

        {/* Error */}
        {submitStatus === 'error' && errorMessage && (
          <div
            role='alert'
            style={{
              display: 'flex',
              gap: 10,
              padding: '12px 14px',
              marginBottom: 20,
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
            <span>
              {errorMessage}
              {showPasswordResetLink && (
                <>
                  {' '}
                  <Link
                    href='/forgot-password'
                    style={{
                      color: 'var(--me-err-fg)',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    Reset your password
                  </Link>
                </>
              )}
            </span>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          aria-labelledby='login-heading'
          noValidate
        >
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor='login-email'
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--me-ink-2)',
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              id='login-email'
              type='email'
              className='field'
              placeholder='you@home.uk'
              autoComplete='email'
              autoFocus
              aria-required='true'
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p
                id='login-email-error'
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

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <label
                htmlFor='login-password'
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--me-ink-2)',
                }}
              >
                Password
              </label>
              <Link
                href='/forgot-password'
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--me-brand)',
                  textDecoration: 'none',
                }}
              >
                Forgot?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id='login-password'
                type={showPassword ? 'text' : 'password'}
                className='field'
                placeholder='••••••••••'
                autoComplete='current-password'
                aria-required='true'
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? 'login-password-error' : undefined
                }
                style={{ paddingRight: 44 }}
                {...register('password')}
              />
              <button
                type='button'
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
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
                }}
              >
                {showPassword ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id='login-password-error'
                style={{
                  margin: '6px 0 0',
                  fontSize: 12,
                  color: 'var(--me-err-fg)',
                }}
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Keep me signed in */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--me-ink-2)',
              margin: '4px 0 22px',
              cursor: 'pointer',
            }}
          >
            <input
              type='checkbox'
              {...register('rememberMe')}
              style={{ accentColor: 'var(--me-brand)' }}
            />
            Keep me signed in
          </label>

          {/* Submit */}
          <button
            type='submit'
            className='btn btn-primary btn-lg'
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={submitting || !csrfToken}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          {mounted && !csrfToken && !isSubmitting && !csrfLoading && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                textAlign: 'center',
                color: 'var(--me-ink-3)',
              }}
            >
              Loading security settings…
            </p>
          )}
        </form>

        <p
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--me-ink-2)',
          }}
        >
          New here?{' '}
          <Link
            href='/register'
            style={{
              color: 'var(--me-brand)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Create an account →
          </Link>
        </p>

        {/* Legal */}
        <div
          style={{
            marginTop: 28,
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
    </main>
  );
}
