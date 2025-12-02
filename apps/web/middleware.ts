import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, ConfigManager } from '@mintenance/auth';
import { logger } from '@mintenance/shared';

// CRITICAL FIX: Fail-fast initialization to prevent silent failures
// If ConfigManager fails to initialize, the entire middleware should fail immediately
// This prevents undefined behavior and ensures security controls are properly enforced
let configManager: ConfigManager;

try {
  configManager = ConfigManager.getInstance();
  // Verify configuration is accessible by testing JWT_SECRET availability
  const jwtSecret = configManager.get('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not available in configuration');
  }
} catch (error) {
  logger.error('CRITICAL: Middleware configuration initialization failed - authentication will be unavailable', error, { service: 'middleware' });
  // Throw error to fail fast and prevent server from starting with broken auth
  throw new Error('Middleware configuration failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
}

import type { JWTPayload } from '@mintenance/types';

/**
 * Middleware to check for valid JWT in cookies and redirect unauthenticated users
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If configuration failed to load, fail closed for security
  if (!configManager) {
    logger.error('Middleware: Configuration unavailable - rejecting request', undefined, {
      service: 'middleware',
      pathname,
    });
    return new NextResponse('Service Unavailable', { status: 503 });
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/about', '/contact', '/privacy', '/terms', '/help', '/logout'];
  // Admin auth routes (login, register, forgot-password) are also public
  const adminAuthRoutes = ['/admin/login', '/admin/register', '/admin/forgot-password'];
  // Public contractor profile pages (e.g., /contractor/[id] for viewing contractor profiles)
  // All other contractor routes require authentication
  const isPublicContractorProfile = /^\/contractor\/[^\/]+$/.test(pathname);
  // Public contractor listing and detail pages (homeowner-facing)
  const isPublicContractorsPage = /^\/contractors(\/|$)/.test(pathname);
  const isPublicRoute = pathname === '/' || 
    publicRoutes.some(route => pathname.startsWith(route)) || 
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
    const isDevelopment = process.env.NODE_ENV === 'development';
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

  // Skip middleware for static files and webhook endpoints only
  // SECURITY: All other API routes should have authentication and CSRF validation
  const isStaticFile = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname);

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') || // Webhooks have their own signature validation
    isStaticFile // Only skip for actual static file extensions
  ) {
    return NextResponse.next();
  }

  try {
    // Get JWT token from cookies
    const isDevelopment = process.env.NODE_ENV === 'development';
    const authCookieName = isDevelopment ? 'mintenance-auth' : '__Host-mintenance-auth';
    const token = request.cookies.get(authCookieName)?.value;

    if (!token) {
      // No token found, redirect to login
      return redirectToLogin(request);
    }

    // Verify the JWT token using shared auth package
    let jwtPayload;
    try {
      const jwtSecret = configManager.getRequired('JWT_SECRET');
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

    // Check if token is expired (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (jwtPayload.exp && jwtPayload.exp < now) {
      // Token expired, redirect to login
      return redirectToLogin(request);
    }

    // Validate CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const isDevelopment = process.env.NODE_ENV === 'development';
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
    
    // Set CSP header with nonce
    const cspHeader = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://maps.googleapis.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com",
      "frame-src https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', cspHeader);
    
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
