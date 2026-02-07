/**
 * Advanced ML Framework - Main Entry Point
 *
 * Comprehensive machine learning framework for A/B testing, model deployment,
 * intelligent matching, and predictive analytics for the Mintenance platform.
 */

import { logger } from '../../../utils/logger';
import { performanceMonitor } from '../../../utils/performanceMonitor';

// Import services
import { MLModelRegistry } from './MLModelRegistry';
import { MLInferenceEngine } from './MLInferenceEngine';
import { MLEvaluationService } from './MLEvaluationService';
import { MLDeploymentService } from './MLDeploymentService';
import { MLApplicationService } from './MLApplicationService';

// Export all types
export * from './types';

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
  registerModel = (
    ...args: Parameters<MLModelRegistry['registerModel']>
  ): ReturnType<MLModelRegistry['registerModel']> => this.modelRegistry.registerModel(...args);
  getModel = (
    ...args: Parameters<MLModelRegistry['getModel']>
  ): ReturnType<MLModelRegistry['getModel']> => this.modelRegistry.getModel(...args);
  listModels = (
    ...args: Parameters<MLModelRegistry['listModels']>
  ): ReturnType<MLModelRegistry['listModels']> => this.modelRegistry.listModels(...args);

  // Inference methods
  predict = (
    ...args: Parameters<MLInferenceEngine['predict']>
  ): ReturnType<MLInferenceEngine['predict']> => this.inferenceEngine.predict(...args);
  batchPredict = (
    ...args: Parameters<MLInferenceEngine['batchPredict']>
  ): ReturnType<MLInferenceEngine['batchPredict']> => this.inferenceEngine.batchPredict(...args);

  // Deployment methods
  deployModel = (
    ...args: Parameters<MLDeploymentService['deployModel']>
  ): ReturnType<MLDeploymentService['deployModel']> => this.deploymentService.deployModel(...args);
  rollbackDeployment = (
    ...args: Parameters<MLDeploymentService['rollbackDeployment']>
  ): ReturnType<MLDeploymentService['rollbackDeployment']> => this.deploymentService.rollbackDeployment(...args);
  getDeployment = (
    ...args: Parameters<MLDeploymentService['getDeployment']>
  ): ReturnType<MLDeploymentService['getDeployment']> => this.deploymentService.getDeployment(...args);
  listDeployments = (
    ...args: Parameters<MLDeploymentService['listDeployments']>
  ): ReturnType<MLDeploymentService['listDeployments']> => this.deploymentService.listDeployments(...args);

  // A/B Testing methods
  createABTest = (
    ...args: Parameters<MLEvaluationService['createABTest']>
  ): ReturnType<MLEvaluationService['createABTest']> => this.evaluationService.createABTest(...args);
  getABTestVariant = (
    ...args: Parameters<MLEvaluationService['getABTestVariant']>
  ): ReturnType<MLEvaluationService['getABTestVariant']> => this.evaluationService.getABTestVariant(...args);
  recordABTestResult = (
    ...args: Parameters<MLEvaluationService['recordABTestResult']>
  ): ReturnType<MLEvaluationService['recordABTestResult']> => this.evaluationService.recordABTestResult(...args);
  analyzeABTest = (
    ...args: Parameters<MLEvaluationService['analyzeABTest']>
  ): ReturnType<MLEvaluationService['analyzeABTest']> => this.evaluationService.analyzeABTest(...args);
  getABTest = (
    ...args: Parameters<MLEvaluationService['getABTest']>
  ): ReturnType<MLEvaluationService['getABTest']> => this.evaluationService.getABTest(...args);
  listABTests = (
    ...args: Parameters<MLEvaluationService['listABTests']>
  ): ReturnType<MLEvaluationService['listABTests']> => this.evaluationService.listABTests(...args);

  // Application-specific methods
  findBestContractors = (
    ...args: Parameters<MLApplicationService['findBestContractors']>
  ): ReturnType<MLApplicationService['findBestContractors']> =>
    this.applicationService.findBestContractors(...args);
  getJobRecommendations = (
    ...args: Parameters<MLApplicationService['getJobRecommendations']>
  ): ReturnType<MLApplicationService['getJobRecommendations']> =>
    this.applicationService.getJobRecommendations(...args);
  predictJobPrice = (
    ...args: Parameters<MLApplicationService['predictJobPrice']>
  ): ReturnType<MLApplicationService['predictJobPrice']> =>
    this.applicationService.predictJobPrice(...args);
  detectFraud = (
    ...args: Parameters<MLApplicationService['detectFraud']>
  ): ReturnType<MLApplicationService['detectFraud']> =>
    this.applicationService.detectFraud(...args);

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
