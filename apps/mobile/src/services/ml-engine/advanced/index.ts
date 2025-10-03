/**
 * Advanced ML Framework - Main Entry Point
 *
 * Comprehensive machine learning framework for A/B testing, model deployment,
 * intelligent matching, and predictive analytics for the Mintenance platform.
 */

import { logger } from '../../../utils/logger';
import { performanceMonitor } from '../../../utils/performanceMonitor';

// Export all types
export * from './types';

// Import services
import { MLModelRegistry } from './MLModelRegistry';
import { MLInferenceEngine } from './MLInferenceEngine';
import { MLEvaluationService } from './MLEvaluationService';
import { MLDeploymentService } from './MLDeploymentService';
import { MLApplicationService } from './MLApplicationService';

// Export service classes
export { MLModelRegistry } from './MLModelRegistry';
export { MLInferenceEngine } from './MLInferenceEngine';
export { MLEvaluationService } from './MLEvaluationService';
export { MLDeploymentService } from './MLDeploymentService';
export { MLApplicationService } from './MLApplicationService';

/**
 * Advanced ML Framework - Main Class
 *
 * Provides unified interface to all ML framework services
 */
export class AdvancedMLFramework {
  private modelRegistry: MLModelRegistry;
  private inferenceEngine: MLInferenceEngine;
  private evaluationService: MLEvaluationService;
  private deploymentService: MLDeploymentService;
  private applicationService: MLApplicationService;

  constructor() {
    // Initialize services in dependency order
    this.modelRegistry = new MLModelRegistry();
    this.inferenceEngine = new MLInferenceEngine(this.modelRegistry);
    this.evaluationService = new MLEvaluationService();
    this.deploymentService = new MLDeploymentService(this.modelRegistry, this.inferenceEngine);
    this.applicationService = new MLApplicationService(this.inferenceEngine);

    this.startModelMonitoring();
  }

  // Model Registry methods
  registerModel = this.modelRegistry.registerModel.bind(this.modelRegistry);
  getModel = this.modelRegistry.getModel.bind(this.modelRegistry);
  listModels = this.modelRegistry.listModels.bind(this.modelRegistry);

  // Inference methods
  predict = this.inferenceEngine.predict.bind(this.inferenceEngine);
  batchPredict = this.inferenceEngine.batchPredict.bind(this.inferenceEngine);

  // Deployment methods
  deployModel = this.deploymentService.deployModel.bind(this.deploymentService);
  rollbackDeployment = this.deploymentService.rollbackDeployment.bind(this.deploymentService);
  getDeployment = this.deploymentService.getDeployment.bind(this.deploymentService);
  listDeployments = this.deploymentService.listDeployments.bind(this.deploymentService);

  // A/B Testing methods
  createABTest = this.evaluationService.createABTest.bind(this.evaluationService);
  getABTestVariant = this.evaluationService.getABTestVariant.bind(this.evaluationService);
  recordABTestResult = this.evaluationService.recordABTestResult.bind(this.evaluationService);
  analyzeABTest = this.evaluationService.analyzeABTest.bind(this.evaluationService);
  getABTest = this.evaluationService.getABTest.bind(this.evaluationService);
  listABTests = this.evaluationService.listABTests.bind(this.evaluationService);

  // Application-specific methods
  findBestContractors = this.applicationService.findBestContractors.bind(this.applicationService);
  getJobRecommendations = this.applicationService.getJobRecommendations.bind(this.applicationService);
  predictJobPrice = this.applicationService.predictJobPrice.bind(this.applicationService);
  detectFraud = this.applicationService.detectFraud.bind(this.applicationService);

  /**
   * Start monitoring model performance
   */
  private startModelMonitoring(): void {
    setInterval(() => {
      this.monitorModelPerformance();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Monitor model performance metrics
   */
  private monitorModelPerformance(): void {
    const inferenceStats = this.inferenceEngine.getStatistics();

    if (inferenceStats.totalPredictions > 0) {
      performanceMonitor.recordMetric('ml_framework_avg_latency', inferenceStats.avgLatency);
      performanceMonitor.recordMetric('ml_framework_avg_confidence', inferenceStats.avgConfidence);
      performanceMonitor.recordMetric('ml_framework_predictions_per_minute',
        inferenceStats.totalPredictions / 60);
    }
  }

  /**
   * Get comprehensive statistics
   */
  getModelStatistics(): {
    totalModels: number;
    deployedModels: number;
    totalPredictions: number;
    avgLatency: number;
    avgConfidence: number;
  } {
    const registryStats = this.modelRegistry.getStatistics();
    const inferenceStats = this.inferenceEngine.getStatistics();

    return {
      totalModels: registryStats.totalModels,
      deployedModels: registryStats.deployedModels,
      totalPredictions: inferenceStats.totalPredictions,
      avgLatency: inferenceStats.avgLatency,
      avgConfidence: inferenceStats.avgConfidence
    };
  }

  /**
   * Get A/B test statistics
   */
  getABTestStatistics(): {
    totalTests: number;
    activeTests: number;
    totalResults: number;
  } {
    return this.evaluationService.getStatistics();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.deploymentService.cleanup();
    this.modelRegistry.clearModelCache();
    this.inferenceEngine.clearPredictionHistory();
  }
}

// Export singleton instance
export const advancedMLFramework = new AdvancedMLFramework();

export default advancedMLFramework;
