/**
 * Bias Detection Service
 * Comprehensive fairness monitoring and bias detection for ML models
 */

import * as tf from '@tensorflow/tfjs';
import { logger } from '../../utils/logger';
import {
  BiasMetrics,
  TrainingData,
  FairnessCriteria,
  ModelType,
  TrainingEvent,
} from './types';

export class BiasDetectionService {
  private protectedAttributes = ['location', 'category', 'contractorId'];
  private fairnessThresholds = {
    demographicParity: 0.8, // 80% parity requirement
    equalOpportunity: 0.8,
    equalisedOdds: 0.8,
    calibration: 0.1, // Max 10% calibration difference
    disparateImpact: 0.8, // 80% rule
  };

  private eventListeners = new Map<string, (event: TrainingEvent) => void>();

  constructor() {
    this.initializeBiasDetection();
  }

  /**
   * Initialize bias detection system
   */
  private initializeBiasDetection(): void {
    logger.info('BiasDetectionService', 'Initializing bias detection system', {
      protectedAttributes: this.protectedAttributes,
      thresholds: this.fairnessThresholds,
    });
  }

  /**
   * Detect bias in model predictions
   */
  async detectBias(
    modelType: ModelType,
    model: tf.LayersModel,
    testData: TrainingData
  ): Promise<BiasMetrics> {
    try {
      logger.info('BiasDetectionService', 'Starting bias detection', {
        modelType,
        dataSize: testData.features.length,
      });

      const predictions = await this.getPredictions(model, testData.features);
      const biasMetrics = await this.calculateBiasMetrics(
        predictions,
        testData.labels,
        testData.metadata
      );

      // Check if bias is detected
      const biasDetected = this.isBiasDetected(biasMetrics);

      const result: BiasMetrics = {
        ...biasMetrics,
        biasDetected,
        affectedGroups: biasDetected ? this.identifyAffectedGroups(biasMetrics) : [],
        recommendations: this.generateBiasRecommendations(biasMetrics, biasDetected),
        timestamp: Date.now(),
        datasetSize: testData.features.length,
      };

      if (biasDetected) {
        this.emitBiasEvent(modelType, result);
      }

      logger.info('BiasDetectionService', 'Bias detection completed', {
        modelType,
        biasDetected,
        fairnessScore: result.fairnessScore,
      });

      return result;
    } catch (error) {
      logger.error('BiasDetectionService', 'Bias detection failed', error);
      throw error;
    }
  }

  /**
   * Get model predictions
   */
  private async getPredictions(model: tf.LayersModel, features: number[][]): Promise<number[]> {
    const inputTensor = tf.tensor2d(features);
    const predictions = model.predict(inputTensor) as tf.Tensor;
    const predictionData = await predictions.data();

    inputTensor.dispose();
    predictions.dispose();

    return Array.from(predictionData);
  }

  /**
   * Calculate comprehensive bias metrics
   */
  private async calculateBiasMetrics(
    predictions: number[],
    labels: number[][],
    metadata: any[]
  ): Promise<Omit<BiasMetrics, 'biasDetected' | 'affectedGroups' | 'recommendations' | 'timestamp' | 'datasetSize'>> {
    const flatLabels = labels.map(label => label[0] || 0);

    const demographicParity = this.calculateDemographicParity(predictions, metadata);
    const equalOpportunity = this.calculateEqualOpportunity(predictions, flatLabels, metadata);
    const disparateImpact = this.calculateDisparateImpact(predictions, metadata);
    const calibration = this.calculateCalibration(predictions, flatLabels, metadata);

    // Overall fairness score (weighted average)
    const fairnessScore = (
      demographicParity * 0.25 +
      equalOpportunity * 0.25 +
      disparateImpact * 0.25 +
      calibration * 0.25
    );

    return {
      fairnessScore,
      disparateImpact,
      demographicParity,
      equalOpportunity,
      calibration,
    };
  }

