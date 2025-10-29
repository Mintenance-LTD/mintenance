'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { csrfToken, loading: csrfLoading } = useCSRF();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csrfToken) {
      setStatus('error');
      setErrorMessage('Security token not available. Please refresh the page.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Sanitize error messages
        if (response.status === 429) {
          throw new Error('Too many password reset requests. Please try again later.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please refresh the page and try again.');
        } else {
          throw new Error('Failed to send reset email. Please try again.');
        }
      }

      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to send reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex items-center justify-center px-4 sm:px-6 lg:px-8">
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
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {status === 'success' ? (
            // Success Message
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-primary mb-3">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setStatus('idle')}
                  className="text-secondary hover:underline font-medium"
                >
                  try again
                </button>
                .
              </p>
              <Link
                href="/login"
                className="inline-block w-full bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-secondary-dark transition-colors"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            // Reset Form
            <>
              {status === 'error' && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start">
                  <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-primary mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    disabled={status === 'submitting'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting' || csrfLoading}
                  className="w-full bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {csrfLoading ? 'Loading...' : status === 'submitting' ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-gray-600 hover:text-secondary transition-colors">
                    ← Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-secondary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-secondary mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
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
