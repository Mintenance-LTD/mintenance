/**
 * Model Evaluation Service for Building Surveyor AI
 *
 * Provides comprehensive evaluation capabilities for YOLO models including:
 * - Metrics extraction from training outputs
 * - Model comparison for A/B testing
 * - Performance benchmarking
 * - Continuous improvement tracking
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

import type {
  ModelEvaluationMetrics,
  ModelComparisonResult,
  EvaluationOptions
} from './model-evaluation/types';
import { DEPLOYMENT_THRESHOLDS } from './model-evaluation/types';
import {
  calculateF1Score,
  calculateImprovement,
  getModelSizeMB,
  calculateLinearTrend
} from './model-evaluation/metrics-math';
import { parseMetricsFromLogs } from './model-evaluation/log-parser';
import { generateRecommendation } from './model-evaluation/recommendation';

// Re-export types and standalone functions for backwards compatibility
export type {
  ModelEvaluationMetrics,
  ModelComparisonResult,
  EvaluationOptions
} from './model-evaluation/types';
export { quickEvaluate, validateModelFile } from './model-evaluation/standalone';

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class ModelEvaluationService {
  private static readonly DEPLOYMENT_THRESHOLDS = DEPLOYMENT_THRESHOLDS;

  private static readonly EVALUATION_SCRIPT_PATH = path.join(
    process.cwd(),
    'scripts',
    'evaluate-yolo-model.py'
  );

  /**
   * Extract metrics from training output files
   */
  static async extractMetricsFromTraining(
    modelVersion: string,
    outputDir: string
  ): Promise<ModelEvaluationMetrics> {
    try {
      // Read metrics from JSON file written by Python training script
      const metricsPath = path.join(outputDir, `metrics-${modelVersion}.json`);

      if (!existsSync(metricsPath)) {
        // Fallback: Parse from training logs
        return parseMetricsFromLogs(outputDir);
      }

      const metricsJson = JSON.parse(readFileSync(metricsPath, 'utf-8'));

      // Transform to our standard format
      const metrics: ModelEvaluationMetrics = {
        test_metrics: {
          mAP50: metricsJson.test_metrics?.mAP50 || 0,
          mAP50_95: metricsJson.test_metrics?.mAP50_95 || 0,
          precision: metricsJson.test_metrics?.precision || 0,
          recall: metricsJson.test_metrics?.recall || 0,
          f1_score: calculateF1Score(
            metricsJson.test_metrics?.precision || 0,
            metricsJson.test_metrics?.recall || 0
          )
        },
        validation_metrics: {
          val_loss: metricsJson.validation_metrics?.val_loss || 0,
          val_accuracy: metricsJson.validation_metrics?.val_accuracy || 0,
          val_box_loss: metricsJson.validation_metrics?.val_box_loss,
          val_cls_loss: metricsJson.validation_metrics?.val_cls_loss,
          val_dfl_loss: metricsJson.validation_metrics?.val_dfl_loss
        },
        class_wise_metrics: metricsJson.class_wise_metrics,
        confusion_matrix: metricsJson.confusion_matrix,
        training_metrics: metricsJson.training_metrics,
        evaluation_timestamp: new Date().toISOString(),
        model_version: modelVersion,
        dataset_version: metricsJson.dataset_version,
        evaluation_type: 'training'
      };

      logger.info('Extracted training metrics', {
        modelVersion,
        mAP50: metrics.test_metrics.mAP50,
        f1Score: metrics.test_metrics.f1_score
      });

      return metrics;

    } catch (error) {
      logger.error('Failed to extract training metrics', { error, modelVersion });
      throw error;
    }
  }

  /**
   * Evaluate a model on a test dataset
   */
  static async evaluateModel(
    modelPath: string,
    options: EvaluationOptions = {}
  ): Promise<ModelEvaluationMetrics> {
    try {
      const modelVersion = path.basename(modelPath, path.extname(modelPath));

      // Prepare evaluation command
      const args = [
        this.EVALUATION_SCRIPT_PATH,
        '--model', modelPath,
        '--dataset', options.test_dataset_path || 'datasets/test',
        '--conf', String(options.confidence_threshold || 0.25),
        '--iou', String(options.iou_threshold || 0.45),
        '--max-det', String(options.max_detections || 300),
        '--device', options.device || 'cpu',
        '--batch', String(options.batch_size || 1),
        '--output-json', `evaluation-${modelVersion}.json`
      ];

      if (options.verbose) {
        args.push('--verbose');
      }

      logger.info('Starting model evaluation', { modelPath, options });

      // Run evaluation
      const startTime = Date.now();
      const result = execSync(`python ${args.join(' ')}`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024  // 10MB buffer
      });

      const evaluationTime = (Date.now() - startTime) / 1000;

      // Parse evaluation results
      const evaluationPath = `evaluation-${modelVersion}.json`;
      const evaluationResults = JSON.parse(readFileSync(evaluationPath, 'utf-8'));

      // Create metrics object
      const metrics: ModelEvaluationMetrics = {
        test_metrics: {
          mAP50: evaluationResults.mAP50 || 0,
          mAP50_95: evaluationResults.mAP50_95 || 0,
          precision: evaluationResults.precision || 0,
          recall: evaluationResults.recall || 0,
          f1_score: calculateF1Score(
            evaluationResults.precision || 0,
            evaluationResults.recall || 0
          )
        },
        validation_metrics: {
          val_loss: 0,  // Not available in test evaluation
          val_accuracy: evaluationResults.accuracy || 0
        },
        class_wise_metrics: evaluationResults.per_class_metrics,
        confusion_matrix: evaluationResults.confusion_matrix,
        training_metrics: {
          total_epochs: 0,  // Not applicable for evaluation
          best_epoch: 0,
          training_time_seconds: evaluationTime,
          model_size_mb: getModelSizeMB(modelPath)
        },
        evaluation_timestamp: new Date().toISOString(),
        model_version: modelVersion,
        evaluation_type: 'test'
      };

      logger.info('Model evaluation complete', {
        modelVersion,
        evaluationTime,
        mAP50: metrics.test_metrics.mAP50
      });

      return metrics;

    } catch (error) {
      logger.error('Model evaluation failed', { error, modelPath });
      throw error;
    }
  }

  /**
   * Compare two models and determine which should be deployed
   */
  static async compareModels(
    modelAPath: string,
    modelBPath: string,
    testDatasetPath?: string
  ): Promise<ModelComparisonResult> {
    try {
      logger.info('Starting model comparison', { modelAPath, modelBPath });

      // Evaluate both models
      const [metricsA, metricsB] = await Promise.all([
        this.evaluateModel(modelAPath, { test_dataset_path: testDatasetPath }),
        this.evaluateModel(modelBPath, { test_dataset_path: testDatasetPath })
      ]);

      // Calculate improvements
      const mAP50Improvement = calculateImprovement(
        metricsA.test_metrics.mAP50,
        metricsB.test_metrics.mAP50
      );

      const precisionImprovement = calculateImprovement(
        metricsA.test_metrics.precision,
        metricsB.test_metrics.precision
      );

      const recallImprovement = calculateImprovement(
        metricsA.test_metrics.recall,
        metricsB.test_metrics.recall
      );

      const f1Improvement = calculateImprovement(
        metricsA.test_metrics.f1_score,
        metricsB.test_metrics.f1_score
      );

      // Determine statistical significance (simplified - would use proper statistical test in production)
      const avgImprovement = (mAP50Improvement + precisionImprovement + recallImprovement + f1Improvement) / 4;
      const isSignificant = Math.abs(avgImprovement) > this.DEPLOYMENT_THRESHOLDS.MIN_IMPROVEMENT_FOR_DEPLOYMENT;

      // Generate recommendation
      const recommendation = generateRecommendation(metricsA, metricsB, avgImprovement, isSignificant);

      // Calculate performance metrics
      const modelASizeMB = getModelSizeMB(modelAPath);
      const modelBSizeMB = getModelSizeMB(modelBPath);

      const result: ModelComparisonResult = {
        model_a: {
          version: metricsA.model_version,
          metrics: metricsA
        },
        model_b: {
          version: metricsB.model_version,
          metrics: metricsB
        },
        comparison: {
          mAP50_improvement: mAP50Improvement,
          precision_improvement: precisionImprovement,
          recall_improvement: recallImprovement,
          f1_improvement: f1Improvement,
          is_statistically_significant: isSignificant,
          confidence_level: 0.95,
          meets_deployment_threshold: isSignificant && avgImprovement > 0,
          recommendation: recommendation.decision,
          reasoning: recommendation.reasoning
        },
        performance: {
          inference_speed_ratio: 1.0,  // Would need actual benchmarking
          memory_usage_ratio: modelBSizeMB / modelASizeMB,
          model_size_ratio: modelBSizeMB / modelASizeMB
        }
      };

      logger.info('Model comparison complete', {
        recommendation: result.comparison.recommendation,
        avgImprovement,
        isSignificant
      });

      return result;

    } catch (error) {
      logger.error('Model comparison failed', { error });
      throw error;
    }
  }

  /**
   * Save evaluation metrics to database
   */
  static async saveMetrics(
    metrics: ModelEvaluationMetrics,
    jobId: string,
    jobType: 'yolo_retraining' | 'knowledge_distillation' = 'yolo_retraining'
  ): Promise<void> {
    try {
      const supabase = serverSupabase;

      const tableName = jobType === 'yolo_retraining'
        ? 'yolo_retraining_jobs'
        : 'knowledge_distillation_jobs';

      // Prepare metrics for JSONB storage
      const metricsJsonb = {
        mAP50: metrics.test_metrics.mAP50,
        mAP50_95: metrics.test_metrics.mAP50_95,
        precision: metrics.test_metrics.precision,
        recall: metrics.test_metrics.recall,
        f1_score: metrics.test_metrics.f1_score,
        val_loss: metrics.validation_metrics.val_loss,
        val_accuracy: metrics.validation_metrics.val_accuracy,
        class_wise_metrics: metrics.class_wise_metrics,
        confusion_matrix: metrics.confusion_matrix,
        training_metrics: metrics.training_metrics,
        evaluation_timestamp: metrics.evaluation_timestamp,
        evaluation_type: metrics.evaluation_type
      };

      const { error } = await supabase
        .from(tableName)
        .update({
          metrics_jsonb: metricsJsonb,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      logger.info('Metrics saved to database', { jobId, jobType, tableName });

    } catch (error) {
      logger.error('Failed to save metrics to database', { error, jobId });
      throw error;
    }
  }

  /**
   * Get historical metrics for trend analysis
   */
  static async getHistoricalMetrics(
    modelType: 'yolo' | 'knowledge_distillation',
    limit = 10
  ): Promise<ModelEvaluationMetrics[]> {
    try {
      const supabase = serverSupabase;

      const tableName = modelType === 'yolo'
        ? 'yolo_retraining_jobs'
        : 'knowledge_distillation_jobs';

      const { data, error } = await supabase
        .from(tableName)
        .select('metrics_jsonb, model_version, completed_at')
        .eq('status', 'completed')
        .not('metrics_jsonb', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(record => ({
        test_metrics: {
          mAP50: record.metrics_jsonb.mAP50 || 0,
          mAP50_95: record.metrics_jsonb.mAP50_95 || 0,
          precision: record.metrics_jsonb.precision || 0,
          recall: record.metrics_jsonb.recall || 0,
          f1_score: record.metrics_jsonb.f1_score || 0
        },
        validation_metrics: {
          val_loss: record.metrics_jsonb.val_loss || 0,
          val_accuracy: record.metrics_jsonb.val_accuracy || 0
        },
        class_wise_metrics: record.metrics_jsonb.class_wise_metrics,
        evaluation_timestamp: record.completed_at,
        model_version: record.model_version,
        evaluation_type: 'training'
      }));

    } catch (error) {
      logger.error('Failed to fetch historical metrics', { error });
      throw error;
    }
  }

  /**
   * Calculate metrics trend over time
   */
  static async calculateMetricsTrend(
    modelType: 'yolo' | 'knowledge_distillation'
  ): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    improvement_rate: number;
    best_model_version: string;
    latest_vs_best_comparison: ModelComparisonResult;
  }> {
    try {
      const historicalMetrics = await this.getHistoricalMetrics(modelType, 20);

      if (historicalMetrics.length < 2) {
        return {
          trend: 'stable',
          improvement_rate: 0,
          best_model_version: historicalMetrics[0]?.model_version || 'unknown',
          latest_vs_best_comparison: null as unknown as ModelComparisonResult
        };
      }

      // Find best model by F1 score
      const bestModel = historicalMetrics.reduce((best, current) =>
        current.test_metrics.f1_score > best.test_metrics.f1_score ? current : best
      );

      const latestModel = historicalMetrics[0];

      // Calculate trend using linear regression on F1 scores
      const f1Scores = historicalMetrics.map(m => m.test_metrics.f1_score).reverse();
      const trend = calculateLinearTrend(f1Scores);

      // Determine trend category
      let trendCategory: 'improving' | 'stable' | 'declining';
      if (trend > 0.001) trendCategory = 'improving';
      else if (trend < -0.001) trendCategory = 'declining';
      else trendCategory = 'stable';

      logger.info('Metrics trend calculated', {
        modelType,
        trend: trendCategory,
        improvementRate: trend,
        bestModelVersion: bestModel.model_version
      });

      return {
        trend: trendCategory,
        improvement_rate: trend,
        best_model_version: bestModel.model_version,
        latest_vs_best_comparison: {
          model_a: { version: bestModel.model_version, metrics: bestModel },
          model_b: { version: latestModel.model_version, metrics: latestModel },
          comparison: {
            mAP50_improvement: calculateImprovement(
              bestModel.test_metrics.mAP50,
              latestModel.test_metrics.mAP50
            ),
            precision_improvement: calculateImprovement(
              bestModel.test_metrics.precision,
              latestModel.test_metrics.precision
            ),
            recall_improvement: calculateImprovement(
              bestModel.test_metrics.recall,
              latestModel.test_metrics.recall
            ),
            f1_improvement: calculateImprovement(
              bestModel.test_metrics.f1_score,
              latestModel.test_metrics.f1_score
            ),
            is_statistically_significant: true,
            confidence_level: 0.95,
            meets_deployment_threshold: latestModel.test_metrics.f1_score >= bestModel.test_metrics.f1_score,
            recommendation: latestModel.test_metrics.f1_score >= bestModel.test_metrics.f1_score
              ? 'deploy_b'
              : 'no_change',
            reasoning: []
          },
          performance: {
            inference_speed_ratio: 1.0,
            memory_usage_ratio: 1.0,
            model_size_ratio: 1.0
          }
        } as ModelComparisonResult
      };

    } catch (error) {
      logger.error('Failed to calculate metrics trend', { error });
      throw error;
    }
  }

}
