/**
 * Job monetary helpers — single source of truth for "what is this
 * job worth?" across the platform.
 *
 * Background
 * ----------
 * Until 2026-05-22 the homeowner set a `budget` when posting and we
 * happily used that number for everything: dashboards, analytics,
 * AI signals, contractor-facing displays. We removed the budget
 * input under the tiered-pricing rollout (anchoring distorted bids
 * away from contractor-set prices), so `jobs.budget` is now almost
 * always NULL for new posts. The 17 places that did `job.budget || 0`
 * were silently degrading to £0 — most visibly contractor earnings
 * + per-client revenue read as zero.
 *
 * Authoritative amounts
 * ---------------------
 * The real money flow is:
 *   1. Contractor submits a bid with `bids.amount`.
 *   2. Homeowner accepts → bid.status = 'accepted'.
 *   3. Homeowner funds escrow → escrow_transactions.amount + status='held'.
 *   4. Job completes + approved → escrow_transactions.status='released'.
 *
 * `getJobAmount()` returns the most-committed figure available,
 * falling back through the chain. `getRealisedAmount()` is the
 * narrow version for revenue / earnings aggregations — it only
 * counts money that has actually changed hands.
 */

export interface JobAmountInputs {
  /**
   * Homeowner-set ceiling. Will be NULL for jobs posted under the
   * 2026-05-22+ open-bidding flow. Kept as a deepest-fallback for
   * legacy data only.
   */
  budget?: number | null;
  /**
   * `escrow_transactions.amount` for this job (typically the
   * latest non-cancelled record).
   */
  escrow_amount?: number | null;
  /**
   * `escrow_transactions.status` — typically one of `held`,
   * `release_pending`, `released`, `completed`, `refunded`, `cancelled`.
   */
  escrow_status?: string | null;
  /**
   * `bids.amount` for the accepted bid.
   */
  accepted_bid_amount?: number | null;
}

const ESCROW_COMMITTED_STATES = new Set([
  'held',
  'release_pending',
  'released',
  'completed',
]);

const ESCROW_REALISED_STATES = new Set(['released', 'completed']);

/**
 * Best-known monetary value for a job at its current lifecycle stage.
 * Returns null when nothing is committed yet (posted, no bids).
 */
export function getJobAmount(inputs: JobAmountInputs): number | null {
  const { budget, escrow_amount, escrow_status, accepted_bid_amount } = inputs;

  if (
    escrow_amount != null &&
    escrow_amount > 0 &&
    escrow_status &&
    ESCROW_COMMITTED_STATES.has(escrow_status)
  ) {
    return escrow_amount;
  }
  if (accepted_bid_amount != null && accepted_bid_amount > 0) {
    return accepted_bid_amount;
  }
  if (budget != null && budget > 0) {
    return budget;
  }
  return null;
}

/**
 * Only-when-it-changed-hands amount. Use this for revenue / earnings
 * aggregations so reports don't inflate based on pending offers or
 * homeowner hint figures.
 */
export function getRealisedAmount(inputs: JobAmountInputs): number | null {
  const { escrow_amount, escrow_status } = inputs;
  if (
    escrow_amount != null &&
    escrow_amount > 0 &&
    escrow_status &&
    ESCROW_REALISED_STATES.has(escrow_status)
  ) {
    return escrow_amount;
  }
  return null;
}

/**
 * Sum of realised amounts — convenience for aggregations.
 */
export function sumRealisedAmounts(jobs: JobAmountInputs[]): number {
  return jobs.reduce((sum, j) => sum + (getRealisedAmount(j) ?? 0), 0);
}

/**
 * Sum using getJobAmount() — includes committed-but-not-yet-paid
 * money. Use for forecasts; do NOT use for revenue reporting.
 */
export function sumCommittedAmounts(jobs: JobAmountInputs[]): number {
  return jobs.reduce((sum, j) => sum + (getJobAmount(j) ?? 0), 0);
}

/**
 * Render-friendly money formatter. Returns "—" for null amounts so
 * UI can't show a misleading £0 when a job genuinely has no
 * committed value yet.
 */
export function formatJobAmount(amount: number | null | undefined): string {
  if (amount == null || amount <= 0) return '—';
  return `£${amount.toLocaleString('en-GB')}`;
}
