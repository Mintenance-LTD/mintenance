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
  // Simplified statistical test - would use proper test in production
  const controlMean = controlMetrics.f1_score;
  const treatmentMean = treatmentMetrics.f1_score;

  // Assumed standard deviations (would calculate from actual data)
  const controlStd = 0.05;
  const treatmentStd = 0.05;

  // Calculate standard error
  const se = Math.sqrt(
    (controlStd * controlStd) / controlN +
      (treatmentStd * treatmentStd) / treatmentN
  );

  // Calculate z-score
  const z = (treatmentMean - controlMean) / (se || 0.001);

  // Calculate p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  // Calculate confidence interval
  const margin = Z_SCORE_95 * se;
  const diff = treatmentMean - controlMean;
  const ci: [number, number] = [diff - margin, diff + margin];

  // Calculate effect size (Cohen's d)
  const pooledStd = Math.sqrt(
    ((controlN - 1) * controlStd * controlStd +
      (treatmentN - 1) * treatmentStd * treatmentStd) /
      (controlN + treatmentN - 2)
  );
  const effectSize = (treatmentMean - controlMean) / (pooledStd || 0.001);

  // Calculate statistical power (simplified)
  const power = 1 - normalCDF(Z_SCORE_95 - Math.abs(z));

  return {
    p_value: pValue,
    confidence_interval: ci,
    effect_size: effectSize,
    power: power,
  };
}
