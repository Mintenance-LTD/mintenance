'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error with context
    logger.error('CheckoutError', 'Checkout process error', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      category: 'checkout',
    });

    // Report to Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          page: 'checkout',
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
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Checkout Error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We couldn't complete your checkout. Your order has been saved and no payment has been processed.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          {/* Cart status */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center text-blue-700 mb-2">
              <ShoppingCart className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Your cart is safe</span>
            </div>
            <p className="text-xs text-blue-600">
              Your items remain in your cart and you can continue checkout when ready.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={reset}
            variant="primary"
            className="w-full flex items-center justify-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try checkout again
          </Button>

          <Button
            onClick={() => router.push('/cart')}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Review cart
          </Button>

          <Button
            onClick={() => router.push('/jobs')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue browsing
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Checkout tips:
          </h3>
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Ensure all required fields are filled</li>
            <li>Check your internet connection</li>
            <li>Try clearing your browser cache</li>
            <li>Disable browser extensions that might interfere</li>
          </ul>
          <p className="mt-3 text-sm text-gray-600">
            Need help? Contact{' '}
            <a href="mailto:support@mintenance.com" className="text-blue-600 hover:underline">
              support@mintenance.com
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