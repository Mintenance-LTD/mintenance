// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { PaymentValidation } from '../PaymentValidation';

describe('PaymentValidation', () => {
  describe('validateAmount', () => {
    it('should accept valid amounts', () => {
      expect(() => PaymentValidation.validateAmount(1)).not.toThrow();
      expect(() => PaymentValidation.validateAmount(50)).not.toThrow();
      expect(() => PaymentValidation.validateAmount(9999.99)).not.toThrow();
      expect(() => PaymentValidation.validateAmount(10000)).not.toThrow();
    });

    it('should reject zero amount', () => {
      expect(() => PaymentValidation.validateAmount(0)).toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should reject negative amounts', () => {
      expect(() => PaymentValidation.validateAmount(-1)).toThrow(
        'Amount must be greater than 0'
      );
      expect(() => PaymentValidation.validateAmount(-100)).toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should reject amounts exceeding £10,000', () => {
      expect(() => PaymentValidation.validateAmount(10001)).toThrow(
        'Amount cannot exceed £10,000'
      );
      expect(() => PaymentValidation.validateAmount(50000)).toThrow(
        'Amount cannot exceed £10,000'
      );
    });

    it('should accept exactly £10,000', () => {
      expect(() => PaymentValidation.validateAmount(10000)).not.toThrow();
    });
  });

  describe('validateCardExpiration', () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    it('should accept a card expiring in the future', () => {
      expect(() =>
        PaymentValidation.validateCardExpiration(12, currentYear + 1)
      ).not.toThrow();
    });

    it('should accept a card expiring this month', () => {
      expect(() =>
        PaymentValidation.validateCardExpiration(currentMonth, currentYear)
      ).not.toThrow();
    });

    it('should reject a card expired last month', () => {
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      expect(() =>
        PaymentValidation.validateCardExpiration(lastMonth, lastMonthYear)
      ).toThrow('Card has expired');
    });

    it('should reject a card expired last year', () => {
      expect(() =>
        PaymentValidation.validateCardExpiration(12, currentYear - 1)
      ).toThrow('Card has expired');
    });
  });

  describe('amountToCents', () => {
    it('should convert whole pound amounts to pence', () => {
      expect(PaymentValidation.amountToCents(1)).toBe(100);
      expect(PaymentValidation.amountToCents(100)).toBe(10000);
      expect(PaymentValidation.amountToCents(10000)).toBe(1000000);
    });

    it('should convert fractional amounts correctly', () => {
      expect(PaymentValidation.amountToCents(1.5)).toBe(150);
      expect(PaymentValidation.amountToCents(99.99)).toBe(9999);
      expect(PaymentValidation.amountToCents(0.01)).toBe(1);
    });

    it('should round to avoid floating point issues', () => {
      // 19.99 * 100 = 1998.9999... in floating point
      expect(PaymentValidation.amountToCents(19.99)).toBe(1999);
    });
  });

  describe('calculateFees', () => {
    it('should calculate correct fees for £100 payment', () => {
      const result = PaymentValidation.calculateFees(100);

      // Platform fee: 5% of 100 = 5.00 (within 0.50-50.00 range)
      expect(result.platformFee).toBe(5);
      // Stripe fee: 1.5% + £0.20 = 1.50 + 0.20 = 1.70
      expect(result.stripeFee).toBe(1.7);
      // Total fees: 5.00 + 1.70 = 6.70
      expect(result.totalFees).toBe(6.7);
      // Contractor: 100 - 6.70 = 93.30
      expect(result.contractorAmount).toBe(93.3);
    });

    it('should enforce minimum platform fee of £0.50', () => {
      const result = PaymentValidation.calculateFees(5);

      // 5% of 5 = 0.25, below minimum
      expect(result.platformFee).toBe(0.5);
    });

    it('should enforce maximum platform fee of £50', () => {
      const result = PaymentValidation.calculateFees(2000);

      // 5% of 2000 = 100, above maximum
      expect(result.platformFee).toBe(50);
    });

    it('should calculate UK Stripe rate (1.5% + £0.20)', () => {
      const result = PaymentValidation.calculateFees(200);

      // Stripe fee: 200 * 0.015 + 0.20 = 3.00 + 0.20 = 3.20
      expect(result.stripeFee).toBe(3.2);
    });

    it('should handle small amounts where fees exceed payment', () => {
      const result = PaymentValidation.calculateFees(0.5);

      // Platform fee: min 0.50
      // Stripe fee: 0.5 * 0.015 + 0.20 = 0.2075 ≈ 0.21
      // Total: 0.71
      // Contractor: max(0, 0.5 - 0.71) - could be negative, rounded to 0 or negative
      expect(result.contractorAmount).toBeLessThanOrEqual(0);
    });

    it('should return numbers with at most 2 decimal places', () => {
      const result = PaymentValidation.calculateFees(33.33);
      const twoDecimalRegex = /^-?\d+(\.\d{1,2})?$/;

      expect(result.platformFee.toString()).toMatch(twoDecimalRegex);
      expect(result.stripeFee.toString()).toMatch(twoDecimalRegex);
      expect(result.totalFees.toString()).toMatch(twoDecimalRegex);
    });

    it('should ensure totalFees = platformFee + stripeFee', () => {
      const amounts = [10, 50, 100, 250, 500, 1000, 5000];

      for (const amount of amounts) {
        const result = PaymentValidation.calculateFees(amount);
        const expectedTotal =
          Math.round((result.platformFee + result.stripeFee) * 100) / 100;
        expect(result.totalFees).toBe(expectedTotal);
      }
    });
  });
});
