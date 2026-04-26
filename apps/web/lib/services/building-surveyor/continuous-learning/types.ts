/**
 * Continuous Learning Pipeline — type definitions + default config.
 *
 * Extracted from `ContinuousLearningService.ts` (2026-04-26) as part
 * of the 687-line split per the deferred audit P2 backlog.
 */

export interface LearningPipelineConfig {
  // Feedback collection
  minCorrectionsForTraining: number;
  maxCorrectionsPerBatch: number;
  requireExpertApproval: boolean;

  // Retraining triggers
  retrainingIntervalDays: number;
  performanceDegradationThreshold: number;
  driftScoreThreshold: number;

  // Model deployment
  minImprovementForDeployment: number;
  autoDeployOnSuccess: boolean;
  autoRollbackOnFailure: boolean;

  // A/B testing
  abTestingEnabled: boolean;
  abTestTrafficSplit: number; // Percentage for treatment
  abTestMinSamples: number;

  // Monitoring
  alertingEnabled: boolean;
  monitoringIntervalMinutes: number;
}

export interface LearningPipelineStatus {
  isHealthy: boolean;
  lastRetrainingDate?: string;
  nextScheduledRetraining?: string;
  pendingCorrections: number;
  approvedCorrections: number;
  currentModelVersion: string;
  currentModelMetrics?: {
    mAP50: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  activeDrift?: {
    type: string;
    score: number;
  };
  activeABTests: number;
  recentAlerts: Array<{
    type: string;
    severity: string;
    message: string;
    timestamp: string;
  }>;
}

export interface FeedbackQualityMetrics {
  totalCorrections: number;
  approvedCorrections: number;
  rejectedCorrections: number;
  averageConfidenceScore: number;
  expertVerifiedPercentage: number;
  /** How consistent corrections are across similar images. */
  correctionConsistencyScore: number;
}

/**
 * Mutable singleton holding the active pipeline config. Modules in
 * this directory read from / write to this object — keeping it in
 * one place means runtime overrides via `initialize()` are visible
 * to every helper without prop-drilling.
 *
 * NOT exported as `const` because `initialize()` mutates it; module-
 * private mutability is the simplest way to preserve the original
 * `static config` pattern across the split.
 */
export const pipelineConfig: LearningPipelineConfig = {
  minCorrectionsForTraining: 100,
  maxCorrectionsPerBatch: 1000,
  requireExpertApproval: false,
  retrainingIntervalDays: 7,
  performanceDegradationThreshold: 0.05,
  driftScoreThreshold: 0.2,
  minImprovementForDeployment: 0.02,
  autoDeployOnSuccess: false,
  autoRollbackOnFailure: true,
  abTestingEnabled: true,
  abTestTrafficSplit: 50,
  abTestMinSamples: 1000,
  alertingEnabled: true,
  monitoringIntervalMinutes: 60,
};

/**
 * Get the current season — used by drift detection.
 */
export function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}
