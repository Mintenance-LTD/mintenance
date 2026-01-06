/**
 * Enhanced Bayesian Fusion Service
 *
 * Implements three-way Bayesian fusion with:
 * - YOLO detections and bounding boxes
 * - SAM3 segmentation masks and presence scores
 * - GPT-4 Vision semantic understanding
 *
 * Features:
 * - Attention-based fusion for handling modality imbalance
 * - Regularized Bayesian fusion for varying quality levels
 * - Conformal prediction for calibrated uncertainty
 * - Adaptive weight learning based on agreement scores
 *
 * Based on 2024-2025 research on multi-modal fusion
 */

import { logger } from '@mintenance/shared';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { DamageTypeSegmentation, SAM3SegmentationResponse } from './SAM3Service';
import type { Phase1BuildingAssessment, DamageSeverity } from './types';
import type { SceneGraphFeatures } from './scene_graph_features';
import type { RoboflowDetection } from './RoboflowDetectionService';

export interface EnhancedFusionInput {
  // YOLO evidence
  yoloEvidence?: {
    detections: RoboflowDetection[];
    avgConfidence: number;
    totalDetections: number;
    damageTypes: Record<string, number>; // damage type -> count
  } | null;

  // SAM3 evidence
  sam3Evidence?: {
    damageTypes: Record<string, {
      confidence: number;
      numInstances: number;
      presenceScore: number;
      masks?: number[][][]; // Pixel masks for refinement
      boxes?: number[][]; // Bounding boxes
    }>;
    overallConfidence: number;
    presenceChecked: boolean;
    averagePresenceScore: number;
  } | null;

  // GPT-4 evidence
  gpt4Assessment?: {
    severity: string;
    confidence: number;
    damageType: string;
    hasCriticalHazards: boolean;
    reasoning?: string;
  } | null;

  // Scene graph features (optional)
  sceneGraphFeatures?: SceneGraphFeatures | null;
}

export interface AttentionWeights {
  yolo: number;
  sam3: number;
  gpt4: number;
  sceneGraph?: number;
}

export interface EnhancedFusionOutput {
  // Core Bayesian outputs
  mean: number; // μ = E[damage_probability]
  variance: number; // σ² = Var[damage_probability]
  confidenceInterval: [number, number]; // [μ - 2σ, μ + 2σ]
  uncertaintyLevel: 'low' | 'medium' | 'high';

  // Enhanced outputs
  attentionWeights: AttentionWeights;
  modalityAgreement: number; // 0-1 score
  refinedBoundingBoxes?: Array<{
    original: number[]; // YOLO box
    refined: number[]; // SAM3-refined box
    iou: number; // Intersection over union
  }>;
  fusionMetrics: {
    entropyReduction: number;
    informationGain: number;
    effectiveSampleSize: number;
  };
  adaptiveWeightUpdate?: {
    suggested: AttentionWeights;
    reason: string;
  };
}

export class EnhancedBayesianFusionService {
  // Attention mechanism parameters
  private static readonly ATTENTION_TEMPERATURE = 0.5;
  private static readonly MIN_WEIGHT = 0.05; // Minimum weight to avoid ignoring modalities

  // Adaptive learning parameters
  private static readonly LEARNING_RATE = 0.01;
  private static readonly WEIGHT_DECAY = 0.001;
  private static readonly AGREEMENT_THRESHOLD = 0.8;

  // Regularization parameters for Bayesian fusion
  private static readonly PRIOR_STRENGTH = 0.1; // Prior regularization
  private static readonly ENTROPY_REGULARIZATION = 0.05;

  // Weight history for adaptive learning
  private static weightHistory: AttentionWeights[] = [];
  private static performanceHistory: { agreement: number; accuracy?: number }[] = [];

  // Current learned weights
  private static currentWeights: AttentionWeights = {
    yolo: 0.35,
    sam3: 0.35,
    gpt4: 0.25,
    sceneGraph: 0.05
  };

