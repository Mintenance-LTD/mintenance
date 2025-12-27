'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, Mail, Lock, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function ResetPasswordError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error with context
    logger.error('ResetPasswordError', 'Password reset error occurred', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Report to Sentry if configured
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          page: 'reset-password',
          errorBoundary: true,
        },
        level: 'error',
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100">
            <Lock className="h-8 w-8 text-orange-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Password Reset Error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We encountered an error while processing your password reset request. No changes have been made to your account.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          {/* Security notice */}
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-1">Your account is secure</p>
            <p className="text-xs text-green-700">
              Your password has not been changed. For security reasons, password reset links expire after use or after 1 hour.
            </p>
          </div>

          {/* Common password reset issues */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">Common issues:</p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
              <li>Reset link has expired (valid for 1 hour)</li>
              <li>Reset link has already been used</li>
              <li>Invalid or malformed reset token</li>
              <li>Email address not found in system</li>
              <li>Network connectivity issues</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={reset}
            variant="primary"
            className="w-full flex items-center justify-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>

          <Button
            onClick={() => router.push('/reset-password')}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <Mail className="mr-2 h-4 w-4" />
            Request new reset link
          </Button>

          <Button
            onClick={() => router.push('/login')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Back to login
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            className="w-full flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to homepage
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Password reset help:
          </h3>
          <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Check your email for the reset link</li>
            <li>Make sure the link hasn't expired</li>
            <li>Try copying and pasting the entire link</li>
            <li>Check your spam folder</li>
            <li>Request a new reset link if needed</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            Still having trouble? Contact{' '}
            <a href="mailto:support@mintenance.com" className="text-blue-600 hover:underline">
              support@mintenance.com
            </a>
            {' '}for assistance with account recovery.
          </p>
        </div>

        {/* Development error details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 rounded-lg">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}