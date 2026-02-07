'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error with context
    logger.error('LoginError', 'Authentication error occurred', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Report to Sentry if configured
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          page: 'login',
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
            Login Error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We encountered an error while trying to log you in. This might be a temporary issue with our authentication service.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          {/* Common login error explanations */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">Common causes:</p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
              <li>Network connectivity issues</li>
              <li>Browser cache needs clearing</li>
              <li>Cookies are disabled</li>
              <li>Session has expired</li>
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
            Try logging in again
          </Button>

          <Button
            onClick={() => {
              // Clear any stale auth data
              localStorage.removeItem('auth_token');
              sessionStorage.clear();
              router.push('/login');
            }}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Return to login page
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to homepage
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Still having trouble?
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Try these steps:
          </p>
          <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Clear your browser cache and cookies</li>
            <li>Try a different browser or incognito mode</li>
            <li>Check your internet connection</li>
            <li>
              Contact support at{' '}
              <a href="mailto:support@mintenance.com" className="text-blue-600 hover:underline">
                support@mintenance.com
              </a>
            </li>
          </ol>
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