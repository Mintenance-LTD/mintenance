import { logger } from '@mintenance/shared';

/**
 * Model Performance Service - Model metrics and evaluation
 */
// Temporary types
interface ModelPerformance {
  modelId: string;
  version: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    mse?: number;
    mae?: number;
    r2Score?: number;
  };
  confusionMatrix?: number[][];
  classLabels?: string[];
  featureImportance?: { feature: string; importance: number }[];
  performanceByClass?: {
    className: string;
    precision: number;
    recall: number;
    f1Score: number;
    support: number;
  }[];
  performanceOverTime: {
    timestamp: string;
    accuracy: number;
    latency: number;
    throughput: number;
  }[];
  comparisonWithBaseline?: {
    metric: string;
    current: number;
    baseline: number;
    improvement: number;
  }[];
  lastEvaluated: string;
}
interface Model {
  id: string;
  name: string;
  version: string;
  status: 'development' | 'testing' | 'staging' | 'production' | 'retired';
  type: 'classification' | 'regression' | 'clustering' | 'recommendation';
  algorithm: string;
  createdAt: string;
  deployedAt?: string;
  retiredAt?: string;
  author: string;
  description?: string;
  tags: string[];
  config: Record<string, unknown>;
  metrics?: unknown;
}
interface DetailedPerformance {
  model: Model;
  performance: ModelPerformance;
  confusionMatrix?: {
    matrix: number[][];
    labels: string[];
    accuracy: number;
    misclassificationRate: number;
  };
  examples?: {
    predictions: {
      id: string;
      input: unknown;
      predicted: string | number;
      actual: string | number;
      confidence: number;
      correct: boolean;
      timestamp: string;
    }[];
    worstPerforming: unknown[];
    bestPerforming: unknown[];
  };
  driftIndicators?: {
    featureDrift: { feature: string; driftScore: number; threshold: number }[];
    predictionDrift: number;
    performanceDrift: number;
  };
}
export class ModelPerformanceService {
  private supabase: unknown;
  constructor(config: { supabase: unknown }) {
    this.supabase = config.supabase;
  }
  /**
   * Get model performance metrics
   */
  async getModelPerformance(modelVersion?: string): Promise<ModelPerformance> {
    try {
      // Get the current production model if no version specified
      let modelId = modelVersion;
      if (!modelId) {
        const { data: prodModel } = await this.supabase
          .from('ml_models')
          .select('id, version')
          .eq('status', 'production')
          .single();
        if (prodModel) {
          modelId = prodModel.id;
        }
      }
      if (!modelId) {
        return this.getDefaultPerformance();
      }
      // Get performance metrics
      const { data: metrics } = await this.supabase
        .from('ml_model_metrics')
        .select('*')
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      // Get performance history
      const { data: history } = await this.supabase
        .from('ml_model_performance_history')
        .select('timestamp, accuracy, latency, throughput')
        .eq('model_id', modelId)
        .order('timestamp', { ascending: false })
        .limit(100);
      // Get feature importance
      const { data: features } = await this.supabase
        .from('ml_feature_importance')
        .select('feature, importance')
        .eq('model_id', modelId)
        .order('importance', { ascending: false })
        .limit(20);
      // Get class-wise performance
      const { data: classPerf } = await this.supabase
        .from('ml_class_performance')
        .select('*')
        .eq('model_id', modelId);
      // Get baseline comparison
      const comparison = await this.getBaselineComparison(modelId);
      return {
        modelId: modelId,
        version: metrics?.version || 'unknown',
        metrics: {
          accuracy: metrics?.accuracy || 0,
          precision: metrics?.precision || 0,
          recall: metrics?.recall || 0,
          f1Score: metrics?.f1_score || 0,
          auc: metrics?.auc || 0,
          mse: metrics?.mse,
          mae: metrics?.mae,
          r2Score: metrics?.r2_score
        },
        confusionMatrix: metrics?.confusion_matrix,
        classLabels: metrics?.class_labels,
        featureImportance: features || [],
        performanceByClass: classPerf?.map((cp: unknown) => ({
          className: cp.class_name,
          precision: cp.precision,
          recall: cp.recall,
          f1Score: cp.f1_score,
          support: cp.support
        })) || [],
        performanceOverTime: history || [],
        comparisonWithBaseline: comparison,
        lastEvaluated: metrics?.created_at || new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting model performance:', error);
      return this.getDefaultPerformance();
    }
  }
  /**
   * List all models with filtering
   */
  async listModels(params: {
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ models: Model[]; total: number }> {
    try {
      let query = this.supabase
        .from('ml_models')
        .select('*, count', { count: 'exact' });
      if (params.status) {
        query = query.eq('status', params.status);
      }
      query = query
        .order('created_at', { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);
      const { data: models, count } = await query;
      // Get latest metrics for each model
      const modelIds = models?.map((m: unknown) => m.id) || [];
      const { data: metrics } = await this.supabase
        .from('ml_model_metrics')
        .select('model_id, accuracy, precision, recall, f1_score')
        .in('model_id', modelIds);
      // Map metrics to models
      const metricsMap = new Map(metrics?.map((m: unknown) => [m.model_id, m]) || []);
      return {
        models: models?.map((model: unknown) => ({
          id: model.id,
          name: model.name,
          version: model.version,
          status: model.status,
          type: model.type,
          algorithm: model.algorithm,
          createdAt: model.created_at,
          deployedAt: model.deployed_at,
          retiredAt: model.retired_at,
          author: model.author,
          description: model.description,
          tags: model.tags || [],
          config: model.config,
          metrics: metricsMap.get(model.id)
        })) || [],
        total: count || 0
      };
    } catch (error) {
      logger.error('Error listing models:', error);
      return { models: [], total: 0 };
    }
  }
  /**
   * Get detailed performance with optional confusion matrix and examples
   */
  async getDetailedPerformance(
    modelId: string,
    options: {
      includeConfusionMatrix?: boolean;
      includeExamples?: boolean;
    }
  ): Promise<DetailedPerformance> {
    try {
      // Get model details
      const { data: model } = await this.supabase
        .from('ml_models')
        .select('*')
        .eq('id', modelId)
        .single();
      if (!model) {
        throw new Error('Model not found');
      }
      // Get performance metrics
      const performance = await this.getModelPerformance(modelId);
      const result: DetailedPerformance = {
        model: {
          id: model.id,
          name: model.name,
          version: model.version,
          status: model.status,
          type: model.type,
          algorithm: model.algorithm,
          createdAt: model.created_at,
          deployedAt: model.deployed_at,
          retiredAt: model.retired_at,
          author: model.author,
          description: model.description,
          tags: model.tags || [],
          config: model.config
        },
        performance
      };
      // Include confusion matrix if requested
      if (options.includeConfusionMatrix && performance.confusionMatrix) {
        const matrix = performance.confusionMatrix;
        const total = matrix.flat().reduce((sum, val) => sum + val, 0);
        const correct = matrix.reduce((sum, row, i) => sum + row[i], 0);
        result.confusionMatrix = {
          matrix,
          labels: performance.classLabels || [],
          accuracy: correct / total,
          misclassificationRate: 1 - (correct / total)
        };
      }
      // Include examples if requested
      if (options.includeExamples) {
        const { data: predictions } = await this.supabase
          .from('ml_predictions')
          .select('*')
          .eq('model_id', modelId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (predictions && predictions.length > 0) {
          // Sort by confidence to get best and worst
          const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence);
          result.examples = {
            predictions: predictions.slice(0, 20).map((p: unknown) => ({
              id: p.id,
              input: p.input_data,
              predicted: p.predicted_value,
              actual: p.actual_value,
              confidence: p.confidence,
              correct: p.predicted_value === p.actual_value,
              timestamp: p.created_at
            })),
            worstPerforming: sorted.slice(-10),
            bestPerforming: sorted.slice(0, 10)
          };
        }
      }
      // Include drift indicators
      const drift = await this.getDriftIndicators(modelId);
      if (drift) {
        result.driftIndicators = drift;
      }
      return result;
    } catch (error) {
      logger.error('Error getting detailed performance:', error);
      throw error;
    }
  }
  // ============= Private Helper Methods =============
  private getDefaultPerformance(): ModelPerformance {
    return {
      modelId: 'default',
      version: '0.0.0',
      metrics: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        auc: 0
      },
      performanceOverTime: [],
      lastEvaluated: new Date().toISOString()
    };
  }
  private async getBaselineComparison(modelId: string): Promise<any[]> {
    try {
      // Get baseline model metrics
      const { data: baseline } = await this.supabase
        .from('ml_baseline_metrics')
        .select('*')
        .single();
      // Get current model metrics
      const { data: current } = await this.supabase
        .from('ml_model_metrics')
        .select('*')
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!baseline || !current) return [];
      return [
        {
          metric: 'Accuracy',
          current: current.accuracy,
          baseline: baseline.accuracy,
          improvement: ((current.accuracy - baseline.accuracy) / baseline.accuracy) * 100
        },
        {
          metric: 'Precision',
          current: current.precision,
          baseline: baseline.precision,
          improvement: ((current.precision - baseline.precision) / baseline.precision) * 100
        },
        {
          metric: 'Recall',
          current: current.recall,
          baseline: baseline.recall,
          improvement: ((current.recall - baseline.recall) / baseline.recall) * 100
        },
        {
          metric: 'F1 Score',
          current: current.f1_score,
          baseline: baseline.f1_score,
          improvement: ((current.f1_score - baseline.f1_score) / baseline.f1_score) * 100
        }
      ];
    } catch (error) {
      logger.error('Error getting baseline comparison:', error);
      return [];
    }
  }
  private async getDriftIndicators(modelId: string): Promise<unknown> {
    try {
      const { data: drift } = await this.supabase
        .from('ml_drift_metrics')
        .select('*')
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!drift) return null;
      return {
        featureDrift: drift.feature_drift || [],
        predictionDrift: drift.prediction_drift || 0,
        performanceDrift: drift.performance_drift || 0
      };
    } catch (error) {
      logger.error('Error getting drift indicators:', error);
      return null;
    }
  }
}