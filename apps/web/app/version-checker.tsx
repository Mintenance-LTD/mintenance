'use client';

import { useEffect, useState } from 'react';

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_ENDPOINT = '/api/version';

interface VersionCheckProps {
  /**
   * Optional callback when new version is detected
   */
  onNewVersion?: () => void;

  /**
   * Auto-refresh on new version (default: false)
   * If true, will automatically refresh the page when a new version is detected
   */
  autoRefresh?: boolean;

  /**
   * Delay before auto-refresh in ms (default: 3000)
   */
  autoRefreshDelay?: number;
}

/**
 * VersionChecker - Detects new deployments and prompts for refresh
 *
 * This component:
 * 1. Periodically checks for new application versions
 * 2. Detects when a new deployment has occurred
 * 3. Optionally prompts user to refresh or auto-refreshes
 * 4. Prevents chunk loading errors from version mismatches
 *
 * How it works:
 * - On mount, records current build ID from Next.js
 * - Periodically fetches version endpoint
 * - Compares build IDs to detect changes
 * - Notifies user or auto-refreshes based on config
 *
 * Usage:
 * ```tsx
 * // Simple usage (shows prompt)
 * <VersionChecker />
 *
 * // Auto-refresh on new version
 * <VersionChecker autoRefresh />
 *
 * // Custom callback
 * <VersionChecker onNewVersion={() => console.log('New version!')} />
 * ```
 */
export function VersionChecker({
  onNewVersion,
  autoRefresh = false,
  autoRefreshDelay = 3000,
}: VersionCheckProps) {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null);

  useEffect(() => {
    // Get initial build ID from meta tag or session storage
    const getBuildId = () => {
      // Try to get from Next.js meta tag
      const metaTag = document.querySelector('meta[name="x-build-id"]');
      if (metaTag) {
        return metaTag.getAttribute('content');
      }

      // Fallback to session storage
      const storedBuildId = sessionStorage.getItem('app-build-id');
      if (storedBuildId) {
        return storedBuildId;
      }

      // Generate a temporary ID if none exists
      const tempId = `build-${Date.now()}`;
      sessionStorage.setItem('app-build-id', tempId);
      return tempId;
    };

    const initialBuildId = getBuildId();
    setCurrentBuildId(initialBuildId);

    // Check for version updates
    const checkVersion = async () => {
      try {
        // Try to fetch version endpoint
        const response = await fetch(VERSION_ENDPOINT, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const newBuildId = data.buildId;

          if (newBuildId && currentBuildId && newBuildId !== currentBuildId) {
            // Version change detected - silently handle unless debugging
            // Uncomment for debugging version changes:
            // console.debug('[VersionChecker] New version detected:', {
            //   current: currentBuildId,
            //   new: newBuildId,
            // });

            // Call callback if provided
            onNewVersion?.();

            // Auto-refresh or show prompt
            if (autoRefresh) {
              console.info(`[VersionChecker] Auto-refreshing in ${autoRefreshDelay}ms...`);
              setTimeout(() => {
                window.location.reload();
              }, autoRefreshDelay);
            } else {
              setShowUpdatePrompt(true);
            }
          }
        }
      } catch (error) {
        // Silently fail - version endpoint might not exist
        // Uncomment for debugging:
        // console.debug('[VersionChecker] Version check failed:', error);
      }
    };

    // Check immediately after mount
    checkVersion();

    // Set up periodic checks
    const intervalId = setInterval(checkVersion, VERSION_CHECK_INTERVAL);

    // Also check when window regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentBuildId, onNewVersion, autoRefresh, autoRefreshDelay]);

  const handleRefresh = () => {
    console.info('[VersionChecker] User triggered refresh');
    window.location.reload();
  };

  const handleDismiss = () => {
    console.info('[VersionChecker] User dismissed update prompt');
    setShowUpdatePrompt(false);
  };

  // Don't render anything if not showing prompt
  if (!showUpdatePrompt) {
    return null;
  }

  // Render update prompt
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        padding: '1.5rem',
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateY(100px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>

      <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#dbeafe',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🔄</span>
        </div>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
            }}
          >
            Update Available
          </h3>

          <p
            style={{
              margin: '0 0 1rem 0',
              fontSize: '0.875rem',
              color: '#6b7280',
              lineHeight: '1.5',
            }}
          >
            A new version of the application is available. Please refresh to get the latest
            features and fixes.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleRefresh}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              Refresh Now
            </button>

            <button
              onClick={handleDismiss}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
