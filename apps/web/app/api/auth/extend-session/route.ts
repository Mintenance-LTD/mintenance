import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionValidator, ConfigManager } from '@mintenance/auth';
import { getCurrentUserFromCookies, rotateTokens, setAuthCookie } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter-enhanced';
import { securityMonitor } from '@/lib/security-monitor';
import { logger } from '@mintenance/shared';

// Initialize config manager
const config = ConfigManager.getInstance();

// Cookie names
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_PREFIX = isProduction ? '__Host-' : '';
const AUTH_COOKIE = `${COOKIE_PREFIX}mintenance-auth`;
const REFRESH_COOKIE = `${COOKIE_PREFIX}mintenance-refresh`;

/**
 * Session Extension API Endpoint
 *
 * VULN-009 Phase 4: Extends user session by refreshing tokens
 * Used by "Extend Session" button in timeout warnings
 *
 * Rate Limit: 5 requests per 30 minutes (prevents abuse)
 * Authentication: Required (must have valid session)
 *
 * Behavior:
 * - Updates last_activity_at (resets idle timeout to 30 minutes)
 * - Preserves session_started_at (absolute timeout still enforced)
 * - Rotates access + refresh tokens (security best practice)
 * - Logs extension event for audit trail
 *
 * @returns New session expiry time or error
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: uses default config (prevents infinite session abuse)
    const rateLimitResult = await checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many session extensions',
          message: 'You have extended your session too many times. Please wait 30 minutes or login again.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': '1800', // 30 minutes
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 1800000).toISOString(),
          }
        }
      );
    }

    // Get current user from cookies
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
          message: 'Your session has expired. Please login again.',
        },
        { status: 401 }
      );
    }

    // Extract session tracking fields from JWT
    const sessionStart = (user as unknown as { sessionStart?: number }).sessionStart;
    const lastActivity = (user as unknown as { lastActivity?: number }).lastActivity;

    // Validate session is not expired
    if (sessionStart && lastActivity) {
      const sessionValidation = SessionValidator.validateSession({
        sessionStart,
        lastActivity,
      });

      if (!sessionValidation.isValid) {
        // Session already expired - cannot extend
        return NextResponse.json(
          {
            success: false,
            error: 'Session expired',
            message: `Your session has expired: ${SessionValidator.getTimeoutMessage(sessionValidation)}`,
            violations: sessionValidation.violations,
          },
          { status: 401 }
        );
      }

      // Check if absolute timeout limit would prevent extension
      const { absoluteMs } = SessionValidator.getTimeUntilExpiry({
        sessionStart,
        lastActivity,
      });

      // If less than 1 minute remaining on absolute timeout, cannot extend
      // (because idle timeout is 30 min, but absolute can't be bypassed)
      if (absoluteMs < 60 * 1000) {
        return NextResponse.json(
          {
            success: false,
            error: 'Session cannot be extended',
            message: 'Your session has reached the maximum duration (12 hours). Please login again.',
            absoluteTimeoutReached: true,
          },
          { status: 400 }
        );
      }
    }

    // Get refresh token from cookies
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'No refresh token',
          message: 'Session cannot be extended. Please login again.',
        },
        { status: 401 }
      );
    }

    // Rotate tokens (this updates last_activity_at, preserves session_started_at)
    const { accessToken, refreshToken: newRefreshToken } = await rotateTokens(
      user.id,
      refreshToken
    );

    // Set new cookies
    await setAuthCookie(accessToken, false, newRefreshToken);

    // Calculate new expiry time (idle timeout resets to 30 minutes)
    const idleTimeoutMs = 30 * 60 * 1000; // 30 minutes
    const newExpiresAt = Date.now() + idleTimeoutMs;

    // Log session extension for audit trail
    await securityMonitor.logSuspiciousActivity(
      request,
      'User extended session via timeout warning',
      user.id,
      {
        eventType: 'session_extension',
        sessionAgeHours: sessionStart ? Math.floor((Date.now() - sessionStart) / (60 * 60 * 1000)) : null,
        idleMinutesBeforeExtension: lastActivity ? Math.floor((Date.now() - lastActivity) / (60 * 1000)) : null,
        newExpiresAt,
      }
    ).catch((err) => {
      // Non-blocking logging
      logger.error('Failed to log session extension', err, {
        service: 'extend-session',
        userId: user.id,
      });
    });

    logger.info('Session extended successfully', {
      service: 'extend-session',
      userId: user.id,
      newExpiryMinutes: Math.floor(idleTimeoutMs / (60 * 1000)),
    });

    return NextResponse.json({
      success: true,
      message: 'Session extended successfully',
      newExpiresAt,
      timeRemainingMs: idleTimeoutMs,
      timeRemainingMinutes: Math.floor(idleTimeoutMs / (60 * 1000)),
    });

  } catch (error) {
    logger.error('Session extension failed', error, {
      service: 'extend-session',
    });

    // Don't expose internal error details
    return NextResponse.json(
      {
        success: false,
        error: 'Session extension failed',
        message: 'Failed to extend your session. Please try again or login.',
      },
      { status: 500 }
    );
  }
}
