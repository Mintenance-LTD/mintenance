import type { FeeCalculation } from '@mintenance/types';

export class PaymentValidation {
  /**
   * Validate payment amount
   */
  static validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (amount > 10000) {
      throw new Error('Amount cannot exceed $10,000');
    }
  }

  /**
   * Validate card expiration
   */
  static validateCardExpiration(expMonth: number, expYear: number): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (
      expYear < currentYear ||
      (expYear === currentYear && expMonth < currentMonth)
    ) {
      throw new Error('Card has expired');
    }
  }

  /**
   * Convert amount to cents for Stripe
   */
  static amountToCents(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Calculate fees
   */
  static calculateFees(amount: number): FeeCalculation {
    let platformFee = Math.max(amount * 0.05, 0.5); // 5% with minimum $0.50
    platformFee = Math.min(platformFee, 50); // Cap at $50

    const stripeFee = Math.round((amount * 0.029 + 0.3) * 100) / 100; // 2.9% + $0.30
    const totalFees = platformFee + stripeFee;
    const contractorAmount = Math.round((amount - totalFees) * 100) / 100;

    return {
      platformFee: Math.round(platformFee * 100) / 100,
      stripeFee,
      contractorAmount,
      totalFees: Math.round(totalFees * 100) / 100,
    };
  }
}
