import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, ConfigManager } from '@mintenance/auth';

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

  // If configuration failed to load, skip authentication for development
  if (!configManager) {
    console.warn('⚠️ Middleware: Configuration not available, skipping authentication for development');
    return NextResponse.next();
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/about', '/contact', '/privacy', '/terms'];
  const isPublicRoute = pathname === '/' || publicRoutes.some(route => pathname.startsWith(route));

  // Skip middleware for public routes
  if (isPublicRoute) {
    return NextResponse.next();
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
    const token = request.cookies.get('auth-token')?.value;

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

    return NextResponse.next({ request: { headers: requestHeaders } });

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
