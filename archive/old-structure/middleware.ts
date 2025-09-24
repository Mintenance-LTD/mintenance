import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJWTSecret } from './lib/config';

// Get secure JWT secret from configuration
const JWT_SECRET = new TextEncoder().encode(getJWTSecret());

// Define the JWT payload interface
interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to check for valid JWT in cookies and redirect unauthenticated users
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

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

    // Verify the JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Type assertion for payload
    const jwtPayload = payload as JWTPayload;

    // Check if token is expired (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (jwtPayload.exp && jwtPayload.exp < now) {
      // Token expired, redirect to login
      return redirectToLogin(request);
    }

    // Token is valid, add user info to headers for use in pages
    const response = NextResponse.next();
    response.headers.set('x-user-id', jwtPayload.sub);
    response.headers.set('x-user-email', jwtPayload.email);
    response.headers.set('x-user-role', jwtPayload.role);

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
