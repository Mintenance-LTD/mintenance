import { expect, it } from 'vitest';
import { calculateDraftQuotePricing } from '@mintenance/shared';

it('rounds each fractional quantity line to pennies before summing and taxing', () => {
  const result = calculateDraftQuotePricing({
    tax_rate_percent: 20,
    line_items: [
      { description: 'Half an hour', quantity: 0.5, unitPrice: 10.01 },
      { description: 'Parts', quantity: 3, unitPrice: 0.1 },
    ],
  });
  expect(result.line_items.map((item) => item.total)).toEqual([5.01, 0.3]);
  expect(result.subtotal).toBe(5.31);
  expect(result.tax_amount).toBe(1.06);
  expect(result.total_amount).toBe(6.37);
});

it.each([0, 5, 20, 100])('uses an explicit percentage of %s', (rate) => {
  const result = calculateDraftQuotePricing({
    tax_rate_percent: rate,
    line_items: [{ description: 'Repair', quantity: 1, unitPrice: 100 }],
  });
  expect(result.tax_amount).toBe(rate);
  expect(result.total_amount).toBe(100 + rate);
});

it('accepts zero-priced items without inventing tax', () => {
  expect(
    calculateDraftQuotePricing({
      tax_rate_percent: 0,
      line_items: [{ description: 'Included', quantity: 1, unitPrice: 0 }],
    }).total_amount
  ).toBe(0);
});

it.each([
  { quantity: 0 },
  { quantity: -1 },
  { quantity: 1.0001 },
  { unitPrice: -1 },
  { unitPrice: 1.001 },
  { unitPrice: Infinity },
  { unitPrice: NaN },
  { description: ' ' },
  { description: 'x'.repeat(501) },
  { quantity: 1_000_000, unitPrice: 1_000_000 },
])('rejects invalid or overflowing items: %j', (overrides) => {
  expect(() =>
    calculateDraftQuotePricing({
      tax_rate_percent: 0,
      line_items: [
        { description: 'Repair', quantity: 1, unitPrice: 1, ...overrides },
      ],
    })
  ).toThrow();
});

it('rejects overflow from the sum or the tax, not just individual lines', () => {
  for (const tax_rate_percent of [0, 100]) {
    expect(() =>
      calculateDraftQuotePricing({
        tax_rate_percent,
        line_items: Array.from({ length: 100 }, () => ({
          description: 'Large project',
          quantity: tax_rate_percent ? 0.6 : 1,
          unitPrice: 1_000_000,
        })),
      })
    ).toThrow(/below/);
  }
});

it('bounds the item count', () => {
  for (const count of [0, 101]) {
    expect(() =>
      calculateDraftQuotePricing({
        tax_rate_percent: 0,
        line_items: Array.from({ length: count }, () => ({
          description: 'Part',
          quantity: 1,
          unitPrice: 1,
        })),
      })
    ).toThrow(/1 and 100/);
  }
});
