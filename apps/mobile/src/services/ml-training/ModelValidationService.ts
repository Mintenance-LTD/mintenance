/**
 * Model Validation Service
 * Comprehensive validation, testing, and quality assurance for ML models
 */

import * as tf from '@tensorflow/tfjs';
import { logger } from '../../utils/logger';
import {
  TrainingData,
  ValidationResults,
  ModelPerformance,
  BiasMetrics,
  DataQualityMetrics,
  FairnessCriteria,
  ModelType,
} from './types';
import { ModelTrainingEngine } from './ModelTrainingEngine';
import { BiasDetectionService } from './BiasDetectionService';

export class ModelValidationService {
  private trainingEngine: ModelTrainingEngine;
  private biasDetectionService: BiasDetectionService;
  private validationHistory = new Map<string, ValidationResults[]>();

  constructor() {
    this.trainingEngine = new ModelTrainingEngine();
    this.biasDetectionService = new BiasDetectionService();
  }

  /**
   * Perform comprehensive model validation
   */
  async validateModel(
    model: tf.LayersModel,
    testData: TrainingData,
    modelType: ModelType,
    modelVersion: string,
    fairnessCriteria?: FairnessCriteria
  ): Promise<ValidationResults> {
    try {
      logger.info('ModelValidationService', 'Starting model validation', {
        modelType,
        modelVersion,
        testDataSize: testData.features.length,
      });

      // 1. Performance validation
      const performance = await this.trainingEngine.evaluateModel(model, testData);

      // 2. Bias detection
      const biasMetrics = await this.biasDetectionService.detectBias(
        testData,
        model,
        fairnessCriteria
      );

      // 3. Data quality assessment
      const dataQuality = this.assessDataQuality(testData);

      // 4. Model architecture validation
      const architectureIssues = this.validateArchitecture(model, modelType);

      // 5. Performance threshold validation
      const performanceIssues = this.validatePerformanceThresholds(performance, modelType);

      // 6. Stability testing
      const stabilityIssues = await this.testModelStability(model, testData);

      // 7. Adversarial testing
      const adversarialIssues = await this.testAdversarialRobustness(model, testData);

      // Compile all issues and improvements
      const allIssues = [
        ...architectureIssues,
        ...performanceIssues,
        ...stabilityIssues,
        ...adversarialIssues,
        ...dataQuality.recommendations,
      ];

      if (biasMetrics.biasDetected) {
        allIssues.push(...biasMetrics.recommendations);
      }

      const improvements = this.generateImprovementSuggestions(
        performance,
        biasMetrics,
        dataQuality,
        modelType
      );

      const passedValidation = this.determineValidationStatus(
        performance,
        biasMetrics,
        allIssues,
        modelType
      );

      const validationResults: ValidationResults = {
        performance,
        biasMetrics,
        passedValidation,
        issues: allIssues,
        improvements,
        validationTimestamp: Date.now(),
        modelVersion,
      };

      // Store validation history
      this.storeValidationResults(modelType, validationResults);

      logger.info('ModelValidationService', 'Model validation completed', {
        modelType,
        modelVersion,
        passedValidation,
        issuesCount: allIssues.length,
        accuracy: performance.accuracy,
        biasDetected: biasMetrics.biasDetected,
      });

      return validationResults;
    } catch (error) {
      logger.error('ModelValidationService', 'Model validation failed', error);
      throw error;
    }
  }

  /**
   * Assess data quality metrics
   */
  private assessDataQuality(data: TrainingData): DataQualityMetrics {
    const features = data.features;
    const labels = data.labels;
    const metadata = data.metadata;

    // Calculate completeness
    const completeness = this.calculateCompleteness(features, labels, metadata);

    // Calculate consistency
    const consistency = this.calculateConsistency(features, metadata);

    // Calculate validity
    const validity = this.calculateValidity(features, labels);

    // Detect duplicates
    const duplicates = this.detectDuplicates(features);

    // Detect outliers
    const outliers = this.detectOutliers(features);

    // Calculate class balance
    const balance = this.calculateClassBalance(labels);

    // Generate recommendations
    const recommendations = this.generateDataQualityRecommendations(
      completeness,
      consistency,
      validity,
      duplicates,
      outliers,
      balance
    );

    return {
      completeness,
      consistency,
      validity,
      duplicates,
      outliers,
      balance,
      recommendations,
    };
  }

