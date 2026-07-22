/**
 * Pure derivations over a job's bids, used by the Mint Editorial job detail.
 *
 * Split out of MintEditorialJobDetail.tsx on 2026-07-21 (that file passed the
 * 500-line pre-commit gate). Keeping these pure and separate also makes the
 * bidding-stage logic directly testable — which matters, because the bug that
 * prompted this split was exactly a stage mistake: every signal keyed off
 * PENDING bids, so accepting a bid made the page claim it was still
 * "Waiting for bids".
 */
import type { Bid } from '../BidCard';

export function pendingOnly(bids: Bid[]): Bid[] {
  return bids.filter((b) => b.status === 'pending');
}

/**
 * The accepted bid, if bidding has concluded. `null` while a job is still
 * open. Callers should branch on this BEFORE falling back to any
 * "waiting for bids" state.
 */
export function acceptedBidOf(bids: Bid[]): Bid | null {
  return bids.find((b) => b.status === 'accepted') ?? null;
}

/** Display name for a bid's contractor, preferring the trading name. */
export function bidContractorName(bid: Bid): string {
  return (
    bid.contractor.company_name ||
    [bid.contractor.first_name, bid.contractor.last_name]
      .filter(Boolean)
      .join(' ') ||
    'your contractor'
  );
}

/**
 * Pick the "recommended" bid by a small heuristic: highest rating
 * × verified status, then lowest amount as a tiebreaker. Returns
 * null if there's nothing to score. The canonical mock uses a
 * dedicated AI model; this is a transparent in-page approximation.
 */
export function pickRecommended(bids: Bid[]): string | null {
  if (bids.length === 0) return null;
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const b of bids) {
    const rating = b.contractor.rating ?? 4.0;
    const verified = b.contractor.admin_verified ? 0.4 : 0;
    const priceWeight = 1 - Math.min(1, (b.amount || 0) / 5000) * 0.3;
    const score = rating + verified + priceWeight;
    if (score > bestScore) {
      bestScore = score;
      bestId = b.id;
    }
  }
  return bestId;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}
