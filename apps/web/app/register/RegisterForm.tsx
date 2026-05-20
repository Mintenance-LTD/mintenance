'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { LeafMark } from './RegisterBrandPanel';
import { RegisterRoleChooser } from './RegisterRoleChooser';
import { RegisterPasswordField } from './RegisterPasswordField';
import {
  registerFormSchema,
  useRegisterSubmit,
  type RegisterFormData,
} from './useRegisterSubmit';

/**
 * Register form — Direction A · Mint Editorial. Source of truth:
 * redesign-v2/auth.html WebSignUp (form side, with role chooser).
 *
 * Auth logic (CSRF gating, duplicate-email surfacing, tenant-invite
 * acceptance, role-aware redirect) lives in `useRegisterSubmit`; the
 * role chooser + password fields are split into sibling components so
 * this file stays under the 500-line per-file cap.
 *
 * Deviation from the spec: the spec shows no password-strength meter
 * and a single password field. We keep a confirm-password field and
 * the platform's complexity rules (enforced by the Zod schema +
 * server) — losing those would be a security regression — but render
 * them as plain Mint Editorial `.field` inputs, matching /login.
 */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--me-ink-2)',
  marginBottom: 6,
};

const errorTextStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: 12,
  color: 'var(--me-err-fg)',
};

/** Labelled wrapper — keeps the per-field markup consistent + short. */
function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {optional && (
          <span style={{ color: 'var(--me-ink-3)', fontWeight: 500 }}>
            {' '}
            (optional)
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} style={errorTextStyle} role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}

export function RegisterForm() {
  const {
    csrfToken,
    csrfLoading,
    submitStatus,
    errorMessage,
    onSubmit,
    initialRole,
  } = useRegisterSubmit();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: initialRole,
      acceptTerms: false,
    },
  });

  const selectedRole = watch('role');
  const submitting = isSubmitting || csrfLoading;

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        background: 'var(--me-bg)',
        overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Mobile logo — brand panel is hidden below lg */}
        <Link
          href='/'
          className='register-mobile-logo'
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 10,
            marginBottom: 28,
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
            <LeafMark size={22} />
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

        <h2 id='register-heading' className='t-h1' style={{ marginBottom: 4 }}>
          Create your account
        </h2>
        <p
          className='t-body'
          style={{ marginBottom: 22, color: 'var(--me-ink-2)' }}
        >
          Takes 90 seconds. You can change role later.
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
              <strong>Account created.</strong> Taking you to your dashboard…
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
              {errorMessage.toLowerCase().includes('already exists') && (
                <>
                  {' '}
                  <Link
                    href='/login'
                    style={{
                      color: 'var(--me-err-fg)',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    Sign in instead
                  </Link>
                </>
              )}
            </span>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          aria-labelledby='register-heading'
          noValidate
        >
          <RegisterRoleChooser
            value={selectedRole}
            onChange={(role) => setValue('role', role)}
            disabled={isSubmitting}
            error={errors.role?.message}
          />

          {/* Name */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <Field
              id='reg-firstName'
              label='First name'
              error={errors.firstName?.message}
            >
              <input
                id='reg-firstName'
                className='field'
                placeholder='Eleanor'
                autoComplete='given-name'
                aria-invalid={!!errors.firstName}
                {...register('firstName')}
              />
            </Field>
            <Field
              id='reg-lastName'
              label='Last name'
              error={errors.lastName?.message}
            >
              <input
                id='reg-lastName'
                className='field'
                placeholder='Mortimer'
                autoComplete='family-name'
                aria-invalid={!!errors.lastName}
                {...register('lastName')}
              />
            </Field>
          </div>

          {/* Email */}
          <Field id='reg-email' label='Email' error={errors.email?.message}>
            <input
              id='reg-email'
              type='email'
              className='field'
              placeholder='you@home.uk'
              autoComplete='email'
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          {/* Phone */}
          <Field
            id='reg-phone'
            label='Phone number'
            optional
            error={errors.phone?.message}
          >
            <input
              id='reg-phone'
              type='tel'
              className='field'
              placeholder='+44 7700 900000'
              autoComplete='tel'
              aria-invalid={!!errors.phone}
              {...register('phone')}
            />
          </Field>

          {/* Password + confirm */}
          <RegisterPasswordField
            id='reg-password'
            label='Password'
            placeholder='At least 8 characters'
            error={errors.password?.message}
            registration={register('password')}
          />
          <RegisterPasswordField
            id='reg-confirmPassword'
            label='Confirm password'
            placeholder='Re-enter your password'
            error={errors.confirmPassword?.message}
            registration={register('confirmPassword')}
          />

          {/* Terms */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 12,
              color: 'var(--me-ink-2)',
              margin: '4px 0 6px',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            <input
              type='checkbox'
              aria-invalid={!!errors.acceptTerms}
              style={{ marginTop: 2, accentColor: 'var(--me-brand)' }}
              {...register('acceptTerms')}
            />
            <span>
              I agree to the{' '}
              <Link
                href='/terms'
                style={{ color: 'var(--me-brand)', fontWeight: 600 }}
              >
                Terms
              </Link>{' '}
              and{' '}
              <Link
                href='/privacy'
                style={{ color: 'var(--me-brand)', fontWeight: 600 }}
              >
                Privacy Policy
              </Link>
              . Mintenance is a Stripe-backed escrow service.
            </span>
          </label>
          {errors.acceptTerms && (
            <p style={errorTextStyle} role='alert'>
              {errors.acceptTerms.message}
            </p>
          )}

          {/* Submit */}
          <button
            type='submit'
            className='btn btn-primary btn-lg'
            style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}
            disabled={submitting || !csrfToken}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
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
            marginTop: 18,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--me-ink-2)',
          }}
        >
          Already have one?{' '}
          <Link
            href='/login'
            style={{
              color: 'var(--me-brand)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign in →
          </Link>
        </p>

        {/* Legal */}
        <div
          style={{
            marginTop: 24,
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
