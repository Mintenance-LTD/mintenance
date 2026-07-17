/**
 * Canonical notification-type registry (2026-07-17, deferred item from
 * the matching integration).
 *
 * Before this module, at least five places declared overlapping
 * notification-type lists and two of them disagreed: the web feed
 * stripped 4 social types while packages/data-access stripped only 3
 * (missing `comment_replied`), so the mobile inbox showed rows the web
 * feed hid. These two invariant sets are now single-sourced here.
 *
 * Consumers:
 *  - apps/web/lib/notifications/feed.ts             (SOCIAL)
 *  - packages/data-access/src/queries/notifications (SOCIAL, re-export)
 *  - apps/mobile .../NotificationCRUD.ts            (SOCIAL badge filter)
 *  - apps/web .../NotificationPreferenceResolver    (ALWAYS_ON)
 *
 * Deliberately NOT unified here: the per-platform display unions
 * (mobile services/notifications/types.ts, web contractor
 * notification-types.ts) — they are UI-routing subsets with different
 * semantics, and collapsing them is a bigger, riskier change than the
 * invariant sets warrant. See docs/AUDIT_LOG.md 2026-07-17.
 */

/**
 * Social-graph notification types excluded from the main notification
 * feeds on BOTH platforms. `/api/notifications/social` is the only
 * surface that serves these.
 */
export const SOCIAL_NOTIFICATION_TYPES = [
  'post_liked',
  'comment_added',
  'comment_replied',
  'new_follower',
] as const;

const SOCIAL_SET: ReadonlySet<string> = new Set(SOCIAL_NOTIFICATION_TYPES);

export function isSocialNotificationType(type: string | null): boolean {
  return type !== null && SOCIAL_SET.has(type);
}

/**
 * Types that are never user-mutable and never deferrable — the mobile
 * preferences banner promises payment confirmations, escrow holds, and
 * contractor "I'm on the way" pings always reach the user. Enforced
 * server-side by NotificationPreferenceResolver; expand ONLY when the
 * always-on banner copy expands.
 */
export const ALWAYS_ON_NOTIFICATION_TYPES = [
  'payment', // payment confirmations / escrow funding
  'payment_received', // legacy alias of payment
  'contractor_en_route', // "I'm on the way" homeowner notification
] as const;

const ALWAYS_ON_SET: ReadonlySet<string> = new Set(
  ALWAYS_ON_NOTIFICATION_TYPES
);

export function isAlwaysOnNotificationType(type: string): boolean {
  return ALWAYS_ON_SET.has(type);
}
