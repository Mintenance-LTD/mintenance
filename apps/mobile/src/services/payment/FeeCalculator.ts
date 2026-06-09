import { apiRequest } from './apiHelper';

export class FeeCalculator {
  /**
   * Local fee estimate, used ONLY as a placeholder before the
   * server-authoritative breakdown loads (see usePayment.ts → GET
   * /api/jobs/[id]/payment-details). The real platform fee is tier-aware
   * (12% basic / 8% professional / 5% enterprise) and resolved server-side
   * from the contractor's subscription — the client can't know the tier.
   *
   * Defaults mirror apps/web FeeCalculationService.DEFAULT_CONFIG: 12% basic
   * rate, no maximum cap (the £50 cap was removed 2026-05-22 with the tiered
   * fee rollout — Pro/Business's lower % is the effective floor).
   */
  static calculateFees(amount: number): {
    platformFee: number;
    stripeFee: number;
    contractorAmount: number;
    totalFees: number;
  } {
    const platformRate = 0.12; // basic-tier fallback (matches web default)
    const stripeRate = 0.015; // UK Stripe rate
    const stripeFixed = 0.2; // £0.20 UK fixed fee
    const minPlatformFee = 0.5;

    const rawPlatformFee = amount * platformRate;
    const platformFee = Math.max(
      minPlatformFee,
      Number(rawPlatformFee.toFixed(2))
    );

    const stripeFee = Number((amount * stripeRate + stripeFixed).toFixed(2));
    const totalFees = Number((platformFee + stripeFee).toFixed(2));
    const contractorAmount = Number((amount - totalFees).toFixed(2));

    return { platformFee, stripeFee, contractorAmount, totalFees };
  }

  /**
   * 2026-05-26 audit-47 P1: repointed from the legacy
   * /api/contractor/payout/setup (now 410 Gone, see audit-46) to the
   * canonical Stripe Connect onboarding endpoint. The web route
   * accepts no body — the contractor is identified via the auth
   * cookie. Returns `{ url }` matching the
   * /api/payments/stripe-connect/onboard response shape.
   *
   * The `_contractorId` param is retained (but ignored) so the older
   * call-site signature in legacy mobile screens / tests still
   * type-checks. Server-side identity comes from the auth cookie, not
   * client input, which is the correct security boundary.
   */
  static async setupContractorPayout(
    _contractorId?: string
  ): Promise<{ accountUrl: string }> {
    const res = await apiRequest<{ url: string; alreadyOnboarded?: boolean }>(
      '/api/payments/stripe-connect/onboard',
      { method: 'POST' }
    );
    return { accountUrl: res.url };
  }

  /**
   * 2026-06-09 audit P0: the stripe_* profile columns were revoked from
   * the authenticated role (20260508100543 lockdown), so the previous
   * direct `profiles` select failed with "permission denied". Repointed
   * to GET /api/payments/stripe-connect/status — the same readiness
   * flags, read server-side. `accountComplete` still requires both
   * payouts_enabled AND transfers_active (audit-46 gate).
   *
   * Like setupContractorPayout above, `_contractorId` is retained for
   * call-site compatibility but ignored: the endpoint is contractor-only
   * and identifies the caller from the auth cookie.
   */
  static async getContractorPayoutStatus(_contractorId?: string): Promise<{
    hasAccount: boolean;
    accountComplete: boolean;
    accountId?: string;
  }> {
    const res = await apiRequest<{
      success: boolean;
      status: {
        accountId?: string | null;
        payoutsEnabled?: boolean;
        transfersActive?: boolean;
        canReceivePayouts?: boolean;
      } | null;
    }>('/api/payments/stripe-connect/status', { method: 'GET' });

    const status = res.status;
    if (!status?.accountId) {
      return { hasAccount: false, accountComplete: false };
    }
    return {
      hasAccount: true,
      accountComplete:
        status.payoutsEnabled === true && status.transfersActive === true,
      accountId: status.accountId,
    };
  }
}
