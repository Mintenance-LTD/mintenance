/**
 * Enhanced Hybrid Inference Service with Conformal Prediction
 * Provides routing decisions with mathematical confidence guarantees
 */

import {
  conformalPrediction,
  ConformalPredictionInterval,
  PropertyAgeCategory,
  PredictionScores,
  SeverityLevel
} from './conformal-prediction';

// ============================================================================
// Types
// ============================================================================

interface DamageAssessment {
  damageType: string;
  severity: SeverityLevel;
  confidence: number;
  urgency: string;
  safetyScore: number;
  complianceScore: number;
  insuranceRiskScore: number;
}

interface InternalModelPrediction {
  severity: SeverityLevel;
  confidence: number;
  scores: PredictionScores;
  inferenceTimeMs: number;
}

interface GPT4Prediction {
  assessment: DamageAssessment;
  inferenceTimeMs: number;
}

interface RoutingDecision {
  route: 'internal' | 'gpt4_vision' | 'hybrid';
  reasoning: string;
  useGPT4: boolean;
  conformalInterval?: ConformalPredictionInterval;
  confidenceGuarantee?: number;
}

interface EnhancedAssessment extends DamageAssessment {
  predictionInterval: ConformalPredictionInterval;
  uncertaintyQuantified: boolean;
  guaranteedCoverage: number;
  intervalEfficiency: number;
}

// ============================================================================
// Enhanced Hybrid Inference Service
// ============================================================================

export class EnhancedHybridInferenceService {
  private static instance: EnhancedHybridInferenceService;

  // Thresholds
  private readonly CONFIDENCE_THRESHOLD = 0.85;
  private readonly CRITICAL_SAFETY_THRESHOLD = 70;
  private readonly GPT4_COST_PER_CALL = 0.01; // Example cost

  private constructor() {}

  public static getInstance(): EnhancedHybridInferenceService {
    if (!EnhancedHybridInferenceService.instance) {
      EnhancedHybridInferenceService.instance = new EnhancedHybridInferenceService();
    }
    return EnhancedHybridInferenceService.instance;
  }

  /**
   * Main assessment method with conformal prediction
   */
  async assessDamageWithGuarantees(
    imageUrls: string[],
    propertyAge?: number,
    propertyType: string = 'residential',
    requireHighConfidence: boolean = false
  ): Promise<EnhancedAssessment> {
    // Classify property age
    const propertyAgeCategory = this.classifyPropertyAge(propertyAge);

    // Get internal model prediction first
    const internalPrediction = await this.runInternalModel(imageUrls);

    // Determine adaptive confidence level based on context
    const targetConfidenceLevel = this.determineTargetConfidence(
      internalPrediction,
      requireHighConfidence
    );

    // Get conformal prediction interval
    const predictionInterval = await conformalPrediction.getPredictionInterval(
      internalPrediction.scores,
      propertyAgeCategory,
      this.extractDamageType(imageUrls), // Simplified for example
      targetConfidenceLevel
    );

    // Make routing decision with conformal guarantees
    const routingDecision = await this.makeConformalRoutingDecision(
      internalPrediction,
      predictionInterval,
      requireHighConfidence
    );

    // Execute routing decision
    let finalAssessment: DamageAssessment;

    if (routingDecision.route === 'internal') {
      // Use internal model with conformal interval
      finalAssessment = this.createAssessmentFromInternal(
        internalPrediction,
        predictionInterval
      );
    } else if (routingDecision.route === 'gpt4_vision') {
      // Use GPT-4 Vision
      const gpt4Result = await this.runGPT4Vision(imageUrls);
      finalAssessment = gpt4Result.assessment;

      // Still provide conformal interval for GPT-4 predictions
      const gpt4Scores = this.convertToScores(gpt4Result.assessment);
      predictionInterval = await conformalPrediction.getPredictionInterval(
        gpt4Scores,
        propertyAgeCategory,
        gpt4Result.assessment.damageType,
        targetConfidenceLevel
      );
    } else {
      // Hybrid: combine both predictions
      finalAssessment = await this.combineWithConformalWeighting(
        internalPrediction,
        await this.runGPT4Vision(imageUrls),
        predictionInterval
      );
    }

    // Calculate interval efficiency
    const intervalEfficiency = predictionInterval.interval_size / 3;

    // Return enhanced assessment with guarantees
    return {
      ...finalAssessment,
      predictionInterval,
      uncertaintyQuantified: true,
      guaranteedCoverage: targetConfidenceLevel,
      intervalEfficiency
    };
  }

