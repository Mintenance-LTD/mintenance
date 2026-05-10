/**
 * Rate-limit tier presets for `withApiHandler`.
 *
 * Audit P2 (2026-05-10): admin route rate limits had drifted into ad-hoc
 * values (2, 3, 5, 10, 20, 30, 60 across 67 routes) with no consistent
 * mapping from risk to limit. New code should pick one of the tiers
 * below; existing routes can migrate incrementally.
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
} as const satisfies Record<string, RateLimitTier>;

export type RateLimitTierName = keyof typeof RATE_LIMIT_TIERS;
