/**
 * Deployment recommendation logic for model comparison
 */

import type { ModelEvaluationMetrics } from './types';
import { DEPLOYMENT_THRESHOLDS } from './types';

export function generateRecommendation(
  metricsA: ModelEvaluationMetrics,
  metricsB: ModelEvaluationMetrics,
  avgImprovement: number,
  isSignificant: boolean
): {
  decision: 'deploy_a' | 'deploy_b' | 'no_change' | 'needs_more_testing';
  reasoning: string[];
} {
  const reasoning: string[] = [];

  // Check if Model B meets minimum thresholds
  const bMeetsThresholds =
    metricsB.test_metrics.mAP50 >= DEPLOYMENT_THRESHOLDS.MIN_MAP50 &&
    metricsB.test_metrics.precision >= DEPLOYMENT_THRESHOLDS.MIN_PRECISION &&
    metricsB.test_metrics.recall >= DEPLOYMENT_THRESHOLDS.MIN_RECALL &&
    metricsB.test_metrics.f1_score >= DEPLOYMENT_THRESHOLDS.MIN_F1;

  // Check if Model A meets minimum thresholds
  const aMeetsThresholds =
    metricsA.test_metrics.mAP50 >= DEPLOYMENT_THRESHOLDS.MIN_MAP50 &&
    metricsA.test_metrics.precision >= DEPLOYMENT_THRESHOLDS.MIN_PRECISION &&
    metricsA.test_metrics.recall >= DEPLOYMENT_THRESHOLDS.MIN_RECALL &&
    metricsA.test_metrics.f1_score >= DEPLOYMENT_THRESHOLDS.MIN_F1;

  // Decision logic
  if (!bMeetsThresholds && !aMeetsThresholds) {
    reasoning.push('Neither model meets minimum deployment thresholds');
    return { decision: 'needs_more_testing', reasoning };
  }

  if (!bMeetsThresholds && aMeetsThresholds) {
    reasoning.push('Model B does not meet minimum deployment thresholds');
    reasoning.push('Model A meets all deployment criteria');
    return { decision: 'deploy_a', reasoning };
  }

  if (bMeetsThresholds && !isSignificant) {
    reasoning.push('Model B meets thresholds but improvement is not statistically significant');
    reasoning.push(`Average improvement: ${avgImprovement.toFixed(2)}%`);
    return { decision: 'no_change', reasoning };
  }

  if (bMeetsThresholds && isSignificant && avgImprovement > 0) {
    reasoning.push('Model B shows statistically significant improvement');
    reasoning.push(`Average improvement: ${avgImprovement.toFixed(2)}%`);
    reasoning.push(`mAP50: ${metricsB.test_metrics.mAP50.toFixed(3)} (Model B) vs ${metricsA.test_metrics.mAP50.toFixed(3)} (Model A)`);
    return { decision: 'deploy_b', reasoning };
  }

  if (bMeetsThresholds && isSignificant && avgImprovement < 0) {
    reasoning.push('Model B shows statistically significant degradation');
    reasoning.push(`Average degradation: ${Math.abs(avgImprovement).toFixed(2)}%`);
    return { decision: 'deploy_a', reasoning };
  }

  reasoning.push('Unable to make clear recommendation, more testing needed');
  return { decision: 'needs_more_testing', reasoning };
}
