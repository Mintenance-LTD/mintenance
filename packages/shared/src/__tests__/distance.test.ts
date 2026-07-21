import { describe, it, expect } from 'vitest';
import {
  kmToMiles,
  milesToKm,
  formatMilesFromKm,
  KM_PER_MILE,
} from '../formatters';

describe('distance conversion', () => {
  it('round-trips km -> miles -> km', () => {
    expect(milesToKm(kmToMiles(42))).toBeCloseTo(42, 10);
  });

  it('uses the exact conversion factor', () => {
    expect(KM_PER_MILE).toBe(1.609344);
    expect(kmToMiles(1.609344)).toBeCloseTo(1, 10);
    expect(milesToKm(1)).toBeCloseTo(1.609344, 10);
  });

  it('converts the radii the discover filter offers', () => {
    // Chips are authored in miles; the query needs km. 30 mi must stay under
    // the server's 50km candidate horizon or the widest chip would silently
    // return nothing beyond it.
    expect(milesToKm(30)).toBeLessThan(50);
    expect(Math.round(milesToKm(10))).toBe(16);
  });
});

describe('formatMilesFromKm()', () => {
  it('formats a short distance to one decimal', () => {
    // 1.6 km is almost exactly a mile.
    expect(formatMilesFromKm(1.609344)).toBe('1.0 mi');
    expect(formatMilesFromKm(5)).toBe('3.1 mi');
  });

  it('drops the decimal at 10 miles and above', () => {
    expect(formatMilesFromKm(16.09344)).toBe('10 mi');
    expect(formatMilesFromKm(40)).toBe('25 mi');
  });

  it('avoids a broken-looking "0.0 mi"', () => {
    expect(formatMilesFromKm(0.05)).toBe('<0.1 mi');
    expect(formatMilesFromKm(0)).toBe('<0.1 mi');
  });

  it('returns an empty string for missing or unusable input', () => {
    expect(formatMilesFromKm(null)).toBe('');
    expect(formatMilesFromKm(undefined)).toBe('');
    expect(formatMilesFromKm(Number.NaN)).toBe('');
  });
});
