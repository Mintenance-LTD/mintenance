import { describe, it, expect } from 'vitest';
import {
  UK_VAT_RATES,
  VAT_RATE_CODES,
  DEFAULT_VAT_RATE_CODE,
  vatRateFraction,
  vatRatePercent,
  computeVat,
  defaultVatCodeForContractor,
  isVatBearing,
} from '../vat';

describe('UK VAT rates', () => {
  it('exposes the four UK rate codes with correct fractions', () => {
    expect(UK_VAT_RATES.standard.fraction).toBe(0.2);
    expect(UK_VAT_RATES.reduced.fraction).toBe(0.05);
    expect(UK_VAT_RATES.zero.fraction).toBe(0);
    expect(UK_VAT_RATES.exempt.fraction).toBe(0);
    expect(VAT_RATE_CODES).toEqual(['standard', 'reduced', 'zero', 'exempt']);
    expect(DEFAULT_VAT_RATE_CODE).toBe('standard');
  });

  it('converts rate to fraction and percent', () => {
    expect(vatRateFraction('standard')).toBe(0.2);
    expect(vatRatePercent('standard')).toBe(20);
    expect(vatRatePercent('reduced')).toBe(5);
    expect(vatRatePercent('zero')).toBe(0);
    expect(vatRateFraction(null)).toBe(0);
  });

  it('computes VAT rounded to pence', () => {
    expect(computeVat(1000, 'standard')).toBe(200);
    expect(computeVat(1000, 'reduced')).toBe(50);
    expect(computeVat(1000, 'zero')).toBe(0);
    expect(computeVat(1000, 'exempt')).toBe(0);
    expect(computeVat(19.99, 'standard')).toBe(4); // 3.998 -> 4.00
  });
});

describe('contractor VAT gating', () => {
  it('a NON-registered contractor defaults to exempt (cannot charge VAT)', () => {
    const code = defaultVatCodeForContractor(false);
    expect(code).toBe('exempt');
    expect(isVatBearing(code)).toBe(false);
    expect(computeVat(1000, code)).toBe(0);
  });

  it('a registered contractor defaults to the standard rate', () => {
    const code = defaultVatCodeForContractor(true);
    expect(code).toBe('standard');
    expect(isVatBearing(code)).toBe(true);
    expect(computeVat(1000, code)).toBe(200);
  });

  it('zero and exempt are both non-VAT-bearing', () => {
    expect(isVatBearing('zero')).toBe(false);
    expect(isVatBearing('exempt')).toBe(false);
    expect(isVatBearing('reduced')).toBe(true);
  });
});
