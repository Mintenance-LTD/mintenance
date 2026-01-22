'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';

export default function MessageThreadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.error('Message thread error:', error, { service: 'app' });

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
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
            Failed to load conversation
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We couldn't load this conversation. It may have been deleted or you don't have access to it.
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
            onClick={() => router.push('/messages')}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            View all messages
          </Button>
        </div>
      </div>
    </div>
  );
}
