'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';

export default function QuickCreateJobError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.error('Quick create job error:', error, { service: 'app' });

    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error);
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
            Failed to load form
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We encountered an error loading the quick job creation form. Please try the standard form or try again.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}
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
            onClick={() => router.push('/jobs/create')}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Use standard form
          </Button>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
            className="w-full flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