  /**
   * Calculate demographic parity
   * Measures if positive prediction rates are equal across groups
   */
  private calculateDemographicParity(predictions: number[], metadata: any[]): number {
    const groups = this.groupByProtectedAttribute(metadata, 'location');
    let minParity = 1.0;

    const groupKeys = Object.keys(groups);
    for (let i = 0; i < groupKeys.length; i++) {
      for (let j = i + 1; j < groupKeys.length; j++) {
        const group1 = groups[groupKeys[i]];
        const group2 = groups[groupKeys[j]];

        const rate1 = this.getPositivePredictionRate(predictions, group1);
        const rate2 = this.getPositivePredictionRate(predictions, group2);

        const parity = Math.min(rate1, rate2) / Math.max(rate1, rate2);
        minParity = Math.min(minParity, parity);
      }
    }

    return minParity;
  }

  /**
   * Calculate equal opportunity
   * Measures if true positive rates are equal across groups
   */
  private calculateEqualOpportunity(predictions: number[], labels: number[], metadata: any[]): number {
    const groups = this.groupByProtectedAttribute(metadata, 'location');
    let minOpportunity = 1.0;

    const groupKeys = Object.keys(groups);
    for (let i = 0; i < groupKeys.length; i++) {
      for (let j = i + 1; j < groupKeys.length; j++) {
        const group1 = groups[groupKeys[i]];
        const group2 = groups[groupKeys[j]];

        const tpr1 = this.getTruePositiveRate(predictions, labels, group1);
        const tpr2 = this.getTruePositiveRate(predictions, labels, group2);

        const opportunity = Math.min(tpr1, tpr2) / Math.max(tpr1, tpr2);
        minOpportunity = Math.min(minOpportunity, opportunity);
      }
    }

    return minOpportunity;
  }

  /**
   * Calculate disparate impact
   * 80% rule: ratio of positive prediction rates
   */
  private calculateDisparateImpact(predictions: number[], metadata: any[]): number {
    const groups = this.groupByProtectedAttribute(metadata, 'location');
    const groupKeys = Object.keys(groups);

    if (groupKeys.length < 2) return 1.0;

    let minImpact = 1.0;
    for (let i = 0; i < groupKeys.length; i++) {
      for (let j = i + 1; j < groupKeys.length; j++) {
        const group1 = groups[groupKeys[i]];
        const group2 = groups[groupKeys[j]];

        const rate1 = this.getPositivePredictionRate(predictions, group1);
        const rate2 = this.getPositivePredictionRate(predictions, group2);

        const impact = Math.min(rate1, rate2) / Math.max(rate1, rate2);
        minImpact = Math.min(minImpact, impact);
      }
    }

    return minImpact;
  }

  /**
   * Calculate calibration
   * Measures if predicted probabilities match actual outcomes
   */
  private calculateCalibration(predictions: number[], labels: number[], metadata: any[]): number {
    const groups = this.groupByProtectedAttribute(metadata, 'location');
    let maxCalibrationDiff = 0;

    const groupKeys = Object.keys(groups);
    for (let i = 0; i < groupKeys.length; i++) {
      for (let j = i + 1; j < groupKeys.length; j++) {
        const group1 = groups[groupKeys[i]];
        const group2 = groups[groupKeys[j]];

        const cal1 = this.getCalibrationScore(predictions, labels, group1);
        const cal2 = this.getCalibrationScore(predictions, labels, group2);

        const diff = Math.abs(cal1 - cal2);
        maxCalibrationDiff = Math.max(maxCalibrationDiff, diff);
      }
    }

    return 1 - maxCalibrationDiff; // Convert to 0-1 scale where 1 is best
  }

  /**
   * Group data by protected attribute
   */
  private groupByProtectedAttribute(metadata: any[], attribute: string): { [key: string]: number[] } {
    const groups: { [key: string]: number[] } = {};

    metadata.forEach((item, index) => {
      const value = item[attribute] || 'unknown';
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(index);
    });

    return groups;
  }

  /**
   * Get positive prediction rate for a group
   */
  private getPositivePredictionRate(predictions: number[], groupIndices: number[]): number {
    if (groupIndices.length === 0) return 0;

    const positives = groupIndices.filter(i => predictions[i] > 0.5).length;
    return positives / groupIndices.length;
  }

  /**
   * Get true positive rate for a group
   */
  private getTruePositiveRate(predictions: number[], labels: number[], groupIndices: number[]): number {
    const actualPositives = groupIndices.filter(i => labels[i] > 0.5);
    if (actualPositives.length === 0) return 0;

    const truePositives = actualPositives.filter(i => predictions[i] > 0.5).length;
    return truePositives / actualPositives.length;
  }

