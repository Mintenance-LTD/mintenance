/**
 * API Route Handler Middleware
 *
 * Eliminates boilerplate (rate limiting, CSRF, auth, error handling)
 * from every route handler. Provides a declarative config-based approach.
 *
 * Usage:
 *   export const GET = withApiHandler({ csrf: false }, async (req, { user }) => {
 *     return NextResponse.json({ data });
 *   });
 *
 *   export const POST = withApiHandler(
 *     { roles: ['contractor'] },
 *     async (req, { user }) => { ... }
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@mintenance/types';
import { getCurrentUserFromCookies, getCurrentUserFromBearerToken } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';
import {
  handleAPIError,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/errors/api-error';

// ── Config ──────────────────────────────────────────────────────────

interface RateLimitConfig {
  maxRequests?: number; // default 30
  windowMs?: number;    // default 60_000
}

interface HandlerConfig {
  /** Rate limit config, or false to disable. Defaults to 30 req/min. */
  rateLimit?: RateLimitConfig | false;
  /** Require authentication. Defaults to true. */
  auth?: boolean;
  /** Validate CSRF token. Defaults to true for POST/PUT/PATCH/DELETE. */
  csrf?: boolean;
  /** Restrict to specific roles. Only checked when auth is true. */
  roles?: Array<'homeowner' | 'contractor' | 'admin'>;
}

// ── Handler types ───────────────────────────────────────────────────

type AuthUser = Pick<User, 'id' | 'email' | 'role' | 'first_name' | 'last_name'>;

interface AuthenticatedContext {
  user: AuthUser;
  params: Record<string, string>;
}

interface PublicContext {
  user?: undefined;
  params: Record<string, string>;
}

type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthenticatedContext,
) => Promise<NextResponse>;

type PublicHandler = (
  request: NextRequest,
  context: PublicContext,
) => Promise<NextResponse>;

// Next.js App Router handler signature (segmentData must not be optional to satisfy Next.js route type checking)
type NextRouteHandler = (
  request: NextRequest,
  segmentData: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

// ── Overloads ───────────────────────────────────────────────────────

export function withApiHandler(
  config: HandlerConfig & { auth: false },
  handler: PublicHandler,
): NextRouteHandler;

export function withApiHandler(
  config: HandlerConfig,
  handler: AuthenticatedHandler,
): NextRouteHandler;

// ── Implementation ──────────────────────────────────────────────────

export function withApiHandler(
  config: HandlerConfig,
  handler: AuthenticatedHandler | PublicHandler,
): NextRouteHandler {
  const {
    rateLimit: rateLimitCfg,
    auth = true,
    csrf,
    roles,
  } = config;

  return async (
    request: NextRequest,
    segmentData: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      // 1. Rate limiting
      if (rateLimitCfg !== false) {
        const maxRequests = rateLimitCfg?.maxRequests ?? 30;
        const windowMs = rateLimitCfg?.windowMs ?? 60_000;
        const ip =
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          'anonymous';

        const result = await rateLimiter.checkRateLimit({
          identifier: `${ip}:${request.url}`,
          windowMs,
          maxRequests,
        });

        if (!result.allowed) {
          return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(result.retryAfter || 60),
                'X-RateLimit-Limit': String(maxRequests),
                'X-RateLimit-Remaining': String(result.remaining),
                'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
              },
            },
          );
        }
      }

      // 2. Detect Bearer token auth (mobile clients)
      const hasBearerToken = request.headers.get('authorization')?.startsWith('Bearer ');

      // 3. CSRF (default: on for mutating methods, skip for Bearer-authenticated requests)
      // CSRF protects against cookie-based cross-site attacks, not needed for Bearer tokens
      const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
      const shouldCheckCSRF = csrf !== undefined ? csrf : (isMutating && !hasBearerToken);
      if (shouldCheckCSRF) {
        await requireCSRF(request);
      }

      // 4. Resolve route params
      const params = segmentData?.params ? await segmentData.params : {};

      // 5. Authentication (cookie-first, then Bearer token fallback for mobile)
      if (auth) {
        let user = await getCurrentUserFromCookies();

        if (!user && hasBearerToken) {
          user = await getCurrentUserFromBearerToken(request);
        }

        if (!user) {
          throw new UnauthorizedError('Authentication required');
        }

        // 6. Role check
        if (roles && roles.length > 0 && !roles.includes(user.role)) {
          throw new ForbiddenError(`This action requires one of: ${roles.join(', ')}`);
        }

        return await (handler as AuthenticatedHandler)(request, { user, params });
      }

      // Public handler (no auth)
      return await (handler as PublicHandler)(request, { params });
    } catch (error) {
      return handleAPIError(error);
    }
  };
}
