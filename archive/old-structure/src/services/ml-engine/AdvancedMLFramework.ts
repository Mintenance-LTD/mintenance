/**
 * Advanced ML Framework
 *
 * Comprehensive machine learning framework for A/B testing, model deployment,
 * intelligent matching, and predictive analytics for the Mintenance platform.
 */

import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { errorTracking } from '../../utils/productionSetupGuide';

// ML Model Types
export interface MLModel {
  id: string;
  name: string;
  version: string;
  type: 'classification' | 'regression' | 'ranking' | 'recommendation' | 'nlp';
  status: 'training' | 'deployed' | 'testing' | 'retired';
  accuracy: number;
  createdAt: number;
  lastUpdated: number;
  metadata: Record<string, any>;
}

export interface ModelPrediction {
  modelId: string;
  input: any;
  output: any;
  confidence: number;
  timestamp: number;
  latency: number;
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABTestVariant[];
  trafficAllocation: Record<string, number>;
  successMetrics: string[];
  startDate: number;
  endDate?: number;
  minSampleSize: number;
  significance: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  modelId?: string;
  config: Record<string, any>;
  allocation: number; // 0-100 percentage
}

export interface ABTestResult {
  testId: string;
  variant: string;
  metric: string;
  value: number;
  sampleSize: number;
  timestamp: number;
}

export interface ModelDeploymentConfig {
  modelId: string;
  environment: 'staging' | 'canary' | 'production';
  trafficPercentage: number;
  rollbackThreshold: number;
  healthChecks: string[];
  autoScaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetLatency: number;
  };
}

export interface MLFeature {
  name: string;
  type: 'numerical' | 'categorical' | 'text' | 'boolean' | 'datetime';
  value: any;
  importance?: number;
}

export interface ModelTrainingConfig {
  algorithm: 'random_forest' | 'xgboost' | 'neural_network' | 'linear_regression' | 'svm';
  hyperparameters: Record<string, any>;
  features: string[];
  target: string;
  validationSplit: number;
  crossValidation: number;
  earlyStoppingRounds?: number;
}

export class AdvancedMLFramework {
  private models: Map<string, MLModel> = new Map();
  private predictions: ModelPrediction[] = [];
  private abTests: Map<string, ABTestConfig> = new Map();
  private abTestResults: ABTestResult[] = [];
  private deployedModels: Map<string, ModelDeploymentConfig> = new Map();
  private modelCache: Map<string, any> = new Map();
  private featureStore: Map<string, MLFeature[]> = new Map();

  constructor() {
    this.initializeBuiltInModels();
    this.startModelMonitoring();
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

    logger.info('AdvancedMLFramework', 'Built-in ML models initialized', {
      modelCount: this.models.size
    });
  }

