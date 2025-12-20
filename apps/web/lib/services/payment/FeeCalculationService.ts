import type { FeeCalculation } from '@mintenance/types';
import { logger } from '@/lib/logger';

export type PaymentType = 'deposit' | 'final' | 'milestone';

export interface FeeCalculationOptions {
  /**
   * Payment type - affects fee rate
   * @default 'final'
   */
  paymentType?: PaymentType;
  
  /**
   * Custom platform fee rate (as decimal, e.g., 0.05 for 5%)
   * If not provided, uses default rate based on payment type
   */
  platformFeeRate?: number;
  
  /**
   * Minimum platform fee amount
   * @default 0.50
   */
  minPlatformFee?: number;
  
  /**
   * Maximum platform fee amount
   * @default 50.00
   */
  maxPlatformFee?: number;
  
  /**
   * Stripe processing fee rate (as decimal, e.g., 0.029 for 2.9%)
   * @default 0.029
   */
  stripeFeeRate?: number;
  
  /**
   * Fixed Stripe processing fee
   * @default 0.30
   */
  stripeFixedFee?: number;
  
  /**
   * Currency code for rounding precision
   * @default 'usd'
   */
  currency?: string;
}

export interface FeeBreakdown extends FeeCalculation {
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
 * - Stripe processing fees (2.9% + fixed fee)
 * - Different rates for deposit vs final payments
 * - Net revenue calculations
 */
export class FeeCalculationService {
  /**
   * Default fee configuration
   */
  private static readonly DEFAULT_CONFIG = {
    platformFeeRate: {
      deposit: 0.05, // 5% for deposits
      final: 0.05,   // 5% for final payments
      milestone: 0.05, // 5% for milestone payments
    },
    minPlatformFee: 0.50,
    maxPlatformFee: 50.00,
    stripeFeeRate: 0.029, // 2.9%
    stripeFixedFee: 0.30, // $0.30
    currency: 'usd',
  } as const;

  /**
   * Calculate fees for a payment amount
   * 
   * @param amount - Payment amount in dollars/cents
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
      platformFeeRate,
      minPlatformFee = this.DEFAULT_CONFIG.minPlatformFee,
      maxPlatformFee = this.DEFAULT_CONFIG.maxPlatformFee,
      stripeFeeRate = this.DEFAULT_CONFIG.stripeFeeRate,
      stripeFixedFee = this.DEFAULT_CONFIG.stripeFixedFee,
    } = options;

    // Determine platform fee rate
    const effectivePlatformFeeRate = platformFeeRate ?? 
      this.DEFAULT_CONFIG.platformFeeRate[paymentType];

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
    const netPlatformRevenue = this.roundToTwoDecimals(
      platformFee - stripeFee
    );

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
      throw new Error('Minimum platform fee cannot exceed maximum platform fee');
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

