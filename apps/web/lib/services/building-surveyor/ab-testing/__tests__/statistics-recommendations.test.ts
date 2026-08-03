import { describe, it, expect } from 'vitest';
import { calculateStatisticalSignificance } from '../statistics';
import { generateABTestRecommendation } from '../recommendations';
import type { ABTestConfig, ABTestResult } from '../types';

type Metrics = ABTestResult['control_metrics'];

function metrics(over: Partial<Metrics> = {}): Metrics {
  return {
    mAP50: 0.8,
    precision: 0.9,
    recall: 0.9,
    f1_score: 0.85,
    avg_latency_ms: 100,
    error_rate: 0.01,
    ...over,
  };
}

function config(
  over: Partial<ABTestConfig['success_metrics']> = {}
): ABTestConfig {
  return {
    test_id: 't1',
    name: 'test',
    description: '',
    control_model: { version: '1', path: 'a' },
    treatment_model: { version: '2', path: 'b' },
    traffic_split: { control_percentage: 50, treatment_percentage: 50 },
    minimum_sample_size: 100,
    maximum_duration_days: 7,
    confidence_level: 0.95,
    success_metrics: {
      primary_metric: 'f1_score',
      minimum_improvement: 0.02, // fraction = 2%
      guardrail_metrics: [{ metric: 'precision', max_degradation: 0.05 }], // 5%
      ...over,
    },
    auto_deploy_on_success: true,
    auto_rollback_on_failure: true,
    status: 'running',
    created_at: '2026-01-01',
  };
}

const SIGNIFICANT: ABTestResult['statistical_significance'] = {
  p_value: 0.01,
  confidence_interval: [0.01, 0.09],
  effect_size: 1,
  power: 0.9,
};

// ── #8: 100x units mismatch (percent vs fraction) ─────────────────────────
describe('generateABTestRecommendation — threshold units', () => {
  const N = 500;

  it('deploys when improvement ≥ 2% and significant with no guardrail breach', () => {
    // f1 0.80 → 0.84 = +5%. precision unchanged.
    const rec = generateABTestRecommendation(
      config(),
      metrics({ f1_score: 0.8, precision: 0.9 }),
      metrics({ f1_score: 0.84, precision: 0.9 }),
      SIGNIFICANT,
      N,
      N
    );
    expect(rec.decision).toBe('deploy_treatment');
  });

  it('does NOT deploy a 0.1% improvement (regression: fraction 0.02 = 2%, not 0.02%)', () => {
    // Pre-fix, 0.125% ≥ 0.02 (raw) wrongly cleared the bar.
    const rec = generateABTestRecommendation(
      config(),
      metrics({ f1_score: 0.8 }),
      metrics({ f1_score: 0.801 }),
      SIGNIFICANT,
      N,
      N
    );
    expect(rec.decision).not.toBe('deploy_treatment');
  });

  it('does NOT flag a 1% guardrail degradation as a violation (< 5%)', () => {
    // Pre-fix, 1% > 0.05 (raw) wrongly tripped the guardrail → keep_control.
    const rec = generateABTestRecommendation(
      config(),
      metrics({ f1_score: 0.8, precision: 0.9 }),
      metrics({ f1_score: 0.84, precision: 0.891 }), // ~1% precision drop
      SIGNIFICANT,
      N,
      N
    );
    expect(rec.decision).toBe('deploy_treatment');
  });

  it('flags a 6% guardrail degradation as a violation → keep_control', () => {
    const rec = generateABTestRecommendation(
      config(),
      metrics({ f1_score: 0.8, precision: 0.9 }),
      metrics({ f1_score: 0.84, precision: 0.846 }), // ~6% precision drop
      SIGNIFICANT,
      N,
      N
    );
    expect(rec.decision).toBe('keep_control');
  });
});

// ── #7: fabricated standard deviations ────────────────────────────────────
describe('calculateStatisticalSignificance — proportion variance', () => {
  it('is not significant when means are identical', () => {
    const r = calculateStatisticalSignificance(
      metrics({ f1_score: 0.85 }),
      metrics({ f1_score: 0.85 }),
      1000,
      1000
    );
    expect(r.p_value).toBeGreaterThan(0.05);
  });

  it('does NOT call a 1-point f1 delta at N=1000 significant (the hardcoded-std bug)', () => {
    // Old std=0.05 gave se≈0.0022 → z≈4.5 → "significant". Proportion se≈0.0158.
    const r = calculateStatisticalSignificance(
      metrics({ f1_score: 0.85 }),
      metrics({ f1_score: 0.86 }),
      1000,
      1000
    );
    expect(r.p_value).toBeGreaterThan(0.05);
  });

  it('detects a large, real improvement at large N', () => {
    const r = calculateStatisticalSignificance(
      metrics({ f1_score: 0.8 }),
      metrics({ f1_score: 0.9 }),
      1000,
      1000
    );
    expect(r.p_value).toBeLessThan(0.05);
  });

  it('does not throw or NaN on degenerate perfect scores', () => {
    const r = calculateStatisticalSignificance(
      metrics({ f1_score: 1 }),
      metrics({ f1_score: 1 }),
      50,
      50
    );
    expect(Number.isFinite(r.p_value)).toBe(true);
    expect(r.p_value).toBeGreaterThan(0.05);
    expect(Number.isFinite(r.effect_size)).toBe(true);
  });

  it('always returns a p_value within [0, 1]', () => {
    const r = calculateStatisticalSignificance(
      metrics({ f1_score: 0.5 }),
      metrics({ f1_score: 0.95 }),
      300,
      300
    );
    expect(r.p_value).toBeGreaterThanOrEqual(0);
    expect(r.p_value).toBeLessThanOrEqual(1);
  });
});