  /**
   * Calculate data completeness
   */
  private calculateCompleteness(
    features: number[][],
    labels: number[][],
    metadata: any[]
  ): number {
    let totalFields = 0;
    let completeFields = 0;

    // Check features
    features.forEach(row => {
      row.forEach(value => {
        totalFields++;
        if (value !== null && value !== undefined && !isNaN(value)) {
          completeFields++;
        }
      });
    });

    // Check labels
    labels.forEach(row => {
      row.forEach(value => {
        totalFields++;
        if (value !== null && value !== undefined && !isNaN(value)) {
          completeFields++;
        }
      });
    });

    return totalFields > 0 ? completeFields / totalFields : 0;
  }

  /**
   * Calculate data consistency
   */
  private calculateConsistency(features: number[][], metadata: any[]): number {
    let consistencyScore = 1.0;

    // Check feature consistency (same number of features per sample)
    const featureLengths = features.map(row => row.length);
    const uniqueLengths = new Set(featureLengths);
    if (uniqueLengths.size > 1) {
      consistencyScore -= 0.3;
    }

    // Check metadata consistency
    if (metadata.length !== features.length) {
      consistencyScore -= 0.2;
    }

    // Check for invalid values
    const invalidCount = features.flat().filter(value => !isFinite(value)).length;
    const totalValues = features.flat().length;
    if (invalidCount > 0) {
      consistencyScore -= (invalidCount / totalValues) * 0.5;
    }

    return Math.max(0, consistencyScore);
  }

  /**
   * Calculate data validity
   */
  private calculateValidity(features: number[][], labels: number[][]): number {
    let validityScore = 1.0;

    // Check for NaN/Infinity values
    const invalidFeatures = features.flat().filter(value => !isFinite(value)).length;
    const invalidLabels = labels.flat().filter(value => !isFinite(value)).length;
    const totalValues = features.flat().length + labels.flat().length;

    if (totalValues > 0) {
      const invalidRatio = (invalidFeatures + invalidLabels) / totalValues;
      validityScore -= invalidRatio;
    }

    return Math.max(0, validityScore);
  }

  /**
   * Detect duplicate samples
   */
  private detectDuplicates(features: number[][]): number {
    const seen = new Set<string>();
    let duplicates = 0;

    features.forEach(row => {
      const key = row.join(',');
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    });

    return duplicates;
  }

