'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, ArrowLeft, Save, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function JobEditError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        // Log the error with context
        logger.error('JobEditError', 'Failed to load job editor', {
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
                    page: 'job-edit',
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
                        Cannot Edit Job
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        We couldn't load the job editor. Your changes have not been lost if you had any unsaved work.
                    </p>

                    {error.digest && (
                        <p className="mt-2 text-xs text-gray-500">
                            Error ID: {error.digest}
                        </p>
                    )}

                    {/* Draft status message */}
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-center text-green-700 mb-2">
                            <Save className="h-5 w-5 mr-2" />
                            <span className="text-sm font-medium">Your work is safe</span>
                        </div>
                        <p className="text-xs text-green-600">
                            If you had unsaved changes, they may be preserved in your browser's local storage.
                        </p>
                    </div>

                    {/* Common edit error explanations */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
                        <p className="text-sm font-medium text-blue-900 mb-2">Possible issues:</p>
                        <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
                            <li>You don't have permission to edit this job</li>
                            <li>The job is locked by another user</li>
                            <li>The job has been deleted</li>
                            <li>Your session has expired</li>
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
                        onClick={() => {
                            const jobId = window.location.pathname.match(/\/jobs\/([^\/]+)/)?.[1];
                            if (jobId) {
                                router.push(`/jobs/${jobId}`);
                            } else {
                                router.push('/jobs');
                            }
                        }}
                        variant="secondary"
                        className="w-full flex items-center justify-center"
                    >
                        <Briefcase className="mr-2 h-4 w-4" />
                        View job details
                    </Button>

                    <Button
                        onClick={() => router.push('/jobs')}
                        variant="outline"
                        className="w-full flex items-center justify-center"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to jobs
                    </Button>
                </div>

                <div className="mt-6 border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-900">
                        Editing tips:
                    </h3>
                    <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
                        <li>Save your work frequently</li>
                        <li>Check you have edit permissions</li>
                        <li>Ensure no one else is editing</li>
                        <li>Try refreshing if the editor freezes</li>
                    </ol>
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