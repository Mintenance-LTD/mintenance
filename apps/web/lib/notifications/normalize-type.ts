/**
 * Normalize a raw `notifications.type` string from the DB onto the
 * five-bucket canonical union the UI filters against:
 *
 *   'job' | 'bid' | 'message' | 'payment' | 'system'
 *
 * The DB stores the full event name (`message_received`,
 * `contract_created`, `bid_accepted`, `job_started`, `payment_received`
 * …). Both notification views (NotificationsInboxView and the legacy
 * MintEditorialNotifications) read the abstract bucket via
 * `n.type === 'message'` / `'bid'` / etc., so without normalisation
 * the category tabs all show 0 even when the inbox is full.
 *
 * Live taxonomy snapshot (2026-05-21, project ukrjudtlvapiajkjbcrd):
 *   message_received (36)         → message
 *   contract_created (6)          → job
 *   job_nearby (6)                → job
 *   bid_accepted / bid_received   → bid
 *   job_assigned / job_started /
 *     job_completed / job_confirmed → job
 *   contract_pending_signature    → job
 *   completion_confirmed          → job
 *   location_sharing_request      → job
 *   payment_received              → payment
 *   post_liked / new_follower     → system  (no dedicated tab)
 *   message (1 legacy row)        → message
 *
 * We match by prefix instead of an explicit allow-list so new event
 * names (e.g. `bid_withdrawn`, `payment_refunded`) drop into the right
 * bucket automatically.
 */

export type CanonicalNotificationType =
  | 'job'
  | 'bid'
  | 'message'
  | 'payment'
  | 'system';

export function normalizeNotificationType(
  raw: string | undefined | null
): CanonicalNotificationType {
  if (!raw) return 'system';
  const t = raw.toLowerCase();

  // Direct canonical hit (legacy rows + caller-already-normalised values).
  if (
    t === 'job' ||
    t === 'bid' ||
    t === 'message' ||
    t === 'payment' ||
    t === 'system'
  ) {
    return t;
  }

  // Money bucket — payment_* and escrow_* events. `refund_*` lives here
  // too since refunds also represent money movement.
  if (
    t.startsWith('payment_') ||
    t.startsWith('escrow_') ||
    t.startsWith('refund_') ||
    t.startsWith('payout_') ||
    t.startsWith('invoice_')
  ) {
    return 'payment';
  }

  // Messages bucket — message_* (received, replied, …).
  if (t.startsWith('message_')) {
    return 'message';
  }

  // Bids bucket — bid_* (received, accepted, rejected, withdrawn, …).
  if (t.startsWith('bid_')) {
    return 'bid';
  }

  // Jobs bucket — broadest. Includes job_* lifecycle events plus the
  // associated contract / completion / scheduling events that
  // homeowners think of as "their job moving forward":
  //   contract_*  · completion_*  · changes_*  · no_show_*
  //   location_sharing_*  · review_*  · job_*  · contractor_* (tracking)
  //
  // 2026-05-24 audit-36 P2: contractor_en_route + contractor_arrived
  // are produced by /api/contractor/trips POST + PATCH. They were
  // falling through to 'system' so the dropdown filter buckets and
  // job-tab counts didn't include them — even though the dropdown
  // icon/colour map already knows them by name. Bucket them with
  // the rest of the job lifecycle events.
  if (
    t.startsWith('job_') ||
    t.startsWith('contract_') ||
    t.startsWith('completion_') ||
    t.startsWith('changes_') ||
    t.startsWith('no_show_') ||
    t.startsWith('location_sharing_') ||
    t.startsWith('review_') ||
    t.startsWith('contractor_')
  ) {
    return 'job';
  }

  // Everything else (post_liked, new_follower, system alerts, …)
  // falls under system — counted in "All" but no dedicated tab.
  return 'system';
}
