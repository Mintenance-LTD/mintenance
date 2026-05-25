import { supabase } from '../../config/supabase';
import { apiRequest } from './apiHelper';

export class FeeCalculator {
  static calculateFees(amount: number): {
    platformFee: number;
    stripeFee: number;
    contractorAmount: number;
    totalFees: number;
  } {
    const platformRate = 0.05;
    const stripeRate = 0.015; // UK Stripe rate
    const stripeFixed = 0.2; // £0.20 UK fixed fee
    const minPlatformFee = 0.5;
    const maxPlatformFee = 50;

    const rawPlatformFee = amount * platformRate;
    const platformFee = Math.min(
      maxPlatformFee,
      Math.max(minPlatformFee, Number(rawPlatformFee.toFixed(2)))
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
   * 2026-05-26 audit-47 P1: previously read the orphan
   * contractor_payout_accounts table (1 stale row live, never resynced
   * with Stripe). Now reads the canonical readiness flags webhook
   * handlers maintain on `profiles`. `accountComplete` requires both
   * payouts_enabled AND transfers_active — same gate used by web
   * accept-bid + release-escrow paths (audit-46 commit 0632eedf7).
   */
  static async getContractorPayoutStatus(contractorId: string): Promise<{
    hasAccount: boolean;
    accountComplete: boolean;
    accountId?: string;
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'stripe_connect_account_id, stripe_payouts_enabled, stripe_transfers_active'
      )
      .eq('id', contractorId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to fetch payout status');
    }
    if (!data) return { hasAccount: false, accountComplete: false };

    const row = data as Record<string, unknown>;
    const accountId = row.stripe_connect_account_id as
      | string
      | null
      | undefined;
    const payoutsEnabled = row.stripe_payouts_enabled === true;
    const transfersActive = row.stripe_transfers_active === true;

    return {
      hasAccount: !!accountId,
      accountComplete: !!accountId && payoutsEnabled && transfersActive,
      accountId: accountId ?? undefined,
    };
  }
}