  /**
   * Make routing decision using conformal prediction insights
   */
  private async makeConformalRoutingDecision(
    internalPrediction: InternalModelPrediction,
    predictionInterval: ConformalPredictionInterval,
    requireHighConfidence: boolean
  ): Promise<RoutingDecision> {
    // Case 1: High confidence with small interval - use internal
    if (predictionInterval.interval_size === 1 &&
        internalPrediction.confidence >= this.CONFIDENCE_THRESHOLD) {
      return {
        route: 'internal',
        reasoning: 'Internal model has high confidence with singleton prediction set',
        useGPT4: false,
        conformalInterval: predictionInterval,
        confidenceGuarantee: predictionInterval.confidence_level
      };
    }

    // Case 2: Large uncertainty interval - use GPT-4
    if (predictionInterval.interval_size === 3) {
      return {
        route: 'gpt4_vision',
        reasoning: 'High uncertainty detected - full prediction set, requiring expert model',
        useGPT4: true,
        conformalInterval: predictionInterval,
        confidenceGuarantee: predictionInterval.confidence_level
      };
    }

    // Case 3: Critical scenarios requiring high confidence
    if (requireHighConfidence && predictionInterval.interval_size > 1) {
      return {
        route: 'hybrid',
        reasoning: 'Critical scenario with moderate uncertainty - using ensemble approach',
        useGPT4: true,
        conformalInterval: predictionInterval,
        confidenceGuarantee: predictionInterval.confidence_level
      };
    }

    // Case 4: Moderate confidence - decide based on cost-benefit
    const costBenefit = this.calculateCostBenefit(
      internalPrediction,
      predictionInterval
    );

    if (costBenefit.netBenefit > 0) {
      return {
        route: 'gpt4_vision',
        reasoning: `Positive cost-benefit ratio: ${costBenefit.netBenefit.toFixed(2)}`,
        useGPT4: true,
        conformalInterval: predictionInterval,
        confidenceGuarantee: predictionInterval.confidence_level
      };
    }

    return {
      route: 'internal',
      reasoning: 'Acceptable uncertainty level for internal model',
      useGPT4: false,
      conformalInterval: predictionInterval,
      confidenceGuarantee: predictionInterval.confidence_level
    };
  }

  /**
   * Calculate cost-benefit of using GPT-4
   */
  private calculateCostBenefit(
    internalPrediction: InternalModelPrediction,
    interval: ConformalPredictionInterval
  ): { netBenefit: number; shouldUseGPT4: boolean } {
    // Estimate potential cost of misclassification
    const misclassificationRisk = this.estimateMisclassificationCost(
      internalPrediction.severity,
      interval
    );

    // Expected value of improved accuracy
    const expectedAccuracyGain = 0.15; // GPT-4 typically 15% more accurate
    const expectedBenefit = misclassificationRisk * expectedAccuracyGain;

    // Net benefit
    const netBenefit = expectedBenefit - this.GPT4_COST_PER_CALL;

    return {
      netBenefit,
      shouldUseGPT4: netBenefit > 0
    };
  }

  /**
   * Estimate cost of misclassification based on severity
   */
  private estimateMisclassificationCost(
    severity: SeverityLevel,
    interval: ConformalPredictionInterval
  ): number {
    const baseCosts = {
      full: 1000,    // High cost for missing severe damage
      midway: 500,   // Moderate cost
      early: 100     // Low cost for early-stage issues
    };

    // Adjust based on interval uncertainty
    const uncertaintyMultiplier = interval.interval_size;

    return baseCosts[severity] * uncertaintyMultiplier;
  }

  /**
   * Combine predictions using conformal weighting
   */
  private async combineWithConformalWeighting(
    internalPred: InternalModelPrediction,
    gpt4Pred: GPT4Prediction,
    interval: ConformalPredictionInterval
  ): Promise<DamageAssessment> {
    // Weight based on interval efficiency
    const internalWeight = 1 / (interval.interval_size + 1);
    const gpt4Weight = 1 - internalWeight;

    // Combine confidence scores
    const combinedConfidence =
      internalPred.confidence * internalWeight +
      gpt4Pred.assessment.confidence * gpt4Weight;

    // Use GPT-4's assessment as base but adjust confidence
    return {
      ...gpt4Pred.assessment,
      confidence: Math.min(combinedConfidence, interval.confidence_level)
    };
  }

