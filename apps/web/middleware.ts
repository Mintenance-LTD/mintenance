import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, ConfigManager, SessionValidator } from '@mintenance/auth';
import { logger } from '@mintenance/shared';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { checkRateLimit, createRateLimitHeaders, type RateLimitResult } from '@/lib/rate-limiter-enhanced';
import { handlePreflightRequest, addCorsHeaders, shouldSkipCors } from '@/lib/cors';
import { securityMonitor } from '@/lib/security-monitor';

// Lazy-initialized ConfigManager to avoid module-level throws that crash the middleware Edge Function
let configManager: ConfigManager | null = null;
let configInitError: string | null = null;

function getConfigManager(): ConfigManager | null {
  if (configManager) return configManager;
  if (configInitError) return null;

  try {
    configManager = ConfigManager.getInstance();
    const jwtSecret = configManager.get('JWT_SECRET');
    if (!jwtSecret) {
      configInitError = 'JWT_SECRET not available in configuration';
      logger.error('CRITICAL: ' + configInitError, undefined, { service: 'middleware' });
      configManager = null;
      return null;
    }
    return configManager;
  } catch (error) {
    configInitError = error instanceof Error ? error.message : 'Unknown error';
    logger.error('CRITICAL: Middleware configuration initialization failed', error, { service: 'middleware' });
    return null;
  }
}

import type { JWTPayload } from '@mintenance/types';

