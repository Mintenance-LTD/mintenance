'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';

export default function JobCreationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    logger.error('Job creation error:', error', [object Object], { service: 'app' });

    // Report to Sentry if configured
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }

    // Try to save form data to localStorage for recovery
    try {
      const formData = sessionStorage.getItem('job-creation-draft');
      if (formData) {
        localStorage.setItem('job-creation-recovery', formData);
      }
    } catch (e) {
      logger.error('Could not save form data for recovery:', e', [object Object], { service: 'app' });
    }
  }, [error]);

  const handleRecoverDraft = () => {
    // Form should check for recovery data on mount
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Job creation failed
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We couldn't create your job posting. Don't worry, we've saved your progress.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          {error.message && error.message.includes('AI') && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                The AI assessment service is temporarily unavailable. You can still post your job without AI-powered pricing.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={handleRecoverDraft}
            variant="primary"
            className="w-full flex items-center justify-center"
          >
            <Save className="mr-2 h-4 w-4" />
            Recover your draft
          </Button>

          <Button
            onClick={reset}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Common issues:
          </h3>
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
            <li>Image files may be too large (max 10MB)</li>
            <li>Internet connection may be unstable</li>
            <li>Required fields may be missing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}