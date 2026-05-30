// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { FeeCalculationService } from '../FeeCalculationService';

describe('FeeCalculationService', () => {
  describe('calculateFees', () => {
    it('calculates standard fees for a £100 payment', () => {
      const result = FeeCalculationService.calculateFees(100);

      expect(result.originalAmount).toBe(100);
      expect(result.platformFee).toBe(12); // 12% of £100 (Basic tier)
      expect(result.stripeFee).toBe(1.7); // 1.5% + £0.20
      expect(result.totalFees).toBe(13.7);
      expect(result.contractorAmount).toBe(86.3);
    });

    it('enforces minimum platform fee of £0.50', () => {
      const result = FeeCalculationService.calculateFees(2);

      // 12% of £2 = £0.24, but minimum is £0.50
      expect(result.platformFee).toBe(0.5);
    });

    it('applies no maximum platform fee cap (£50 cap removed 2026-05-22)', () => {
      const result = FeeCalculationService.calculateFees(2000);

      // 12% of £2000 = £240 — tiered-fee rollout removed the old £50 cap
      expect(result.platformFee).toBe(240);
    });

    it('throws for zero amount', () => {
      expect(() => FeeCalculationService.calculateFees(0)).toThrow(
        'Payment amount must be greater than 0'
      );
    });

    it('throws for negative amount', () => {
      expect(() => FeeCalculationService.calculateFees(-10)).toThrow(
        'Payment amount must be greater than 0'
      );
    });

    it('uses deposit rate when specified', () => {
      const result = FeeCalculationService.calculateFees(100, {
        paymentType: 'deposit',
      });

      expect(result.paymentType).toBe('deposit');
      expect(result.platformFeeRate).toBe(0.12);
    });

    it('uses milestone rate when specified', () => {
      const result = FeeCalculationService.calculateFees(100, {
        paymentType: 'milestone',
      });

      expect(result.paymentType).toBe('milestone');
    });

    it('allows custom platform fee rate', () => {
      const result = FeeCalculationService.calculateFees(100, {
        platformFeeRate: 0.1,
      });

      expect(result.platformFee).toBe(10); // 10% of £100
    });

    it('contractor amount is never negative', () => {
      // Very small amount where fees exceed the payment
      const result = FeeCalculationService.calculateFees(0.01);

      expect(result.contractorAmount).toBe(0);
    });

    it('calculates net platform revenue correctly', () => {
      const result = FeeCalculationService.calculateFees(100);

      // Net revenue = platform fee - stripe fee
      expect(result.netPlatformRevenue).toBe(
        result.platformFee - result.stripeFee
      );
    });

    it('rounds all amounts to two decimal places', () => {
      const result = FeeCalculationService.calculateFees(33.33);

      // Check all monetary amounts have at most 2 decimal places
      const check = (n: number) => expect(Math.round(n * 100) / 100).toBe(n);
      check(result.platformFee);
      check(result.stripeFee);
      check(result.totalFees);
      check(result.contractorAmount);
    });
  });

  describe('calculateFeesInCents', () => {
    it('converts from cents and back', () => {
      const result = FeeCalculationService.calculateFeesInCents(10000); // £100 in pence

      expect(result.originalAmount).toBe(10000);
      expect(result.platformFee).toBe(1200); // 12% = 1200p
      expect(result.stripeFee).toBe(170); // 1.5% + 20p = 170p
    });
  });

  describe('calculatePlatformFee', () => {
    it('returns just the platform fee', () => {
      const fee = FeeCalculationService.calculatePlatformFee(200);

      expect(fee).toBe(24); // 12% of £200
    });
  });

  describe('calculateStripeFee', () => {
    it('returns just the Stripe fee', () => {
      const fee = FeeCalculationService.calculateStripeFee(100);

      expect(fee).toBe(1.7); // 1.5% + £0.20
    });
  });

  describe('calculateContractorPayout', () => {
    it('returns the contractor net amount', () => {
      const payout = FeeCalculationService.calculateContractorPayout(100);

      expect(payout).toBe(86.3); // £100 - £12 platform - £1.70 stripe
    });
  });

  describe('validateFeeConfig', () => {
    it('accepts valid configuration', () => {
      expect(() =>
        FeeCalculationService.validateFeeConfig({
          platformFeeRate: 0.05,
          minPlatformFee: 0.5,
          maxPlatformFee: 50,
          stripeFeeRate: 0.015,
          stripeFixedFee: 0.2,
        })
      ).not.toThrow();
    });

    it('rejects platform fee rate > 1', () => {
      expect(() =>
        FeeCalculationService.validateFeeConfig({ platformFeeRate: 1.5 })
      ).toThrow('Platform fee rate must be between 0 and 1');
    });

    it('rejects negative platform fee rate', () => {
      expect(() =>
        FeeCalculationService.validateFeeConfig({ platformFeeRate: -0.1 })
      ).toThrow('Platform fee rate must be between 0 and 1');
    });

    it('rejects min > max platform fee', () => {
      expect(() =>
        FeeCalculationService.validateFeeConfig({
          minPlatformFee: 100,
          maxPlatformFee: 50,
        })
      ).toThrow('Minimum platform fee cannot exceed maximum platform fee');
    });

    it('rejects negative stripe fee rate', () => {
      expect(() =>
        FeeCalculationService.validateFeeConfig({ stripeFeeRate: -0.01 })
      ).toThrow('Stripe fee rate must be between 0 and 1');
    });

    it('rejects negative stripe fixed fee', () => {
      expect(() =>
        FeeCalculationService.validateFeeConfig({ stripeFixedFee: -1 })
      ).toThrow('Stripe fixed fee must be >= 0');
    });
  });

  describe('static getters', () => {
    it('returns correct platform fee rate', () => {
      expect(FeeCalculationService.getPlatformFeeRate('final')).toBe(0.12);
      expect(FeeCalculationService.getPlatformFeeRate('deposit')).toBe(0.12);
      expect(FeeCalculationService.getPlatformFeeRate('milestone')).toBe(0.12);
    });

    it('returns correct stripe fee rate', () => {
      expect(FeeCalculationService.getStripeFeeRate()).toBe(0.015);
    });

    it('returns correct stripe fixed fee', () => {
      expect(FeeCalculationService.getStripeFixedFee()).toBe(0.2);
    });
  });
});
