'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Logo from '@/app/components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function AdminForgotPasswordPage() {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email. Please try again.';
      setErrorMessage(errorMessage);
      setSubmitStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex w-1/2 bg-primary text-white p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center space-x-2 mb-12">
            <Logo />
            <h1 className="text-3xl font-bold">Mintenance</h1>
          </Link>
          <h2 className="text-4xl font-bold mb-6">Admin Portal</h2>
          <p className="text-xl text-gray-300">Reset your admin account password.</p>
        </div>
        <div className="text-sm text-gray-400">
          <p>© 2025 MINTENANCE LTD</p>
          <p>Company No. 16542104</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600 mb-8">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {submitStatus === 'success' ? (
            <div className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Check Your Email</AlertTitle>
                <AlertDescription className="text-green-700">
                  We've sent a password reset link to <strong>{submittedEmail}</strong>. Please check your inbox and follow the instructions.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-600">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => {
                    setSubmitStatus('idle');
                    setSubmittedEmail('');
                  }}
                  className="text-primary hover:text-primary-light font-medium"
                >
                  try again
                </button>
                .
              </p>
              <Link href="/admin/login">
                <Button variant="primary" fullWidth>
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {submitStatus === 'error' && errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@mintenance.co.uk"
                  {...register('email')}
                  errorText={errors.email?.message}
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isSubmitting || csrfLoading}
                leftIcon={isSubmitting || csrfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
              >
                {csrfLoading ? 'Loading...' : isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link
                  href="/admin/login"
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              For your security, password reset links expire after 1 hour. If you didn't request this reset, you can safely ignore the email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

