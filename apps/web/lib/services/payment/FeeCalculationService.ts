import type { FeeCalculation } from '@mintenance/types';
import { logger } from '@/lib/logger';
import { PLATFORM_FEE_RATE_BY_TIER } from '@/lib/feature-access-config';
import type { ContractorSubscriptionTier } from '@/lib/feature-access-types';

export type PaymentType = 'deposit' | 'final' | 'milestone';

interface FeeCalculationOptions {
  /**
   * Payment type - affects fee rate
   * @default 'final'
   */
  paymentType?: PaymentType;

  /**
   * Contractor's effective subscription tier. When provided, fee rate is
   * looked up from PLATFORM_FEE_RATE_BY_TIER and overrides paymentType
   * default. Use getContractorTierForFee() to resolve this with early-access
   * bypass. 2026-05-22 Sprint 2.
   */
  contractorTier?: ContractorSubscriptionTier;

  /**
   * Custom platform fee rate (as decimal, e.g., 0.05 for 5%)
   * Highest precedence — overrides both contractorTier and paymentType.
   * Mostly used by tests.
   */
  platformFeeRate?: number;

  /**
   * Minimum platform fee amount
   * @default 0.50
   */
  minPlatformFee?: number;

  /**
   * Maximum platform fee amount. 2026-05-22: removed the £50 default cap as
   * part of tiered-fee rollout — Pro/Business tiers' lower % is the cap.
   * Callers can still pass an explicit value to constrain (e.g. for test
   * fixtures or admin overrides).
   * @default Infinity (no cap)
   */
  maxPlatformFee?: number;

  /**
   * Stripe processing fee rate (as decimal, e.g., 0.015 for 1.5%)
   * @default 0.015
   */
  stripeFeeRate?: number;

  /**
   * Fixed Stripe processing fee
   * @default 0.20
   */
  stripeFixedFee?: number;

  /**
   * Currency code for rounding precision
   * @default 'gbp'
   */
  currency?: string;
}

interface FeeBreakdown extends FeeCalculation {
  /**
   * Original payment amount before fees
   */
  originalAmount: number;

  /**
   * Payment type used for calculation
   */
  paymentType: PaymentType;

  /**
   * Platform fee rate used (as decimal)
   */
  platformFeeRate: number;

  /**
   * Stripe processing fee rate used (as decimal)
   */
  stripeFeeRate: number;

  /**
   * Net platform revenue (platform fee minus Stripe costs)
   */
  netPlatformRevenue: number;
}

/**
 * Centralized fee calculation service
 *
 * Handles all fee calculations consistently across the platform:
 * - Platform fees (configurable rate, min/max limits)
 * - Stripe processing fees (1.5% + 20p, UK rates)
 * - Different rates for deposit vs final payments
 * - Net revenue calculations
 */
export class FeeCalculationService {
  /**
   * Default fee configuration
   */
  private static readonly DEFAULT_CONFIG = {
    // 2026-05-22 Sprint 2: the per-paymentType fallback is the Basic tier
    // rate. The tier-aware lookup runs first; this only fires when caller
    // doesn't pass contractorTier (legacy code paths, tests, admin imports).
    platformFeeRate: {
      deposit: 0.12,
      final: 0.12,
      milestone: 0.12,
    },
    minPlatformFee: 0.5,
    // 2026-05-22: was 50.0 (£50 cap subsidised large jobs). Tier-aware fees
    // make the cap unnecessary — Business pays 5%, that's the floor.
    maxPlatformFee: Number.POSITIVE_INFINITY,
    stripeFeeRate: 0.015, // 1.5% (UK Stripe rate)
    stripeFixedFee: 0.2, // £0.20 (UK Stripe fixed fee)
    currency: 'gbp',
  } as const;

