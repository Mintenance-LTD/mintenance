import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, ConfigManager } from '@mintenance/auth';
import { logger } from '@mintenance/shared';

let configManager: ConfigManager;

try {
  configManager = ConfigManager.getInstance();
} catch (error) {
  console.error('❌ Middleware Configuration Error:', error);
  // configManager will be undefined if this fails
}

import type { JWTPayload } from '@mintenance/types';

/**
 * Middleware to check for valid JWT in cookies and redirect unauthenticated users
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If configuration failed to load, fail closed for security
  if (!configManager) {
    console.error('❌ Middleware: Configuration unavailable - rejecting request');
    return new NextResponse('Service Unavailable', { status: 503 });
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/about', '/contact', '/privacy', '/terms'];
  const isPublicRoute = pathname === '/' || publicRoutes.some(route => pathname.startsWith(route));

  // Skip middleware for public routes
  if (isPublicRoute) {
    const response = NextResponse.next();
    
    // Generate CSRF token on first visit if not present
    if (!request.cookies.get('__Host-csrf-token')) {
      const csrfToken = crypto.randomUUID();
      response.cookies.set('__Host-csrf-token', csrfToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }
    
    return response;
  }

  // Skip middleware for static files and API routes (except auth endpoints)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  try {
    // Get JWT token from cookies
    const token = request.cookies.get('__Host-mintenance-auth')?.value;

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
      console.error('❌ Middleware: JWT verification failed due to configuration error:', configError);
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
      const headerToken = request.headers.get('x-csrf-token');
      const cookieToken = request.cookies.get('__Host-csrf-token')?.value;

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

    // Generate CSP nonce for script security
    const nonce = crypto.randomUUID().replace(/-/g, '');
    requestHeaders.set('x-csp-nonce', nonce);

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
    console.error('JWT verification failed:', error);
    // Invalid token, redirect to login
    return redirectToLogin(request);
  }
}

/**
 * Helper function to redirect to login page
 */
function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  
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
