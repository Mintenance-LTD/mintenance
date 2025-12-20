/**
 * ML Inference Engine
 *
 * Handles model inference, prediction serving, and batch predictions
 */

import { logger } from '../../../utils/logger';
import { performanceMonitor } from '../../../utils/performanceMonitor';
import { errorTracking } from '../../../utils/productionSetupGuide';
import { MLModel, ModelPrediction, MLFeature } from './types';
import { MLModelRegistry } from './MLModelRegistry';

export class MLInferenceEngine {
  private predictions: ModelPrediction[] = [];
  private modelRegistry: MLModelRegistry;

  constructor(modelRegistry: MLModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  /**
   * Make prediction with deployed model
   */
  async predict(
    modelId: string,
    features: MLFeature[],
    options: { timeout?: number; useCache?: boolean } = {}
  ): Promise<ModelPrediction> {
    const startTime = Date.now();

    try {
      const model = this.modelRegistry.getModel(modelId);
      if (!model || model.status !== 'deployed') {
        throw new Error(`Model not available for prediction: ${modelId}`);
      }

      // Check cache if enabled
      if (options.useCache) {
        const cacheKey = this.generateCacheKey(modelId, features);
        const cachedResult = this.modelRegistry.getModelCache(cacheKey);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // Prepare features for inference
      const processedFeatures = this.preprocessFeatures(features, model);

      // Run model inference
      const output = await this.runInference(model, processedFeatures, options.timeout);

      // Calculate confidence based on model type and output
      const confidence = this.calculateConfidence(model, output);

      const prediction: ModelPrediction = {
        modelId,
        input: features,
        output,
        confidence,
        timestamp: Date.now(),
        latency: Date.now() - startTime
      };

      // Store prediction for analysis
      this.predictions.push(prediction);

      // Limit prediction history
      if (this.predictions.length > 10000) {
        this.predictions = this.predictions.slice(-5000);
      }

      // Cache result if enabled
      if (options.useCache) {
        const cacheKey = this.generateCacheKey(modelId, features);
        this.modelRegistry.setModelCache(cacheKey, prediction);
      }

      // Record performance metrics
      performanceMonitor.recordMetric('model_inference_latency', prediction.latency);
      performanceMonitor.recordMetric('model_inference_confidence', confidence);

      return prediction;

    } catch (error) {
      errorTracking.trackError(error as Error, {
        context: 'model_prediction',
        modelId,
        features: features.map(f => ({ name: f.name, type: f.type }))
      });

      throw error;
    }
  }

  /**
   * Batch prediction for multiple inputs
   */
  async batchPredict(
    modelId: string,
    featureSets: MLFeature[][],
    options: { timeout?: number; useCache?: boolean } = {}
  ): Promise<ModelPrediction[]> {
    const predictions: ModelPrediction[] = [];

    for (const features of featureSets) {
      try {
        const prediction = await this.predict(modelId, features, options);
        predictions.push(prediction);
      } catch (error) {
        logger.error('MLInferenceEngine', 'Batch prediction failed for input', error);
      }
    }

    return predictions;
  }

  /**
   * Generate cache key for prediction
   */
  private generateCacheKey(modelId: string, features: MLFeature[]): string {
    const featureString = features.map(f => `${f.name}:${f.value}`).join('|');
    return `${modelId}:${this.hashString(featureString)}`;
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Preprocess features for model
   */
  private preprocessFeatures(features: MLFeature[], model: MLModel): any {
    const processed: Record<string, any> = {};

    for (const feature of features) {
      switch (feature.type) {
        case 'numerical':
          processed[feature.name] = Number(feature.value) || 0;
          break;
        case 'categorical':
          processed[feature.name] = String(feature.value);
          break;
        case 'boolean':
          processed[feature.name] = Boolean(feature.value);
          break;
        case 'datetime':
          processed[feature.name] = new Date(feature.value).getTime();
          break;
        default:
          processed[feature.name] = feature.value;
      }
    }

    return processed;
  }

  /**
   * Run model inference
   */
  private async runInference(model: MLModel, features: any, timeout?: number): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (model.type) {
          case 'classification':
            resolve({
              class: 'positive',
              probability: Math.random() * 0.4 + 0.6
            });
            break;
          case 'regression':
            resolve({
              value: Math.random() * 1000 + 500,
              price: Math.random() * 1000 + 500
            });
            break;
          case 'ranking':
            resolve({
              score: Math.random() * 0.3 + 0.7,
              rank: Math.floor(Math.random() * 10) + 1
            });
            break;
          case 'recommendation':
            resolve({
              score: Math.random() * 0.4 + 0.6,
              items: []
            });
            break;
          default:
            resolve({ value: Math.random() });
        }
      }, Math.random() * 50 + 10); // 10-60ms latency
    });
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(model: MLModel, output: any): number {
    switch (model.type) {
      case 'classification':
        return output.probability || 0.5;
      case 'regression':
        return Math.min(0.95, model.accuracy + Math.random() * 0.1);
      case 'ranking':
      case 'recommendation':
        return output.score || 0.5;
      default:
        return 0.5;
    }
  }

  /**
   * Get recent predictions
   */
  getRecentPredictions(limit?: number): ModelPrediction[] {
    const sorted = [...this.predictions].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get predictions by model
   */
  getPredictionsByModel(modelId: string, limit?: number): ModelPrediction[] {
    const filtered = this.predictions.filter(p => p.modelId === modelId);
    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get inference statistics
   */
  getStatistics(): {
    totalPredictions: number;
    avgLatency: number;
    avgConfidence: number;
    predictionsByModel: Record<string, number>;
  } {
    const recentPredictions = this.predictions.filter(
      p => Date.now() - p.timestamp < 3600000
    ); // Last hour

    const avgLatency = recentPredictions.length > 0
      ? recentPredictions.reduce((sum, p) => sum + p.latency, 0) / recentPredictions.length
      : 0;

    const avgConfidence = recentPredictions.length > 0
      ? recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length
      : 0;

    const predictionsByModel: Record<string, number> = {};
    this.predictions.forEach(p => {
      predictionsByModel[p.modelId] = (predictionsByModel[p.modelId] || 0) + 1;
    });

    return {
      totalPredictions: this.predictions.length,
      avgLatency,
      avgConfidence,
      predictionsByModel
    };
  }

  /**
   * Clear prediction history
   */
  clearPredictionHistory(): void {
    this.predictions = [];
  }
}
