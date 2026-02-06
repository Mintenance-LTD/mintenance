'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, Users, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function ContractorsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error
    logger.error('ContractorsError', 'Contractors listing error', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Report to Sentry
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          page: 'contractors',
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
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
            <Users className="h-8 w-8 text-blue-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Contractors Unavailable
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We couldn't load the contractors list. This is usually a temporary issue.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          {/* Info about the error */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">What you can do:</p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
              <li>Try refreshing the page</li>
              <li>Check your search filters</li>
              <li>Browse by category instead</li>
              <li>Come back in a few minutes</li>
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
            onClick={() => router.push('/find-contractors')}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <Search className="mr-2 h-4 w-4" />
            Search contractors
          </Button>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to dashboard
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Alternative options:
          </h3>
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Post a job and let contractors find you</li>
            <li>Browse contractor categories</li>
            <li>Check featured contractors</li>
            <li>View your saved contractors</li>
          </ul>
          <p className="mt-3 text-sm text-gray-600">
            Need help finding contractors?{' '}
            <a href="mailto:support@mintenance.com" className="text-blue-600 hover:underline">
              Contact support
            </a>
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