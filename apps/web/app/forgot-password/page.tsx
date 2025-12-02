'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Logo from '../components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import { AuthCard, AuthInput, AuthLink } from '@/components/auth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [submittedEmail, setSubmittedEmail] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const email = watch('email');
  const hasValidEmail = email && !errors.email;

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
          throw new Error('Too many password reset requests. Please try again later.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please refresh the page and try again.');
        } else if (response.status === 400) {
          throw new Error(responseData.error || 'Invalid email address. Please check and try again.');
        } else if (response.status === 500 || response.status === 503) {
          throw new Error(responseData.error || 'Service temporarily unavailable. Please try again later.');
        } else {
          throw new Error(responseData.error || 'Failed to send reset email. Please try again.');
        }
      }

      if (responseData.success) {
        setSubmittedEmail(data.email);
        setSubmitStatus('success');
      } else {
        throw new Error(responseData.error || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email. Please try again.';
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Forgot your password?</h1>
          <p className="text-base text-gray-600">
            No worries! We'll send you reset instructions.
          </p>
        </div>

        {/* Form Card */}
        <AuthCard>
          {submitStatus === 'success' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to{' '}
                <span className="font-semibold text-gray-900">{submittedEmail}</span>
              </p>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => {
                      setSubmitStatus('idle');
                      setSubmittedEmail('');
                    }}
                    className="text-[#0066CC] hover:text-[#0052A3] font-medium underline"
                  >
                    try again
                  </button>
                </p>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => window.location.href = '/login'}
                  className="bg-[#0066CC] hover:bg-[#0052A3]"
                >
                  Back to Login
                </Button>
              </div>
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
                <AuthInput
                  label="Email address"
                  type="email"
                  icon={<Mail className="w-5 h-5" />}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  showSuccess={!!hasValidEmail}
                  {...register('email')}
                  error={errors.email?.message}
                  helperText="Enter the email address associated with your account"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isSubmitting || csrfLoading}
                  disabled={isSubmitting || csrfLoading || !csrfToken}
                  className="bg-[#0066CC] hover:bg-[#0052A3] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <AuthLink href="/register" variant="primary">
              Sign up for free
            </AuthLink>
          </p>
        </div>

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
                Password reset links expire after 1 hour. If you didn't request this, you can safely ignore any emails you receive.
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
