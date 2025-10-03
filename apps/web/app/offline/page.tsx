/**
 * Offline Fallback Page
 * Displayed when the app is offline and requested content is not cached
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
          <svg
            className="w-full h-full text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
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
          <button
            onClick={handleRetry}
            disabled={isOnline}
            className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
              isOnline
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isOnline ? 'Connecting...' : 'Try Again'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go to Homepage
          </button>
        </div>

        {/* Helpful Tips */}
        <div className="mt-12 p-6 bg-blue-50 rounded-lg text-left">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Offline Mode Tips:
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Previously viewed pages may be available offline
            </li>
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Check your WiFi or mobile data connection
            </li>
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
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
