/**
 * Rate-limit tier presets for `withApiHandler`.
 *
 * Audit P2 (2026-05-10): admin route rate limits had drifted into ad-hoc
 * values (2, 3, 5, 10, 20, 30, 60 across 67 routes) with no consistent
 * mapping from risk to limit. New code should pick one of the tiers
 * below; existing routes can migrate incrementally.
 *
 * Audit 2026-05-24: extended with AUTH, READ_HEAVY, and WEBHOOK tiers to
 * cover the three patterns previously hardcoded across non-admin routes
 * (login/register/password-reset, paginated feeds, payment webhooks).
 *
 * The shape mirrors `RateLimitConfig` in `with-api-handler.ts` so the
 * presets drop straight into the handler config:
 *
 *   import { RATE_LIMIT_TIERS } from '@/lib/api/rate-limit-tiers';
 *
 *   export const POST = withApiHandler(
 *     { roles: ['admin'], rateLimit: RATE_LIMIT_TIERS.STRICT },
 *     async (req, { user }) => { ... }
 *   );
 *
 * Tier guidance:
 *   STRICT (5/min)
 *     — Privilege-escalation primitives (create-admin, rotate-totp-secrets).
 *     — Costly mutations (RAG embedding generation, synthetic data, tax
 *       form generation, mass announcements, migration apply).
 *     — Reasonable cap: a real admin uses these tens of times per month.
 *
 *   STANDARD (20/min)
 *     — Most reads + non-bulk mutations (dashboards, list views, single-
 *       record verify/approve, settings update, escrow approve/reject).
 *     — A real admin paginating + clicking through detail views won't
 *       hit this; an attacker scripting will.
 *
 *   FREQUENT (60/min)
 *     — UI surfaces that poll or auto-refresh (security dashboard,
 *       review-moderation queue, retention dashboards, monitoring
 *       feeds). Polling at 1Hz still fits inside the budget.
 *
 *   ENROLLMENT (3/hour)
 *     — Legitimate one-shot security flows (MFA enroll). Used outside
 *       admin too; included here for shared semantics.
 *
 *   AUTH (10/min)
 *     — Credential primitives: login, register, password reset request,
 *       resend verification, check-password-breach. Tight enough to slow
 *       credential-stuffing while still letting a real user fat-finger
 *       a password 2-3 times. Pairs with the per-account lockout in
 *       BUSINESS_RULES.MAX_LOGIN_ATTEMPTS.
 *
 *   READ_HEAVY (120/min)
 *     — Paginated list / infinite-scroll feeds that a single SPA session
 *       legitimately hits in bursts (messages, notifications, jobs feed
 *       on scroll, infinite-loaded reviews). Headroom above FREQUENT
 *       because two parallel feeds (e.g. messages + notifications) at
 *       1Hz polling shouldn't squeeze each other out.
 *
 *   WEBHOOK (200/min per source IP)
 *     — Inbound webhooks from trusted partners (Stripe primarily). Stripe
 *       can legitimately replay during incident windows. Limit is per-IP
 *       and Stripe signature verification still runs first; this is a
 *       DoS backstop, not an auth gate. Matches the value already
 *       hardcoded in apps/web/app/api/webhooks/stripe/route.ts after
 *       the 2026-05-10 audit (P3.3) tightened it from 1000 → 200.
 */

export interface RateLimitTier {
  readonly maxRequests: number;
  readonly windowMs: number;
}

export const RATE_LIMIT_TIERS = {
  /** 5 requests / minute — high-impact mutations + privilege escalation. */
  STRICT: { maxRequests: 5, windowMs: 60_000 },

  /** 20 requests / minute — most admin endpoints (default for new routes). */
  STANDARD: { maxRequests: 20, windowMs: 60_000 },

  /** 60 requests / minute — UI-polled dashboards / paginated feeds. */
  FREQUENT: { maxRequests: 60, windowMs: 60_000 },

  /** 3 requests / hour — security enrollment flows (MFA, etc). */
  ENROLLMENT: { maxRequests: 3, windowMs: 3_600_000 },

  /** 10 requests / minute — credential primitives (login, register, reset). */
  AUTH: { maxRequests: 10, windowMs: 60_000 },

  /** 120 requests / minute — paginated feeds + infinite-scroll consumers. */
  READ_HEAVY: { maxRequests: 120, windowMs: 60_000 },

  /** 200 requests / minute — inbound webhooks (DoS backstop, not auth). */
  WEBHOOK: { maxRequests: 200, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitTier>;

export type RateLimitTierName = keyof typeof RATE_LIMIT_TIERS;
