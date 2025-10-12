/**
 * PWA Initializer Component
 * Registers Service Worker and handles PWA features
 */

'use client';

import { useEffect, useState } from 'react';
import { pwa } from '@/lib/pwa';
import { logger } from '@/lib/logger';

export function PWAInitializer() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);

  useEffect(() => {
    if (!pwa.isSupported()) {
      logger.info('PWA features not supported');
      return;
    }

    // Register Service Worker
    pwa.register().then((registration) => {
      if (registration) {
        logger.info('Service Worker registered successfully');
      }
    });

    // Setup install prompt
    pwa.setupInstallPrompt();

    // Listen for PWA events
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    const handleInstallAvailable = () => {
      setInstallPromptAvailable(true);
    };

    const handleInstalled = () => {
      setInstallPromptAvailable(false);
      logger.info('PWA installed successfully');
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleUpdate = async () => {
    await pwa.skipWaiting();
    setUpdateAvailable(false);
  };

  const handleInstall = async () => {
    const accepted = await pwa.showInstallPrompt();
    if (accepted) {
      setInstallPromptAvailable(false);
    }
  };

  return (
    <>
      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-blue-600 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <p className="font-medium">A new version of Mintenance is available!</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="px-4 py-2 text-white/80 hover:text-white transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Prompt Banner */}
      {installPromptAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p className="font-semibold">Install Mintenance App</p>
                <p className="text-sm text-white/80">
                  Get quick access and work offline
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Install
              </button>
              <button
                onClick={() => setInstallPromptAvailable(false)}
                className="px-4 py-2 text-white/80 hover:text-white transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network Status Indicator (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <NetworkStatusIndicator />
      )}
    </>
  );
}

function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    pwa.setupNetworkListeners(
      () => setIsOnline(true),
      () => setIsOnline(false)
    );

    return () => {
      // Cleanup handled by pwa service
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-500 text-yellow-900 p-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span>You are offline - Some features may be limited</span>
      </div>
    </div>
  );
}
