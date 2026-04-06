/**
 * A/B Testing Type Definitions
 */

import { ModelEvaluationMetrics } from '../ModelEvaluationService';

export interface ABTestConfig {
  test_id: string;
  name: string;
  description: string;

  // Model versions
  control_model: {
    version: string;
    path: string;
    metrics?: ModelEvaluationMetrics;
  };

  treatment_model: {
    version: string;
    path: string;
    metrics?: ModelEvaluationMetrics;
  };

  // Traffic configuration
  traffic_split: {
    control_percentage: number;      // 0-100
    treatment_percentage: number;     // 0-100
    ramp_up_schedule?: {             // Gradual rollout
      day: number;
      percentage: number;
    }[];
  };

  // Test parameters
  minimum_sample_size: number;        // Per variant
  maximum_duration_days: number;
  confidence_level: number;           // e.g., 0.95

  // Success criteria
  success_metrics: {
    primary_metric: 'mAP50' | 'precision' | 'recall' | 'f1_score' | 'latency';
    minimum_improvement: number;       // Percentage
    guardrail_metrics: {              // Metrics that shouldn't degrade
      metric: string;
      max_degradation: number;         // Percentage
    }[];
  };

  // Auto-actions
  auto_deploy_on_success: boolean;
  auto_rollback_on_failure: boolean;

  // Status
  status: 'draft' | 'running' | 'paused' | 'completed' | 'rolled_back';
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ABTestResult {
  test_id: string;
  timestamp: string;

  // Sample sizes
  control_samples: number;
  treatment_samples: number;

  // Performance metrics
  control_metrics: {
    mAP50: number;
    precision: number;
    recall: number;
    f1_score: number;
    avg_latency_ms: number;
    error_rate: number;
  };

  treatment_metrics: {
    mAP50: number;
    precision: number;
    recall: number;
    f1_score: number;
    avg_latency_ms: number;
    error_rate: number;
  };

  // Statistical analysis
  statistical_significance: {
    p_value: number;
    confidence_interval: [number, number];
    effect_size: number;
    power: number;
  };

  // Decision
  recommendation: 'continue' | 'deploy_treatment' | 'keep_control' | 'inconclusive';
  confidence: number;
  reasons: string[];
}

export interface ModelAssignment {
  user_id?: string;
  session_id: string;
  assigned_model: 'control' | 'treatment';
  assignment_timestamp: string;
  assignment_method: 'random' | 'hash' | 'sticky';
}
