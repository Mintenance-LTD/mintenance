import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, SessionValidator } from '@mintenance/auth';
import type { ConfigManager } from '@mintenance/auth';
import { logger } from '@mintenance/shared';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { securityMonitor } from '@/lib/security-monitor';
import { redirectToLogin } from './helpers';
import { validateCsrf, setCsrfCookie } from './csrf';

export interface AuthResult {
  response?: NextResponse;
  jwtPayload?: {
    sub?: string;
    email?: string;
    role?: string;
  };
}

export async function handleSupabaseAuth(
  request: NextRequest,
  pathname: string,
  isDevelopment: boolean
): Promise<NextResponse> {
  try {
    const { createServerClient } = await import('@supabase/ssr');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Supabase credentials not configured', undefined, {
        service: 'middleware',
        pathname,
      });
      return redirectToLogin(request);
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(_name: string, _value: string, _options: any) {
          // Not needed in middleware - cookies handled by response
        },
        remove(_name: string, _options: any) {
          // Not needed in middleware - cookies handled by response
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return redirectToLogin(request);
    }

    // SECURITY: Validate CSRF for state-changing requests
    const csrfResponse = validateCsrf(
      request,
      isDevelopment,
      'Supabase auth path'
    );
    if (csrfResponse) return csrfResponse;

    // SECURITY: Read role from profiles table (not user_metadata which is client-writable)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-email', user.email || '');
    requestHeaders.set('x-user-role', profileData?.role || 'homeowner');
    requestHeaders.set('x-pathname', pathname);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    setCsrfCookie(response, request, isDevelopment);
    return response;
  } catch (parseError) {
    logger.error('Failed to validate Supabase auth token', parseError, {
      service: 'middleware',
      pathname,
    });
    return redirectToLogin(request);
  }
}

export async function verifyJwtToken(
  token: string,
  cfg: ConfigManager,
  request: NextRequest,
  pathname: string
): Promise<any | null> {
  try {
    const jwtSecret = cfg.getRequired('JWT_SECRET');
    return await verifyJWT(token, jwtSecret);
  } catch (configError) {
    logger.error(
      'JWT verification failed due to configuration error',
      configError,
      { service: 'middleware', pathname }
    );
    return null;
  }
}

export async function checkTokenBlacklist(
  token: string,
  pathname: string,
  userId?: string
): Promise<boolean> {
  try {
    const isBlacklisted = await tokenBlacklist.isTokenBlacklisted(token);
    if (isBlacklisted) {
      logger.warn('Blacklisted token attempt blocked', {
        service: 'middleware',
        pathname,
        userId,
      });
      return true;
    }
    return false;
  } catch (blacklistError) {
    // SECURITY: Fail closed for payment platform - if blacklist check fails, reject token
    logger.error(
      'CRITICAL: Token blacklist check failed - rejecting request for security',
      {
        service: 'middleware',
        pathname,
        error: blacklistError,
        securityRisk: 'Cannot verify token is not blacklisted - failing closed',
      }
    );
    return true;
  }
}

export async function enforceSessionTimeouts(
  jwtPayload: any,
  token: string,
  request: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  if (!jwtPayload.sessionStart || !jwtPayload.lastActivity) {
    return null;
  }

  const sessionValidation = SessionValidator.validateSession({
    sessionStart: jwtPayload.sessionStart,
    lastActivity: jwtPayload.lastActivity,
  });

  if (sessionValidation.isValid) {
    return null;
  }

  // SECURITY FIX: Default to enforcing timeouts in production.
  const enforceTimeouts =
    process.env.ENFORCE_SESSION_TIMEOUTS !== 'false' &&
    process.env.NODE_ENV === 'production';

  securityMonitor
    .logSuspiciousActivity(
      request,
      `Session timeout violation: ${sessionValidation.reason}`,
      jwtPayload.sub,
      {
        violations: sessionValidation.violations,
        sessionAgeMs: sessionValidation.metadata.sessionAgeMs,
        idleTimeMs: sessionValidation.metadata.idleTimeMs,
        hardEnforcement: enforceTimeouts,
        timeoutMessage: SessionValidator.getTimeoutMessage(sessionValidation),
      }
    )
    .catch((err) => {
      logger.error('Failed to log session timeout violation', err, {
        service: 'middleware',
        userId: jwtPayload.sub,
      });
    });

  if (!enforceTimeouts) {
    return null;
  }

  // Blacklist token to prevent reuse (defense in depth)
  try {
    await tokenBlacklist.blacklistToken(token);
    logger.info('Token blacklisted on session timeout', {
      service: 'middleware',
      userId: jwtPayload.sub,
      violations: sessionValidation.violations.join(', '),
    });
  } catch (error) {
    logger.error('CRITICAL: Token blacklist failed on forced logout', error, {
      service: 'middleware',
      userId: jwtPayload.sub,
      securityRisk: 'Token may be reused until JWT expiry (max 1 hour)',
    });
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        error: 'Session Timeout',
        code: 'SESSION_TIMEOUT',
        message: SessionValidator.getTimeoutMessage(sessionValidation),
        violations: sessionValidation.violations,
        sessionAgeHours: Math.floor(
          (sessionValidation.metadata.sessionAgeMs || 0) / (60 * 60 * 1000)
        ),
        idleMinutes: Math.floor(
          (sessionValidation.metadata.idleTimeMs || 0) / (60 * 1000)
        ),
      },
      { status: 401 }
    );
  }

  return redirectToLogin(request);
}