  /**
   * Get calibration score for a group
   */
  private getCalibrationScore(predictions: number[], labels: number[], groupIndices: number[]): number {
    if (groupIndices.length === 0) return 0;

    // Bin predictions and calculate calibration
    const bins = 10;
    let totalCalibration = 0;
    let totalSamples = 0;

    for (let bin = 0; bin < bins; bin++) {
      const binMin = bin / bins;
      const binMax = (bin + 1) / bins;

      const binIndices = groupIndices.filter(i =>
        predictions[i] >= binMin && predictions[i] < binMax
      );

      if (binIndices.length > 0) {
        const avgPrediction = binIndices.reduce((sum, i) => sum + predictions[i], 0) / binIndices.length;
        const avgActual = binIndices.reduce((sum, i) => sum + labels[i], 0) / binIndices.length;

        totalCalibration += Math.abs(avgPrediction - avgActual) * binIndices.length;
        totalSamples += binIndices.length;
      }
    }

    return totalSamples > 0 ? totalCalibration / totalSamples : 0;
  }

  /**
   * Check if bias is detected based on thresholds
   */
  private isBiasDetected(metrics: Omit<BiasMetrics, 'biasDetected' | 'affectedGroups' | 'recommendations' | 'timestamp' | 'datasetSize'>): boolean {
    return (
      metrics.demographicParity < this.fairnessThresholds.demographicParity ||
      metrics.equalOpportunity < this.fairnessThresholds.equalOpportunity ||
      metrics.disparateImpact < this.fairnessThresholds.disparateImpact ||
      (1 - metrics.calibration) > this.fairnessThresholds.calibration
    );
  }

  /**
   * Identify affected groups
   */
  private identifyAffectedGroups(metrics: Omit<BiasMetrics, 'biasDetected' | 'affectedGroups' | 'recommendations' | 'timestamp' | 'datasetSize'>): string[] {
    const affectedGroups: string[] = [];

    if (metrics.demographicParity < this.fairnessThresholds.demographicParity) {
      affectedGroups.push('Demographic groups show unequal positive prediction rates');
    }

    if (metrics.equalOpportunity < this.fairnessThresholds.equalOpportunity) {
      affectedGroups.push('Groups have unequal true positive rates');
    }

    if (metrics.disparateImpact < this.fairnessThresholds.disparateImpact) {
      affectedGroups.push('Disparate impact detected (80% rule violation)');
    }

    return affectedGroups;
  }

  /**
   * Generate bias mitigation recommendations
   */
  private generateBiasRecommendations(
    metrics: Omit<BiasMetrics, 'biasDetected' | 'affectedGroups' | 'recommendations' | 'timestamp' | 'datasetSize'>,
    biasDetected: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!biasDetected) {
      recommendations.push('Model shows good fairness metrics across protected groups');
      return recommendations;
    }

    if (metrics.demographicParity < this.fairnessThresholds.demographicParity) {
      recommendations.push('Apply demographic parity constraints during training');
      recommendations.push('Balance training data across protected groups');
    }

    if (metrics.equalOpportunity < this.fairnessThresholds.equalOpportunity) {
      recommendations.push('Implement equal opportunity constraints');
      recommendations.push('Use equalized odds post-processing');
    }

    if (metrics.disparateImpact < this.fairnessThresholds.disparateImpact) {
      recommendations.push('Review feature selection to remove proxy variables');
      recommendations.push('Apply disparate impact mitigation techniques');
    }

    if ((1 - metrics.calibration) > this.fairnessThresholds.calibration) {
      recommendations.push('Improve model calibration across groups');
      recommendations.push('Use calibration post-processing methods');
    }

    recommendations.push('Consider using fairness-aware training algorithms');
    recommendations.push('Regularly monitor bias metrics in production');