  /**
   * Calculate fees for a payment amount
   *
   * @param amount - Payment amount in pounds
   * @param options - Fee calculation options
   * @returns Fee breakdown with all calculated values
   */
  static calculateFees(
    amount: number,
    options: FeeCalculationOptions = {}
  ): FeeBreakdown {
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const {
      paymentType = 'final',
      contractorTier,
      platformFeeRate,
      minPlatformFee = this.DEFAULT_CONFIG.minPlatformFee,
      maxPlatformFee = this.DEFAULT_CONFIG.maxPlatformFee,
      stripeFeeRate = this.DEFAULT_CONFIG.stripeFeeRate,
      stripeFixedFee = this.DEFAULT_CONFIG.stripeFixedFee,
    } = options;

    // Determine platform fee rate. Precedence: explicit override >
    // tier-based lookup > paymentType-based default.
    // 2026-05-22 Sprint 2 wired contractorTier as the standard path.
    const effectivePlatformFeeRate =
      platformFeeRate ??
      (contractorTier !== undefined
        ? PLATFORM_FEE_RATE_BY_TIER[contractorTier]
        : this.DEFAULT_CONFIG.platformFeeRate[paymentType]);

    // Calculate platform fee with min/max constraints
    let platformFee = amount * effectivePlatformFeeRate;
    platformFee = Math.max(platformFee, minPlatformFee);
    platformFee = Math.min(platformFee, maxPlatformFee);
    platformFee = this.roundToTwoDecimals(platformFee);

    // Calculate Stripe processing fee
    const stripeFee = this.roundToTwoDecimals(
      amount * stripeFeeRate + stripeFixedFee
    );

    // Calculate total fees
    const totalFees = this.roundToTwoDecimals(platformFee + stripeFee);

    // Calculate contractor payout (amount after all fees)
    const contractorAmount = this.roundToTwoDecimals(amount - totalFees);

    // Calculate net platform revenue (platform fee minus Stripe costs)
    // Note: Stripe fee is typically charged on the full amount, not just platform fee
    // But for accounting purposes, we track net revenue as platform fee minus our Stripe costs
    const netPlatformRevenue = this.roundToTwoDecimals(platformFee - stripeFee);

    // Ensure contractor amount is not negative
    if (contractorAmount < 0) {
      logger.warn('Contractor amount is negative after fees', {
        amount,
        platformFee,
        stripeFee,
        contractorAmount,
      });
      // In this case, contractor would receive 0, but we log a warning
    }

    return {
      originalAmount: amount,
      paymentType,
      platformFeeRate: effectivePlatformFeeRate,
      stripeFeeRate,
      platformFee,
      stripeFee,
      contractorAmount: Math.max(0, contractorAmount),
      totalFees,
      netPlatformRevenue,
    };
  }

  /**
   * Calculate fees in cents (for Stripe API)
   *
   * @param amountCents - Payment amount in cents
   * @param options - Fee calculation options
   * @returns Fee breakdown with amounts in cents
   */
  static calculateFeesInCents(
    amountCents: number,
    options: FeeCalculationOptions = {}
  ): FeeBreakdown {
    const amountDollars = amountCents / 100;
    const breakdown = this.calculateFees(amountDollars, options);

    // Convert all amounts back to cents
    return {
      ...breakdown,
      originalAmount: amountCents,
      platformFee: Math.round(breakdown.platformFee * 100),
      stripeFee: Math.round(breakdown.stripeFee * 100),
      contractorAmount: Math.round(breakdown.contractorAmount * 100),
      totalFees: Math.round(breakdown.totalFees * 100),
      netPlatformRevenue: Math.round(breakdown.netPlatformRevenue * 100),
    };
  }

  /**
   * Get platform fee rate for a payment type
   *
   * @param paymentType - Type of payment
   * @returns Platform fee rate as decimal
   */
  static getPlatformFeeRate(paymentType: PaymentType = 'final'): number {
    return this.DEFAULT_CONFIG.platformFeeRate[paymentType];
  }

  /**
   * Get Stripe processing fee rate
   *
   * @returns Stripe fee rate as decimal
   */
  static getStripeFeeRate(): number {
    return this.DEFAULT_CONFIG.stripeFeeRate;
  }

  /**
   * Get Stripe fixed fee
   *
   * @returns Fixed Stripe fee amount
   */
  static getStripeFixedFee(): number {
    return this.DEFAULT_CONFIG.stripeFixedFee;
  }

  /**
   * Calculate platform fee only (without Stripe fees)
   *
   * @param amount - Payment amount
   * @param options - Fee calculation options
   * @returns Platform fee amount
   */
  static calculatePlatformFee(
    amount: number,
    options: FeeCalculationOptions = {}
  ): number {
    const breakdown = this.calculateFees(amount, options);
    return breakdown.platformFee;
  }