/**
 * Middleware to check for valid JWT in cookies and redirect unauthenticated users
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // SECURITY: Validate request body size and content type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type') || '';
    const contentLength = request.headers.get('content-length');

    // Reject requests without content-type for state-changing methods
    if (!contentType && request.method !== 'GET') {
      logger.warn('Request missing content-type header', {
        service: 'middleware',
        pathname,
        method: request.method,
      });
      return new NextResponse(
        JSON.stringify({ error: 'Content-Type header required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reject requests with body size > 10MB (configurable)
    const maxBodySize = 10 * 1024 * 1024; // 10MB
    if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
      logger.warn('Request body size exceeds limit', {
        service: 'middleware',
        pathname,
        contentLength,
        maxSize: maxBodySize,
      });
      return new NextResponse(
        JSON.stringify({ error: 'Request body too large' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate content-type for JSON requests
    if (contentType && !contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data') &&
        !contentType.includes('application/x-www-form-urlencoded') &&
        !contentType.includes('text/')) {
      logger.warn('Invalid content-type for request', {
        service: 'middleware',
        pathname,
        contentType,
      });
      // Allow through but log - some APIs may accept other content types
    }
  }

  // If configuration failed to load, fail closed for security (non-public routes only)
  const cfg = getConfigManager();
  if (!cfg) {
    logger.error('Middleware: Configuration unavailable - rejecting request', undefined, {
      service: 'middleware',
      pathname,
      configError: configInitError,
    });
    return new NextResponse('Service Unavailable', { status: 503 });
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/about', '/contact', '/privacy', '/terms', '/help', '/logout', '/careers', '/press', '/safety', '/cookies', '/faq', '/blog', '/pricing', '/how-it-works', '/ai-search', '/try-mint-ai'];
  // Auth API routes must be public (can't require auth to log in)
  const publicApiRoutes = ['/api/csrf', '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email', '/api/auth/session-status', '/api/stats/platform'];
  // Admin auth routes (login, register, forgot-password) are also public
  const adminAuthRoutes = ['/admin/login', '/admin/register', '/admin/forgot-password'];
  // Public contractor profile pages (e.g., /contractor/[id] for viewing contractor profiles)
  // All other contractor routes require authentication
  const isPublicContractorProfile = /^\/contractor\/[^\/]+$/.test(pathname);
  // Public contractor listing and detail pages (homeowner-facing)
  const isPublicContractorsPage = /^\/contractors(\/|$)/.test(pathname);
  const isPublicRoute = pathname === '/' ||
    publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) ||
    publicApiRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) ||
    isPublicContractorProfile ||
    isPublicContractorsPage ||
    adminAuthRoutes.includes(pathname);

  // Skip middleware for public routes
  if (isPublicRoute) {
    const requestHeaders = new Headers(request.headers);
    // Add pathname for consistent server-side rendering
    requestHeaders.set('x-pathname', pathname);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    
    // Generate CSRF token on first visit if not present
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const csrfCookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';
    
    if (!request.cookies.get(csrfCookieName)) {
      const csrfToken = crypto.randomUUID();
      response.cookies.set(csrfCookieName, csrfToken, {
        httpOnly: false, // SECURITY: Must be false for double-submit cookie pattern
        secure: !isDevelopment, // Only secure in production
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }
    
    return response;
  }

  // Skip middleware for static files only
  // SECURITY: All API routes including webhooks should go through rate limiting
  const isStaticFile = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname);

  if (
    pathname.startsWith('/_next') ||
    isStaticFile // Only skip for actual static file extensions
  ) {
    return NextResponse.next();
  }

  // ============================================================================
  // CORS HANDLING FOR ALL API ROUTES (VULN-007 Security Fix)
  // ============================================================================
  if (pathname.startsWith('/api/')) {
    // Skip CORS for certain endpoints (webhooks, health checks)
    const skipCors = shouldSkipCors(pathname);

    // Handle CORS preflight (OPTIONS) requests
    // SECURITY: This must happen BEFORE rate limiting to avoid counting preflight requests
    if (request.method === 'OPTIONS' && !skipCors) {
      return handlePreflightRequest(request);
    }

    try {
      // Skip middleware rate limiting for endpoints with their own rate limiters
      // These endpoints implement more permissive, endpoint-specific rate limiting
      const skipMiddlewareRateLimit = pathname === '/api/auth/session-status' ||
                                       pathname === '/api/auth/extend-session';

      // Perform rate limit check (unless explicitly skipped)
      const rateLimitResult = skipMiddlewareRateLimit
        ? { allowed: true, limit: 0, remaining: 0, resetTime: Date.now() + 60000, tier: 'anonymous' } as RateLimitResult
        : await checkRateLimit(request);

      if (!rateLimitResult.allowed) {
        logger.warn('API rate limit exceeded', {
          service: 'middleware',
          pathname,
          tier: rateLimitResult.tier,
          remaining: rateLimitResult.remaining,
        });

        // Return 429 Too Many Requests
        return new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...createRateLimitHeaders(rateLimitResult),
            },
          }
        );
      }

      // Add rate limit headers to successful responses for API routes
      const requestHeaders = new Headers(request.headers);
      Object.entries(createRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        requestHeaders.set(key, value);
      });

      // Special handling for webhook endpoints (skip auth but apply rate limiting)
      if (pathname.startsWith('/api/webhooks')) {
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        // Add CORS headers to webhook responses (if not skipped)
        return skipCors ? response : addCorsHeaders(response, request);
      }

      // For other API routes, continue with normal processing
      // CORS headers will be added by the API route handler or error handler
      // We set a marker header to indicate CORS has been processed
      requestHeaders.set('x-cors-processed', 'true');

      // Continue with normal API processing (auth will be checked below for non-public routes)
    } catch (error) {
      logger.error('Rate limiting failed in middleware', error, {
        service: 'middleware',
        pathname,
      });

      // In production, fail closed for security
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Service Unavailable', { status: 503 });
      }
    }
  }

  try {
    // Get JWT token from cookies
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const authCookieName = isDevelopment ? 'mintenance-auth' : '__Host-mintenance-auth';
    const token = request.cookies.get(authCookieName)?.value;

    // Also check for Supabase auth token (for E2E tests and Supabase-only auth)
    const supabaseAuthCookie = request.cookies.get('sb-ukrjudtlvapiajkjbcrd-auth-token')?.value;

    if (!token && !supabaseAuthCookie) {
      // No token found, redirect to login
      return redirectToLogin(request);
    }

    // If only Supabase token exists, validate it using @supabase/ssr
    if (!token && supabaseAuthCookie) {
      try {
        // Use @supabase/ssr createServerClient for proper token validation
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
            set(name: string, value: string, options: any) {
              // Not needed in middleware - cookies handled by response
            },
            remove(name: string, options: any) {
              // Not needed in middleware - cookies handled by response
            },
          },
        });

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          return redirectToLogin(request);
        }

        // SECURITY: Validate CSRF for state-changing requests (same check as JWT path)
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
          const csrfCookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';
          const headerToken = request.headers.get('x-csrf-token');
          const cookieToken = request.cookies.get(csrfCookieName)?.value;

          if (!headerToken || !cookieToken || headerToken !== cookieToken) {
            logger.warn('CSRF token validation failed (Supabase auth path)', {
              service: 'middleware',
              method: request.method,
              pathname,
              hasHeaderToken: !!headerToken,
              hasCookieToken: !!cookieToken,
            });
            return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
          }
        }

        // Add user info to request headers from Supabase session
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', user.id);
        requestHeaders.set('x-user-email', user.email || '');
        requestHeaders.set('x-user-role', user.user_metadata?.role || 'homeowner');
        requestHeaders.set('x-pathname', pathname);

        const response = NextResponse.next({ request: { headers: requestHeaders } });
        return response;
      } catch (parseError) {
        logger.error('Failed to validate Supabase auth token', parseError, {
          service: 'middleware',
          pathname,
        });
        return redirectToLogin(request);
      }
    }

    // Verify the JWT token using shared auth package
    // At this point, token must be defined (undefined case handled above)
    if (!token) {
      return redirectToLogin(request);
    }
    let jwtPayload;
    try {
      const jwtSecret = cfg.getRequired('JWT_SECRET');
      jwtPayload = await verifyJWT(token, jwtSecret);
    } catch (configError) {
      logger.error('JWT verification failed due to configuration error', configError, {
        service: 'middleware',
        pathname,
      });
      return redirectToLogin(request);
    }

    if (!jwtPayload) {
      return redirectToLogin(request);
    }

    // SECURITY: Check if token is blacklisted (e.g., after logout)
    try {
      const isBlacklisted = await tokenBlacklist.isTokenBlacklisted(token);
      if (isBlacklisted) {
        logger.warn('Blacklisted token attempt blocked', {
          service: 'middleware',
          pathname,
          userId: jwtPayload.sub,
        });
        return redirectToLogin(request);
      }
    } catch (blacklistError) {
      // SECURITY: Fail closed for payment platform - if blacklist check fails, reject token
      // This prevents compromised tokens from being used if Redis is unavailable
      logger.error('CRITICAL: Token blacklist check failed - rejecting request for security', {
        service: 'middleware',
        pathname,
        error: blacklistError,
        securityRisk: 'Cannot verify token is not blacklisted - failing closed',
      });
      return redirectToLogin(request);
    }

    // Check if token is expired (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (jwtPayload.exp && jwtPayload.exp < now) {
      // Token expired, redirect to login
      return redirectToLogin(request);
    }

    // VULN-009: Check session timeouts (Phase 3: hard enforcement mode)
    // Validates absolute session timeout (12 hours) and idle timeout (30 minutes)
    // - Soft enforcement (default): Violations logged but requests proceed
    // - Hard enforcement (ENFORCE_SESSION_TIMEOUTS=true): Force logout on violation
    if (jwtPayload.sessionStart && jwtPayload.lastActivity) {
      const sessionValidation = SessionValidator.validateSession({
        sessionStart: jwtPayload.sessionStart,
        lastActivity: jwtPayload.lastActivity,
      });

      if (!sessionValidation.isValid) {
        // Determine enforcement mode from environment variable
        const enforceTimeouts = process.env.ENFORCE_SESSION_TIMEOUTS === 'true';

        // Log violation (both soft and hard enforcement)
        securityMonitor.logSuspiciousActivity(
          request,
          `Session timeout violation: ${sessionValidation.reason}`,
          jwtPayload.sub,
          {
            violations: sessionValidation.violations,
            sessionAgeMs: sessionValidation.metadata.sessionAgeMs,
            idleTimeMs: sessionValidation.metadata.idleTimeMs,
            hardEnforcement: enforceTimeouts,  // Phase 3: track enforcement mode
            timeoutMessage: SessionValidator.getTimeoutMessage(sessionValidation),
          }
        ).catch((err) => {
          // Catch logging errors to prevent middleware failures
          logger.error('Failed to log session timeout violation', err, {
            service: 'middleware',
            userId: jwtPayload.sub,
          });
        });

        // Hard enforcement: force logout on timeout violation
        if (enforceTimeouts) {
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
            // Continue with logout anyway (user experience > blacklist failure)
          }

          // Differentiate response based on request type
          if (pathname.startsWith('/api/')) {
            // API request: Return JSON 401 with timeout details
            return NextResponse.json(
              {
                error: 'Session Timeout',
                code: 'SESSION_TIMEOUT',
                message: SessionValidator.getTimeoutMessage(sessionValidation),
                violations: sessionValidation.violations,
                sessionAgeHours: Math.floor((sessionValidation.metadata.sessionAgeMs || 0) / (60 * 60 * 1000)),
                idleMinutes: Math.floor((sessionValidation.metadata.idleTimeMs || 0) / (60 * 1000)),
              },
              { status: 401 }
            );
          } else {
            // Page request: Redirect to login (preserves admin routes)
            return redirectToLogin(request);
          }
        }
        // Soft enforcement (default): Continue with request
      }
    }

    // Validate CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const csrfCookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';
      
      const headerToken = request.headers.get('x-csrf-token');
      const cookieToken = request.cookies.get(csrfCookieName)?.value;

      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        logger.warn('CSRF token validation failed', {
          service: 'middleware',
          method: request.method,
          pathname: pathname,
          hasHeaderToken: !!headerToken,
          hasCookieToken: !!cookieToken,
          tokensMatch: headerToken === cookieToken
        });
        return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
      }
    }

    // Token is valid, add user info to the request headers so server components can read it
    const requestHeaders = new Headers(request.headers);
    if (jwtPayload.sub) {
      requestHeaders.set('x-user-id', jwtPayload.sub);
    }
    if (jwtPayload.email) {
      requestHeaders.set('x-user-email', jwtPayload.email);
    }
    if (jwtPayload.role) {
      requestHeaders.set('x-user-role', jwtPayload.role);
    }

    // Add request ID for tracing
    const requestId = crypto.randomUUID();
    requestHeaders.set('x-request-id', requestId);

    // Add pathname for consistent server-side rendering
    requestHeaders.set('x-pathname', pathname);

    // Generate CSP nonce for script security
    const nonce = crypto.randomUUID().replace(/-/g, '');
    requestHeaders.set('x-csp-nonce', nonce);

    // 2025 UI Feature Flag Logic
    const is2025Enabled = is2025FeatureEnabled(request);
    requestHeaders.set('x-ui-version', is2025Enabled ? '2025' : 'current');

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    
    // Set CSP header with nonce — localhost only allowed in development
    const connectSrc = isDevelopment
      ? "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com http://localhost:* http://127.0.0.1:* ws: wss:"
      : "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com wss:";
    const cspHeader = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://maps.googleapis.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      connectSrc,
      "frame-src https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', cspHeader);

    // API versioning header for all /api/ routes
    if (pathname.startsWith('/api/')) {
      response.headers.set('X-API-Version', process.env.API_VERSION || '2026-02-09');
      response.headers.set('X-API-Deprecation', 'false');
    }

    return response;

  } catch (error) {
    logger.error('JWT verification failed', error, {
      service: 'middleware',
      pathname: request.nextUrl.pathname,
    });
    // Invalid token, redirect to login
    return redirectToLogin(request);
  }
}

/**
 * 2025 UI Feature Flag Logic
 * Controls gradual rollout of the redesigned UI
 */