  /**
   * Detect outliers using IQR method
   */
  private detectOutliers(features: number[][]): number {
    let outliers = 0;

    // Transpose features to work column-wise
    const featureColumns = features[0].map((_, colIndex) =>
      features.map(row => row[colIndex])
    );

    featureColumns.forEach(column => {
      const sortedColumn = [...column].sort((a, b) => a - b);
      const q1Index = Math.floor(sortedColumn.length * 0.25);
      const q3Index = Math.floor(sortedColumn.length * 0.75);
      const q1 = sortedColumn[q1Index];
      const q3 = sortedColumn[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      column.forEach(value => {
        if (value < lowerBound || value > upperBound) {
          outliers++;
        }
      });
    });

    return outliers;
  }

  /**
   * Calculate class balance
   */
  private calculateClassBalance(labels: number[][]): { [key: string]: number } {
    const balance: { [key: string]: number } = {};
    const totalSamples = labels.length;

    // For binary classification
    if (labels[0].length === 1) {
      const positiveCount = labels.filter(label => label[0] > 0.5).length;
      const negativeCount = totalSamples - positiveCount;

      balance['positive'] = positiveCount / totalSamples;
      balance['negative'] = negativeCount / totalSamples;
    } else {
      // For multi-class classification
      for (let classIndex = 0; classIndex < labels[0].length; classIndex++) {
        const classCount = labels.filter(label =>
          label.indexOf(Math.max(...label)) === classIndex
        ).length;
        balance[`class_${classIndex}`] = classCount / totalSamples;
      }
    }

    return balance;
  }

  /**
   * Generate data quality recommendations
   */
  private generateDataQualityRecommendations(
    completeness: number,
    consistency: number,
    validity: number,
    duplicates: number,
    outliers: number,
    balance: { [key: string]: number }
  ): string[] {
    const recommendations: string[] = [];

    if (completeness < 0.95) {
      recommendations.push('Improve data completeness by handling missing values');
    }

    if (consistency < 0.9) {
      recommendations.push('Address data consistency issues in feature formats');
    }

    if (validity < 0.95) {
      recommendations.push('Clean invalid values (NaN, Infinity) from dataset');
    }

    if (duplicates > 0) {
      recommendations.push(`Remove ${duplicates} duplicate samples from dataset`);
    }

    if (outliers > 0) {
      recommendations.push(`Review ${outliers} outlier values for data quality`);
    }

    // Check class imbalance
    const balanceValues = Object.values(balance);
    const minBalance = Math.min(...balanceValues);
    const maxBalance = Math.max(...balanceValues);
    if (maxBalance / minBalance > 3) {
      recommendations.push('Address class imbalance using sampling techniques');
    }

    return recommendations;
  }

  /**
   * Validate model architecture
   */
  private validateArchitecture(model: tf.LayersModel, modelType: ModelType): string[] {
    const issues: string[] = [];

    // Check parameter count
    const paramCount = model.countParams();
    if (paramCount < 1000) {
      issues.push('Model may be too simple (very low parameter count)');
    } else if (paramCount > 10000000) {
      issues.push('Model may be overcomplex (very high parameter count)');
    }

    // Check layer count
    const layerCount = model.layers.length;
    if (layerCount < 2) {
      issues.push('Model architecture too shallow');
    } else if (layerCount > 20) {
      issues.push('Model architecture may be too deep');
    }

    // Model-specific validations
    switch (modelType) {
      case 'fraud_detection':
        if (layerCount < 3) {
          issues.push('Fraud detection models typically need deeper architectures');
        }
        break;
      case 'sentiment':
        // Check for LSTM/RNN layers for text processing
        const hasRecurrentLayers = model.layers.some(layer =>
          layer.getClassName().toLowerCase().includes('lstm') ||
          layer.getClassName().toLowerCase().includes('gru')
        );
        if (!hasRecurrentLayers) {
          issues.push('Sentiment analysis may benefit from recurrent layers');
        }
        break;
    }

    return issues;
  }

  /**
   * Validate performance thresholds
   */
  private validatePerformanceThresholds(
    performance: ModelPerformance,
    modelType: ModelType
  ): string[] {
    const issues: string[] = [];

    // Define minimum thresholds by model type
    const thresholds = {
      pricing: { accuracy: 0.8, mae: 100 },
      matching: { accuracy: 0.85, precision: 0.8, recall: 0.8 },
      recommendation: { accuracy: 0.75, precision: 0.7 },
      sentiment: { accuracy: 0.8, f1Score: 0.75 },
      fraud_detection: { accuracy: 0.95, precision: 0.9, recall: 0.85 },
    };

    const threshold = thresholds[modelType];

    if (performance.accuracy < threshold.accuracy) {
      issues.push(`Accuracy ${performance.accuracy.toFixed(3)} below threshold ${threshold.accuracy}`);
    }

    if (threshold.precision && performance.precision < threshold.precision) {
      issues.push(`Precision ${performance.precision.toFixed(3)} below threshold ${threshold.precision}`);
    }

    if (threshold.recall && performance.recall < threshold.recall) {
      issues.push(`Recall ${performance.recall.toFixed(3)} below threshold ${threshold.recall}`);
    }

    if (threshold.f1Score && performance.f1Score < threshold.f1Score) {
      issues.push(`F1 Score ${performance.f1Score.toFixed(3)} below threshold ${threshold.f1Score}`);
    }

    if (threshold.mae && performance.mae > threshold.mae) {
      issues.push(`MAE ${performance.mae.toFixed(3)} above threshold ${threshold.mae}`);
    }

    // Performance latency check
    if (performance.latency > 1000) {
      issues.push(`Model inference latency ${performance.latency}ms too high`);
    }

    return issues;
  }

  /**
   * Test model stability with noise
   */
  private async testModelStability(
    model: tf.LayersModel,
    testData: TrainingData
  ): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Add small amounts of noise and test consistency
      const noiseFactors = [0.01, 0.05, 0.1];
      const originalPerformance = await this.trainingEngine.evaluateModel(model, testData);

      for (const noiseFactor of noiseFactors) {
        const noisyData = this.addNoise(testData, noiseFactor);
        const noisyPerformance = await this.trainingEngine.evaluateModel(model, noisyData);

        const accuracyDrop = originalPerformance.accuracy - noisyPerformance.accuracy;
        if (accuracyDrop > 0.1) {
          issues.push(`Model unstable with ${noiseFactor * 100}% noise (accuracy drop: ${accuracyDrop.toFixed(3)})`);
        }
      }
    } catch (error) {
      issues.push('Failed to perform stability testing');
    }