  /**
   * Calculate Stripe processing fee only
   *
   * @param amount - Payment amount
   * @param options - Fee calculation options
   * @returns Stripe processing fee amount
   */
  static calculateStripeFee(
    amount: number,
    options: FeeCalculationOptions = {}
  ): number {
    const {
      stripeFeeRate = this.DEFAULT_CONFIG.stripeFeeRate,
      stripeFixedFee = this.DEFAULT_CONFIG.stripeFixedFee,
    } = options;

    return this.roundToTwoDecimals(amount * stripeFeeRate + stripeFixedFee);
  }

  /**
   * Calculate contractor payout amount
   *
   * @param amount - Payment amount
   * @param options - Fee calculation options
   * @returns Amount contractor receives after all fees
   */
  static calculateContractorPayout(
    amount: number,
    options: FeeCalculationOptions = {}
  ): number {
    const breakdown = this.calculateFees(amount, options);
    return breakdown.contractorAmount;
  }

  /**
   * Resolve a contractor's effective tier for fee calculation.
   *
   * Resolution order (matches lib/middleware/subscription-check.ts):
   * 1. Early-access founding-member grant → 'enterprise' (5% rate)
   * 2. Active contractor_subscriptions row → its plan_type
   * 3. Fallback → 'basic' (12% rate)
   *
   * Caller is responsible for passing the result to calculateFees as
   * `contractorTier`. Kept as a static method on the service so the two
   * fee-calculation call sites (embedded-checkout, release-escrow) have
   * one canonical place to fetch this from. 2026-05-22 Sprint 2.
   */
  static async resolveContractorTier(
    contractorId: string
  ): Promise<ContractorSubscriptionTier> {
    try {
      const { getEarlyAccessEntitlement } =
        await import('@/lib/subscription/early-access');
      const earlyAccess = await getEarlyAccessEntitlement(contractorId);
      if (earlyAccess.eligible && earlyAccess.role === 'contractor') {
        return 'enterprise';
      }

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      const { data: subscription } = await serverSupabase
        .from('contractor_subscriptions')
        .select('plan_type, status')
        .eq('contractor_id', contractorId)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const planType = subscription?.plan_type;
      if (
        planType === 'free' ||
        planType === 'basic' ||
        planType === 'professional' ||
        planType === 'enterprise'
      ) {
        return planType;
      }
      return 'basic';
    } catch (err) {
      // Fail safe — if tier lookup throws, charge the highest rate so the
      // contractor isn't accidentally subsidised. Logged so we can detect
      // the lookup chain breaking in prod.
      logger.warn('Failed to resolve contractor tier; defaulting to basic', {
        service: 'FeeCalculationService',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return 'basic';
    }
  }

  /**
   * Round amount to two decimal places
   *
   * @param amount - Amount to round
   * @returns Rounded amount
   */
  private static roundToTwoDecimals(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Validate fee configuration
   *
   * @param options - Fee calculation options to validate
   * @throws Error if configuration is invalid
   */
  static validateFeeConfig(options: FeeCalculationOptions): void {
    if (options.platformFeeRate !== undefined) {
      if (options.platformFeeRate < 0 || options.platformFeeRate > 1) {
        throw new Error('Platform fee rate must be between 0 and 1');
      }
    }

    if (options.minPlatformFee !== undefined && options.minPlatformFee < 0) {
      throw new Error('Minimum platform fee must be >= 0');
    }

    if (options.maxPlatformFee !== undefined && options.maxPlatformFee < 0) {
      throw new Error('Maximum platform fee must be >= 0');
    }

    if (
      options.minPlatformFee !== undefined &&
      options.maxPlatformFee !== undefined &&
      options.minPlatformFee > options.maxPlatformFee
    ) {
      throw new Error(
        'Minimum platform fee cannot exceed maximum platform fee'
      );
    }

    if (options.stripeFeeRate !== undefined) {
      if (options.stripeFeeRate < 0 || options.stripeFeeRate > 1) {
        throw new Error('Stripe fee rate must be between 0 and 1');
      }
    }

    if (options.stripeFixedFee !== undefined && options.stripeFixedFee < 0) {
      throw new Error('Stripe fixed fee must be >= 0');
    }
  }
}
