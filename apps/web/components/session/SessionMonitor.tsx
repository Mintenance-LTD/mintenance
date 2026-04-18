'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

/**
 * Session Monitor Component
 *
 * VULN-009 Phase 4B: Global session timeout monitoring
 *
 * Features:
 * - Shows warning toast when < 5 minutes remaining
 * - Shows critical modal when < 1 minute remaining
 * - Provides "Extend Session" action
 * - Automatically redirects to login on session expiry
 * - Respects feature flags for gradual rollout
 * - Skips monitoring on public pages (coming-soon, login, register)
 *
 * Usage: Add once to root layout for app-wide monitoring
 */
export function SessionMonitor() {
  const router = useRouter();
  const pathname = usePathname();

  // Skip session monitoring on public pages where there is no session
  const isPublicPage =
    pathname?.startsWith('/coming-soon') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register');

  const {
    status,
    isExtending,
    hasShownWarning,
    hasShownCriticalWarning,
    error,
    extendSession,
    markWarningShown,
  } = useSessionMonitor({ enabled: !isPublicPage });

  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [ratelimitToastShown, setRatelimitToastShown] = useState(false);

  /**
   * Sprint 7 (6.1): surface the 429 back-off to the user.
   * The hook silently flips `error` to "Polling paused for 2 minutes." when
   * rate-limited, but the user had no way to see this so session expiry
   * could surprise them. Show a single toast on the transition into the
   * paused state, and clear the flag once polling resumes.
   */
  useEffect(() => {
    const paused = !!error && /paused/i.test(error);
    if (paused && !ratelimitToastShown) {
      // Using native alert here to match the existing warning-toast style
      // in this component. When the shared ToastProvider is wired up we
      // can swap to that — low priority.
      if (typeof window !== 'undefined') {
        // Fire-and-forget notification so polling does not stall.
        window.setTimeout(() => {
          window.alert(
            'Session check paused for 2 minutes (rate-limited). We will retry automatically. If you are about to be signed out, click "Extend Session" when the warning appears.'
          );
        }, 0);
      }
      setRatelimitToastShown(true);
    } else if (!paused && ratelimitToastShown) {
      setRatelimitToastShown(false);
    }
  }, [error, ratelimitToastShown]);

  /**
   * Handle warning toast (5 minutes remaining)
   */
  useEffect(() => {
    if (!status || !status.authenticated) return;

    if (status.warnings.shouldWarnSoon && !hasShownWarning) {
      // Show toast notification using native browser notification
      // (In production, you'd use your existing Toast system here)
      const minutes = status.timeRemainingMinutes || 0;

      if (
        window.confirm(
          `Your session will expire in ${minutes} minutes due to inactivity.\n\nClick OK to extend your session, or Cancel to logout.`
        )
      ) {
        extendSession();
      }

      markWarningShown('warning');
    }
  }, [status, hasShownWarning, extendSession, markWarningShown]);

  /**
   * Handle critical modal (1 minute remaining)
   */
  useEffect(() => {
    if (!status || !status.authenticated) return;

    if (status.warnings.shouldWarnCritical && !hasShownCriticalWarning) {
      setShowCriticalModal(true);
      markWarningShown('critical');
    }
  }, [status, hasShownCriticalWarning, markWarningShown]);

  /**
   * Handle session extension from critical modal
   */
  const handleExtendFromModal = async () => {
    const success = await extendSession();
    if (success) {
      setShowCriticalModal(false);
    }
  };

  /**
   * Handle logout from critical modal
   */
  const handleLogout = () => {
    router.push('/logout');
  };

  // Render critical warning modal
  if (showCriticalModal && status?.authenticated) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h2
            style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600 }}
          >
            Session Expiring Soon
          </h2>

          <p style={{ margin: '0 0 16px 0', color: '#666' }}>
            Your session will expire in less than 1 minute due to inactivity.
          </p>

          <p style={{ margin: '0 0 24px 0', color: '#666' }}>
            Click "Stay Logged In" to continue working, or "Log Out" to end your
            session.
          </p>

          <div
            style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}
          >
            <button
              onClick={handleLogout}
              disabled={isExtending}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              Log Out
            </button>

            <button
              onClick={handleExtendFromModal}
              disabled={isExtending}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#0070f3',
                color: 'white',
                cursor: isExtending ? 'not-allowed' : 'pointer',
                opacity: isExtending ? 0.6 : 1,
              }}
            >
              {isExtending ? 'Extending...' : 'Stay Logged In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No UI when not showing warnings
  return null;
}
