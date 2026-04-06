/**
 * Metric calculation helpers for A/B testing
 */

import type { ABTestResult } from './types';

export function calculateVariantMetrics(data: Record<string, unknown>[]): ABTestResult['control_metrics'] {
  if (data.length === 0) {
    return {
      mAP50: 0,
      precision: 0,
      recall: 0,
      f1_score: 0,
      avg_latency_ms: 0,
      error_rate: 0
    };
  }

  const successfulInferences = data.filter((d: Record<string, unknown>) => d.success);
  const avgLatency = data.reduce((sum: number, d: Record<string, unknown>) => sum + ((d.latency_ms as number) || 0), 0) / data.length;
  const errorRate = (data.length - successfulInferences.length) / data.length;
  const avgConfidence = successfulInferences.reduce((sum: number, d: Record<string, unknown>) => sum + ((d.avg_confidence as number) || 0), 0) /
                       (successfulInferences.length || 1);

  // These would come from actual model evaluation
  // For now, using confidence as a proxy
  return {
    mAP50: avgConfidence * 0.9,  // Simplified
    precision: avgConfidence * 0.85,
    recall: avgConfidence * 0.88,
    f1_score: avgConfidence * 0.86,
    avg_latency_ms: avgLatency,
    error_rate: errorRate
  };
}

export function createInconclusiveResult(testId: string, reason: string): ABTestResult {
  return {
    test_id: testId,
    timestamp: new Date().toISOString(),
    control_samples: 0,
    treatment_samples: 0,
    control_metrics: {
      mAP50: 0,
      precision: 0,
      recall: 0,
      f1_score: 0,
      avg_latency_ms: 0,
      error_rate: 0
    },
    treatment_metrics: {
      mAP50: 0,
      precision: 0,
      recall: 0,
      f1_score: 0,
      avg_latency_ms: 0,
      error_rate: 0
    },
    statistical_significance: {
      p_value: 1,
      confidence_interval: [0, 0],
      effect_size: 0,
      power: 0
    },
    recommendation: 'inconclusive',
    confidence: 0,
    reasons: [reason]
  };
}