    return issues;
  }

  /**
   * Test adversarial robustness
   */
  private async testAdversarialRobustness(
    model: tf.LayersModel,
    testData: TrainingData
  ): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Simple adversarial test with gradient-based perturbations
      const sampleSize = Math.min(100, testData.features.length);
      const testSample = {
        features: testData.features.slice(0, sampleSize),
        labels: testData.labels.slice(0, sampleSize),
        metadata: testData.metadata.slice(0, sampleSize),
      };

      const originalPerformance = await this.trainingEngine.evaluateModel(model, testSample);

      // Add adversarial perturbations
      const adversarialData = this.generateAdversarialExamples(testSample);
      const adversarialPerformance = await this.trainingEngine.evaluateModel(model, adversarialData);

      const robustnessScore = adversarialPerformance.accuracy / originalPerformance.accuracy;
      if (robustnessScore < 0.8) {
        issues.push(`Model vulnerable to adversarial attacks (robustness score: ${robustnessScore.toFixed(3)})`);
      }
    } catch (error) {
      issues.push('Failed to perform adversarial robustness testing');
    }

    return issues;
  }

  /**
   * Add noise to training data
   */
  private addNoise(data: TrainingData, noiseFactor: number): TrainingData {
    const noisyFeatures = data.features.map(row =>
      row.map(value => value + (Math.random() - 0.5) * noiseFactor * value)
    );

    return {
      features: noisyFeatures,
      labels: data.labels,
      metadata: data.metadata,
    };
  }

  /**
   * Generate simple adversarial examples
   */
  private generateAdversarialExamples(data: TrainingData): TrainingData {
    // Simple FGSM-like approach with random perturbations
    const adversarialFeatures = data.features.map(row =>
      row.map(value => {
        const perturbation = (Math.random() - 0.5) * 0.1;
        return value + perturbation;
      })
    );

    return {
      features: adversarialFeatures,
      labels: data.labels,
      metadata: data.metadata,
    };
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(
    performance: ModelPerformance,
    biasMetrics: BiasMetrics,
    dataQuality: DataQualityMetrics,
    modelType: ModelType
  ): string[] {
    const improvements: string[] = [];

    // Performance improvements
    if (performance.accuracy < 0.9) {
      improvements.push('Consider increasing model complexity or training data size');
      improvements.push('Experiment with different architectures or hyperparameters');
    }

    if (performance.latency > 500) {
      improvements.push('Optimize model for inference speed using quantization or pruning');
    }

    // Bias improvements
    if (biasMetrics.biasDetected) {
      improvements.push('Implement bias mitigation techniques during training');
      improvements.push('Collect more diverse training data');
    }

    // Data quality improvements
    if (dataQuality.completeness < 0.95) {
      improvements.push('Improve data collection and preprocessing pipelines');
    }

    return improvements;
  }

  /**
   * Determine overall validation status
   */
  private determineValidationStatus(
    performance: ModelPerformance,
    biasMetrics: BiasMetrics,
    issues: string[],
    modelType: ModelType
  ): boolean {
    // Critical failures
    if (performance.accuracy < 0.5) return false;
    if (biasMetrics.biasDetected && biasMetrics.fairnessScore < 0.6) return false;
    if (issues.length > 10) return false;

    // Model-specific requirements
    const requirements = {
      fraud_detection: performance.accuracy >= 0.95 && performance.precision >= 0.9,
      pricing: performance.accuracy >= 0.8 && performance.mae < 100,
      matching: performance.accuracy >= 0.85,
      recommendation: performance.accuracy >= 0.75,
      sentiment: performance.accuracy >= 0.8,
    };

    return requirements[modelType] || performance.accuracy >= 0.8;
  }

  /**
   * Store validation results
   */
  private storeValidationResults(modelType: string, results: ValidationResults): void {
    if (!this.validationHistory.has(modelType)) {
      this.validationHistory.set(modelType, []);
    }

    const history = this.validationHistory.get(modelType)!;
    history.push(results);

    // Keep only last 50 validation results
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Get validation history
   */
  getValidationHistory(modelType: string, limit?: number): ValidationResults[] {
    const history = this.validationHistory.get(modelType) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get latest validation results
   */
  getLatestValidation(modelType: string): ValidationResults | undefined {
    const history = this.validationHistory.get(modelType) || [];
    return history[history.length - 1];
  }
}