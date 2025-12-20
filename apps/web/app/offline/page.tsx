/**
 * Offline Fallback Page
 * Displayed when the app is offline and requested content is not cached
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { WifiOff, Home, CheckCircle2 } from 'lucide-react';

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);

      // Auto-retry when online
      if (navigator.onLine && retryCount < 3) {
        setTimeout(() => {
          router.back();
        }, 1000);
      }
    };

    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [router, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);

    if (navigator.onLine) {
      router.back();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mx-auto w-24 h-24 mb-8">
          <WifiOff className="w-full h-full text-gray-400" />
        </div>

        {/* Status Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {isOnline ? 'Reconnecting...' : "You're Offline"}
        </h1>

        <p className="text-gray-600 mb-8">
          {isOnline
            ? 'Connection restored. Redirecting...'
            : 'No internet connection available. Please check your network settings and try again.'}
        </p>

        {/* Connection Status Indicator */}
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full">
            <div
              className={`w-3 h-3 rounded-full ${
                isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleRetry}
            disabled={isOnline}
            variant="primary"
            fullWidth
          >
            {isOnline ? 'Connecting...' : 'Try Again'}
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="outline"
            fullWidth
            leftIcon={<Home className="h-4 w-4" />}
          >
            Go to Homepage
          </Button>
        </div>

        {/* Helpful Tips */}
        <div className="mt-12 p-6 bg-blue-50 rounded-lg text-left">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Offline Mode Tips:
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 mt-0.5 shrink-0" />
              Previously viewed pages may be available offline
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 mt-0.5 shrink-0" />
              Check your WiFi or mobile data connection
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 mt-0.5 shrink-0" />
              Try disabling VPN or proxy if enabled
            </li>
          </ul>
        </div>

        {/* Retry Count Debug Info (hidden in production) */}
        {process.env.NODE_ENV === 'development' && retryCount > 0 && (
          <p className="mt-4 text-xs text-gray-400">
            Retry attempts: {retryCount}
          </p>
        )}
      </div>
    </div>
  );
}
