'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VideoCallsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Video calls error:', error);

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-white">
            Video call failed
          </h2>

          <p className="mt-2 text-sm text-gray-300">
            We couldn't connect to the video call. Please check your camera and microphone permissions and try again.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-400">
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
            className="w-full flex items-center justify-center bg-white text-gray-900 hover:bg-gray-100"
          >
            <Video className="mr-2 h-4 w-4" />
            Use text messaging instead
          </Button>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
            className="w-full flex items-center justify-center text-white hover:bg-gray-800"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to dashboard
          </Button>
        </div>

        <div className="mt-6 border-t border-gray-700 pt-6">
          <h3 className="text-sm font-medium text-white">
            Troubleshooting tips:
          </h3>
          <ul className="mt-2 text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>Check camera and microphone permissions in your browser</li>
            <li>Ensure your internet connection is stable</li>
            <li>Try using a different browser (Chrome recommended)</li>
            <li>Restart your device if issues persist</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
