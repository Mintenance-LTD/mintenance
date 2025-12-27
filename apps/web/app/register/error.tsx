'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, UserPlus, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function RegisterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error with context
    logger.error('RegisterError', 'Registration error occurred', {
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
          page: 'register',
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
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Registration Error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We're sorry, but we couldn't complete your registration. This might be a temporary issue with our system.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          {/* Common registration error explanations */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">Possible issues:</p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
              <li>Email address might already be registered</li>
              <li>Form validation errors</li>
              <li>Network connectivity problems</li>
              <li>Server temporarily unavailable</li>
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
            Try registering again
          </Button>

          <Button
            onClick={() => {
              // Clear any partial registration data
              sessionStorage.removeItem('registration_data');
              router.push('/register');
            }}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Start registration over
          </Button>

          <Button
            onClick={() => router.push('/login')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Already have an account? Login
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
            Need help with registration?
          </h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-600">
              Make sure you're using a valid email address that hasn't been registered before.
            </p>
            <p className="text-sm text-gray-600">
              If you forgot your password, try{' '}
              <a href="/reset-password" className="text-blue-600 hover:underline">
                resetting your password
              </a>{' '}
              instead.
            </p>
            <p className="text-sm text-gray-600">
              For further assistance, contact{' '}
              <a href="mailto:support@mintenance.com" className="text-blue-600 hover:underline">
                support@mintenance.com
              </a>
            </p>
          </div>
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