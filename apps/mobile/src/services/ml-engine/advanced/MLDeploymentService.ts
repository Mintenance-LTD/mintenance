/**
 * ML Deployment Service
 *
 * Handles model deployment, serving configuration, and health monitoring
 */

import { logger } from '../../../utils/logger';
import { performanceMonitor } from '../../../utils/performanceMonitor';
import { errorTracking } from '../../../utils/productionSetupGuide';
import { ModelDeploymentConfig, ModelPrediction } from './types';
import { MLModelRegistry } from './MLModelRegistry';
import { MLInferenceEngine } from './MLInferenceEngine';

export class MLDeploymentService {
  private deployedModels: Map<string, ModelDeploymentConfig> = new Map();
  private modelRegistry: MLModelRegistry;
  private inferenceEngine: MLInferenceEngine;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(modelRegistry: MLModelRegistry, inferenceEngine: MLInferenceEngine) {
    this.modelRegistry = modelRegistry;
    this.inferenceEngine = inferenceEngine;
  }

  /**
   * Deploy model with advanced configuration
   */
  async deployModel(
    modelId: string,
    config: ModelDeploymentConfig
  ): Promise<{ success: boolean; deploymentId: string }> {
    const startTime = Date.now();

    try {
      const model = this.modelRegistry.getModel(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Validate deployment configuration
      this.validateDeploymentConfig(config);

      // Create deployment ID
      const deploymentId = `deploy_${modelId}_${Date.now()}`;

      // Store deployment configuration
      this.deployedModels.set(deploymentId, config);

      // Update model status
      this.modelRegistry.updateModel(modelId, {
        status: 'deployed',
        lastUpdated: Date.now()
      });

      // Initialize model in cache for fast inference
      await this.modelRegistry.warmupModel(modelId);

      // Start health monitoring
      this.startModelHealthMonitoring(deploymentId);

      const deploymentTime = Date.now() - startTime;
      performanceMonitor.recordMetric('model_deployment_time', deploymentTime);

      logger.info('MLDeploymentService', 'Model deployed successfully', {
        modelId,
        deploymentId,
        environment: config.environment,
        trafficPercentage: config.trafficPercentage,
        deploymentTime
      });

      return { success: true, deploymentId };

    } catch (error) {
      errorTracking.trackError(error as Error, {
        context: 'model_deployment',
        modelId,
        config
      });

      logger.error('MLDeploymentService', 'Model deployment failed', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { success: false, deploymentId: '' };
    }
  }

  /**
   * Rollback model deployment
   */
  async rollbackDeployment(deploymentId: string): Promise<{ success: boolean }> {
    try {
      const deployment = this.deployedModels.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      // Stop health monitoring
      this.stopModelHealthMonitoring(deploymentId);

      // Update model status
      this.modelRegistry.updateModel(deployment.modelId, {
        status: 'retired'
      });

      // Remove deployment
      this.deployedModels.delete(deploymentId);

      logger.info('MLDeploymentService', 'Model deployment rolled back', {
        deploymentId,
        modelId: deployment.modelId
      });

      return { success: true };

    } catch (error) {
      logger.error('MLDeploymentService', 'Rollback failed', error);
      return { success: false };
    }
  }

  /**
   * Get deployment configuration
   */
  getDeployment(deploymentId: string): ModelDeploymentConfig | undefined {
    return this.deployedModels.get(deploymentId);
  }

  /**
   * List all deployments
   */
  listDeployments(filter?: { environment?: ModelDeploymentConfig['environment'] }): ModelDeploymentConfig[] {
    const allDeployments = Array.from(this.deployedModels.values());

    if (!filter) {
      return allDeployments;
    }

    return allDeployments.filter(deployment => {
      if (filter.environment && deployment.environment !== filter.environment) return false;
      return true;
    });
  }

  /**
   * Update deployment traffic
   */
  updateDeploymentTraffic(deploymentId: string, trafficPercentage: number): void {
    const deployment = this.deployedModels.get(deploymentId);
    if (deployment) {
      deployment.trafficPercentage = trafficPercentage;
      logger.info('MLDeploymentService', 'Deployment traffic updated', {
        deploymentId,
        trafficPercentage
      });
    }
  }

  /**
   * Validate deployment configuration
   */
  private validateDeploymentConfig(config: ModelDeploymentConfig): void {
    if (config.trafficPercentage < 0 || config.trafficPercentage > 100) {
      throw new Error('Traffic percentage must be between 0 and 100');
    }

    if (config.rollbackThreshold < 0 || config.rollbackThreshold > 1) {
      throw new Error('Rollback threshold must be between 0 and 1');
    }
  }

  /**
   * Start model health monitoring
   */
  private startModelHealthMonitoring(deploymentId: string): void {
    const interval = setInterval(() => {
      this.checkModelHealth(deploymentId);
    }, 60000); // Check every minute

    this.healthCheckIntervals.set(deploymentId, interval);
  }

  /**
   * Stop model health monitoring
   */
  private stopModelHealthMonitoring(deploymentId: string): void {
    const interval = this.healthCheckIntervals.get(deploymentId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(deploymentId);
    }
  }

  /**
   * Check model health
   */
  private checkModelHealth(deploymentId: string): void {
    const deployment = this.deployedModels.get(deploymentId);
    if (!deployment) return;

    // Get recent predictions for this model
    const recentPredictions = this.inferenceEngine
      .getPredictionsByModel(deployment.modelId)
      .filter(p => Date.now() - p.timestamp < 300000); // Last 5 minutes

    if (recentPredictions.length > 0) {
      const avgLatency = recentPredictions.reduce((sum, p) => sum + p.latency, 0) / recentPredictions.length;
      const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length;

      performanceMonitor.recordMetric(`model_health_latency_${deployment.modelId}`, avgLatency);
      performanceMonitor.recordMetric(`model_health_confidence_${deployment.modelId}`, avgConfidence);

      // Check for rollback conditions
      if (avgLatency > deployment.rollbackThreshold * 1000 || avgConfidence < deployment.rollbackThreshold) {
        logger.warn('MLDeploymentService', 'Model health degraded', {
          deploymentId,
          avgLatency,
          avgConfidence,
          threshold: deployment.rollbackThreshold
        });

        // Auto-rollback if configured
        if (deployment.autoScaling.enabled) {
          logger.warn('MLDeploymentService', 'Triggering auto-rollback', { deploymentId });
          this.rollbackDeployment(deploymentId);
        }
      }
    }
  }

  /**
   * Get deployment statistics
   */
  getStatistics(): {
    totalDeployments: number;
    deploymentsByEnvironment: Record<string, number>;
  } {
    const allDeployments = Array.from(this.deployedModels.values());

    const deploymentsByEnvironment: Record<string, number> = {};
    allDeployments.forEach(deployment => {
      deploymentsByEnvironment[deployment.environment] = (deploymentsByEnvironment[deployment.environment] || 0) + 1;
    });

    return {
      totalDeployments: this.deployedModels.size,
      deploymentsByEnvironment
    };
  }

  /**
   * Cleanup - stop all health checks
   */
  cleanup(): void {
    this.healthCheckIntervals.forEach((interval, deploymentId) => {
      this.stopModelHealthMonitoring(deploymentId);
    });
  }
}
