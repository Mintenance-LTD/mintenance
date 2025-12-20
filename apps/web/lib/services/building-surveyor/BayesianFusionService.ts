/**
 * Bayesian Fusion Service
 * 
 * Implements Bayesian logistic regression for fusing evidence from multiple sources:
 * - SAM 3 segmentation evidence
 * - GPT-4 Vision assessment
 * - Scene graph features
 * 
 * Outputs:
 * - Mean: μ = E[damage_probability]
 * - Variance: σ² = Var[damage_probability]
 * - Confidence interval: [μ - 2σ, μ + 2σ]
 * - Uncertainty level: 'low' | 'medium' | 'high'
 * 
 * Based on paper methodology: Bayesian Fusion → Uncertainty Calibration
 */

import { logger } from '@mintenance/shared';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { DamageTypeSegmentation } from './SAM3Service';
import type { Phase1BuildingAssessment } from './types';
import type { SceneGraphFeatures } from './scene_graph_features';

export interface FusionInput {
  sam3Evidence?: {
    damageTypes: Record<string, { confidence: number; numInstances: number }>;
    overallConfidence: number;
  } | null;
  gpt4Assessment?: {
    severity: string;
    confidence: number;
    damageType: string;
    hasCriticalHazards: boolean;
  } | null;
  sceneGraphFeatures?: SceneGraphFeatures | null;
}

export interface FusionOutput {
  mean: number; // μ = E[damage_probability]
  variance: number; // σ² = Var[damage_probability]
  confidenceInterval: [number, number]; // [μ - 2σ, μ + 2σ]
  uncertaintyLevel: 'low' | 'medium' | 'high';
  evidenceWeights: {
    sam3: number;
    gpt4: number;
    sceneGraph: number;
  };
}

export class BayesianFusionService {
  // Default weights for evidence sources (fallback if file doesn't exist)
  private static readonly DEFAULT_EVIDENCE_WEIGHTS = {
    sam3: 0.40, // SAM 3 provides precise segmentation
    gpt4: 0.35, // GPT-4 provides semantic understanding
    sceneGraph: 0.25, // Scene graph provides structural relationships
  };

  // Cached loaded weights (loaded once on first access)
  private static loadedWeights: {
    sam3: number;
    gpt4: number;
    sceneGraph: number;
  } | null = null;

  /**
   * Load weights from JSON file, fallback to default if file doesn't exist
   */
  private static loadWeightsFromFile(): {
    sam3: number;
    gpt4: number;
    sceneGraph: number;
  } {
    // Return cached weights if already loaded
    if (this.loadedWeights !== null) {
      return this.loadedWeights;
    }

    // Try to load from file
    const weightsPath = join(process.cwd(), 'apps/web/lib/services/building-surveyor/fusion_weights.json');
    
    if (existsSync(weightsPath)) {
      try {
        const fileContent = readFileSync(weightsPath, 'utf-8');
        const weights = JSON.parse(fileContent) as {
          sam3?: number;
          gpt4?: number;
          sceneGraph?: number;
        };

        // Validate weights
        if (
          typeof weights.sam3 === 'number' &&
          typeof weights.gpt4 === 'number' &&
          typeof weights.sceneGraph === 'number' &&
          weights.sam3 >= 0 &&
          weights.gpt4 >= 0 &&
          weights.sceneGraph >= 0
        ) {
          // Normalize weights to sum to 1.0
          const total = weights.sam3 + weights.gpt4 + weights.sceneGraph;
          if (total > 0) {
            this.loadedWeights = {
              sam3: weights.sam3 / total,
              gpt4: weights.gpt4 / total,
              sceneGraph: weights.sceneGraph / total,
            };
            logger.info('Loaded Bayesian Fusion weights from file', {
              service: 'BayesianFusionService',
              weights: this.loadedWeights,
            });
            return this.loadedWeights;
          }
        }

        logger.warn('Invalid weights in fusion_weights.json, using defaults', {
          service: 'BayesianFusionService',
          weights,
        });
      } catch (error) {
        logger.warn('Failed to load fusion_weights.json, using defaults', {
          service: 'BayesianFusionService',
          error,
        });
      }
    } else {
      logger.debug('fusion_weights.json not found, using default weights', {
        service: 'BayesianFusionService',
      });
    }

    // Fallback to default weights
    this.loadedWeights = { ...this.DEFAULT_EVIDENCE_WEIGHTS };
    return this.loadedWeights;
  }

  /**
   * Get current evidence weights (loaded from file or defaults)
   */
  private static getEvidenceWeights(): {
    sam3: number;
    gpt4: number;
    sceneGraph: number;
  } {
    return this.loadWeightsFromFile();
  }

  // Prior variance for each source (epistemic uncertainty)
  private static readonly SOURCE_VARIANCES = {
    sam3: 0.05, // Low variance (precise segmentation)
    gpt4: 0.10, // Medium variance (semantic interpretation)
    sceneGraph: 0.08, // Medium-low variance (structural analysis)
  };

