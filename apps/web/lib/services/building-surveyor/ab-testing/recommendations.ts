/**
 * A/B test recommendation/decision logic
 */

import type { ABTestConfig, ABTestResult } from './types';

export function generateABTestRecommendation(
  config: ABTestConfig,
  controlMetrics: ABTestResult['control_metrics'],
  treatmentMetrics: ABTestResult['treatment_metrics'],
  significance: ABTestResult['statistical_significance'],
  controlN: number,
  treatmentN: number
): {
  decision: 'continue' | 'deploy_treatment' | 'keep_control' | 'inconclusive';
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check sample size
  if (controlN < config.minimum_sample_size || treatmentN < config.minimum_sample_size) {
    reasons.push(`Insufficient samples (need ${config.minimum_sample_size} per variant)`);
    return { decision: 'continue', confidence: 0.3, reasons };
  }

  // Check statistical significance
  const isSignificant = significance.p_value < (1 - config.confidence_level);

  // Calculate improvement on primary metric
  const primaryMetric = config.success_metrics.primary_metric;
  const controlValue = controlMetrics[primaryMetric as keyof ABTestResult['control_metrics']] as number;
  const treatmentValue = treatmentMetrics[primaryMetric as keyof ABTestResult['treatment_metrics']] as number;
  const improvement = ((treatmentValue - controlValue) / controlValue) * 100;

  // Check guardrail metrics
  let guardrailViolation = false;
  for (const guardrail of config.success_metrics.guardrail_metrics) {
    const controlGuardrail = controlMetrics[guardrail.metric as keyof ABTestResult['control_metrics']] as number;
    const treatmentGuardrail = treatmentMetrics[guardrail.metric as keyof ABTestResult['treatment_metrics']] as number;
    const degradation = ((controlGuardrail - treatmentGuardrail) / controlGuardrail) * 100;

    if (degradation > guardrail.max_degradation) {
      guardrailViolation = true;
      reasons.push(`Guardrail violation: ${guardrail.metric} degraded by ${degradation.toFixed(2)}%`);
    }
  }

  // Make recommendation
  if (guardrailViolation) {
    reasons.push('Treatment violates guardrail metrics');
    return { decision: 'keep_control', confidence: 0.9, reasons };
  }

  if (!isSignificant) {
    reasons.push('Results not statistically significant');
    return { decision: 'continue', confidence: 0.5, reasons };
  }

  if (improvement >= config.success_metrics.minimum_improvement) {
    reasons.push(`Treatment shows ${improvement.toFixed(2)}% improvement on ${primaryMetric}`);
    reasons.push('Statistical significance achieved');
    return { decision: 'deploy_treatment', confidence: significance.power, reasons };
  }

  if (improvement < 0) {
    reasons.push(`Treatment shows ${Math.abs(improvement).toFixed(2)}% degradation on ${primaryMetric}`);
    return { decision: 'keep_control', confidence: significance.power, reasons };
  }

  reasons.push('Improvement below minimum threshold');
  return { decision: 'continue', confidence: 0.6, reasons };
}
