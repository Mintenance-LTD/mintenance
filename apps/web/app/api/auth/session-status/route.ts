import { NextResponse } from 'next/server';
import { SessionValidator } from '@mintenance/auth';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter-enhanced';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler({ auth: false, rateLimit: false }, async (request) => {
  const isDev = process.env.NODE_ENV === 'development';

  logger.debug('[session-status] Rate limit check', { isDev, nodeEnv: process.env.NODE_ENV });

  const rateLimitResult = await checkRateLimit(request);
  logger.debug('[session-status] Rate limit result', { rateLimitResult });

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Limit': String(isDev ? 720 : 60), 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString() }
    });
  }

  const user = await getCurrentUserFromCookies();
  if (!user) {
    return NextResponse.json({ authenticated: false, message: 'No active session' }, { status: 401 });
  }

  const sessionStart = (user as unknown as { sessionStart?: number }).sessionStart;
  const lastActivity = (user as unknown as { lastActivity?: number }).lastActivity;

  if (!sessionStart || !lastActivity) {
    return NextResponse.json({ authenticated: true, userId: user.id, sessionStart: null, lastActivity: null, timeRemainingMs: null, timeRemainingMinutes: null, expiresAt: null, timeoutType: null, warnings: { shouldWarnSoon: false, shouldWarnCritical: false }, message: 'Session tracking not available (legacy token)' });
  }

  const { absoluteMs, idleMs } = SessionValidator.getTimeUntilExpiry({ sessionStart, lastActivity });
  const timeRemainingMs = Math.min(absoluteMs, idleMs);
  const timeoutType = absoluteMs < idleMs ? 'absolute' : 'idle';
  const now = Date.now();
  const expiresAt = now + timeRemainingMs;

  const warningThresholdMs = parseInt(process.env.SESSION_WARNING_THRESHOLD_MINUTES || '5') * 60 * 1000;
  const criticalThresholdMs = parseInt(process.env.SESSION_CRITICAL_THRESHOLD_MINUTES || '1') * 60 * 1000;

  const warnings = {
    shouldWarnSoon: timeRemainingMs <= warningThresholdMs && timeRemainingMs > criticalThresholdMs,
    shouldWarnCritical: timeRemainingMs <= criticalThresholdMs,
  };

  logger.debug('Session status checked', { service: 'session-status', userId: user.id, timeRemainingMinutes: Math.floor(timeRemainingMs / (60 * 1000)), timeoutType, warningLevel: warnings.shouldWarnCritical ? 'critical' : warnings.shouldWarnSoon ? 'warning' : 'normal' });

  return NextResponse.json({ authenticated: true, userId: user.id, sessionStart, lastActivity, timeRemainingMs, timeRemainingMinutes: Math.floor(timeRemainingMs / (60 * 1000)), timeRemainingSeconds: Math.floor(timeRemainingMs / 1000), expiresAt, timeoutType, warnings, sessionAgeHours: Math.floor((now - sessionStart) / (60 * 60 * 1000)), idleMinutes: Math.floor((now - lastActivity) / (60 * 1000)) });
});
