/**
 * Platform fee — SINGLE SOURCE OF TRUTH for the percentage Mintenance
 * takes from a completed job, shared by web and mobile.
 *
 * Before 2026-07-22 the fee percentage was hardcoded independently in at
 * least four display surfaces, each with a DIFFERENT number:
 *   - web contractor job detail  -> 8%   (MintEditorialJobDetailView)
 *   - web bid submission          -> 5%   (BidSubmissionClient2025)
 *   - mobile bid submission       -> 5%   (BidSubmissionScreen)
 *   - mobile fee placeholder      -> 12%  (FeeCalculator)
 * None were tier-aware, so a founding member (5%) was shown 8% on one
 * screen and 5% on another — while the escrow release charged the real
 * tier rate via FeeCalculationService. This module removes the literals:
 * every surface now reads the rate for the contractor's resolved tier
 * from ONE table.
 *
 * The rate a contractor actually pays is authoritative on the SERVER
 * (FeeCalculationService.resolveContractorTier, which maps the
 * early-access founding cohort to 'enterprise'). Clients must display the
 * server-resolved rate — never assume one. `DEFAULT_PLATFORM_FEE_RATE` is
 * the conservative fallback for the brief window before that rate loads:
 * it is the Basic rate, matching the server's own fail-safe, so a
 * contractor is never shown a rate LOWER (better) than they might pay.
 */

/** Contractor fee tiers. Mirrors ContractorSubscriptionTier in
 *  apps/web/lib/feature-access-types.ts — kept as its own type here so
 *  the mobile app (which cannot import from apps/web) has it too. */
export type ContractorFeeTier =
  | 'free'
  | 'basic'
  | 'professional'
  | 'enterprise';

/**
 * Platform fee rate by tier, as a decimal (0.08 = 8%).
 * enterprise = "Business" in the UI, and the early-access founding cohort
 * resolves to enterprise server-side. No per-tier cap (the £50 cap was
 * removed 2026-05-22 — the lower % on higher tiers is the effective floor).
 */
export const PLATFORM_FEE_RATE_BY_TIER: Record<ContractorFeeTier, number> = {
  free: 0.12,
  basic: 0.12,
  professional: 0.08,
  enterprise: 0.05,
};

/**
 * Conservative fallback used only until the server-resolved rate loads.
 * Basic rate on purpose — it is the HIGHEST, so an estimate shown with it
 * never over-promises earnings, and it matches
 * FeeCalculationService.resolveContractorTier's own failure default.
 */
export const DEFAULT_PLATFORM_FEE_RATE = PLATFORM_FEE_RATE_BY_TIER.basic;

/** Rate for a tier, falling back to the Basic default for an unknown or
 *  missing tier. Never throws — display code must always render something. */
export function platformFeeRateForTier(
  tier: ContractorFeeTier | null | undefined
): number {
  if (tier && tier in PLATFORM_FEE_RATE_BY_TIER) {
    return PLATFORM_FEE_RATE_BY_TIER[tier];
  }
  return DEFAULT_PLATFORM_FEE_RATE;
}

/**
 * Human label for a rate: 0.08 -> "8%", 0.125 -> "12.5%".
 * Integer percentages render without a trailing ".0"; fractional ones
 * keep a single decimal. Used everywhere the "(8%)" label appears so the
 * number in the label always matches the number in the maths.
 */
export function formatPlatformFeePercent(rate: number): string {
  const pct = rate * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

export interface PlatformFeeBreakdown {
  /** The rate applied, as a decimal. */
  rate: number;
  /** Platform fee in the same currency units as `amount`, 2dp. */
  platformFee: number;
  /** What the contractor keeps after the platform fee, 2dp. */
  netToContractor: number;
}

/**
 * Contractor-facing breakdown of a bid/job amount: platform fee and net.
 *
 * Deliberately platform-fee only — it does NOT subtract Stripe processing
 * fees. This matches what every contractor-facing "You'll be paid" /
 * "Platform fee" panel already showed (bid amount minus our cut); the
 * authoritative Stripe-inclusive figure lives in
 * FeeCalculationService.calculateFees for the actual transfer. Keeping the
 * two concerns separate stops a redesign from silently changing what the
 * contractor is quoted.
 *
 * Rounds to 2dp the same way as FeeCalculationService so the quote and the
 * eventual charge agree to the penny at equal rates. No minimum-fee floor
 * here — that floor only matters for tiny real charges, not headline quotes.
 */
export function platformFeeBreakdown(
  amount: number,
  rate: number
): PlatformFeeBreakdown {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const platformFee = Math.round(safeAmount * rate * 100) / 100;
  const netToContractor = Math.round((safeAmount - platformFee) * 100) / 100;
  return { rate, platformFee, netToContractor };
}
