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
import {
  getCurrentUserFromCookies,
  getCurrentUserFromBearerToken,
} from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';
import { verifyAdminRoleFromDatabase } from '@/lib/admin-verification';
import { hasValidStepUp } from '@/lib/auth/mfa-step-up';
import {
  handleAPIError,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/errors/api-error';

// ── Config ──────────────────────────────────────────────────────────

interface RateLimitConfig {
  maxRequests?: number; // default 30
  windowMs?: number; // default 60_000
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
  /**
   * AUDIT FIX: When true (or when roles includes only 'admin' and the request
   * is a mutating method), verify admin role from database — not just the JWT.
   * Prevents privilege escalation if JWT signing key is compromised.
   * Defaults to true for admin-only mutating endpoints.
   */
  requireDbAdmin?: boolean;
  /**
   * Sprint 7 (3.1): step-up MFA gate. When set, the route requires a fresh
   * MFA verification proof (via /api/auth/mfa/step-up) within the given
   * number of minutes. Apply to sensitive admin mutations (escrow holds,
   * settings, 1099 generation, etc.) so a long-lived session alone is not
   * enough to execute them. Missing / expired step-up returns 403 with
   * `requiresStepUp: true`; client should prompt for the code and retry.
   *
   * The gate is capped at 60 minutes regardless of the requested window
   * (see lib/auth/mfa-step-up.ts MAX_WINDOW_SECONDS).
   */
  requireMfaVerifiedWithinMinutes?: number;
}

// ── Handler types ───────────────────────────────────────────────────

type AuthUser = Pick<
  User,
  'id' | 'email' | 'role' | 'first_name' | 'last_name'
>;

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
  context: AuthenticatedContext
) => Promise<NextResponse>;

type PublicHandler = (
  request: NextRequest,
  context: PublicContext
) => Promise<NextResponse>;

// Next.js App Router handler signature (segmentData must not be optional to satisfy Next.js route type checking)
type NextRouteHandler = (
  request: NextRequest,
  segmentData: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

// ── Overloads ───────────────────────────────────────────────────────

export function withApiHandler(
  config: HandlerConfig & { auth: false },
  handler: PublicHandler
): NextRouteHandler;

export function withApiHandler(
  config: HandlerConfig,
  handler: AuthenticatedHandler
): NextRouteHandler;

// ── Implementation ──────────────────────────────────────────────────

export function withApiHandler(
  config: HandlerConfig,
  handler: AuthenticatedHandler | PublicHandler
): NextRouteHandler {
  const {
    rateLimit: rateLimitCfg,
    auth = true,
    csrf,
    roles,
    requireDbAdmin,
    requireMfaVerifiedWithinMinutes,
  } = config;

  return async (
    request: NextRequest,
    segmentData: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // 1. Rate limiting
      if (rateLimitCfg !== false) {
        const maxRequests = rateLimitCfg?.maxRequests ?? 30;
        const windowMs = rateLimitCfg?.windowMs ?? 60_000;
        // SECURITY: use trusted IP (Vercel-verified) — NEVER the first XFF
        // entry, which is client-controllable and lets attackers bypass
        // per-IP limits by sending their own X-Forwarded-For header.
        const ip = getClientIp(request);

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
            }
          );
        }
      }

      // 2. Detect Bearer token auth (mobile clients)
      const hasBearerToken = request.headers
        .get('authorization')
        ?.startsWith('Bearer ');

      // 3. CSRF (default: on for mutating methods, skip for Bearer-authenticated requests)
      // CSRF protects against cookie-based cross-site attacks, not needed for Bearer tokens
      const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
        request.method
      );
      const shouldCheckCSRF =
        csrf !== undefined ? csrf : isMutating && !hasBearerToken;
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
          throw new ForbiddenError(
            `This action requires one of: ${roles.join(', ')}`
          );
        }

        // 7. AUDIT FIX: Database-backed admin verification for mutating requests.
        // Auto-enabled when roles is admin-only and the request is a mutation,
        // unless explicitly set to false.
        const isMutatingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
          request.method
        );
        const isAdminOnlyRoute = roles?.length === 1 && roles[0] === 'admin';
        const shouldVerifyDbAdmin =
          requireDbAdmin === true ||
          (requireDbAdmin !== false && isAdminOnlyRoute && isMutatingRequest);

        if (shouldVerifyDbAdmin && user.role === 'admin') {
          const isVerifiedAdmin = await verifyAdminRoleFromDatabase(user.id);
          if (!isVerifiedAdmin) {
            throw new ForbiddenError('Admin role verification failed');
          }
        }

        // 8. Sprint 7 (3.1): per-request MFA step-up gate. Routes opt in via
        // `requireMfaVerifiedWithinMinutes`. If the caller has no valid
        // step-up cookie, return 403 with requiresStepUp:true so the client
        // can show a code prompt and retry.
        if (
          typeof requireMfaVerifiedWithinMinutes === 'number' &&
          requireMfaVerifiedWithinMinutes > 0
        ) {
          const stepUpOk = hasValidStepUp(
            request,
            user.id,
            requireMfaVerifiedWithinMinutes
          );
          if (!stepUpOk) {
            return NextResponse.json(
              {
                error: 'Step-up MFA required',
                requiresStepUp: true,
                maxAgeMinutes: requireMfaVerifiedWithinMinutes,
              },
              { status: 403 }
            );
          }
        }

        return await (handler as AuthenticatedHandler)(request, {
          user,
          params,
        });
      }

      // Public handler (no auth)
      return await (handler as PublicHandler)(request, { params });
    } catch (error) {
      return handleAPIError(error);
    }
  };
}
