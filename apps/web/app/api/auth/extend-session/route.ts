import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionValidator, ConfigManager } from '@mintenance/auth';
import { getCurrentUserFromCookies, rotateTokens, setAuthCookie } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter-enhanced';
import { securityMonitor } from '@/lib/security-monitor';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Initialize config manager
const config = ConfigManager.getInstance();
void config; // referenced for side effects

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_PREFIX = isProduction ? '__Host-' : '';
const REFRESH_COOKIE = `${COOKIE_PREFIX}mintenance-refresh`;

export const POST = withApiHandler({ auth: false, rateLimit: false }, async (request) => {
  const rateLimitResult = await checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many session extensions', message: 'You have extended your session too many times. Please wait 30 minutes or login again.' },
      { status: 429, headers: { 'Retry-After': '1800', 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': new Date(Date.now() + 1800000).toISOString() } }
    );
  }

  const user = await getCurrentUserFromCookies();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated', message: 'Your session has expired. Please login again.' }, { status: 401 });
  }

  const sessionStart = (user as unknown as { sessionStart?: number }).sessionStart;
  const lastActivity = (user as unknown as { lastActivity?: number }).lastActivity;

  if (sessionStart && lastActivity) {
    const sessionValidation = SessionValidator.validateSession({ sessionStart, lastActivity });
    if (!sessionValidation.isValid) {
      return NextResponse.json({ success: false, error: 'Session expired', message: `Your session has expired: ${SessionValidator.getTimeoutMessage(sessionValidation)}`, violations: sessionValidation.violations }, { status: 401 });
    }

    const { absoluteMs } = SessionValidator.getTimeUntilExpiry({ sessionStart, lastActivity });
    if (absoluteMs < 60 * 1000) {
      return NextResponse.json({ success: false, error: 'Session cannot be extended', message: 'Your session has reached the maximum duration (12 hours). Please login again.', absoluteTimeoutReached: true }, { status: 400 });
    }
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ success: false, error: 'No refresh token', message: 'Session cannot be extended. Please login again.' }, { status: 401 });
  }

  const { accessToken, refreshToken: newRefreshToken } = await rotateTokens(user.id, refreshToken);
  await setAuthCookie(accessToken, false, newRefreshToken);

  const idleTimeoutMs = 30 * 60 * 1000;
  const newExpiresAt = Date.now() + idleTimeoutMs;

  await securityMonitor.logSuspiciousActivity(request, 'User extended session via timeout warning', user.id, {
    eventType: 'session_extension',
    sessionAgeHours: sessionStart ? Math.floor((Date.now() - sessionStart) / (60 * 60 * 1000)) : null,
    idleMinutesBeforeExtension: lastActivity ? Math.floor((Date.now() - lastActivity) / (60 * 1000)) : null,
    newExpiresAt,
  }).catch((err) => logger.error('Failed to log session extension', err, { service: 'extend-session', userId: user.id }));

  logger.info('Session extended successfully', { service: 'extend-session', userId: user.id, newExpiryMinutes: Math.floor(idleTimeoutMs / (60 * 1000)) });

  return NextResponse.json({ success: true, message: 'Session extended successfully', newExpiresAt, timeRemainingMs: idleTimeoutMs, timeRemainingMinutes: Math.floor(idleTimeoutMs / (60 * 1000)) });
});
