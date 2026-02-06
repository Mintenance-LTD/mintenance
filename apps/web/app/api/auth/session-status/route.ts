import { NextRequest, NextResponse } from 'next/server';
import { SessionValidator } from '@mintenance/auth';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter-enhanced';
import { logger } from '@mintenance/shared';

/**
 * Session Status API Endpoint
 *
 * VULN-009 Phase 4: Returns current session status and time remaining
 * Used by client-side session monitor for warning notifications
 *
 * Rate Limit: 60 requests/hour per user (prevents polling abuse)
 * Authentication: Required (must have valid session)
 *
 * @returns Session status with time remaining and warning flags
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting: Configurable for development vs production
    // Development (5s poll): 720/hour, Production (60s poll): 60/hour
    const isDev = process.env.NODE_ENV === 'development';

    logger.debug('[session-status] Rate limit check', { isDev, nodeEnv: process.env.NODE_ENV });

    const rateLimitResult = await checkRateLimit(request);

    logger.debug('[session-status] Rate limit result', { rateLimitResult });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(isDev ? 720 : 60),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString(),
          }
        }
      );
    }

    // Get current user from cookies (requires authentication)
    const user = await getCurrentUserFromCookies();

    if (!user) {
      // Not authenticated - return minimal response
      return NextResponse.json({
        authenticated: false,
        message: 'No active session',
      }, { status: 401 });
    }

    // Extract session tracking fields from JWT
    // These are set during login and preserved across token refreshes
    const sessionStart = (user as any).sessionStart; // Unix timestamp (ms)
    const lastActivity = (user as any).lastActivity; // Unix timestamp (ms)

    // If session tracking not available (legacy token), return basic status
    if (!sessionStart || !lastActivity) {
      return NextResponse.json({
        authenticated: true,
        userId: user.id,
        sessionStart: null,
        lastActivity: null,
        timeRemainingMs: null,
        timeRemainingMinutes: null,
        expiresAt: null,
        timeoutType: null,
        warnings: {
          shouldWarnSoon: false,
          shouldWarnCritical: false,
        },
        message: 'Session tracking not available (legacy token)',
      });
    }

    // Get time remaining until session expires
    const { absoluteMs, idleMs } = SessionValidator.getTimeUntilExpiry({
      sessionStart,
      lastActivity,
    });

    // Determine which timeout will trigger first
    const timeRemainingMs = Math.min(absoluteMs, idleMs);
    const timeoutType = absoluteMs < idleMs ? 'absolute' : 'idle';
    const now = Date.now();
    const expiresAt = now + timeRemainingMs;

    // Calculate warning thresholds
    const warningThresholdMs = parseInt(process.env.SESSION_WARNING_THRESHOLD_MINUTES || '5') * 60 * 1000; // Default: 5 min
    const criticalThresholdMs = parseInt(process.env.SESSION_CRITICAL_THRESHOLD_MINUTES || '1') * 60 * 1000; // Default: 1 min

    const warnings = {
      shouldWarnSoon: timeRemainingMs <= warningThresholdMs && timeRemainingMs > criticalThresholdMs,
      shouldWarnCritical: timeRemainingMs <= criticalThresholdMs,
    };

    // Log session status check (for monitoring)
    logger.debug('Session status checked', {
      service: 'session-status',
      userId: user.id,
      timeRemainingMinutes: Math.floor(timeRemainingMs / (60 * 1000)),
      timeoutType,
      warningLevel: warnings.shouldWarnCritical ? 'critical' : warnings.shouldWarnSoon ? 'warning' : 'normal',
    });

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      sessionStart,
      lastActivity,
      timeRemainingMs,
      timeRemainingMinutes: Math.floor(timeRemainingMs / (60 * 1000)),
      timeRemainingSeconds: Math.floor(timeRemainingMs / 1000),
      expiresAt,
      timeoutType,
      warnings,
      sessionAgeHours: Math.floor((now - sessionStart) / (60 * 60 * 1000)),
      idleMinutes: Math.floor((now - lastActivity) / (60 * 1000)),
    });

  } catch (error) {
    logger.error('Session status check failed', error, {
      service: 'session-status',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
