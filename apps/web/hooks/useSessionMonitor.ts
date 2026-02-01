'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@mintenance/shared';

/**
 * Session status returned from API
 */
export interface SessionStatus {
  authenticated: boolean;
  userId?: string;
  sessionStart?: number;
  lastActivity?: number;
  timeRemainingMs: number | null;
  timeRemainingMinutes: number | null;
  timeRemainingSeconds: number | null;
  expiresAt: number | null;
  timeoutType: 'idle' | 'absolute' | null;
  warnings: {
    shouldWarnSoon: boolean;
    shouldWarnCritical: boolean;
  };
  sessionAgeHours?: number;
  idleMinutes?: number;
}

/**
 * Session monitor hook state
 */
export interface SessionMonitorState {
  status: SessionStatus | null;
  isLoading: boolean;
  isExtending: boolean;
  error: string | null;
  hasShownWarning: boolean;
  hasShownCriticalWarning: boolean;
}

/**
 * Hook for monitoring session timeout status
 *
 * VULN-009 Phase 4B: Client-side session monitoring
 *
 * Features:
 * - Polls /api/auth/session-status every 60 seconds (configurable)
 * - Pauses polling when tab is hidden (performance optimization)
 * - Tracks warning state (prevents duplicate notifications)
 * - Provides session extension function
 * - Handles errors gracefully
 *
 * @returns Session monitor state and extension function
 */
export function useSessionMonitor() {
  const [state, setState] = useState<SessionMonitorState>({
    status: null,
    isLoading: true,
    isExtending: false,
    error: null,
    hasShownWarning: false,
    hasShownCriticalWarning: false,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  /**
   * Fetch current session status from API
   */
  const fetchSessionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session-status', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (response.status === 429) {
        // Rate limited - back off polling
        logger.warn('Session status rate limit exceeded', { service: 'useSessionMonitor' });
        setState(prev => ({
          ...prev,
          error: 'Too many requests. Polling paused.',
        }));
        return;
      }

      if (!response.ok) {
        // Not authenticated or error
        setState(prev => ({
          ...prev,
          status: {
            authenticated: false,
            timeRemainingMs: null,
            timeRemainingMinutes: null,
            timeRemainingSeconds: null,
            expiresAt: null,
            timeoutType: null,
            warnings: {
              shouldWarnSoon: false,
              shouldWarnCritical: false,
            },
          },
          isLoading: false,
          error: response.status === 401 ? null : 'Failed to fetch session status',
        }));
        return;
      }

      const data: SessionStatus = await response.json();

      setState(prev => ({
        ...prev,
        status: data,
        isLoading: false,
        error: null,
      }));

      logger.debug('Session status updated', {
        service: 'useSessionMonitor',
        timeRemainingMinutes: data.timeRemainingMinutes,
        shouldWarnSoon: data.warnings.shouldWarnSoon,
        shouldWarnCritical: data.warnings.shouldWarnCritical,
      });

    } catch (error) {
      logger.error('Failed to fetch session status', error, { service: 'useSessionMonitor' });
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error. Session monitoring unavailable.',
      }));
    }
  }, []);

  /**
   * Extend user session by refreshing tokens
   */
  const extendSession = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isExtending: true }));

    try {
      const response = await fetch('/api/auth/extend-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Extension failed
        const errorMessage = data.message || 'Failed to extend session';

        logger.warn('Session extension failed', {
          service: 'useSessionMonitor',
          status: response.status,
          error: data.error,
        });

        setState(prev => ({
          ...prev,
          isExtending: false,
          error: errorMessage,
        }));

        return false;
      }

      // Extension successful - reset warning flags and fetch fresh status
      setState(prev => ({
        ...prev,
        isExtending: false,
        hasShownWarning: false,
        hasShownCriticalWarning: false,
        error: null,
      }));

      logger.info('Session extended successfully', {
        service: 'useSessionMonitor',
        newExpiresAt: data.newExpiresAt,
        timeRemainingMinutes: data.timeRemainingMinutes,
      });

      // Fetch updated session status immediately
      await fetchSessionStatus();

      return true;

    } catch (error) {
      logger.error('Session extension failed', error, { service: 'useSessionMonitor' });

      setState(prev => ({
        ...prev,
        isExtending: false,
        error: 'Failed to extend session. Please try again.',
      }));

      return false;
    }
  }, [fetchSessionStatus]);

  /**
   * Mark that warning has been shown (prevents duplicates)
   */
  const markWarningShown = useCallback((type: 'warning' | 'critical') => {
    setState(prev => ({
      ...prev,
      hasShownWarning: type === 'warning' ? true : prev.hasShownWarning,
      hasShownCriticalWarning: type === 'critical' ? true : prev.hasShownCriticalWarning,
    }));
  }, []);

  /**
   * Setup polling interval
   */
  useEffect(() => {
    // Get poll interval from environment or default to 60 seconds
    const pollIntervalSeconds = parseInt(
      process.env.NEXT_PUBLIC_SESSION_POLL_INTERVAL_SECONDS || '60'
    );
    const pollIntervalMs = pollIntervalSeconds * 1000;

    // Initial fetch
    fetchSessionStatus();

    // Start polling
    pollIntervalRef.current = setInterval(() => {
      // Only poll if tab is visible
      if (isVisibleRef.current) {
        fetchSessionStatus();
      }
    }, pollIntervalMs);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchSessionStatus]);

  /**
   * Pause polling when tab is hidden (performance optimization)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;

      // If tab becomes visible again, fetch immediately
      if (!document.hidden) {
        fetchSessionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSessionStatus]);

  return {
    ...state,
    extendSession,
    markWarningShown,
    refetchStatus: fetchSessionStatus,
  };
}
