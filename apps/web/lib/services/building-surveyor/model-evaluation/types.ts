/**
 * Type definitions for Model Evaluation Service
 */

export interface ModelEvaluationMetrics {
  // Core detection metrics
  test_metrics: {
    mAP50: number;           // Mean Average Precision @ IoU 0.5
    mAP50_95: number;        // Mean Average Precision @ IoU 0.5-0.95
    precision: number;       // True Positives / (True Positives + False Positives)
    recall: number;          // True Positives / (True Positives + False Negatives)
    f1_score: number;        // Harmonic mean of precision and recall
  };

  // Validation metrics from training
  validation_metrics: {
    val_loss: number;        // Validation loss
    val_accuracy: number;    // Validation accuracy
    val_box_loss?: number;   // Box regression loss
    val_cls_loss?: number;   // Classification loss
    val_dfl_loss?: number;   // Distribution focal loss
  };

  // Per-class performance
  class_wise_metrics?: {
    [className: string]: {
      precision: number;
      recall: number;
      f1_score: number;
      support: number;       // Number of samples
      ap50: number;          // Average Precision @ IoU 0.5
    };
  };

  // Confusion matrix
  confusion_matrix?: number[][];

  // Training efficiency metrics
  training_metrics?: {
    total_epochs: number;
    best_epoch: number;
    training_time_seconds: number;
    gpu_memory_gb?: number;
    model_size_mb: number;
  };

  // Metadata
  evaluation_timestamp: string;
  model_version: string;
  dataset_version?: string;
  evaluation_type: 'training' | 'validation' | 'test' | 'production';
}

export interface ModelComparisonResult {
  model_a: {
    version: string;
    metrics: ModelEvaluationMetrics;
  };
  model_b: {
    version: string;
    metrics: ModelEvaluationMetrics;
  };

  // Statistical comparison
  comparison: {
    mAP50_improvement: number;        // Percentage improvement
    precision_improvement: number;
    recall_improvement: number;
    f1_improvement: number;

    // Statistical significance
    is_statistically_significant: boolean;
    confidence_level: number;         // e.g., 0.95 for 95% confidence
    p_value?: number;

    // Practical significance
    meets_deployment_threshold: boolean;
    recommendation: 'deploy_a' | 'deploy_b' | 'no_change' | 'needs_more_testing';
    reasoning: string[];
  };

  // Performance comparison
  performance: {
    inference_speed_ratio: number;    // model_b_speed / model_a_speed
    memory_usage_ratio: number;
    model_size_ratio: number;
  };
}

export interface EvaluationOptions {
  test_dataset_path?: string;
  confidence_threshold?: number;
  iou_threshold?: number;
  max_detections?: number;
  device?: 'cpu' | 'cuda';
  batch_size?: number;
  verbose?: boolean;
}

export const DEPLOYMENT_THRESHOLDS = {
  MIN_MAP50: 0.70,
  MIN_PRECISION: 0.75,
  MIN_RECALL: 0.70,
  MIN_F1: 0.72,
  MIN_IMPROVEMENT_FOR_DEPLOYMENT: 0.02  // 2% improvement required
} as const;
