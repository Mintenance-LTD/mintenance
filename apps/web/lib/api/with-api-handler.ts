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
  /**
   * Audit 2026-05-24 HIGH: opt-in fail-closed when the rate limiter has
   * fallen back to in-memory in production (Redis env vars missing or
   * Redis outage). Routes tagged with a criticality class will return
   * 429 instead of accepting per-instance-only enforcement, which would
   * let an attacker spray across Vercel regions.
   *
   * Flip this on for:
   *   - 'auth'    — login, register, password-reset, verify-phone,
   *                 check-password-breach, mfa step-up.
   *   - 'payment' — create-intent, confirm-intent, refund, release-escrow,
   *                 stripe-connect onboarding, webhooks (after sig check).
   *   - 'admin'   — every mutating admin route (the wrapper already
   *                 requires MFA + DB role check; the rate limit is the
   *                 outermost layer).
   *
   * Untagged routes keep the historical degraded-in-memory behaviour so
   * this is non-breaking. See lib/rate-limiter.ts:fallbackRateLimit.
   */
  criticality?: 'auth' | 'payment' | 'admin';
}

/**
 * Categories accepted by `admin_activity_log.action_category`. Kept here
 * (rather than imported from `AdminActivityLogger`) so the wrapper does
 * not need a runtime import for a value-type that's purely structural.
 */
type AdminActionCategory =
  | 'user_management'
  | 'verification'
  | 'security'
  | 'settings'
  | 'revenue'
  | 'communication'
  | 'ip_blocking';

/**
 * Audit P1/P2 (2026-05-10): declarative `admin_activity_log` write.
 *
 * When set on an admin route's config, the wrapper writes a row to
 * `admin_activity_log` *after the handler returns successfully* (HTTP
 * status < 400). On thrown errors or 4xx/5xx responses, no log row is
 * written — the audit trail tracks what actually happened, not what
 * was attempted.
 *
 * Rationale: only ~31% of mutating admin routes called
 * `AdminActivityLogger.logFromRequest` manually, so the
 * `/api/admin/audit-logs` UI saw a partial picture. Routing through
 * the wrapper enforces audit coverage by construction.
 */
interface LogActivityConfig {
  actionType: string;
  category: AdminActionCategory;
  /**
   * Free-text description. Either a literal string (for routes whose
   * action is fully determined at config time) or a function that
   * receives route params + the authenticated user so the description
   * can include dynamic context like target IDs.
   */
  description?:
    | string
    | ((ctx: {
        params: Record<string, string>;
        user: { id: string; email?: string };
      }) => string);
  /** Stable label for the kind of resource the action targets. */
  targetType?: string;
  /**
   * Optional resolver for the target id. Defaults to `params.id` if
   * the route has one; pass an explicit function when the relevant
   * id lives in a different param (e.g. `params.userId`).
   */
  targetId?: (params: Record<string, string>) => string | undefined;
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
  /**
   * Declarative admin-activity logging. See `LogActivityConfig`. Only
   * writes a row when the caller's role is 'admin' and the handler
   * returned a 2xx/3xx response — failed requests are not logged.
   */
  logActivity?: LogActivityConfig;
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
    logActivity,
  } = config;

  return async (
    request: NextRequest,
    segmentData: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    // Hoisted so the catch can include them on the error log. Without
    // this, "API Error … Property not found" lines have no method /
    // pathname / userId / params and are impossible to diagnose.
    let resolvedUserId: string | null = null;
    let resolvedParams: Record<string, string> = {};
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
          // Propagate the criticality class so the limiter can fail-closed
          // in production when Redis is degraded. See RateLimitConfig
          // comment above for which routes should set this.
          criticality: rateLimitCfg?.criticality,
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
      resolvedParams = params;

      // 5. Authentication (cookie-first, then Bearer token fallback for mobile)
      if (auth) {
        let user = await getCurrentUserFromCookies();

        if (!user && hasBearerToken) {
          user = await getCurrentUserFromBearerToken(request);
        }

        if (!user) {
          throw new UnauthorizedError('Authentication required');
        }
        resolvedUserId = user.id;

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

        const response = await (handler as AuthenticatedHandler)(request, {
          user,
          params,
        });

        // 9. Audit log on success. Fire-and-forget: AdminActivityLogger
        //    swallows its own errors so a transient log-table failure
        //    never converts a successful 2xx into a 5xx for the caller.
        //    Restricted to admin callers — non-admins reaching an admin
        //    route are already blocked by the role check above, but the
        //    explicit guard here keeps the contract clear if a route
        //    later opts in to a multi-role audience.
        if (logActivity && user.role === 'admin' && response.status < 400) {
          // Lazy-import keeps the auth/cookie path off the
          // AdminActivityLogger module's initialisation so the cold
          // path of every public route doesn't load the admin logger.
          void import('@/lib/services/admin/AdminActivityLogger').then(
            ({ AdminActivityLogger }) => {
              const description =
                typeof logActivity.description === 'function'
                  ? logActivity.description({
                      params,
                      user: { id: user.id, email: user.email },
                    })
                  : (logActivity.description ?? logActivity.actionType);

              const targetId = logActivity.targetId
                ? logActivity.targetId(params)
                : (params.id ?? undefined);

              return AdminActivityLogger.logFromRequest(
                request,
                user.id,
                logActivity.actionType,
                logActivity.category,
                description,
                logActivity.targetType,
                targetId
              );
            }
          );
        }

        return response;
      }

      // Public handler (no auth)
      return await (handler as PublicHandler)(request, { params });
    } catch (error) {
      // Pass request + context so the error log includes method,
      // pathname, userId, and route params. Without this the
      // "API Error" warn line is unactionable — multiple routes
      // throw the same NotFoundError('Property not found') message
      // and there's no way to tell which fired.
      let pathname: string | undefined;
      try {
        pathname = new URL(request.url).pathname;
      } catch {
        // Bad URL — leave undefined
      }
      return handleAPIError(
        error,
        undefined,
        {
          method: request.method,
          pathname,
          userId: resolvedUserId,
          params: resolvedParams,
        },
        request
      );
    }
  };
}
