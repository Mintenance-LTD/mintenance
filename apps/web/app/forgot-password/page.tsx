'use client';

import React, { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Logo from '../components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to send reset email. Please try again.');
      setSubmitStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-6">
            <Logo />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Forgot Password?</h1>
          <p className="text-gray-300">
            No worries! Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 group relative overflow-hidden">
          {/* Gradient bar - appears on hover, always visible on large screens */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          {submitStatus === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-secondary" />
              </div>
              <AlertTitle className="text-2xl font-bold text-primary mb-3">Check Your Email</AlertTitle>
              <AlertDescription className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{submittedEmail}</strong>. Please check your inbox and follow the instructions.
              </AlertDescription>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => {
                    setSubmitStatus('idle');
                    setSubmittedEmail('');
                  }}
                  className="text-secondary hover:underline font-medium"
                >
                  try again
                </button>
                .
              </p>
              <Link href="/login">
                <Button variant="primary" fullWidth>
                  Back to Login
                </Button>
              </Link>
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
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    error={errors.email?.message}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isSubmitting || csrfLoading}
                  disabled={isSubmitting || csrfLoading || !csrfToken}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-gray-600 hover:text-primary transition-colors">
                    ← Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-300">
            Don't have an account?{' '}
            <Link href="/register" className="text-secondary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-secondary mr-3 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Security Note</h3>
              <p className="text-xs text-gray-300">
                For your security, password reset links expire after 1 hour. If you didn't request this reset, you can safely ignore this email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
