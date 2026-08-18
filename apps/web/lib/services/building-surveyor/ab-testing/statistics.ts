/**
 * Statistical analysis helpers for A/B testing
 */

import type { ABTestResult } from './types';

const Z_SCORE_95 = 1.96; // 95% confidence

/**
 * Approximation of the normal cumulative distribution function
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * z);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  const y =
    1.0 - (a5 * t5 + a4 * t4 + a3 * t3 + a2 * t2 + a1 * t) * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

export function calculateStatisticalSignificance(
  controlMetrics: ABTestResult['control_metrics'],
  treatmentMetrics: ABTestResult['treatment_metrics'],
  controlN: number,
  treatmentN: number
): ABTestResult['statistical_significance'] {
  const controlMean = controlMetrics.f1_score;
  const treatmentMean = treatmentMetrics.f1_score;

  // The metric is a rate in [0,1] (f1/precision/recall) and only the mean +
  // sample size are available here — not the per-sample data. Estimate the
  // sampling variance as a proportion: var = p(1-p)/n (the Wald two-proportion
  // model). The previous code hardcoded std = 0.05 regardless of the observed
  // values or N, which made the standard error far too small — every trivial
  // delta read as "significant" — so the z-score and every deploy decision
  // derived from it were meaningless. This still isn't the raw-sample variance
  // (that would need the per-image outcomes plumbed through), but it responds
  // correctly to both the metric values and the sample sizes.
  const clamp01 = (p: number) => Math.min(1, Math.max(0, p));
  const pC = clamp01(controlMean);
  const pT = clamp01(treatmentMean);

  const varC = controlN > 0 ? (pC * (1 - pC)) / controlN : 0;
  const varT = treatmentN > 0 ? (pT * (1 - pT)) / treatmentN : 0;

  // Floor the SE so a degenerate 0/1 rate (zero variance) can't divide by zero.
  const se = Math.max(Math.sqrt(varC + varT), 1e-6);

  // Calculate z-score
  const z = (treatmentMean - controlMean) / se;

  // Calculate p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  // Calculate confidence interval
  const margin = Z_SCORE_95 * se;
  const diff = treatmentMean - controlMean;
  const ci: [number, number] = [diff - margin, diff + margin];

  // Standardized effect size using the pooled-proportion SD.
  const total = controlN + treatmentN;
  const pPool = total > 0 ? (controlN * pC + treatmentN * pT) / total : 0;
  const pooledStd = Math.max(Math.sqrt(pPool * (1 - pPool)), 1e-6);
  const effectSize = (treatmentMean - controlMean) / pooledStd;

  // Calculate statistical power (simplified)
  const power = 1 - normalCDF(Z_SCORE_95 - Math.abs(z));

  return {
    p_value: pValue,
    confidence_interval: ci,
    effect_size: effectSize,
    power: power,
  };
}