  /**
   * Create assessment from internal model with conformal interval
   */
  private createAssessmentFromInternal(
    internalPred: InternalModelPrediction,
    interval: ConformalPredictionInterval
  ): DamageAssessment {
    // Use the most likely severity from the prediction set
    const finalSeverity = interval.prediction_set[0] || internalPred.severity;

    // Adjust confidence based on interval size
    const adjustedConfidence = interval.interval_size === 1
      ? internalPred.confidence
      : internalPred.confidence * (1 / interval.interval_size);

    return {
      damageType: 'structural', // Simplified
      severity: finalSeverity,
      confidence: adjustedConfidence,
      urgency: this.determineUrgency(finalSeverity),
      safetyScore: 85, // Example values
      complianceScore: 90,
      insuranceRiskScore: 75
    };
  }

  /**
   * Determine target confidence level adaptively
   */
  private determineTargetConfidence(
    prediction: InternalModelPrediction,
    requireHighConfidence: boolean
  ): number {
    if (requireHighConfidence) {
      return 0.99;
    }

    // Adaptive based on initial confidence
    if (prediction.confidence < 0.6) {
      return 0.95; // Need higher guarantee when model is uncertain
    } else if (prediction.confidence < 0.8) {
      return 0.90;
    } else {
      return 0.85; // Can accept lower guarantee when model is confident
    }
  }

  /**
   * Monitor and track conformal prediction performance
   */
  async monitorPerformance(
    assessmentId: string,
    predictedInterval: ConformalPredictionInterval,
    actualSeverity: SeverityLevel
  ): Promise<void> {
    // Check if prediction was correct (within interval)
    const wasCorrect = conformalPrediction.isPredictionInInterval(
      actualSeverity,
      predictedInterval
    );

    // Log to performance metrics
    await this.logPerformanceMetric({
      assessmentId,
      intervalSize: predictedInterval.interval_size,
      confidenceLevel: predictedInterval.confidence_level,
      wasCorrect,
      actualSeverity,
      calibrationSetId: predictedInterval.calibration_set_id
    });

    // Check if recalibration is needed
    if (predictedInterval.calibration_set_id) {
      const needsRecalibration = await conformalPrediction.isRecalibrationNeeded(
        predictedInterval.calibration_set_id
      );

      if (needsRecalibration) {
        console.log('Recalibration recommended for set:', predictedInterval.calibration_set_id);
        // Could trigger automated recalibration here
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private classifyPropertyAge(age?: number): PropertyAgeCategory {
    if (!age) return 'unknown';
    const constructionYear = new Date().getFullYear() - age;
    return conformalPrediction.classifyPropertyAge(constructionYear);
  }

  private extractDamageType(imageUrls: string[]): string {
    // Simplified - in real implementation, extract from image analysis
    return 'structural';
  }

  private determineUrgency(severity: SeverityLevel): string {
    switch (severity) {
      case 'full':
        return 'immediate';
      case 'midway':
        return 'urgent';
      case 'early':
        return 'soon';
      default:
        return 'planned';
    }
  }

  private convertToScores(assessment: DamageAssessment): PredictionScores {
    const scores: PredictionScores = {
      early: 0,
      midway: 0,
      full: 0
    };

    // Set score for predicted severity
    scores[assessment.severity] = assessment.confidence;

    // Distribute remaining probability
    const remaining = 1 - assessment.confidence;
    const otherSeverities = (['early', 'midway', 'full'] as SeverityLevel[])
      .filter(s => s !== assessment.severity);

    otherSeverities.forEach(severity => {
      scores[severity] = remaining / otherSeverities.length;
    });

    return scores;
  }

  // Placeholder methods for actual model calls
  private async runInternalModel(imageUrls: string[]): Promise<InternalModelPrediction> {
    // Implement actual YOLO/internal model call
    return {
      severity: 'midway',
      confidence: 0.75,
      scores: { early: 0.15, midway: 0.75, full: 0.10 },
      inferenceTimeMs: 50
    };
  }

  private async runGPT4Vision(imageUrls: string[]): Promise<GPT4Prediction> {
    // Implement actual GPT-4 Vision API call
    return {
      assessment: {
        damageType: 'structural_crack',
        severity: 'midway',
        confidence: 0.92,
        urgency: 'urgent',
        safetyScore: 75,
        complianceScore: 85,
        insuranceRiskScore: 80
      },
      inferenceTimeMs: 2000
    };
  }

  private async logPerformanceMetric(metric: any): Promise<void> {
    // Implement logging to database
    console.log('Performance metric:', metric);
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const enhancedHybridInference = EnhancedHybridInferenceService.getInstance();