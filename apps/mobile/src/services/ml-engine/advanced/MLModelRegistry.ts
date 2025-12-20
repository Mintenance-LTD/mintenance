/**
 * ML Model Registry
 *
 * Handles model storage, versioning, and metadata management
 */

import { logger } from '../../../utils/logger';
import { MLModel } from './types';

export class MLModelRegistry {
  private models: Map<string, MLModel> = new Map();
  private modelCache: Map<string, any> = new Map();

  constructor() {
    this.initializeBuiltInModels();
  }

  /**
   * Initialize built-in ML models
   */
  private initializeBuiltInModels(): void {
    // Contractor Matching Model
    this.registerModel({
      id: 'contractor_matching_v2',
      name: 'Advanced Contractor Matching',
      version: '2.0.0',
      type: 'ranking',
      status: 'deployed',
      accuracy: 0.87,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      metadata: {
        features: ['skills_match', 'location_distance', 'price_compatibility', 'rating', 'availability'],
        algorithm: 'xgboost',
        trainingData: 'contractor_interactions_2024'
      }
    });

    // Job Recommendation Model
    this.registerModel({
      id: 'job_recommendation_v1',
      name: 'Job Recommendation Engine',
      version: '1.0.0',
      type: 'recommendation',
      status: 'deployed',
      accuracy: 0.82,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      metadata: {
        features: ['job_history', 'skills', 'preferences', 'location', 'time_patterns'],
        algorithm: 'neural_network',
        trainingData: 'job_interactions_2024'
      }
    });

    // Price Prediction Model
    this.registerModel({
      id: 'price_prediction_v1',
      name: 'Smart Price Prediction',
      version: '1.0.0',
      type: 'regression',
      status: 'deployed',
      accuracy: 0.79,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      metadata: {
        features: ['job_complexity', 'location', 'season', 'materials', 'labor_hours'],
        algorithm: 'random_forest',
        trainingData: 'completed_jobs_pricing_2024'
      }
    });

    // Fraud Detection Model
    this.registerModel({
      id: 'fraud_detection_v1',
      name: 'Fraud Detection System',
      version: '1.0.0',
      type: 'classification',
      status: 'deployed',
      accuracy: 0.94,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      metadata: {
        features: ['user_behavior', 'payment_patterns', 'device_info', 'velocity_checks'],
        algorithm: 'xgboost',
        trainingData: 'transaction_history_2024'
      }
    });

    logger.info('MLModelRegistry', 'Built-in ML models initialized', {
      modelCount: this.models.size
    });
  }

  /**
   * Register a new ML model
   */
  registerModel(model: MLModel): void {
    this.models.set(model.id, model);
    logger.info('MLModelRegistry', 'Model registered', {
      modelId: model.id,
      modelName: model.name,
      version: model.version
    });
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): MLModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * Update model metadata
   */
  updateModel(modelId: string, updates: Partial<MLModel>): void {
    const model = this.models.get(modelId);
    if (model) {
      Object.assign(model, updates);
      model.lastUpdated = Date.now();
      logger.info('MLModelRegistry', 'Model updated', { modelId });
    }
  }

  /**
   * List all models
   */
  listModels(filter?: { status?: MLModel['status']; type?: MLModel['type'] }): MLModel[] {
    const allModels = Array.from(this.models.values());

    if (!filter) {
      return allModels;
    }

    return allModels.filter(model => {
      if (filter.status && model.status !== filter.status) return false;
      if (filter.type && model.type !== filter.type) return false;
      return true;
    });
  }

  /**
   * Warmup model for inference
   */
  async warmupModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      this.modelCache.set(`warmup_${modelId}`, true);
      logger.info('MLModelRegistry', 'Model warmed up', { modelId });
    }
  }

  /**
   * Get cache for model
   */
  getModelCache(key: string): any {
    return this.modelCache.get(key);
  }

  /**
   * Set cache for model
   */
  setModelCache(key: string, value: any): void {
    this.modelCache.set(key, value);
  }

  /**
   * Clear model cache
   */
  clearModelCache(modelId?: string): void {
    if (modelId) {
      const keysToDelete = Array.from(this.modelCache.keys()).filter(key => key.includes(modelId));
      keysToDelete.forEach(key => this.modelCache.delete(key));
    } else {
      this.modelCache.clear();
    }
  }

  /**
   * Get model statistics
   */
  getStatistics(): {
    totalModels: number;
    deployedModels: number;
    modelsByType: Record<string, number>;
  } {
    const allModels = Array.from(this.models.values());
    const deployedCount = allModels.filter(m => m.status === 'deployed').length;

    const modelsByType: Record<string, number> = {};
    allModels.forEach(model => {
      modelsByType[model.type] = (modelsByType[model.type] || 0) + 1;
    });

    return {
      totalModels: this.models.size,
      deployedModels: deployedCount,
      modelsByType
    };
  }
}
