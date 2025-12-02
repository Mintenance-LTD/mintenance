'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Logo from '../components/Logo';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AuthCard, PasswordInput, AuthLink } from '@/components/auth';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = React.useState('');
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const type = params.get('type');

      if (!token || type !== 'recovery') {
        setSubmitStatus('error');
        setErrorMessage('Invalid or expired reset link. Please request a new one.');
      } else {
        setAccessToken(token);
      }
    } else {
      const token = searchParams.get('token') || searchParams.get('access_token');
      if (token) {
        setAccessToken(token);
      } else {
        setSubmitStatus('error');
        setErrorMessage('No reset token found. Please check your email for the reset link.');
      }
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!accessToken) {
      setErrorMessage('No reset token found. Please check your email for the reset link.');
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          password: data.password,
        }),
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password. Please try again.';
      setErrorMessage(errorMessage);
      setSubmitStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center space-x-2 mb-6">
            <Logo className="w-10 h-10" />
            <span className="text-2xl font-bold text-[#0066CC]">Mintenance</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Create new password</h1>
          <p className="text-base text-gray-600">
            Your new password must be different from previously used passwords
          </p>
        </div>

        {/* Form Card */}
        <AuthCard>
          {submitStatus === 'success' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Password reset!</h2>
              <p className="text-gray-600 mb-6">
                Your password has been successfully reset. Redirecting you to login...
              </p>
            </div>
          ) : (
            <>
              {submitStatus === 'error' && errorMessage && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <PasswordInput
                  label="New password"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  autoFocus
                  showStrengthMeter
                  showRequirements
                  {...register('password')}
                  error={errors.password?.message}
                  value={password}
                  disabled={isSubmitting || !accessToken}
                />

                <PasswordInput
                  label="Confirm new password"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                  value={confirmPassword}
                  disabled={isSubmitting || !accessToken}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isSubmitting}
                  disabled={isSubmitting || !accessToken}
                  className="bg-[#0066CC] hover:bg-[#0052A3] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSubmitting ? 'Resetting password...' : 'Reset Password'}
                </Button>

                <div className="text-center">
                  <AuthLink href="/login" variant="default" className="inline-flex items-center gap-2 text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </AuthLink>
                </div>
              </form>
            </>
          )}
        </AuthCard>

        {/* Security Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 text-[#0066CC] mt-0.5">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Security tip</h3>
              <p className="text-xs text-gray-600">
                Use a strong password with at least 8 characters, including uppercase and lowercase letters, numbers, and special characters.
              </p>
            </div>
          </div>
        </div>

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
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