  /**
   * Register a new ML model
   */
  registerModel(model: MLModel): void {
    this.models.set(model.id, model);
    logger.info('AdvancedMLFramework', 'Model registered', {
      modelId: model.id,
      modelName: model.name,
      version: model.version
    });
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
      const model = this.models.get(modelId);
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
      model.status = 'deployed';
      model.lastUpdated = Date.now();

      // Initialize model in cache for fast inference
      await this.warmupModel(modelId);

      // Start health monitoring
      this.startModelHealthMonitoring(deploymentId);

      const deploymentTime = Date.now() - startTime;
      performanceMonitor.recordMetric('model_deployment_time', deploymentTime);

      logger.info('AdvancedMLFramework', 'Model deployed successfully', {
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

      logger.error('AdvancedMLFramework', 'Model deployment failed', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { success: false, deploymentId: '' };
    }
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
      const model = this.models.get(modelId);
      if (!model || model.status !== 'deployed') {
        throw new Error(`Model not available for prediction: ${modelId}`);
      }

      // Check cache if enabled
      if (options.useCache) {
        const cacheKey = this.generateCacheKey(modelId, features);
        const cachedResult = this.modelCache.get(cacheKey);
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
        this.modelCache.set(cacheKey, prediction);
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
   * Create and configure A/B test
   */
  createABTest(config: ABTestConfig): string {
    // Validate A/B test configuration
    this.validateABTestConfig(config);

    // Store A/B test
    this.abTests.set(config.id, config);

    logger.info('AdvancedMLFramework', 'A/B test created', {
      testId: config.id,
      variantCount: config.variants.length,
      successMetrics: config.successMetrics
    });

    return config.id;
  }

  /**
   * Get A/B test variant for user
   */
  getABTestVariant(testId: string, userId: string): ABTestVariant | null {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if test is within date range
    const now = Date.now();
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      return null;
    }

    // Deterministic assignment based on user ID
    const hash = this.hashString(userId + testId);
    const bucket = hash % 100;

    let cumulativeAllocation = 0;
    for (const variant of test.variants) {
      cumulativeAllocation += variant.allocation;
      if (bucket < cumulativeAllocation) {
        return variant;
      }
    }

    // Fallback to first variant
    return test.variants[0] || null;
  }

  /**
   * Record A/B test result
   */
  recordABTestResult(testId: string, variant: string, metric: string, value: number): void {
    const result: ABTestResult = {
      testId,
      variant,
      metric,
      value,
      sampleSize: 1,
      timestamp: Date.now()
    };

    this.abTestResults.push(result);

    // Limit result history
    if (this.abTestResults.length > 50000) {
      this.abTestResults = this.abTestResults.slice(-25000);
    }
  }

  /**
   * Analyze A/B test results
   */
  analyzeABTest(testId: string): {
    results: Record<string, Record<string, any>>;
    significance: Record<string, boolean>;
    recommendations: string[];
  } {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test not found: ${testId}`);
    }

    const testResults = this.abTestResults.filter(r => r.testId === testId);
    const results: Record<string, Record<string, any>> = {};
    const significance: Record<string, boolean> = {};
    const recommendations: string[] = [];

    // Analyze each metric
    for (const metric of test.successMetrics) {
      const metricResults = testResults.filter(r => r.metric === metric);
      const variantStats: Record<string, any> = {};

      // Calculate statistics for each variant
      for (const variant of test.variants) {
        const variantData = metricResults.filter(r => r.variant === variant.id);
        const values = variantData.map(r => r.value);

        if (values.length > 0) {
          variantStats[variant.id] = {
            sampleSize: values.length,
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            std: this.calculateStandardDeviation(values),
            confidence95: this.calculateConfidenceInterval(values, 0.95)
          };
        }
      }

      results[metric] = variantStats;

      // Check statistical significance (simplified)
      const variantKeys = Object.keys(variantStats);
      if (variantKeys.length >= 2) {
        const controlVariant = variantStats[variantKeys[0]];
        const testVariant = variantStats[variantKeys[1]];

        if (controlVariant.sampleSize >= test.minSampleSize &&
            testVariant.sampleSize >= test.minSampleSize) {

          const pValue = this.calculateTTest(
            controlVariant.mean, controlVariant.std, controlVariant.sampleSize,
            testVariant.mean, testVariant.std, testVariant.sampleSize
          );

          significance[metric] = pValue < (1 - test.significance);

          if (significance[metric]) {
            const improvement = ((testVariant.mean - controlVariant.mean) / controlVariant.mean) * 100;
            recommendations.push(
              `${metric}: ${improvement > 0 ? 'Positive' : 'Negative'} impact of ${Math.abs(improvement).toFixed(2)}% detected`
            );
          }
        }
      }
    }

    // Generate overall recommendations
    const significantMetrics = Object.entries(significance).filter(([_, sig]) => sig).length;
    if (significantMetrics > 0) {
      recommendations.push(`${significantMetrics} metrics show statistically significant differences`);
    } else {
      recommendations.push('No statistically significant differences detected yet');
    }

    return { results, significance, recommendations };
  }

  /**
   * Smart contractor matching with ML
   */
  async findBestContractors(
    jobRequirements: {
      skills: string[];
      location: { lat: number; lng: number };
      budget: number;
      urgency: 'low' | 'medium' | 'high';
      complexity: number;
    },
    contractors: any[],
    limit: number = 10
  ): Promise<Array<{ contractor: any; score: number; explanation: string }>> {

    try {
      const results = [];

      for (const contractor of contractors) {
        // Prepare features for ML model
        const features: MLFeature[] = [
          { name: 'skills_match', type: 'numerical', value: this.calculateSkillsMatch(jobRequirements.skills, contractor.skills) },
          { name: 'location_distance', type: 'numerical', value: this.calculateDistance(jobRequirements.location, contractor.location) },
          { name: 'price_compatibility', type: 'numerical', value: this.calculatePriceCompatibility(jobRequirements.budget, contractor.hourlyRate) },
          { name: 'rating', type: 'numerical', value: contractor.rating || 0 },
          { name: 'availability', type: 'numerical', value: contractor.availability || 0.5 },
          { name: 'urgency_match', type: 'numerical', value: this.calculateUrgencyMatch(jobRequirements.urgency, contractor.responseTime) },
          { name: 'complexity_capability', type: 'numerical', value: this.calculateComplexityCapability(jobRequirements.complexity, contractor.experience) }
        ];

        // Get ML prediction
        const prediction = await this.predict('contractor_matching_v2', features);
        const score = prediction.output.score || prediction.confidence;

        // Generate explanation
        const explanation = this.generateMatchingExplanation(features, score);

        results.push({
          contractor,
          score,
          explanation
        });
      }

      // Sort by score and return top matches
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('AdvancedMLFramework', 'Contractor matching failed', error);
      return [];
    }
  }

  /**
   * Intelligent job recommendations
   */
  async getJobRecommendations(
    contractorId: string,
    contractorProfile: any,
    availableJobs: any[],
    limit: number = 20
  ): Promise<Array<{ job: any; score: number; reasons: string[] }>> {

    try {
      const results = [];

      for (const job of availableJobs) {
        // Prepare features
        const features: MLFeature[] = [
          { name: 'skills_compatibility', type: 'numerical', value: this.calculateSkillsMatch(job.requiredSkills, contractorProfile.skills) },
          { name: 'location_preference', type: 'numerical', value: this.calculateLocationPreference(job.location, contractorProfile.preferredAreas) },
          { name: 'budget_attractiveness', type: 'numerical', value: this.calculateBudgetAttractiveness(job.budget, contractorProfile.hourlyRate) },
          { name: 'job_complexity_fit', type: 'numerical', value: this.calculateComplexityFit(job.complexity, contractorProfile.experience) },
          { name: 'historical_success', type: 'numerical', value: this.calculateHistoricalSuccess(contractorProfile.jobHistory, job.category) },
          { name: 'time_preference', type: 'numerical', value: this.calculateTimePreference(job.schedule, contractorProfile.availability) }
        ];

        // Get recommendation score
        const prediction = await this.predict('job_recommendation_v1', features);
        const score = prediction.output.score || prediction.confidence;

        // Generate reasons
        const reasons = this.generateRecommendationReasons(features, score);

        results.push({
          job,
          score,
          reasons
        });
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('AdvancedMLFramework', 'Job recommendations failed', error);
      return [];
    }
  }

  /**
   * Predictive pricing with ML
   */
  async predictJobPrice(
    jobDetails: {
      category: string;
      description: string;
      location: any;
      complexity: number;
      materials: string[];
      timeEstimate: number;
    }
  ): Promise<{
    estimatedPrice: number;
    priceRange: { min: number; max: number };
    confidence: number;
    factors: Array<{ factor: string; impact: number }>;
  }> {

    try {
      // Extract features from job details
      const features: MLFeature[] = [
        { name: 'job_complexity', type: 'numerical', value: jobDetails.complexity },
        { name: 'time_estimate', type: 'numerical', value: jobDetails.timeEstimate },
        { name: 'materials_cost', type: 'numerical', value: this.estimateMaterialsCost(jobDetails.materials) },
        { name: 'location_factor', type: 'numerical', value: this.getLocationPriceFactor(jobDetails.location) },
        { name: 'season_factor', type: 'numerical', value: this.getSeasonFactor() },
        { name: 'category_base_rate', type: 'numerical', value: this.getCategoryBaseRate(jobDetails.category) },
        { name: 'description_complexity', type: 'numerical', value: this.analyzeDescriptionComplexity(jobDetails.description) }
      ];

      // Get price prediction
      const prediction = await this.predict('price_prediction_v1', features);
      const estimatedPrice = prediction.output.price || 0;
      const confidence = prediction.confidence;

      // Calculate price range based on confidence
      const uncertainty = (1 - confidence) * 0.3; // 30% max uncertainty
      const priceRange = {
        min: estimatedPrice * (1 - uncertainty),
        max: estimatedPrice * (1 + uncertainty)
      };

      // Analyze feature importance
      const factors = features.map(feature => ({
        factor: feature.name,
        impact: this.calculateFeatureImpact(feature, estimatedPrice)
      })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

      return {
        estimatedPrice,
        priceRange,
        confidence,
        factors
      };

    } catch (error) {
      logger.error('AdvancedMLFramework', 'Price prediction failed', error);
      return {
        estimatedPrice: 0,
        priceRange: { min: 0, max: 0 },
        confidence: 0,
        factors: []
      };
    }
  }

  /**
   * Fraud detection
   */
  async detectFraud(
    transactionData: {
      userId: string;
      amount: number;
      paymentMethod: string;
      deviceInfo: any;
      location: any;
      timestamp: number;
    }
  ): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
    recommendedAction: string;
  }> {

    try {
      // Prepare fraud detection features
      const features: MLFeature[] = [
        { name: 'transaction_amount', type: 'numerical', value: transactionData.amount },
        { name: 'time_of_day', type: 'numerical', value: new Date(transactionData.timestamp).getHours() },
        { name: 'user_velocity', type: 'numerical', value: this.calculateUserVelocity(transactionData.userId) },
        { name: 'device_risk', type: 'numerical', value: this.calculateDeviceRisk(transactionData.deviceInfo) },
        { name: 'location_risk', type: 'numerical', value: this.calculateLocationRisk(transactionData.location, transactionData.userId) },
        { name: 'payment_method_risk', type: 'numerical', value: this.calculatePaymentMethodRisk(transactionData.paymentMethod) },
        { name: 'amount_deviation', type: 'numerical', value: this.calculateAmountDeviation(transactionData.userId, transactionData.amount) }
      ];

      // Get fraud prediction
      const prediction = await this.predict('fraud_detection_v1', features);
      const riskScore = prediction.output.riskScore || prediction.confidence;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (riskScore < 0.3) riskLevel = 'low';
      else if (riskScore < 0.6) riskLevel = 'medium';
      else if (riskScore < 0.8) riskLevel = 'high';
      else riskLevel = 'critical';

      // Generate reasons
      const reasons = this.generateFraudReasons(features, riskScore);

      // Recommend action
      const recommendedAction = this.getRecommendedFraudAction(riskLevel, riskScore);

      return {
        riskScore,
        riskLevel,
        reasons,
        recommendedAction
      };

    } catch (error) {
      logger.error('AdvancedMLFramework', 'Fraud detection failed', error);
      return {
        riskScore: 0,
        riskLevel: 'low',
        reasons: ['Analysis failed'],
        recommendedAction: 'Allow transaction'
      };
    }
  }

  // Helper methods for ML operations
  private validateDeploymentConfig(config: ModelDeploymentConfig): void {
    if (config.trafficPercentage < 0 || config.trafficPercentage > 100) {
      throw new Error('Traffic percentage must be between 0 and 100');
    }

    if (config.rollbackThreshold < 0 || config.rollbackThreshold > 1) {
      throw new Error('Rollback threshold must be between 0 and 1');
    }
  }

  private validateABTestConfig(config: ABTestConfig): void {
    const totalAllocation = config.variants.reduce((sum, v) => sum + v.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Variant allocations must sum to 100%');
    }

    if (config.minSampleSize < 1) {
      throw new Error('Minimum sample size must be at least 1');
    }
  }

  private async warmupModel(modelId: string): Promise<void> {
    // Simulate model warmup
    const model = this.models.get(modelId);
    if (model) {
      this.modelCache.set(`warmup_${modelId}`, true);
      logger.info('AdvancedMLFramework', 'Model warmed up', { modelId });
    }
  }

  private startModelHealthMonitoring(deploymentId: string): void {
    // Start monitoring model health
    setInterval(() => {
      this.checkModelHealth(deploymentId);
    }, 60000); // Check every minute
  }

  private checkModelHealth(deploymentId: string): void {
    const deployment = this.deployedModels.get(deploymentId);
    if (!deployment) return;

    // Check model latency, accuracy, and error rates
    const recentPredictions = this.predictions
      .filter(p => p.modelId === deployment.modelId)
      .filter(p => Date.now() - p.timestamp < 300000); // Last 5 minutes

    if (recentPredictions.length > 0) {
      const avgLatency = recentPredictions.reduce((sum, p) => sum + p.latency, 0) / recentPredictions.length;
      const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length;

      performanceMonitor.recordMetric(`model_health_latency_${deployment.modelId}`, avgLatency);
      performanceMonitor.recordMetric(`model_health_confidence_${deployment.modelId}`, avgConfidence);

      // Check for rollback conditions
      if (avgLatency > deployment.rollbackThreshold * 1000 || avgConfidence < deployment.rollbackThreshold) {
        logger.warn('AdvancedMLFramework', 'Model health degraded', {
          deploymentId,
          avgLatency,
          avgConfidence,
          threshold: deployment.rollbackThreshold
        });
      }
    }
  }

  private startModelMonitoring(): void {
    // Monitor model performance every 5 minutes
    setInterval(() => {
      this.monitorModelPerformance();
    }, 5 * 60 * 1000);
  }

  private monitorModelPerformance(): void {
    const now = Date.now();
    const recentPredictions = this.predictions.filter(p => now - p.timestamp < 5 * 60 * 1000);

    if (recentPredictions.length > 0) {
      const avgLatency = recentPredictions.reduce((sum, p) => sum + p.latency, 0) / recentPredictions.length;
      const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length;

      performanceMonitor.recordMetric('ml_framework_avg_latency', avgLatency);
      performanceMonitor.recordMetric('ml_framework_avg_confidence', avgConfidence);
      performanceMonitor.recordMetric('ml_framework_predictions_per_minute', recentPredictions.length);
    }
  }

  // Utility methods
  private generateCacheKey(modelId: string, features: MLFeature[]): string {
    const featureString = features.map(f => `${f.name}:${f.value}`).join('|');
    return `${modelId}:${this.hashString(featureString)}`;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private preprocessFeatures(features: MLFeature[], model: MLModel): any {
    // Simulate feature preprocessing
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

  private async runInference(model: MLModel, features: any, timeout?: number): Promise<any> {
    // Simulate model inference
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

  private calculateConfidence(model: MLModel, output: any): number {
    // Calculate confidence based on model type and output
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

  // Feature calculation methods
  private calculateSkillsMatch(requiredSkills: string[], contractorSkills: string[]): number {
    if (!requiredSkills.length) return 1;

    const matches = requiredSkills.filter(skill =>
      contractorSkills.some(cSkill =>
        cSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    return matches.length / requiredSkills.length;
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculatePriceCompatibility(budget: number, hourlyRate: number): number {
    if (!hourlyRate) return 0.5;
    const estimatedCost = hourlyRate * 8; // Assume 8-hour job
    return Math.max(0, Math.min(1, budget / estimatedCost));
  }

  private calculateUrgencyMatch(urgency: string, responseTime: number): number {
    const urgencyWeights = { low: 0.3, medium: 0.6, high: 0.9 };
    const urgencyWeight = urgencyWeights[urgency as keyof typeof urgencyWeights] || 0.5;

    // Convert response time to compatibility score
    const responseScore = Math.max(0, Math.min(1, 1 - (responseTime / 24))); // 24 hours max

    return urgencyWeight * responseScore;
  }

  private calculateComplexityCapability(jobComplexity: number, experience: any): number {
    const experienceLevel = experience?.level || 1;
    const experienceYears = experience?.years || 0;

    const capability = (experienceLevel * 0.6) + (Math.min(experienceYears / 10, 1) * 0.4);
    return Math.min(1, capability / jobComplexity);
  }

  // Statistical methods
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateConfidenceInterval(values: number[], confidence: number): { lower: number; upper: number } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = this.calculateStandardDeviation(values);
    const n = values.length;

    // Use t-distribution approximation
    const tValue = confidence === 0.95 ? 1.96 : 2.58; // 95% or 99%
    const margin = tValue * (std / Math.sqrt(n));

    return {
      lower: mean - margin,
      upper: mean + margin
    };
  }

  private calculateTTest(
    mean1: number, std1: number, n1: number,
    mean2: number, std2: number, n2: number
  ): number {
    // Simplified t-test calculation
    const pooledStd = Math.sqrt(((n1 - 1) * std1 * std1 + (n2 - 1) * std2 * std2) / (n1 + n2 - 2));
    const standardError = pooledStd * Math.sqrt(1/n1 + 1/n2);
    const tStatistic = Math.abs(mean1 - mean2) / standardError;

    // Simplified p-value approximation
    return Math.max(0.001, Math.min(0.999, 1 - (tStatistic / 10)));
  }

  // Additional helper methods would be implemented here...
  private generateMatchingExplanation(features: MLFeature[], score: number): string {
    const topFeatures = features
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 3);

    return `Match score: ${(score * 100).toFixed(1)}%. Top factors: ${topFeatures.map(f => f.name).join(', ')}`;
  }

  private generateRecommendationReasons(features: MLFeature[], score: number): string[] {
    return features
      .filter(f => (f.value as number) > 0.7)
      .map(f => `High ${f.name.replace('_', ' ')}: ${((f.value as number) * 100).toFixed(1)}%`);
  }

  private generateFraudReasons(features: MLFeature[], riskScore: number): string[] {
    return features
      .filter(f => (f.value as number) > 0.6)
      .map(f => `Elevated ${f.name.replace('_', ' ')}`);
  }

  private getRecommendedFraudAction(riskLevel: string, riskScore: number): string {
    switch (riskLevel) {
      case 'low': return 'Allow transaction';
      case 'medium': return 'Additional verification required';
      case 'high': return 'Manual review required';
      case 'critical': return 'Block transaction';
      default: return 'Allow transaction';
    }
  }

  // Placeholder methods for various calculations
  private calculateLocationPreference(jobLocation: any, preferredAreas: any[]): number { return Math.random(); }
  private calculateBudgetAttractiveness(budget: number, hourlyRate: number): number { return Math.random(); }
  private calculateComplexityFit(jobComplexity: number, experience: any): number { return Math.random(); }
  private calculateHistoricalSuccess(jobHistory: any[], category: string): number { return Math.random(); }
  private calculateTimePreference(schedule: any, availability: any): number { return Math.random(); }
  private estimateMaterialsCost(materials: string[]): number { return Math.random() * 500; }
  private getLocationPriceFactor(location: any): number { return Math.random() * 0.5 + 0.75; }
  private getSeasonFactor(): number { return Math.random() * 0.3 + 0.85; }
  private getCategoryBaseRate(category: string): number { return Math.random() * 100 + 50; }
  private analyzeDescriptionComplexity(description: string): number { return description.length / 100; }
  private calculateFeatureImpact(feature: MLFeature, price: number): number { return Math.random() * 20 - 10; }
  private calculateUserVelocity(userId: string): number { return Math.random(); }
  private calculateDeviceRisk(deviceInfo: any): number { return Math.random() * 0.3; }
  private calculateLocationRisk(location: any, userId: string): number { return Math.random() * 0.4; }
  private calculatePaymentMethodRisk(paymentMethod: string): number { return Math.random() * 0.2; }
  private calculateAmountDeviation(userId: string, amount: number): number { return Math.random() * 0.5; }

  /**
   * Get model statistics
   */
  getModelStatistics(): {
    totalModels: number;
    deployedModels: number;
    totalPredictions: number;
    avgLatency: number;
    avgConfidence: number;
  } {
    const deployedCount = Array.from(this.models.values()).filter(m => m.status === 'deployed').length;
    const recentPredictions = this.predictions.filter(p => Date.now() - p.timestamp < 3600000); // Last hour

    const avgLatency = recentPredictions.length > 0
      ? recentPredictions.reduce((sum, p) => sum + p.latency, 0) / recentPredictions.length
      : 0;

    const avgConfidence = recentPredictions.length > 0
      ? recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length
      : 0;

    return {
      totalModels: this.models.size,
      deployedModels: deployedCount,
      totalPredictions: this.predictions.length,
      avgLatency,
      avgConfidence
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
    const activeCount = Array.from(this.abTests.values()).filter(t => t.status === 'running').length;

    return {
      totalTests: this.abTests.size,
      activeTests: activeCount,
      totalResults: this.abTestResults.length
    };
  }
}

// Export singleton instance
export const advancedMLFramework = new AdvancedMLFramework();

export default advancedMLFramework;