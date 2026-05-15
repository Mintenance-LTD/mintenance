'use client';

import React from 'react';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCSRF } from '@/lib/hooks/useCSRF';

/**
 * Register form schema + submit logic, extracted from RegisterForm so
 * the presentational component stays under the 500-line per-file cap.
 *
 * This is the pre-2026-05-15-redesign register behaviour preserved
 * verbatim — CSRF gating, duplicate-email surfacing, the optional
 * tenant-invite acceptance, and the role-aware post-signup redirect.
 */

export type Role = 'homeowner' | 'contractor';

export const registerFormSchema = z
  .object({
    email: z.string().email('Invalid email address'),
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
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z
      .string()
      .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number')
      .optional()
      .or(z.literal('')),
    role: z.enum(['homeowner', 'contractor']),
    acceptTerms: z
      .boolean()
      .refine(
        (val) => val === true,
        'You must accept the terms and conditions'
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerFormSchema>;

export type SubmitStatus = 'idle' | 'success' | 'error';

export function useRegisterSubmit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const [submitStatus, setSubmitStatus] = React.useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  const roleParam = searchParams?.get('role') ?? null;
  const initialRole: Role =
    roleParam === 'contractor' ? 'contractor' : 'homeowner';
  const inviteToken = searchParams?.get('invite') ?? null;

  const onSubmit = async (data: RegisterFormData) => {
    if (!csrfToken) {
      setErrorMessage('Security token not available. Please refresh the page.');
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            'Too many registration attempts. Please try again later.'
          );
        } else if (response.status === 400) {
          const errorMsg =
            responseData.error?.message ||
            responseData.error ||
            responseData.message ||
            'Invalid registration data. Please check your information.';
          throw new Error(errorMsg);
        } else if (response.status === 403) {
          throw new Error(
            responseData.error?.message === 'CSRF validation failed' ||
              responseData.error === 'CSRF validation failed'
              ? 'Security token expired. Please refresh the page and try again.'
              : 'Access denied. Please refresh the page and try again.'
          );
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      }

      // Accept tenant invitation if invite token present
      if (inviteToken) {
        try {
          await fetch('/api/tenant-invite/accept', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
            },
            body: JSON.stringify({ token: inviteToken }),
          });
        } catch {
          // Non-blocking — invitation can be accepted later
        }
      }

      setSubmitStatus('success');
      setTimeout(() => {
        const redirectPath =
          data.role === 'contractor'
            ? '/contractor/dashboard-enhanced'
            : '/dashboard';
        router.push(redirectPath);
        router.refresh();
      }, 1500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.'
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
    initialRole,
  };
}