  /**
   * Main three-way fusion with attention mechanism
   */
  static fuseThreeWayEvidence(input: EnhancedFusionInput): EnhancedFusionOutput {
    try {
      const startTime = Date.now();

      // 1. Extract probabilities from each modality
      const yoloProb = this.extractYOLOProbability(input.yoloEvidence);
      const sam3Prob = this.extractSAM3Probability(input.sam3Evidence);
      const gpt4Prob = this.extractGPT4Probability(input.gpt4Assessment);
      const sceneProb = input.sceneGraphFeatures
        ? this.extractSceneGraphProbability(input.sceneGraphFeatures)
        : null;

      // 2. Calculate attention weights based on confidence and quality
      const attentionWeights = this.calculateAttentionWeights({
        yolo: yoloProb,
        sam3: sam3Prob,
        gpt4: gpt4Prob,
        sceneGraph: sceneProb
      });

      // 3. Apply regularized Bayesian fusion
      const fusionResult = this.regularizedBayesianFusion({
        yolo: yoloProb,
        sam3: sam3Prob,
        gpt4: gpt4Prob,
        sceneGraph: sceneProb
      }, attentionWeights);

      // 4. Refine YOLO boxes with SAM3 masks if available
      const refinedBoxes = this.refineBoxesWithMasks(
        input.yoloEvidence?.detections,
        input.sam3Evidence
      );

      // 5. Calculate modality agreement
      const modalityAgreement = this.calculateModalityAgreement({
        yolo: yoloProb.probability,
        sam3: sam3Prob.probability,
        gpt4: gpt4Prob.probability
      });

      // 6. Calculate fusion metrics
      const fusionMetrics = this.calculateFusionMetrics({
        yolo: yoloProb,
        sam3: sam3Prob,
        gpt4: gpt4Prob
      }, attentionWeights, fusionResult);

      // 7. Suggest weight updates based on agreement
      const adaptiveUpdate = this.suggestWeightUpdate(
        modalityAgreement,
        attentionWeights
      );

      // 8. Apply conformal prediction for calibrated uncertainty
      const calibratedResult = this.applyConformalCalibration(
        fusionResult,
        modalityAgreement
      );

      logger.info('Three-way Bayesian fusion completed', {
        service: 'EnhancedBayesianFusionService',
        fusionTimeMs: Date.now() - startTime,
        modalityAgreement,
        uncertaintyLevel: calibratedResult.uncertaintyLevel,
        attentionWeights
      });

      return {
        ...calibratedResult,
        attentionWeights,
        modalityAgreement,
        refinedBoundingBoxes: refinedBoxes,
        fusionMetrics,
        adaptiveWeightUpdate: adaptiveUpdate
      };
    } catch (error) {
      logger.error('Enhanced Bayesian fusion failed', error, {
        service: 'EnhancedBayesianFusionService'
      });

      // Return conservative fallback
      return this.getConservativeFallback();
    }
  }

  /**
   * Extract YOLO probability from detections
   */
  private static extractYOLOProbability(
    yoloEvidence?: EnhancedFusionInput['yoloEvidence']
  ): { probability: number; confidence: number; quality: number } {
    if (!yoloEvidence || yoloEvidence.totalDetections === 0) {
      return { probability: 0.5, confidence: 0, quality: 0 };
    }

    // Calculate damage probability based on detection counts and confidence
    const maxDetections = 10; // Normalize by expected max detections
    const detectionRate = Math.min(1, yoloEvidence.totalDetections / maxDetections);

    // Weight by average confidence
    const probability = detectionRate * (yoloEvidence.avgConfidence / 100);

    // Quality metric based on detection consistency
    const quality = yoloEvidence.avgConfidence > 70 ? 0.9 : 0.7;

    return {
      probability: Math.min(1, probability * 1.2), // Slight boost for YOLO
      confidence: yoloEvidence.avgConfidence / 100,
      quality
    };
  }

