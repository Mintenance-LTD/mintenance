import { describe, expect, it } from 'vitest';
import { demoConfidence, demoRepairCost } from './assessment-display-metrics';

describe('Mint AI demo evidence metrics', () => {
  it('preserves zero confidence, and never invents a confidence for missing or invalid values', () => {
    expect(demoConfidence(0)).toBe(0);
    expect(demoConfidence(62)).toBe(62);
    for (const value of [null, undefined, NaN, Infinity, -1, 101, '75']) {
      expect(demoConfidence(value)).toBeNull();
    }
  });

  it('displays only complete, ordered, finite repair ranges', () => {
    expect(demoRepairCost(0, 125)).toEqual({ min: 0, max: 125 });
    expect(demoRepairCost(100, 250)).toEqual({ min: 100, max: 250 });
    expect(demoRepairCost(undefined, 250)).toBeNull();
    expect(demoRepairCost(100, null)).toBeNull();
    expect(demoRepairCost(250, 100)).toBeNull();
    expect(demoRepairCost(-5, 100)).toBeNull();
    expect(demoRepairCost(0, 0)).toBeNull();
    expect(demoRepairCost(0, Infinity)).toBeNull();
  });
});
