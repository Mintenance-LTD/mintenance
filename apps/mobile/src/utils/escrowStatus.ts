/**
 * 2026-05-27 audit-83 P1/P2: single source of truth for escrow
 * lifecycle predicates on mobile. Mirrors the web definitions in
 * apps/web/app/jobs/[id]/components/mint-editorial/jobDetailHelpers.ts
 * so a contractor / homeowner sees the same CTA semantics regardless
 * of platform.
 *
 * Live escrow_transactions.status values today: pending | held |
 * release_pending | completed | failed | cancelled | refunded.
 * (The web helper also accepts 'released' which the legacy release
 * paths used before the auto-release migration normalised on
 * 'completed'.) Treating only 'held' as funded — which is what the
 * mobile CTAs did pre-fix — caused two regressions:
 *
 *   1. After homeowner approval the escrow flips held → release_pending
 *      → completed before the job row flips to completed; the
 *      contractor CTA would briefly re-show "Waiting for Payment".
 *   2. Same window the homeowner CTA would briefly re-show "Pay Now"
 *      and could invite a duplicate payment.
 */

/**
 * True iff the homeowner has paid into escrow and the funds are at
 * least committed (regardless of whether release/payout has fired).
 *
 * Use this to gate any CTA that means "is this job funded?" — e.g.
 * the contractor's "Waiting for Payment" sticky CTA should suppress,
 * the homeowner's "Pay Now" CTA should suppress, the contractor
 * stepper's Payment step should show complete.
 */
export function isEscrowFunded(
  escrowStatus: string | null | undefined
): boolean {
  if (!escrowStatus) return false;
  return ['held', 'release_pending', 'released', 'completed'].includes(
    escrowStatus
  );
}

/**
 * True iff escrow has reached a terminal released state (payout
 * fired or auto-release completed). The auto-release path lands on
 * 'completed'; legacy release paths use 'released'. Either signals
 * money out the door.
 */
export function isEscrowReleased(
  escrowStatus: string | null | undefined
): boolean {
  if (!escrowStatus) return false;
  return ['released', 'completed'].includes(escrowStatus);
}

/**
 * True iff escrow is committed but NOT yet released — i.e. the
 * contractor is safe to start work and the homeowner still has
 * recourse via dispute. Useful for "Ready to Start" / "Start Job"
 * gating where a released escrow should NOT also surface as ready
 * (the job has already completed).
 */
export function isEscrowHeldOnly(
  escrowStatus: string | null | undefined
): boolean {
  return isEscrowFunded(escrowStatus) && !isEscrowReleased(escrowStatus);
}
