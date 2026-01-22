import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, ConfigManager } from '@mintenance/auth';
import { logger } from '@mintenance/shared';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter-enhanced';
import { applySecurityHeaders, getRouteSecurityConfig } from './middleware/security-headers';
import { verifyOrigin } from './lib/csrf-protection';
/**
 * Enhanced security middleware with comprehensive protections
 * This can replace or augment the existing middleware.ts
 */
// Initialize configuration
let configManager: ConfigManager;
try {
  configManager = ConfigManager.getInstance();
  const jwtSecret = configManager.get('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not available');
  }
} catch (error) {
  logger.error('CRITICAL: Security middleware configuration failed', error);
  throw new Error('Security middleware initialization failed');
}
// Define route configurations
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/help',
  '/pricing',
  '/how-it-works',
];
const ADMIN_AUTH_ROUTES = [
  '/admin/login',
  '/admin/register',
  '/admin/forgot-password',
];
const API_PUBLIC_ROUTES = [
  '/api/health',
  '/api/public',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
];
const WEBHOOK_ROUTES = [
  '/api/webhooks/stripe',
  '/api/webhooks/github',
];
/**
 * Enhanced security middleware with multiple layers of protection
 */
export async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = request.method;
  try {
    // 1. Apply rate limiting
    const clientIdentifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientIdentifier, pathname);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', {
        clientId: clientIdentifier,
        path: pathname,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
      });
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      });
    }
    // 2. Check if route requires authentication
    const isPublicRoute = isPublic(pathname);
    const isApiRoute = pathname.startsWith('/api/');
    let response = NextResponse.next();
    // 3. Apply security headers
    const securityConfig = getRouteSecurityConfig(pathname);
    response = applySecurityHeaders(response, securityConfig);
    // 4. Add rate limit headers
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    for (const [key, value] of Object.entries(rateLimitHeaders)) {
      response.headers.set(key, value);
    }
    // 5. Handle authentication if required
    if (!isPublicRoute) {
      const authResult = await handleAuthentication(request);
      if (!authResult.authenticated) {
        if (isApiRoute) {
          return NextResponse.json(
            { error: authResult.error || 'Authentication required' },
            { status: 401 }
          );
        }
        // Redirect to login for web pages
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
      // Add user context to headers
      if (authResult.userId) {
        response.headers.set('X-User-Id', authResult.userId);
        response.headers.set('X-User-Role', authResult.userRole || 'user');
      }
    }
    // 6. CSRF protection for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const skipCSRF = WEBHOOK_ROUTES.some(route => pathname.startsWith(route));
      if (!skipCSRF && isApiRoute) {
        // Verify origin
        if (!verifyOrigin(request)) {
          logger.warn('Invalid origin for request', {
            path: pathname,
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer'),
          });
          return NextResponse.json(
            { error: 'Invalid origin' },
            { status: 403 }
          );
        }
        // Check CSRF token
        const csrfToken = request.headers.get('X-CSRF-Token');
        const cookieToken = request.cookies.get('csrf-token')?.value;
        if (!csrfToken || csrfToken !== cookieToken) {
          logger.warn('CSRF validation failed', {
            path: pathname,
            method,
            hasHeader: !!csrfToken,
            hasCookie: !!cookieToken,
          });
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403 }
          );
        }
      }
    }
    // 7. Add request tracking
    const requestId = crypto.randomUUID();
    response.headers.set('X-Request-Id', requestId);
    // 8. Log security audit trail
    if (process.env.NODE_ENV === 'production') {
      logger.info('Security audit', {
        requestId,
        method,
        path: pathname,
        clientId: clientIdentifier,
        authenticated: !isPublicRoute,
        userAgent: request.headers.get('user-agent'),
      });
    }
    return response;
  } catch (error) {
    logger.error('Security middleware error', {
      error,
      path: pathname,
      method,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
/**
 * Get client identifier for rate limiting and logging
 */
function getClientIdentifier(request: NextRequest): string {
  // Try authenticated user first
  const authToken = request.cookies.get('auth-token')?.value;
  if (authToken) {
    try {
      const decoded = verifyJWT(authToken, configManager.get('JWT_SECRET'));
      if (decoded && decoded.sub) {
        return `user:${decoded.sub}`;
      }
    } catch {
      // Invalid token, fall through to IP
    }
  }
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
  return `ip:${ip}`;
}
/**
 * Check if path is public
 */
function isPublic(pathname: string): boolean {
  // Check static public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }
  // Check admin auth routes
  if (ADMIN_AUTH_ROUTES.includes(pathname)) {
    return true;
  }
  // Check API public routes
  if (API_PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return true;
  }
  // Check public contractor profiles
  if (/^\/contractor\/[^\/]+$/.test(pathname)) {
    return true;
  }
  // Check public contractor listings
  if (/^\/contractors(\/|$)/.test(pathname)) {
    return true;
  }
  // Check static assets
  if (/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|otf)$/i.test(pathname)) {
    return true;
  }
  return false;
}
/**
 * Handle authentication verification
 */
async function handleAuthentication(request: NextRequest): Promise<{
  authenticated: boolean;
  userId?: string;
  userRole?: string;
  error?: string;
}> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return { authenticated: false, error: 'No authentication token' };
  }
  try {
    // Check token blacklist
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      return { authenticated: false, error: 'Token has been revoked' };
    }
    // Verify JWT
    const decoded = verifyJWT(token, configManager.get('JWT_SECRET'));
    if (!decoded) {
      return { authenticated: false, error: 'Invalid token' };
    }
    // Check token expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return { authenticated: false, error: 'Token expired' };
    }
    return {
      authenticated: true,
      userId: decoded.sub,
      userRole: decoded.role,
    };
  } catch (error) {
    logger.error('Authentication verification failed', { error });
    return { authenticated: false, error: 'Authentication verification failed' };
  }
}
/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
};