  /**
   * Fuse evidence from multiple sources using Bayesian logistic regression
   * 
   * @param input - Evidence from SAM 3, GPT-4, and scene graph
   * @returns Bayesian fusion output with mean, variance, and confidence interval
   */
  static fuseEvidence(input: FusionInput): FusionOutput {
    try {
      // 1. Extract individual probabilities and confidences
      const sam3Prob = this.extractSAM3Probability(input.sam3Evidence);
      const gpt4Prob = this.extractGPT4Probability(input.gpt4Assessment);
      const sceneGraphProb = this.extractSceneGraphProbability(input.sceneGraphFeatures);

      // 2. Compute weighted mean (Bayesian posterior mean)
      // μ = Σ w_i * p_i / Σ w_i
      const weights = this.computeAdaptiveWeights(input);
      const totalWeight = weights.sam3 + weights.gpt4 + weights.sceneGraph;
      
      let mean = 0;
      if (totalWeight > 0) {
        mean = (
          weights.sam3 * sam3Prob.probability +
          weights.gpt4 * gpt4Prob.probability +
          weights.sceneGraph * sceneGraphProb.probability
        ) / totalWeight;
      } else {
        // Fallback: use average if no weights
        mean = (sam3Prob.probability + gpt4Prob.probability + sceneGraphProb.probability) / 3;
      }

      // 3. Compute variance using law of total variance
      // σ² = E[Var(Y|X)] + Var(E[Y|X])
      // Where Y is damage probability, X is evidence sources
      
      // Epistemic variance (uncertainty in weights)
      const epistemicVariance = this.computeEpistemicVariance(weights, {
        sam3: sam3Prob,
        gpt4: gpt4Prob,
        sceneGraph: sceneGraphProb,
      });

      // Aleatoric variance (uncertainty in observations)
      const aleatoricVariance = this.computeAleatoricVariance(weights, {
        sam3: sam3Prob,
        gpt4: gpt4Prob,
        sceneGraph: sceneGraphProb,
      });

      // Total variance
      const variance = epistemicVariance + aleatoricVariance;

      // 4. Compute confidence interval (95%: μ ± 2σ)
      const stdDev = Math.sqrt(variance);
      const confidenceInterval: [number, number] = [
        Math.max(0, mean - 2 * stdDev),
        Math.min(1, mean + 2 * stdDev),
      ];

      // 5. Determine uncertainty level
      const uncertaintyLevel = this.determineUncertaintyLevel(stdDev, mean);

      return {
        mean,
        variance,
        confidenceInterval,
        uncertaintyLevel,
        evidenceWeights: weights,
      };
    } catch (error) {
      logger.error('Bayesian fusion failed, returning conservative estimate', {
        service: 'BayesianFusionService',
        error,
      });

      // Return conservative fallback
      return {
        mean: 0.5,
        variance: 0.25, // High variance = high uncertainty
        confidenceInterval: [0, 1],
        uncertaintyLevel: 'high',
        evidenceWeights: {
          sam3: 0,
          gpt4: 0,
          sceneGraph: 0,
        },
      };
    }
  }

  /**
   * Extract probability from SAM 3 evidence
   */
  private static extractSAM3Probability(
    sam3Evidence?: FusionInput['sam3Evidence']
  ): { probability: number; confidence: number } {
    if (!sam3Evidence || !sam3Evidence.damageTypes) {
      return { probability: 0.5, confidence: 0 };
    }

    // Compute weighted average of damage type confidences
    let totalConfidence = 0;
    let totalWeight = 0;

    for (const [damageType, data] of Object.entries(sam3Evidence.damageTypes)) {
      const weight = data.numInstances;
      totalConfidence += data.confidence * weight;
      totalWeight += weight;
    }

    const probability = totalWeight > 0 ? totalConfidence / totalWeight : sam3Evidence.overallConfidence;
    const confidence = sam3Evidence.overallConfidence;

    return { probability, confidence };
  }

  /**
   * Extract probability from GPT-4 assessment
   */
  private static extractGPT4Probability(
    gpt4Assessment?: FusionInput['gpt4Assessment']
  ): { probability: number; confidence: number } {
    if (!gpt4Assessment) {
      return { probability: 0.5, confidence: 0 };
    }

    // Map severity to probability
    const severityMap: Record<string, number> = {
      'none': 0.1,
      'minor': 0.3,
      'moderate': 0.6,
      'severe': 0.9,
      'critical': 0.95,
    };

    const baseProbability = severityMap[gpt4Assessment.severity.toLowerCase()] || 0.5;
    
    // Adjust for critical hazards
    const probability = gpt4Assessment.hasCriticalHazards
      ? Math.min(1, baseProbability + 0.1)
      : baseProbability;

    return { probability, confidence: gpt4Assessment.confidence / 100 };
  }