function is2025FeatureEnabled(request: NextRequest): boolean {
  // 1. Kill switch - emergency disable (highest priority)
  if (process.env.DISABLE_2025_PAGES === 'true') {
    return false;
  }

  // 2. Global feature flag - enable for all users
  if (process.env.NEXT_PUBLIC_ENABLE_2025_DASHBOARD === 'true') {
    return true;
  }

  // 3. User preference cookie - user manually switched
  const userPreference = request.cookies.get('dashboard-version')?.value;
  if (userPreference === '2025') {
    return true;
  }
  if (userPreference === 'current') {
    return false;
  }

  // 4. Beta features flag - opt-in beta testers
  if (request.cookies.get('beta-features')?.value === 'true') {
    return true;
  }

  // 5. Gradual rollout based on percentage (consistent hashing)
  const rolloutPercentage = getRolloutPercentage();
  if (rolloutPercentage > 0) {
    const userIdentifier = request.cookies.get('session-id')?.value || request.headers.get('x-forwarded-for') || 'anonymous';
    const hash = simpleHash(userIdentifier);
    const userPercentile = hash % 100;

    if (userPercentile < rolloutPercentage) {
      return true;
    }
  }

  return false;
}

/**
 * Get rollout percentage from environment variable
 * @returns number between 0-100
 */
function getRolloutPercentage(): number {
  const percentage = process.env.NEXT_PUBLIC_ROLLOUT_PERCENTAGE;
  if (!percentage) return 0;

  const parsed = parseInt(percentage, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 100) {
    logger.warn('Invalid NEXT_PUBLIC_ROLLOUT_PERCENTAGE value', {
      service: 'middleware',
      value: percentage,
    });
    return 0;
  }

  return parsed;
}

/**
 * Simple hash function for consistent user bucketing
 * Uses basic string hashing for deterministic results
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Helper function to redirect to login page
 * Checks if route is admin route and redirects to appropriate login page
 */
function redirectToLogin(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const loginPath = isAdminRoute ? '/admin/login' : '/login';
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set('redirect', pathname);

  return NextResponse.redirect(loginUrl);
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * 
     * NOTE: API routes are NOT excluded - middleware handles rate limiting and CORS for /api/*
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
