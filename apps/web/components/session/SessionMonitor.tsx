'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { useConfirm } from '@/components/ui/confirm-dialog';

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

  const confirm = useConfirm();
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
      // Non-blocking, branded notification so polling does not stall.
      toast(
        'Session check paused for 2 minutes (rate-limited). We will retry automatically. If you are about to be signed out, click "Extend Session" when the warning appears.',
        { duration: 8000, icon: '⏳' }
      );
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
      const minutes = status.timeRemainingMinutes || 0;

      // Mark the warning shown up front so this effect can't re-fire and
      // stack a second dialog while the async confirm is still open.
      markWarningShown('warning');

      void confirm({
        title: 'Session expiring soon',
        description: `Your session will expire in ${minutes} minutes due to inactivity.\n\nExtend your session to keep working, or dismiss to let it expire.`,
        confirmText: 'Extend session',
        cancelText: 'Dismiss',
      }).then((extend) => {
        if (extend) extendSession();
      });
    }
  }, [status, hasShownWarning, extendSession, markWarningShown, confirm]);

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
