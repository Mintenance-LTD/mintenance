import { expect, it } from 'vitest';
import { platformFeeBreakdown } from '../../../../packages/shared/src/pricing/platform-fees';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
it.each([0.01, 0.5, 1, 1.2, 100, 300])(
  'quote matches actual platform deduction for £%s',
  (amount) => {
    const quote = platformFeeBreakdown(amount, 0.05);
    const actual = FeeCalculationService.calculateFees(amount, {
      platformFeeRate: 0.05,
    });
    expect(quote.platformFee).toBe(actual.platformFee);
    expect(quote.netToContractor).toBe(actual.contractorAmount);
  }
);