    return recommendations;
  }

  /**
   * Emit bias detection event
   */
  private emitBiasEvent(modelType: ModelType, biasMetrics: BiasMetrics): void {
    const event: TrainingEvent = {
      type: 'bias_detected',
      modelType,
      timestamp: Date.now(),
      data: {
        fairnessScore: biasMetrics.fairnessScore,
        affectedGroups: biasMetrics.affectedGroups,
        recommendations: biasMetrics.recommendations,
      },
    };

    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error('BiasDetectionService', 'Event listener failed', error);
      }
    });

    logger.warn('BiasDetectionService', 'Bias detected', {
      modelType,
      fairnessScore: biasMetrics.fairnessScore,
      affectedGroups: biasMetrics.affectedGroups.length,
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: TrainingEvent) => void): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.eventListeners.set(id, listener);
    return id;
  }

  /**
   * Remove event listener
   */
  removeEventListener(id: string): void {
    this.eventListeners.delete(id);
  }

  /**
   * Update fairness thresholds
   */
  updateFairnessThresholds(thresholds: Partial<typeof this.fairnessThresholds>): void {
    this.fairnessThresholds = { ...this.fairnessThresholds, ...thresholds };
    logger.info('BiasDetectionService', 'Fairness thresholds updated', this.fairnessThresholds);
  }

  /**
   * Get current fairness thresholds
   */
  getFairnessThresholds(): typeof this.fairnessThresholds {
    return { ...this.fairnessThresholds };
  }

  /**
   * Validate fairness criteria
   */
  validateFairnessCriteria(criteria: FairnessCriteria, metrics: BiasMetrics): {
    passed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (criteria.demographicParity && metrics.demographicParity < this.fairnessThresholds.demographicParity) {
      violations.push('Demographic parity requirement not met');
    }

    if (criteria.equalOpportunity && metrics.equalOpportunity < this.fairnessThresholds.equalOpportunity) {
      violations.push('Equal opportunity requirement not met');
    }

    if (criteria.calibration && (1 - metrics.calibration) > this.fairnessThresholds.calibration) {
      violations.push('Calibration requirement not met');
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Generate bias mitigation strategy
   */
  generateMitigationStrategy(biasMetrics: BiasMetrics): {
    strategy: string;
    techniques: string[];
    expectedImprovement: string;
    implementationSteps: string[];
  } {
    const mostProblematicMetric = this.identifyMostProblematicMetric(biasMetrics);

    const strategies = {
      demographicParity: {
        strategy: 'Demographic Parity Optimization',
        techniques: ['Reweighting', 'Adversarial debiasing', 'Fairness constraints'],
        expectedImprovement: 'Equalize positive prediction rates across groups',
        implementationSteps: [
          'Apply sample weights to balance groups',
          'Add fairness regularization to loss function',
          'Validate improvements on held-out test set',
        ],
      },
      equalOpportunity: {
        strategy: 'Equal Opportunity Enhancement',
        techniques: ['Equalized odds postprocessing', 'Threshold optimization', 'Calibration'],
        expectedImprovement: 'Equalize true positive rates across groups',
        implementationSteps: [
          'Optimize decision thresholds per group',
          'Apply post-processing calibration',
          'Monitor TPR across all groups',
        ],
      },
      calibration: {
        strategy: 'Calibration Improvement',
        techniques: ['Platt scaling', 'Isotonic regression', 'Temperature scaling'],
        expectedImprovement: 'Improve prediction reliability across groups',
        implementationSteps: [
          'Train calibration model on validation set',
          'Apply calibration transformation',
          'Validate calibration metrics',
        ],
      },
    };

    return strategies[mostProblematicMetric] || strategies.demographicParity;
  }

  /**
   * Identify the most problematic bias metric
   */
  private identifyMostProblematicMetric(biasMetrics: BiasMetrics): keyof typeof this.fairnessThresholds {
    const scores = {
      demographicParity: biasMetrics.demographicParity / this.fairnessThresholds.demographicParity,
      equalOpportunity: biasMetrics.equalOpportunity / this.fairnessThresholds.equalOpportunity,
      calibration: (1 - biasMetrics.calibration) / this.fairnessThresholds.calibration,
    };

    return Object.entries(scores).reduce((worst, [metric, score]) =>
      score < scores[worst] ? metric as keyof typeof this.fairnessThresholds : worst,
      'demographicParity' as keyof typeof this.fairnessThresholds
    );
  }
}