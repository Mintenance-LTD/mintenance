/**
 * Authentication Middleware for Next.js
 * Handles JWT verification, token refresh, and route protection
 */
import { NextRequest, NextResponse } from 'next/server';
import { WebAuthAdapter } from '../platform/WebAuthAdapter';
import { jwtVerify } from 'jose';
export interface MiddlewareConfig {
  protectedRoutes: string[];
  publicRoutes: string[];
  roleBasedRoutes?: Record<string, string[]>; // role -> allowed routes
  redirectUrl?: string;
  enableCSRF?: boolean;
  excludeCSRF?: string[]; // Routes to exclude from CSRF
}
export class AuthMiddleware {
  private auth: WebAuthAdapter;
  private config: MiddlewareConfig;
  private jwtSecret: Uint8Array;
  constructor(auth: WebAuthAdapter, config: MiddlewareConfig) {
    this.auth = auth;
    this.config = config;
    this.jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET!);
  }
  /**
   * Main middleware handler
   */
  async handle(request: NextRequest): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;
    // Check if route is public
    if (this.isPublicRoute(pathname)) {
      return NextResponse.next();
    }
    // Get tokens from cookies
    const { accessToken, refreshToken } = await this.auth.getTokensFromCookies();
    // No tokens, redirect to login
    if (!accessToken) {
      return this.redirectToLogin(request);
    }
    // Check if token is blacklisted
    const isBlacklisted = await this.auth.isTokenBlacklisted(accessToken);
    if (isBlacklisted) {
      return this.redirectToLogin(request);
    }
    // Verify JWT token
    try {
      const { payload } = await jwtVerify(accessToken, this.jwtSecret);
      // Check CSRF token if enabled
      if (this.config.enableCSRF && !this.isCSRFExcluded(pathname)) {
        const isValidCSRF = this.auth.verifyCSRFToken(request);
        if (!isValidCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
          return new NextResponse('CSRF token validation failed', { status: 403 });
        }
      }
      // Check role-based access
      if (this.config.roleBasedRoutes) {
        const userRole = payload.role as string;
        const allowedForRoute = this.getAllowedRolesForRoute(pathname);
        if (allowedForRoute.length > 0 && !allowedForRoute.includes(userRole)) {
          return new NextResponse('Insufficient permissions', { status: 403 });
        }
      }
      // Token is valid, continue
      const response = NextResponse.next();
      // Add user info to headers for downstream use
      response.headers.set('x-user-id', payload.sub!);
      response.headers.set('x-user-role', payload.role as string);
      response.headers.set('x-user-email', payload.email as string);
      return response;
    } catch (error) {
      // Token invalid or expired
      if (refreshToken) {
        // Try to refresh
        try {
          const newTokens = await this.auth.validateAndRotateRefreshToken(refreshToken);
          if (newTokens) {
            // Set new cookies and continue
            const response = NextResponse.next();
            await this.setNewTokenCookies(response, newTokens);
            return response;
          }
        } catch {
          // Refresh failed
        }
      }
      return this.redirectToLogin(request);
    }
  }
  /**
   * Check if route is public
   */
  private isPublicRoute(pathname: string): boolean {
    return this.config.publicRoutes.some(route => {
      if (route.endsWith('*')) {
        return pathname.startsWith(route.slice(0, -1));
      }
      return pathname === route;
    });
  }
  /**
   * Check if route is excluded from CSRF
   */
  private isCSRFExcluded(pathname: string): boolean {
    if (!this.config.excludeCSRF) return false;
    return this.config.excludeCSRF.some(route => {
      if (route.endsWith('*')) {
        return pathname.startsWith(route.slice(0, -1));
      }
      return pathname === route;
    });
  }
  /**
   * Get allowed roles for a route
   */
  private getAllowedRolesForRoute(pathname: string): string[] {
    if (!this.config.roleBasedRoutes) return [];
    const allowedRoles: string[] = [];
    Object.entries(this.config.roleBasedRoutes).forEach(([role, routes]) => {
      const hasAccess = routes.some(route => {
        if (route.endsWith('*')) {
          return pathname.startsWith(route.slice(0, -1));
        }
        return pathname === route;
      });
      if (hasAccess) {
        allowedRoles.push(role);
      }
    });
    return allowedRoles;
  }
  /**
   * Redirect to login page
   */
  private redirectToLogin(request: NextRequest): NextResponse {
    const redirectUrl = this.config.redirectUrl || '/login';
    const url = new URL(redirectUrl, request.url);
    url.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  /**
   * Set new token cookies on response
   */
  private async setNewTokenCookies(response: NextResponse, tokens: any): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    // Access token
    const accessCookieName = isProduction ? '__Host-access-token' : 'access-token';
    response.cookies.set(accessCookieName, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
    });
    // Refresh token
    const refreshCookieName = isProduction ? '__Host-refresh-token' : 'refresh-token';
    response.cookies.set(refreshCookieName, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }
}
/**
 * Create middleware instance
 */
export function createAuthMiddleware(config: MiddlewareConfig): (req: NextRequest) => Promise<NextResponse> {
  const auth = new WebAuthAdapter({
    platform: 'web',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    jwtSecret: process.env.JWT_SECRET!,
    redisUrl: process.env.UPSTASH_REDIS_REST_URL,
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  const middleware = new AuthMiddleware(auth, config);
  return (req) => middleware.handle(req);
}