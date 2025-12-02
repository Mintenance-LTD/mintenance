'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Logo from '../components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Mail, Phone, User } from 'lucide-react';
import {
  AuthCard,
  AuthInput,
  PasswordInput,
  AuthBrandSide,
  AuthLink,
  RoleToggle,
  Role
} from '@/components/auth';

// Disable static optimization for this page
export const dynamic = 'force-dynamic';

const registerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional().or(z.literal('')),
  role: z.enum(['homeowner', 'contractor']),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerFormSchema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const { csrfToken, loading: csrfLoading } = useCSRF();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: (roleParam === 'contractor' || roleParam === 'homeowner' ? roleParam : 'homeowner') as Role,
      acceptTerms: false,
    },
  });

  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  const selectedRole = watch('role');
  const email = watch('email');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const firstName = watch('firstName');
  const lastName = watch('lastName');

  useEffect(() => {
    if (roleParam === 'contractor' || roleParam === 'homeowner') {
      setValue('role', roleParam as Role);
    }
  }, [roleParam, setValue]);

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
          throw new Error('Too many registration attempts. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(responseData.error || 'Invalid registration data. Please check your information.');
        } else if (response.status === 403) {
          throw new Error(
            responseData.error === 'CSRF validation failed'
              ? 'Security token expired. Please refresh the page and try again.'
              : 'Access denied. Please refresh the page and try again.'
          );
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      }

      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setSubmitStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Brand */}
      <AuthBrandSide
        title="Join the Network"
        description={
          selectedRole === 'homeowner'
            ? 'Connect with verified professionals for all your home maintenance needs.'
            : 'Grow your business with quality leads and secure payments.'
        }
        role={selectedRole}
      />

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4">
              <Logo className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-[#0066CC]">Mintenance</h1>
            </Link>
          </div>

          {/* Card */}
          <AuthCard>
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                Create your account
              </h2>
              <p className="text-base text-gray-600">
                Already have an account?{' '}
                <AuthLink href="/login" variant="primary">
                  Sign in
                </AuthLink>
              </p>
            </div>

            {/* Success Alert */}
            {submitStatus === 'success' && (
              <Alert className="mb-6 border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Registration Successful!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Redirecting to your dashboard...
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {submitStatus === 'error' && errorMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Registration Failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">I am a</label>
                <RoleToggle
                  value={selectedRole}
                  onChange={(role) => setValue('role', role)}
                  disabled={isSubmitting}
                />
                {errors.role && (
                  <p className="text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <AuthInput
                  label="First name"
                  icon={<User className="w-5 h-5" />}
                  placeholder="John"
                  autoComplete="given-name"
                  showSuccess={!!firstName && !errors.firstName}
                  {...register('firstName')}
                  error={errors.firstName?.message}
                />
                <AuthInput
                  label="Last name"
                  icon={<User className="w-5 h-5" />}
                  placeholder="Smith"
                  autoComplete="family-name"
                  showSuccess={!!lastName && !errors.lastName}
                  {...register('lastName')}
                  error={errors.lastName?.message}
                />
              </div>

              {/* Email Input */}
              <AuthInput
                label="Email address"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                placeholder="you@example.com"
                autoComplete="email"
                showSuccess={!!email && !errors.email}
                {...register('email')}
                error={errors.email?.message}
              />

              {/* Phone Input */}
              <AuthInput
                label="Phone number (optional)"
                type="tel"
                icon={<Phone className="w-5 h-5" />}
                placeholder="+1 (555) 000-0000"
                autoComplete="tel"
                {...register('phone')}
                error={errors.phone?.message}
                helperText="We'll only use this for account security"
              />

              {/* Password Input */}
              <PasswordInput
                label="Password"
                placeholder="Create a strong password"
                autoComplete="new-password"
                showStrengthMeter
                showRequirements
                {...register('password')}
                error={errors.password?.message}
                value={password}
              />

              {/* Confirm Password Input */}
              <PasswordInput
                label="Confirm password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                value={confirmPassword}
              />

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  {...register('acceptTerms')}
                  className="mt-1 h-4 w-4 text-[#0066CC] focus:ring-[#0066CC] border-gray-300 rounded"
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer">
                  I agree to the{' '}
                  <AuthLink href="/terms" variant="primary" className="underline">
                    Terms of Service
                  </AuthLink>{' '}
                  and{' '}
                  <AuthLink href="/privacy" variant="primary" className="underline">
                    Privacy Policy
                  </AuthLink>
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-red-600 -mt-2">{errors.acceptTerms.message}</p>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting || csrfLoading}
                disabled={isSubmitting || csrfLoading || !csrfToken}
                className="mt-6 bg-[#0066CC] hover:bg-[#0052A3] text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <AuthLink href="/login" variant="primary">
                  Sign in
                </AuthLink>
              </p>
            </div>
          </AuthCard>

          {/* Legal Links */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <AuthLink href="/terms" variant="muted">Terms</AuthLink>
              <span>•</span>
              <AuthLink href="/privacy" variant="muted">Privacy</AuthLink>
              <span>•</span>
              <AuthLink href="/help" variant="muted">Help</AuthLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
