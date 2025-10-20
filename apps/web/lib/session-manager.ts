/**
 * Session Manager
 * Handles session persistence, refresh, and "Remember Me" functionality
 */

'use client';

// Client-side logger for session management
const sessionLogger = {
  info: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[SessionManager] ${message}`, data || '');
    }
  },
  error: (message: string, error?: unknown) => {
    console.error(`[SessionManager] ${message}`, error || '');
  },
  warn: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SessionManager] ${message}`, data || '');
    }
  }
};

interface SessionTimestamp {
  lastActive: number;
  rememberMe: boolean;
}

const SESSION_KEY = 'mint_session_timestamp';
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_CHECK_INTERVAL = 60 * 1000; // Check every minute

export class SessionManager {
  private static instance: SessionManager | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private activityListeners: Array<{ event: string; handler: () => void }> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSessionTracking();
    }
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Initialize session tracking
   */
  private initializeSessionTracking() {
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((event) => {
      const handler = () => this.updateLastActive();
      window.addEventListener(event, handler, { passive: true });
      this.activityListeners.push({ event, handler });
    });

    // Check for expired sessions on load
    this.checkSessionOnLoad();

    // Start periodic refresh check
    this.startRefreshInterval();

    // Handle tab visibility changes
    const visibilityHandler = () => {
      if (!document.hidden) {
        this.handleTabVisible();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    this.activityListeners.push({ event: 'visibilitychange', handler: visibilityHandler });

    // Handle beforeunload
    const beforeUnloadHandler = () => {
      this.updateLastActive();
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    this.activityListeners.push({ event: 'beforeunload', handler: beforeUnloadHandler });
  }

  /**
   * Update last active timestamp
   */
  private updateLastActive() {
    try {
      const session = this.getSession();
      if (session) {
        session.lastActive = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    } catch (error) {
      sessionLogger.error('Failed to update last active', error);
    }
  }

  /**
   * Get current session data
   */
  private getSession(): SessionTimestamp | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set session data
   */
  public setSession(rememberMe: boolean = false) {
    try {
      const session: SessionTimestamp = {
        lastActive: Date.now(),
        rememberMe,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      sessionLogger.error('Failed to set session', error);
    }
  }

  /**
   * Clear session data and cleanup resources
   */
  public clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      this.cleanup();
    } catch (error) {
      sessionLogger.error('Failed to clear session', error);
    }
  }

  /**
   * Cleanup event listeners and intervals
   */
  private cleanup() {
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    // Remove all event listeners
    this.activityListeners.forEach(({ event, handler }) => {
      if (event === 'visibilitychange') {
        document.removeEventListener(event, handler);
      } else {
        window.removeEventListener(event, handler);
      }
    });
    this.activityListeners = [];
  }

  /**
   * Destroy the session manager instance (for cleanup on app unmount)
   */
  public destroy() {
    this.cleanup();
    SessionManager.instance = null;
  }

  /**
   * Check if session is within grace period
   */
  public isWithinGracePeriod(): boolean {
    const session = this.getSession();
    if (!session) return false;

    const timeSinceLastActive = Date.now() - session.lastActive;
    return timeSinceLastActive <= GRACE_PERIOD_MS;
  }

  /**
   * Check session on page load
   */
  private async checkSessionOnLoad() {
    const session = this.getSession();
    if (!session) return;

    const timeSinceLastActive = Date.now() - session.lastActive;

    // Within 5-minute grace period - auto refresh
    if (timeSinceLastActive <= GRACE_PERIOD_MS) {
      sessionLogger.info('Session within grace period, auto-refreshing');
      await this.refreshSession();
      return;
    }

    // "Remember Me" enabled - attempt refresh
    if (session.rememberMe) {
      sessionLogger.info('Remember Me active, refreshing session');
      await this.refreshSession();
      return;
    }

    // Session expired, clear it
    if (timeSinceLastActive > GRACE_PERIOD_MS && !session.rememberMe) {
      sessionLogger.info('Session expired, clearing');
      this.clearSession();
      // Redirect to login if on protected page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
  }

  /**
   * Handle tab becoming visible
   */
  private async handleTabVisible() {
    const session = this.getSession();
    if (!session) return;

    // Check if we need to refresh
    const timeSinceLastActive = Date.now() - session.lastActive;

    // If within grace period or remember me is on, refresh
    if (timeSinceLastActive <= GRACE_PERIOD_MS || session.rememberMe) {
      await this.refreshSession();
    }
  }

  /**
   * Start periodic session refresh
   */
  private startRefreshInterval() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      const session = this.getSession();
      if (!session) return;

      // Only auto-refresh if "Remember Me" is enabled or within grace period
      if (session.rememberMe || this.isWithinGracePeriod()) {
        await this.refreshSession();
      }
    }, REFRESH_CHECK_INTERVAL);
  }

  /**
   * Refresh session by calling the refresh API
   */
  public async refreshSession(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        sessionLogger.error('Failed to refresh session', response.statusText);
        return false;
      }

      // Update last active on successful refresh
      this.updateLastActive();
      sessionLogger.info('Session refreshed successfully');
      return true;
    } catch (error) {
      sessionLogger.error('Session refresh error', error);
      return false;
    }
  }

  /**
   * Check if remember me is enabled
   */
  public isRememberMeEnabled(): boolean {
    const session = this.getSession();
    return session?.rememberMe || false;
  }

  /**
   * Get time until session expires (for UI display)
   */
  public getTimeUntilExpiry(): number | null {
    const session = this.getSession();
    if (!session) return null;

    if (session.rememberMe) {
      return Infinity; // No expiry with remember me
    }

    const timeSinceLastActive = Date.now() - session.lastActive;
    const timeRemaining = GRACE_PERIOD_MS - timeSinceLastActive;

    return timeRemaining > 0 ? timeRemaining : 0;
  }
}

// Initialize singleton
if (typeof window !== 'undefined') {
  SessionManager.getInstance();
}