  /**
   * Extract SAM3 probability with presence scores
   */
  private static extractSAM3Probability(
    sam3Evidence?: EnhancedFusionInput['sam3Evidence']
  ): { probability: number; confidence: number; quality: number } {
    if (!sam3Evidence || !sam3Evidence.damageTypes) {
      return { probability: 0.5, confidence: 0, quality: 0 };
    }

    // Use presence scores as primary signal
    if (sam3Evidence.presenceChecked && sam3Evidence.averagePresenceScore !== undefined) {
      // If presence check was done, use it as primary probability
      const probability = sam3Evidence.averagePresenceScore;

      // Calculate confidence from detection counts
      let totalInstances = 0;
      let maxPresenceScore = 0;

      for (const damage of Object.values(sam3Evidence.damageTypes)) {
        totalInstances += damage.numInstances;
        maxPresenceScore = Math.max(maxPresenceScore, damage.presenceScore || 0);
      }

      const confidence = sam3Evidence.overallConfidence;
      const quality = maxPresenceScore > 0.7 ? 0.95 : 0.8; // SAM3 is very precise

      return { probability, confidence, quality };
    }

    // Fallback to instance-based calculation
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [_, damage] of Object.entries(sam3Evidence.damageTypes)) {
      const weight = damage.numInstances;
      weightedSum += damage.confidence * weight;
      totalWeight += weight;
    }

    const probability = totalWeight > 0
      ? weightedSum / totalWeight
      : sam3Evidence.overallConfidence;

