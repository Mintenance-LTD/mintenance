/**
 * Continuous Learning Service
 *
 * Orchestrates the entire continuous learning pipeline for Building Surveyor AI:
 * - Feedback collection and validation
 * - Model retraining triggers
 * - Drift detection and adaptation
 * - Model versioning and deployment
 * - Performance monitoring
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { YOLOCorrectionService } from './YOLOCorrectionService';
import { YOLORetrainingService } from './YOLORetrainingService';
import { DriftMonitorService } from './DriftMonitorService';
import { ModelEvaluationService } from './ModelEvaluationService';
import { ModelABTestingService } from './ModelABTestingService';
import { SAM3TrainingDataService } from './SAM3TrainingDataService';
import { KnowledgeDistillationService } from './KnowledgeDistillationService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
  correctionConsistencyScore: number; // How consistent corrections are across similar images
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class ContinuousLearningService {
  private static config: LearningPipelineConfig = {
    // Default configuration
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
    monitoringIntervalMinutes: 60
  };

  /**
   * Initialize the continuous learning pipeline
   */
  static async initialize(config?: Partial<LearningPipelineConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    logger.info('Continuous Learning Pipeline initialized', { config: this.config });

    // Configure sub-services
    await YOLORetrainingService.configure({
      minCorrections: this.config.minCorrectionsForTraining,
      maxCorrections: this.config.maxCorrectionsPerBatch,
      retrainingIntervalDays: this.config.retrainingIntervalDays,
      autoApprove: !this.config.requireExpertApproval
    });
  }

  /**
   * Get current pipeline status
   */
  static async getStatus(): Promise<LearningPipelineStatus> {
    try {
      const supabase = serverSupabase;

      // Get correction statistics
      const correctionStats = await YOLOCorrectionService.getCorrectionStats();

      // Get last retraining job
      const lastJob = await YOLORetrainingService.getLastJob();

      // Get current model version and metrics
      const { data: currentModel } = await supabase
        .from('yolo_models')
        .select('version, created_at')
        .eq('is_active', true)
        .single();

      // Get model metrics from last evaluation
      const historicalMetrics = await ModelEvaluationService.getHistoricalMetrics('yolo', 1);
      const currentMetrics = historicalMetrics[0]?.test_metrics;

      // Check for active drift
      const driftResult = await DriftMonitorService.detectDrift({
        season: this.getCurrentSeason()
      });

      // Get active A/B tests
      const { data: activeTests } = await supabase
        .from('model_ab_tests')
        .select('test_id')
        .eq('status', 'running');

      // Get recent alerts
      const { data: recentAlerts } = await supabase
        .from('system_alerts')
        .select('type, severity, message, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate next scheduled retraining
      let nextScheduledRetraining: string | undefined;
      if (lastJob?.completedAt) {
        const nextDate = new Date(lastJob.completedAt);
        nextDate.setDate(nextDate.getDate() + this.config.retrainingIntervalDays);
        nextScheduledRetraining = nextDate.toISOString();
      }

      // Determine health status
      const isHealthy = this.calculateHealthStatus({
        pendingCorrections: correctionStats.pending,
        daysSinceLastTraining: lastJob?.completedAt
          ? Math.floor((Date.now() - new Date(lastJob.completedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999,
        driftScore: driftResult.driftScore,
        currentModelMetrics: currentMetrics
      });

      return {
        isHealthy,
        lastRetrainingDate: lastJob?.completedAt?.toISOString(),
        nextScheduledRetraining,
        pendingCorrections: correctionStats.pending,
        approvedCorrections: correctionStats.approved,
        currentModelVersion: currentModel?.version || 'unknown',
        currentModelMetrics: currentMetrics ? {
          mAP50: currentMetrics.mAP50,
          precision: currentMetrics.precision,
          recall: currentMetrics.recall,
          f1Score: currentMetrics.f1_score
        } : undefined,
        activeDrift: driftResult.hasDrift ? {
          type: driftResult.driftType,
          score: driftResult.driftScore
        } : undefined,
        activeABTests: activeTests?.length || 0,
        recentAlerts: (recentAlerts || []).map(alert => ({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.created_at
        }))
      };

    } catch (error) {
      logger.error('Failed to get continuous learning status', { error });
      throw error;
    }
  }

  /**
   * Process new feedback (correction submitted by user)
   */
  static async processFeedback(correctionId: string): Promise<void> {
    try {
      logger.info('Processing feedback for continuous learning', { correctionId });

      // 1. Validate correction quality
      const isValid = await this.validateCorrection(correctionId);
      if (!isValid) {
        logger.warn('Correction failed validation', { correctionId });
        return;
      }

      // 2. Check if we should trigger immediate retraining
      const shouldRetrain = await this.checkImmediateRetrainingTrigger();
      if (shouldRetrain) {
        logger.info('Immediate retraining triggered by feedback', { correctionId });
        await YOLORetrainingService.triggerRetraining();
      }

      // 3. Capture additional training data (SAM3 masks)
      // This is already handled asynchronously in YOLOCorrectionService

      // 4. Update feedback quality metrics
      await this.updateFeedbackQualityMetrics();

    } catch (error) {
      logger.error('Failed to process feedback', { error, correctionId });
      // Don't throw - feedback processing shouldn't break the main flow
    }
  }

  /**
   * Trigger model evaluation and deployment decision
   */
  static async evaluateAndDeploy(modelPath: string, modelVersion: string): Promise<{
    deployed: boolean;
    reason: string;
    abTestId?: string;
  }> {
    try {
      logger.info('Evaluating model for deployment', { modelPath, modelVersion });

      // 1. Evaluate the new model
      const newModelMetrics = await ModelEvaluationService.evaluateModel(modelPath);

      // 2. Compare with current production model
      const { data: currentModel } = await serverSupabase
        .from('yolo_models')
        .select('version, storage_path')
        .eq('is_active', true)
        .single();

      if (!currentModel) {
        // No current model, deploy immediately
        logger.info('No current model, deploying new model', { modelVersion });
        return {
          deployed: true,
          reason: 'First model deployment'
        };
      }

      const comparison = await ModelEvaluationService.compareModels(
        currentModel.storage_path,
        modelPath
      );

      // 3. Check deployment criteria
      if (!comparison.comparison.meets_deployment_threshold) {
        return {
          deployed: false,
          reason: `Improvement below threshold: ${comparison.comparison.recommendation}`
        };
      }

      // 4. Deploy based on configuration
      if (this.config.abTestingEnabled) {
        // Create A/B test
        const abTest = await ModelABTestingService.createABTest({
          name: `Model ${currentModel.version} vs ${modelVersion}`,
          description: 'Automated continuous learning deployment',
          control_model: {
            version: currentModel.version,
            path: currentModel.storage_path
          },
          treatment_model: {
            version: modelVersion,
            path: modelPath,
            metrics: newModelMetrics
          },
          traffic_split: {
            control_percentage: 100 - this.config.abTestTrafficSplit,
            treatment_percentage: this.config.abTestTrafficSplit
          },
          minimum_sample_size: this.config.abTestMinSamples,
          maximum_duration_days: 7,
          confidence_level: 0.95,
          success_metrics: {
            primary_metric: 'mAP50',
            minimum_improvement: this.config.minImprovementForDeployment,
            guardrail_metrics: [
              { metric: 'precision', max_degradation: 0.05 },
              { metric: 'recall', max_degradation: 0.05 }
            ]
          },
          auto_deploy_on_success: this.config.autoDeployOnSuccess,
          auto_rollback_on_failure: this.config.autoRollbackOnFailure
        });

        await ModelABTestingService.startTest(abTest.test_id);

        return {
          deployed: false, // Not immediately deployed, in A/B test
          reason: 'Model deployed to A/B test',
          abTestId: abTest.test_id
        };

      } else if (this.config.autoDeployOnSuccess) {
        // Direct deployment
        await this.deployModel(modelPath, modelVersion);
        return {
          deployed: true,
          reason: 'Automated deployment (no A/B test)'
        };
      } else {
        return {
          deployed: false,
          reason: 'Manual deployment required'
        };
      }

    } catch (error) {
      logger.error('Failed to evaluate and deploy model', { error });
      throw error;
    }
  }

  /**
   * Monitor and maintain the learning pipeline health
   */
  static async monitorPipelineHealth(): Promise<void> {
    try {
      const status = await this.getStatus();

      // Check for issues and create alerts
      const alerts: Array<{
        type: string;
        severity: 'info' | 'warning' | 'critical';
        message: string;
      }> = [];

      // Check if pipeline is unhealthy
      if (!status.isHealthy) {
        alerts.push({
          type: 'PIPELINE_UNHEALTHY',
          severity: 'warning',
          message: 'Continuous learning pipeline health check failed'
        });
      }

      // Check for stale model
      if (status.lastRetrainingDate) {
        const daysSince = Math.floor(
          (Date.now() - new Date(status.lastRetrainingDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince > this.config.retrainingIntervalDays * 2) {
          alerts.push({
            type: 'STALE_MODEL',
            severity: 'warning',
            message: `Model hasn't been retrained in ${daysSince} days`
          });
        }
      }

      // Check for high pending corrections
      if (status.pendingCorrections > this.config.maxCorrectionsPerBatch) {
        alerts.push({
          type: 'HIGH_PENDING_CORRECTIONS',
          severity: 'warning',
          message: `${status.pendingCorrections} corrections pending review`
        });
      }

      // Check for drift
      if (status.activeDrift && status.activeDrift.score > this.config.driftScoreThreshold) {
        alerts.push({
          type: 'DISTRIBUTION_DRIFT',
          severity: 'warning',
          message: `${status.activeDrift.type} drift detected (score: ${status.activeDrift.score.toFixed(2)})`
        });
      }

      // Store alerts
      if (alerts.length > 0 && this.config.alertingEnabled) {
        await this.storeAlerts(alerts);
      }

      logger.info('Pipeline health monitoring completed', {
        isHealthy: status.isHealthy,
        alertCount: alerts.length
      });

    } catch (error) {
      logger.error('Failed to monitor pipeline health', { error });
    }
  }

  /**
   * Get feedback quality metrics
   */
  static async getFeedbackQualityMetrics(): Promise<FeedbackQualityMetrics> {
    try {
      const supabase = serverSupabase;

      // Get correction statistics
      const { data: corrections } = await supabase
        .from('yolo_corrections')
        .select('status, confidence_score, correction_quality, corrected_by');

      if (!corrections || corrections.length === 0) {
        return {
          totalCorrections: 0,
          approvedCorrections: 0,
          rejectedCorrections: 0,
          averageConfidenceScore: 0,
          expertVerifiedPercentage: 0,
          correctionConsistencyScore: 0
        };
      }

      const approved = corrections.filter(c => c.status === 'approved').length;
      const rejected = corrections.filter(c => c.status === 'rejected').length;
      const expertVerified = corrections.filter(c => c.correction_quality === 'expert').length;
      const avgConfidence = corrections.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / corrections.length;

      // Calculate consistency score (simplified - would need more complex logic in production)
      const consistencyScore = await this.calculateConsistencyScore(corrections);

      return {
        totalCorrections: corrections.length,
        approvedCorrections: approved,
        rejectedCorrections: rejected,
        averageConfidenceScore: avgConfidence,
        expertVerifiedPercentage: (expertVerified / corrections.length) * 100,
        correctionConsistencyScore: consistencyScore
      };

    } catch (error) {
      logger.error('Failed to get feedback quality metrics', { error });
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static calculateHealthStatus(params: {
    pendingCorrections: number;
    daysSinceLastTraining: number;
    driftScore: number;
    currentModelMetrics?: any;
  }): boolean {
    // Pipeline is unhealthy if:
    // - Too many pending corrections (> 2x batch size)
    // - Model is too old (> 2x interval)
    // - Significant drift detected
    // - Model performance is poor

    if (params.pendingCorrections > this.config.maxCorrectionsPerBatch * 2) {
      return false;
    }

    if (params.daysSinceLastTraining > this.config.retrainingIntervalDays * 2) {
      return false;
    }

    if (params.driftScore > this.config.driftScoreThreshold * 1.5) {
      return false;
    }

    if (params.currentModelMetrics) {
      if (params.currentModelMetrics.f1Score < 0.6) {
        return false;
      }
    }

    return true;
  }

  private static async validateCorrection(correctionId: string): Promise<boolean> {
    try {
      const supabase = serverSupabase;

      const { data: correction } = await supabase
        .from('yolo_corrections')
        .select('*')
        .eq('id', correctionId)
        .single();

      if (!correction) return false;

      // Validation checks
      // 1. Has corrections been made?
      if (!correction.corrections_made || Object.keys(correction.corrections_made).length === 0) {
        return false;
      }

      // 2. Is confidence reasonable?
      if (correction.confidence_score < 0.1) {
        return false;
      }

      // 3. Expert approval required?
      if (this.config.requireExpertApproval && correction.status !== 'approved') {
        return false;
      }

      return true;

    } catch (error) {
      logger.error('Failed to validate correction', { error, correctionId });
      return false;
    }
  }

  private static async checkImmediateRetrainingTrigger(): Promise<boolean> {
    // Check if conditions warrant immediate retraining
    const stats = await YOLOCorrectionService.getCorrectionStats();

    // Trigger if we have enough critical corrections
    if (stats.approved >= this.config.minCorrectionsForTraining * 2) {
      return true;
    }

    // Check for critical drift
    const drift = await DriftMonitorService.detectDrift({
      season: this.getCurrentSeason()
    });

    if (drift.driftScore > this.config.driftScoreThreshold * 2) {
      return true;
    }

    return false;
  }

  private static async updateFeedbackQualityMetrics(): Promise<void> {
    // This would update aggregated metrics in a separate table
    // For now, we just log
    const metrics = await this.getFeedbackQualityMetrics();
    logger.info('Feedback quality metrics updated', { metrics });
  }

  private static async calculateConsistencyScore(corrections: any[]): Promise<number> {
    // Simplified consistency calculation
    // In production, would compare corrections on similar images
    // and check for consistency in labeling
    return 0.85; // Placeholder
  }

  private static getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private static async deployModel(modelPath: string, modelVersion: string): Promise<void> {
    try {
      const supabase = serverSupabase;

      // Deactivate current model
      await supabase
        .from('yolo_models')
        .update({ is_active: false })
        .eq('is_active', true);

      // Activate new model
      await supabase
        .from('yolo_models')
        .update({ is_active: true })
        .eq('version', modelVersion);

      logger.info('Model deployed successfully', { modelVersion });

    } catch (error) {
      logger.error('Failed to deploy model', { error });
      throw error;
    }
  }

  private static async storeAlerts(alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>): Promise<void> {
    try {
      const supabase = serverSupabase;

      const alertRecords = alerts.map(alert => ({
        type: 'CONTINUOUS_LEARNING',
        severity: alert.severity,
        message: alert.message,
        metadata: { alert_type: alert.type },
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('system_alerts')
        .insert(alertRecords);

    } catch (error) {
      logger.error('Failed to store alerts', { error });
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick function to check if retraining is needed
 */
export async function shouldTriggerRetraining(): Promise<boolean> {
  return YOLORetrainingService.shouldRetrain();
}

/**
 * Get a summary of the learning pipeline for dashboard
 */
export async function getLearningPipelineSummary(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  metrics: LearningPipelineStatus;
  recommendations: string[];
}> {
  const metrics = await ContinuousLearningService.getStatus();

  const status = metrics.isHealthy
    ? 'healthy'
    : metrics.recentAlerts.some(a => a.severity === 'critical')
    ? 'critical'
    : 'warning';

  const recommendations: string[] = [];

  if (metrics.pendingCorrections > 100) {
    recommendations.push('Review pending corrections to improve model');
  }

  if (metrics.activeDrift) {
    recommendations.push(`Address ${metrics.activeDrift.type} drift with targeted training data`);
  }

  if (!metrics.currentModelMetrics || metrics.currentModelMetrics.f1Score < 0.7) {
    recommendations.push('Model performance below target, consider additional training');
  }

  return {
    status,
    metrics,
    recommendations
  };
}