  /**
   * Extract probability from scene graph features
   */
  private static extractSceneGraphProbability(
    sceneGraphFeatures?: SceneGraphFeatures | null
  ): { probability: number; confidence: number } {
    if (!sceneGraphFeatures) {
      return { probability: 0.5, confidence: 0 };
    }

    // Use compact feature vector if available (12-dim)
    const features = sceneGraphFeatures.compactFeatureVector || sceneGraphFeatures.featureVector;

    // Extract key indicators from features
    // Feature 0: has_critical_hazard
    // Feature 1: crack_density
    // Feature 5: damage_severity_score
    const hasCriticalHazard = features[0] || 0;
    const crackDensity = features[1] || 0;
    const damageSeverity = features[5] || 0;

    // Combine into probability
    const probability = Math.min(1, (hasCriticalHazard * 0.4 + crackDensity * 0.3 + damageSeverity * 0.3));
    
    // Confidence from spatial features
    const confidence = sceneGraphFeatures.spatialFeatures.avgNodeConfidence;

    return { probability, confidence };
  }

  /**
   * Compute adaptive weights based on evidence availability and quality
   */
  private static computeAdaptiveWeights(input: FusionInput): {
    sam3: number;
    gpt4: number;
    sceneGraph: number;
  } {
    const hasSAM3 = !!input.sam3Evidence && !!input.sam3Evidence.damageTypes;
    const hasGPT4 = !!input.gpt4Assessment;
    const hasSceneGraph = !!input.sceneGraphFeatures;

    // Get base weights (from file or defaults)
    const baseWeights = this.getEvidenceWeights();

    // Base weights
    let sam3Weight = hasSAM3 ? baseWeights.sam3 : 0;
    let gpt4Weight = hasGPT4 ? baseWeights.gpt4 : 0;
    let sceneGraphWeight = hasSceneGraph ? baseWeights.sceneGraph : 0;

    // Normalize weights if some sources are missing
    const totalAvailableWeight = sam3Weight + gpt4Weight + sceneGraphWeight;
    if (totalAvailableWeight > 0) {
      const normalizationFactor = 1.0 / totalAvailableWeight;
      sam3Weight *= normalizationFactor;
      gpt4Weight *= normalizationFactor;
      sceneGraphWeight *= normalizationFactor;
    } else {
      // Fallback: equal weights if nothing available
      sam3Weight = gpt4Weight = sceneGraphWeight = 1 / 3;
    }

    return { sam3: sam3Weight, gpt4: gpt4Weight, sceneGraph: sceneGraphWeight };
  }

  /**
   * Compute epistemic variance (uncertainty in model weights)
   */
  private static computeEpistemicVariance(
    weights: { sam3: number; gpt4: number; sceneGraph: number },
    probabilities: {
      sam3: { probability: number; confidence: number };
      gpt4: { probability: number; confidence: number };
      sceneGraph: { probability: number; confidence: number };
    }
  ): number {
    // Epistemic variance = Σ w_i² * σ_i²
    // Where σ_i² is the source variance
    const sam3Var = weights.sam3 * weights.sam3 * this.SOURCE_VARIANCES.sam3;
    const gpt4Var = weights.gpt4 * weights.gpt4 * this.SOURCE_VARIANCES.gpt4;
    const sceneGraphVar = weights.sceneGraph * weights.sceneGraph * this.SOURCE_VARIANCES.sceneGraph;

    return sam3Var + gpt4Var + sceneGraphVar;
  }

  /**
   * Compute aleatoric variance (uncertainty in observations)
   */
  private static computeAleatoricVariance(
    weights: { sam3: number; gpt4: number; sceneGraph: number },
    probabilities: {
      sam3: { probability: number; confidence: number };
      gpt4: { probability: number; confidence: number };
      sceneGraph: { probability: number; confidence: number };
    }
  ): number {
    // Aleatoric variance = Σ w_i² * p_i * (1 - p_i)
    // This is the variance of a Bernoulli distribution weighted by confidence
    const sam3Aleatoric = weights.sam3 * weights.sam3 * 
      probabilities.sam3.probability * (1 - probabilities.sam3.probability) * 
      (1 - probabilities.sam3.confidence);
    const gpt4Aleatoric = weights.gpt4 * weights.gpt4 * 
      probabilities.gpt4.probability * (1 - probabilities.gpt4.probability) * 
      (1 - probabilities.gpt4.confidence);
    const sceneGraphAleatoric = weights.sceneGraph * weights.sceneGraph * 
      probabilities.sceneGraph.probability * (1 - probabilities.sceneGraph.probability) * 
      (1 - probabilities.sceneGraph.confidence);

    return sam3Aleatoric + gpt4Aleatoric + sceneGraphAleatoric;
  }

  /**
   * Determine uncertainty level based on standard deviation and mean
   */
  private static determineUncertaintyLevel(
    stdDev: number,
    mean: number
  ): 'low' | 'medium' | 'high' {
    // Coefficient of variation (CV) = stdDev / mean
    // Low uncertainty: CV < 0.2
    // Medium uncertainty: 0.2 <= CV < 0.5
    // High uncertainty: CV >= 0.5
    const cv = mean > 0 ? stdDev / mean : stdDev;

    if (cv < 0.2) return 'low';
    if (cv < 0.5) return 'medium';
    return 'high';
  }
}