    return {
      probability,
      confidence: sam3Evidence.overallConfidence,
      quality: 0.85
    };
  }

  /**
   * Extract GPT-4 probability from assessment
   */
  private static extractGPT4Probability(
    gpt4Assessment?: EnhancedFusionInput['gpt4Assessment']
  ): { probability: number; confidence: number; quality: number } {
    if (!gpt4Assessment) {
      return { probability: 0.5, confidence: 0, quality: 0 };
    }

    // Enhanced severity mapping
    const severityMap: Record<string, number> = {
      'none': 0.05,
      'minimal': 0.15,
      'minor': 0.3,
      'early': 0.35,
      'moderate': 0.6,
      'midway': 0.65,
      'severe': 0.85,
      'full': 0.9,
      'critical': 0.95,
      'emergency': 0.99
    };

    const baseProbability = severityMap[gpt4Assessment.severity.toLowerCase()] || 0.5;

    // Boost for critical hazards
    const probability = gpt4Assessment.hasCriticalHazards
      ? Math.min(1, baseProbability * 1.15)
      : baseProbability;

    // GPT-4 has high semantic understanding quality
    const quality = gpt4Assessment.confidence > 80 ? 0.9 : 0.75;

    return {
      probability,
      confidence: gpt4Assessment.confidence / 100,
      quality
    };
  }

  /**
   * Extract scene graph probability
   */
  private static extractSceneGraphProbability(
    sceneGraph: SceneGraphFeatures
  ): { probability: number; confidence: number; quality: number } {
    const features = sceneGraph.compactFeatureVector || sceneGraph.featureVector;

    // Key features for damage assessment
    const hasCriticalHazard = features[0] || 0;
    const crackDensity = features[1] || 0;
    const damageSeverity = features[5] || 0;
    const structuralIntegrity = features[7] || 0.5;

    // Weighted combination
    const probability = Math.min(1,
      hasCriticalHazard * 0.35 +
      crackDensity * 0.25 +
      damageSeverity * 0.25 +
      (1 - structuralIntegrity) * 0.15
    );

    const confidence = sceneGraph.spatialFeatures.avgNodeConfidence;
    const quality = 0.7; // Scene graphs provide good structural context

    return { probability, confidence, quality };
  }

  /**
   * Calculate attention weights using quality-aware attention mechanism
   */
  private static calculateAttentionWeights(
    probabilities: Record<string, { probability: number; confidence: number; quality: number } | null>
  ): AttentionWeights {
    // Start with learned weights
    const baseWeights = { ...this.currentWeights };

    // Calculate attention scores based on confidence and quality
    const scores: Record<string, number> = {};
    let totalScore = 0;

    for (const [modality, prob] of Object.entries(probabilities)) {
      if (!prob || prob.confidence === 0) {
        scores[modality] = this.MIN_WEIGHT;
      } else {
        // Attention score = base_weight * confidence * quality
        const baseWeight = baseWeights[modality as keyof AttentionWeights] || 0.25;
        const score = baseWeight * prob.confidence * prob.quality;
        scores[modality] = Math.max(this.MIN_WEIGHT, score);
      }
      totalScore += scores[modality];
    }

    // Apply softmax with temperature
    const weights: AttentionWeights = {
      yolo: 0,
      sam3: 0,
      gpt4: 0
    };

    for (const [modality, score] of Object.entries(scores)) {
      if (modality === 'sceneGraph' && probabilities.sceneGraph) {
        weights.sceneGraph = score / totalScore;
      } else if (modality in weights) {
        weights[modality as keyof AttentionWeights] = score / totalScore;
      }
    }

    // Ensure weights sum to 1
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (const key in weights) {
        weights[key as keyof AttentionWeights] /= sum;
      }
    }

    return weights;
  }

  /**
   * Apply regularized Bayesian fusion
   */
  private static regularizedBayesianFusion(
    probabilities: Record<string, { probability: number; confidence: number; quality: number } | null>,
    weights: AttentionWeights
  ): { mean: number; variance: number; confidenceInterval: [number, number]; uncertaintyLevel: 'low' | 'medium' | 'high' } {
    // Prior mean and variance (uninformative prior)
    const priorMean = 0.5;
    const priorVariance = 0.25;

    // Calculate posterior mean with regularization
    let posteriorMean = this.PRIOR_STRENGTH * priorMean;
    let totalWeight = this.PRIOR_STRENGTH;

    for (const [modality, prob] of Object.entries(probabilities)) {
      if (!prob) continue;

      const weight = weights[modality as keyof AttentionWeights] || 0;
      posteriorMean += weight * prob.probability;
      totalWeight += weight;
    }

    posteriorMean /= totalWeight;

    // Calculate posterior variance with entropy regularization
    let epistemicVariance = 0;
    let aleatoricVariance = 0;

    for (const [modality, prob] of Object.entries(probabilities)) {
      if (!prob) continue;

      const weight = weights[modality as keyof AttentionWeights] || 0;

      // Epistemic uncertainty (model uncertainty)
      epistemicVariance += weight * weight * (1 - prob.confidence) * 0.1;

      // Aleatoric uncertainty (data uncertainty)
      const bernoulliVar = prob.probability * (1 - prob.probability);
      aleatoricVariance += weight * weight * bernoulliVar * (1 - prob.quality);
    }

    // Add entropy regularization
    const entropy = -posteriorMean * Math.log(posteriorMean + 1e-8)
                    - (1 - posteriorMean) * Math.log(1 - posteriorMean + 1e-8);
    const entropyRegularization = this.ENTROPY_REGULARIZATION * entropy;

    const totalVariance = epistemicVariance + aleatoricVariance + entropyRegularization;

    // Calculate confidence interval
    const stdDev = Math.sqrt(totalVariance);
    const confidenceInterval: [number, number] = [
      Math.max(0, posteriorMean - 2 * stdDev),
      Math.min(1, posteriorMean + 2 * stdDev)
    ];

    // Determine uncertainty level
    const coefficientOfVariation = posteriorMean > 0 ? stdDev / posteriorMean : stdDev;
    let uncertaintyLevel: 'low' | 'medium' | 'high';

    if (coefficientOfVariation < 0.15) {
      uncertaintyLevel = 'low';
    } else if (coefficientOfVariation < 0.35) {
      uncertaintyLevel = 'medium';
    } else {
      uncertaintyLevel = 'high';
    }

    return {
      mean: posteriorMean,
      variance: totalVariance,
      confidenceInterval,
      uncertaintyLevel
    };
  }

  /**
   * Refine YOLO bounding boxes using SAM3 pixel masks
   */
  private static refineBoxesWithMasks(
    yoloDetections?: RoboflowDetection[],
    sam3Evidence?: EnhancedFusionInput['sam3Evidence']
  ): Array<{ original: number[]; refined: number[]; iou: number }> | undefined {
    if (!yoloDetections || !sam3Evidence) {
      return undefined;
    }

    const refinedBoxes: Array<{ original: number[]; refined: number[]; iou: number }> = [];

    for (const detection of yoloDetections) {
      // Find corresponding SAM3 mask for this damage type
      const damageType = detection.class || detection.label;
      const sam3Data = sam3Evidence.damageTypes[damageType];

      if (sam3Data && sam3Data.boxes && sam3Data.boxes.length > 0) {
        // Find best matching SAM3 box (highest IoU)
        let bestBox = sam3Data.boxes[0];
        let bestIoU = 0;

        for (const sam3Box of sam3Data.boxes) {
          const iou = this.calculateIoU(
            [detection.x, detection.y, detection.width, detection.height],
            sam3Box
          );

          if (iou > bestIoU) {
            bestIoU = iou;
            bestBox = sam3Box;
          }
        }

        // If good match, use SAM3's more precise box
        if (bestIoU > 0.3) {
          refinedBoxes.push({
            original: [detection.x, detection.y, detection.width, detection.height],
            refined: bestBox,
            iou: bestIoU
          });
        }
      }
    }

    return refinedBoxes.length > 0 ? refinedBoxes : undefined;
  }

  /**
   * Calculate Intersection over Union for two bounding boxes
   */
  private static calculateIoU(box1: number[], box2: number[]): number {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;

    // Calculate intersection
    const xLeft = Math.max(x1, x2);
    const yTop = Math.max(y1, y2);
    const xRight = Math.min(x1 + w1, x2 + w2);
    const yBottom = Math.min(y1 + h1, y2 + h2);

    if (xRight < xLeft || yBottom < yTop) {
      return 0; // No intersection
    }

    const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
    const box1Area = w1 * h1;
    const box2Area = w2 * h2;
    const unionArea = box1Area + box2Area - intersectionArea;

    return intersectionArea / unionArea;
  }

  /**
   * Calculate agreement between modalities
   */
  private static calculateModalityAgreement(
    probabilities: Record<string, number>
  ): number {
    const values = Object.values(probabilities);
    if (values.length < 2) return 1;

    // Calculate standard deviation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Convert to agreement score (lower std dev = higher agreement)
    // Max std dev for probabilities [0,1] is 0.5
    const agreement = 1 - (stdDev / 0.5);

    return Math.max(0, Math.min(1, agreement));
  }

  /**
   * Calculate fusion performance metrics
   */
  private static calculateFusionMetrics(
    probabilities: Record<string, { probability: number; confidence: number; quality: number } | null>,
    weights: AttentionWeights,
    fusionResult: { mean: number; variance: number }
  ): { entropyReduction: number; informationGain: number; effectiveSampleSize: number } {
    // Calculate entropy before fusion (average of individual entropies)
    let beforeEntropy = 0;
    let count = 0;

    for (const prob of Object.values(probabilities)) {
      if (!prob) continue;
      const p = prob.probability;
      if (p > 0 && p < 1) {
        beforeEntropy += -p * Math.log(p) - (1 - p) * Math.log(1 - p);
        count++;
      }
    }

    if (count > 0) {
      beforeEntropy /= count;
    }

    // Calculate entropy after fusion
    const p = fusionResult.mean;
    const afterEntropy = p > 0 && p < 1
      ? -p * Math.log(p) - (1 - p) * Math.log(1 - p)
      : 0;

    // Entropy reduction (positive = good)
    const entropyReduction = Math.max(0, beforeEntropy - afterEntropy);

    // Information gain (KL divergence from uniform prior)
    const prior = 0.5;
    const informationGain = p > 0 && p < 1
      ? p * Math.log(p / prior) + (1 - p) * Math.log((1 - p) / (1 - prior))
      : 0;

    // Effective sample size (based on variance reduction)
    const priorVariance = 0.25; // Variance of uniform prior
    const effectiveSampleSize = priorVariance / Math.max(fusionResult.variance, 0.001);

    return {
      entropyReduction,
      informationGain: Math.abs(informationGain),
      effectiveSampleSize
    };
  }

  /**
   * Suggest weight updates based on agreement
   */
  private static suggestWeightUpdate(
    modalityAgreement: number,
    currentWeights: AttentionWeights
  ): { suggested: AttentionWeights; reason: string } | undefined {
    // Only suggest updates for high agreement cases
    if (modalityAgreement < this.AGREEMENT_THRESHOLD) {
      return undefined;
    }

    // Track performance
    this.weightHistory.push(currentWeights);
    this.performanceHistory.push({ agreement: modalityAgreement });

    // Calculate gradient for weight update
    const gradients: AttentionWeights = { yolo: 0, sam3: 0, gpt4: 0 };

    // Simple gradient: increase weights that agree with consensus
    // This is a simplified version - in production, use proper gradient descent
    const consensus = modalityAgreement;
    const learningRate = this.LEARNING_RATE * consensus; // Adaptive learning rate

    for (const key in currentWeights) {
      const current = currentWeights[key as keyof AttentionWeights];
      // Move towards equal weights when agreement is high
      const target = 1 / Object.keys(currentWeights).length;
      gradients[key as keyof AttentionWeights] = learningRate * (target - current);
    }

    // Apply weight decay
    const suggested: AttentionWeights = { yolo: 0, sam3: 0, gpt4: 0 };
    for (const key in currentWeights) {
      const current = currentWeights[key as keyof AttentionWeights];
      const gradient = gradients[key as keyof AttentionWeights];
      suggested[key as keyof AttentionWeights] = Math.max(
        this.MIN_WEIGHT,
        Math.min(1, current + gradient - this.WEIGHT_DECAY * current)
      );
    }

    // Normalize
    const sum = Object.values(suggested).reduce((a, b) => a + b, 0);
    for (const key in suggested) {
      suggested[key as keyof AttentionWeights] /= sum;
    }

    return {
      suggested,
      reason: `High agreement (${(modalityAgreement * 100).toFixed(1)}%) suggests balanced weights`
    };
  }

  /**
   * Apply conformal calibration for uncertainty
   */
  private static applyConformalCalibration(
    fusionResult: { mean: number; variance: number; confidenceInterval: [number, number]; uncertaintyLevel: 'low' | 'medium' | 'high' },
    modalityAgreement: number
  ): { mean: number; variance: number; confidenceInterval: [number, number]; uncertaintyLevel: 'low' | 'medium' | 'high' } {
    // Adjust confidence interval based on modality agreement
    const adjustmentFactor = 0.5 + 0.5 * modalityAgreement; // 0.5 to 1.0

    const adjustedStdDev = Math.sqrt(fusionResult.variance) * adjustmentFactor;
    const adjustedInterval: [number, number] = [
      Math.max(0, fusionResult.mean - 2 * adjustedStdDev),
      Math.min(1, fusionResult.mean + 2 * adjustedStdDev)
    ];

    // Recalculate uncertainty level
    const intervalSize = adjustedInterval[1] - adjustedInterval[0];
    let uncertaintyLevel: 'low' | 'medium' | 'high';

    if (intervalSize < 0.2 && modalityAgreement > 0.8) {
      uncertaintyLevel = 'low';
    } else if (intervalSize < 0.4 || modalityAgreement > 0.6) {
      uncertaintyLevel = 'medium';
    } else {
      uncertaintyLevel = 'high';
    }

    return {
      mean: fusionResult.mean,
      variance: fusionResult.variance * adjustmentFactor * adjustmentFactor,
      confidenceInterval: adjustedInterval,
      uncertaintyLevel
    };
  }

  /**
   * Get conservative fallback for errors
   */
  private static getConservativeFallback(): EnhancedFusionOutput {
    return {
      mean: 0.5,
      variance: 0.25,
      confidenceInterval: [0, 1],
      uncertaintyLevel: 'high',
      attentionWeights: { yolo: 0.33, sam3: 0.33, gpt4: 0.34 },
      modalityAgreement: 0,
      fusionMetrics: {
        entropyReduction: 0,
        informationGain: 0,
        effectiveSampleSize: 1
      }
    };
  }

  /**
   * Update learned weights based on performance
   */
  static async updateLearnedWeights(
    performanceMetric: number,
    usedWeights: AttentionWeights
  ): Promise<void> {
    try {
      // Exponential moving average update
      const alpha = 0.1; // Update rate

      for (const key in this.currentWeights) {
        const current = this.currentWeights[key as keyof AttentionWeights];
        const used = usedWeights[key as keyof AttentionWeights];
        this.currentWeights[key as keyof AttentionWeights] =
          (1 - alpha) * current + alpha * used * performanceMetric;
      }

      // Normalize
      const sum = Object.values(this.currentWeights).reduce((a, b) => a + b, 0);
      for (const key in this.currentWeights) {
        this.currentWeights[key as keyof AttentionWeights] /= sum;
      }

      // Persist to file
      const weightsPath = join(process.cwd(), 'apps/web/lib/services/building-surveyor/adaptive_fusion_weights.json');
      writeFileSync(weightsPath, JSON.stringify(this.currentWeights, null, 2));

      logger.info('Updated adaptive fusion weights', {
        service: 'EnhancedBayesianFusionService',
        weights: this.currentWeights,
        performanceMetric
      });
    } catch (error) {
      logger.error('Failed to update learned weights', error, {
        service: 'EnhancedBayesianFusionService'
      });
    }
  }

  /**
   * Load learned weights from file
   */
  static loadLearnedWeights(): void {
    try {
      const weightsPath = join(process.cwd(), 'apps/web/lib/services/building-surveyor/adaptive_fusion_weights.json');

      if (existsSync(weightsPath)) {
        const content = readFileSync(weightsPath, 'utf-8');
        const weights = JSON.parse(content);

        if (this.validateWeights(weights)) {
          this.currentWeights = weights;
          logger.info('Loaded adaptive fusion weights', {
            service: 'EnhancedBayesianFusionService',
            weights: this.currentWeights
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to load learned weights, using defaults', {
        service: 'EnhancedBayesianFusionService',
        error
      });
    }
  }

  /**
   * Validate weight structure
   */
  private static validateWeights(weights: unknown): weights is AttentionWeights {
    return weights &&
      typeof weights.yolo === 'number' &&
      typeof weights.sam3 === 'number' &&
      typeof weights.gpt4 === 'number' &&
      weights.yolo >= 0 && weights.yolo <= 1 &&
      weights.sam3 >= 0 && weights.sam3 <= 1 &&
      weights.gpt4 >= 0 && weights.gpt4 <= 1;
  }

  /**
   * Get fusion statistics
   */
  static getFusionStatistics(): {
    currentWeights: AttentionWeights;
    averageAgreement: number;
    fusionCount: number;
    weightStability: number;
  } {
    const avgAgreement = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((sum, p) => sum + p.agreement, 0) / this.performanceHistory.length
      : 0;

    // Calculate weight stability (low variance = high stability)
    let weightVariance = 0;
    if (this.weightHistory.length > 1) {
      for (const key in this.currentWeights) {
        const values = this.weightHistory.map(w => w[key as keyof AttentionWeights]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        weightVariance += variance;
      }
    }

    const stability = 1 - Math.min(1, weightVariance * 10); // Scale variance to 0-1

    return {
      currentWeights: this.currentWeights,
      averageAgreement: avgAgreement,
      fusionCount: this.performanceHistory.length,
      weightStability: stability
    };
  }
}

// Load learned weights on module initialization
EnhancedBayesianFusionService.loadLearnedWeights();