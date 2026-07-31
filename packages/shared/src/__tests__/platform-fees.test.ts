import { describe, it, expect } from 'vitest';
import {
  PLATFORM_FEE_RATE_BY_TIER,
  DEFAULT_PLATFORM_FEE_RATE,
  platformFeeRateForTier,
  formatPlatformFeePercent,
  platformFeeBreakdown,
} from '../pricing/platform-fees';

/**
 * Guards the 2026-07-22 fee-consistency fix. Four display surfaces used
 * to hardcode three different percentages (web job detail 8%, both bid
 * screens 5%, mobile placeholder 12%) while the escrow release charged
 * the real tier rate. These tests pin the shared table every surface now
 * reads from.
 */

describe('platform fee rate table', () => {
  it('matches the published pricing tiers', () => {
    // Pricing page: Basic 12%, Professional 8%, Business(enterprise) 5%.
    expect(PLATFORM_FEE_RATE_BY_TIER.basic).toBe(0.12);
    expect(PLATFORM_FEE_RATE_BY_TIER.professional).toBe(0.08);
    expect(PLATFORM_FEE_RATE_BY_TIER.enterprise).toBe(0.05);
    expect(PLATFORM_FEE_RATE_BY_TIER.free).toBe(0.12);
  });

  it('defaults to the Basic (highest) rate so estimates never over-promise', () => {
    expect(DEFAULT_PLATFORM_FEE_RATE).toBe(0.12);
    expect(DEFAULT_PLATFORM_FEE_RATE).toBe(
      Math.max(...Object.values(PLATFORM_FEE_RATE_BY_TIER))
    );
  });
});

describe('platformFeeRateForTier', () => {
  it('resolves the founding-member (enterprise) rate to 5%', () => {
    // The bug in the screenshots: a founding member was shown 8%.
    expect(platformFeeRateForTier('enterprise')).toBe(0.05);
  });

  it('falls back to the default for unknown / missing tiers', () => {
    expect(platformFeeRateForTier(undefined)).toBe(DEFAULT_PLATFORM_FEE_RATE);
    expect(platformFeeRateForTier(null)).toBe(DEFAULT_PLATFORM_FEE_RATE);
    // @ts-expect-error — guarding runtime junk from an API response
    expect(platformFeeRateForTier('platinum')).toBe(DEFAULT_PLATFORM_FEE_RATE);
  });
});

describe('formatPlatformFeePercent', () => {
  it('renders whole percentages without a trailing decimal', () => {
    expect(formatPlatformFeePercent(0.05)).toBe('5%');
    expect(formatPlatformFeePercent(0.08)).toBe('8%');
    expect(formatPlatformFeePercent(0.12)).toBe('12%');
  });

  it('keeps one decimal for fractional percentages', () => {
    expect(formatPlatformFeePercent(0.125)).toBe('12.5%');
  });

  it('the label always matches the rate used in the maths', () => {
    // Regression intent: label and calculation must never diverge again.
    const rate = PLATFORM_FEE_RATE_BY_TIER.enterprise;
    const { platformFee } = platformFeeBreakdown(150, rate);
    expect(formatPlatformFeePercent(rate)).toBe('5%');
    expect(platformFee).toBe(7.5);
  });
});

describe('platformFeeBreakdown', () => {
  it('reproduces the screenshot job at the CORRECT founding rate', () => {
    // £150 bid, founding member. Screen showed 8% -> -£12 -> £138.
    // Correct: 5% -> -£7.50 -> £142.50.
    const b = platformFeeBreakdown(150, 0.05);
    expect(b.platformFee).toBe(7.5);
    expect(b.netToContractor).toBe(142.5);
  });

  it('rounds to 2dp so the quote matches the eventual charge', () => {
    const b = platformFeeBreakdown(133.33, 0.08);
    expect(b.platformFee).toBe(10.67); // 10.6664 -> 10.67
    expect(b.platformFee + b.netToContractor).toBeCloseTo(133.33, 2);
  });

  it('treats non-positive or non-finite amounts as zero', () => {
    expect(platformFeeBreakdown(0, 0.08)).toEqual({
      rate: 0.08,
      platformFee: 0,
      netToContractor: 0,
    });
    expect(platformFeeBreakdown(NaN, 0.08).platformFee).toBe(0);
    expect(platformFeeBreakdown(-50, 0.08).netToContractor).toBe(0);
  });
});
