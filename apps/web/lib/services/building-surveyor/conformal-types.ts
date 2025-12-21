/**
 * Type definitions for Conformal Prediction integration
 * Used by HybridInferenceService for calibrated uncertainty quantification
 */

import type {
  ConformalPredictionInterval,
  PropertyAgeCategory,
  SeverityLevel,
  PredictionScores
} from '@mintenance/shared/src/services/conformal-prediction';

/**
 * Conformal prediction data used in routing decisions
 */
export interface ConformalPredictionData {
  /** The prediction interval containing severity levels with guaranteed coverage */
  interval: ConformalPredictionInterval;

  /** Stratum identifier used for Mondrian conformal prediction */
  stratum: string;

  /** Number of classes in the prediction set (1 = certain, 2+ = uncertain) */
  intervalSize: number;

  /** True if prediction interval contains only 1 class (high certainty) */
  isCertain: boolean;

  /** Property age category used for stratification */
  propertyAgeCategory: PropertyAgeCategory;

  /** Whether calibration data was available for this prediction */
  calibrationAvailable: boolean;
}

/**
 * Routing decision metrics for conformal prediction
 */
export interface ConformalRoutingMetrics {
  /** Total assessments using conformal prediction */
  totalWithConformal: number;

  /** Total assessments without conformal prediction (fallback) */
  totalWithoutConformal: number;

  /** Average size of prediction intervals */
  averageIntervalSize: number;

  /** Distribution of predictions by stratum */
  stratumDistribution: Record<string, number>;

  /** Routing decisions grouped by interval size */
  routingByIntervalSize: Record<number, {
    internal: number;
    hybrid: number;
    gpt4: number;
  }>;

  /** Percentage of assessments with calibration available */
  calibrationCoverage: number;
}

/**
 * Conformal calibration sample for continuous learning
 */
export interface ConformalCalibrationSample {
  /** Unique assessment ID */
  assessmentId: string;

  /** Stratum for Mondrian conformal prediction */
  stratum: string;

  /** Property age category */
  propertyAgeCategory: PropertyAgeCategory;

  /** Normalized damage category */
  damageCategory: string;

  /** Predicted severity level */
  predictedSeverity: SeverityLevel;

  /** Prediction confidence (0-100) */
  predictedConfidence: number;

  /** Full prediction scores for all severity levels */
  predictionScores: PredictionScores;

  /** True severity from validation */
  trueSeverity: SeverityLevel;

  /** True damage type from validation */
  trueDamageType: string;

  /** Source of ground truth */
  groundTruthSource: 'expert_validation' | 'repair_outcome' | 'contractor_feedback';

  /** Nonconformity score for this prediction */
  nonconformityScore: number;
}

/**
 * Conformal prediction configuration
 */
export interface ConformalPredictionConfig {
  /** Target confidence level for prediction intervals (default: 0.90) */
  confidenceLevel: number;

  /** Minimum samples required for stratum calibration */
  minCalibrationSamples: number;

  /** Enable small sample beta correction */
  enableSSBC: boolean;

  /** Maximum age of calibration data in days */
  maxCalibrationAge: number;

  /** Recalibration threshold (percentage of new samples) */
  recalibrationThreshold: number;
}

/**
 * Interval-based routing thresholds
 */
export interface IntervalRoutingThresholds {
  /** Max interval size for internal routing (default: 1) */
  internalMaxInterval: number;

  /** Max interval size for hybrid routing (default: 2) */
  hybridMaxInterval: number;

  /** Interval size above which to use GPT-4 (default: 3+) */
  gpt4MinInterval: number;
}

export type {
  ConformalPredictionInterval,
  PropertyAgeCategory,
  SeverityLevel,
  PredictionScores
};