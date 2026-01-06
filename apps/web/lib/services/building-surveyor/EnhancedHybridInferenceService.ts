/**
 * Enhanced Hybrid Inference Service
 *
 * Implements real-time three-way Bayesian fusion with:
 * - Parallel execution of YOLO, SAM3, and GPT-4
 * - SAM3 mask refinement for YOLO boxes
 * - Adaptive weight learning based on agreement scores
 * - Fallback mechanisms for service unavailability
 * - Performance tracking and metrics
 *
 * Key improvements:
 * - SAM3 is now always included in production fusion
 * - Attention-based weighting for modality imbalance
 * - Conformal prediction for calibrated uncertainty
 */

import { logger } from '@mintenance/shared';
import { InternalDamageClassifier } from './InternalDamageClassifier';
import { AssessmentOrchestrator } from './orchestration/AssessmentOrchestrator';
import { FeatureExtractionService } from './orchestration/FeatureExtractionService';
import { RoboflowDetectionService } from './RoboflowDetectionService';
import { SAM3Service } from './SAM3Service';
import { EnhancedBayesianFusionService } from './EnhancedBayesianFusionService';
import { getConfig } from './config/BuildingSurveyorConfig';
import { supabase } from '@/lib/supabase';
import { ModelDriftDetectionService } from '../ai/ModelDriftDetectionService';
import { ConformalPredictionService } from './conformal-prediction';
import type {
  AssessmentContext,
  Phase1BuildingAssessment,
  DamageSeverity,
  UrgencyLevel,
  RoboflowDetection
} from './types';
import type { EnhancedFusionInput, EnhancedFusionOutput } from './EnhancedBayesianFusionService';

/**
 * Enhanced routing options with SAM3 always included
 */
export type EnhancedInferenceRoute = 'yolo_sam3' | 'gpt4_sam3' | 'three_way_fusion';

/**
 * Enhanced result with three-way fusion data
 */
export interface EnhancedHybridInferenceResult {
  assessment: Phase1BuildingAssessment;
  route: EnhancedInferenceRoute;
  fusionOutput: EnhancedFusionOutput;

  // Individual model outputs
  yoloOutput?: {
    detections: RoboflowDetection[];
    confidence: number;
    inferenceMs: number;
  };

  sam3Output?: {
    damageDetected: boolean;
    damageTypes: string[];
    averagePresenceScore: number;
    masks?: unknown;
    inferenceMs: number;
  };

  gpt4Output?: {
    assessment: Phase1BuildingAssessment;
    confidence: number;
    inferenceMs: number;
  };

  // Performance metrics
  totalInferenceMs: number;
  parallelExecutionMs: number;
  fusionMs: number;

  // Tracking
  routingDecisionId?: string;
  agreementScore: number;
  fallbacksUsed: string[];
}

export class EnhancedHybridInferenceService {
  private static readonly SERVICE_NAME = 'EnhancedHybridInferenceService';

  // Service availability tracking
  private static serviceAvailability = {
    yolo: { available: true, lastCheck: 0, failures: 0 },
    sam3: { available: true, lastCheck: 0, failures: 0 },
    gpt4: { available: true, lastCheck: 0, failures: 0 }
  };

  private static readonly AVAILABILITY_CHECK_INTERVAL = 60000; // 1 minute
  private static readonly MAX_FAILURES_BEFORE_DISABLE = 5;

  // Performance metrics
  private static performanceMetrics = {
    totalInferences: 0,
    threeWayFusions: 0,
    averageInferenceMs: 0,
    averageFusionMs: 0,
    sam3UsageRate: 0,
    fallbackRate: 0
  };

  /**
   * Main entry point: Three-way fusion assessment
   */
  static async assessDamageWithFusion(
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<EnhancedHybridInferenceResult> {
    const startTime = Date.now();
    const fallbacksUsed: string[] = [];

    try {
      logger.info('Starting enhanced three-way fusion assessment', {
        service: this.SERVICE_NAME,
        imageCount: imageUrls.length,
        context
      });

      // Step 1: Check service availability
      await this.checkServiceAvailability();

      // Step 2: Run all three models in parallel
      const parallelStartTime = Date.now();
      const [yoloResult, sam3Result, gpt4Result] = await Promise.allSettled([
        this.runYOLOInference(imageUrls, context),
        this.runSAM3Inference(imageUrls),
        this.runGPT4Inference(imageUrls, context)
      ]);
      const parallelExecutionMs = Date.now() - parallelStartTime;

      // Step 3: Process results and handle failures
      const yoloOutput = this.processModelResult(yoloResult, 'yolo', fallbacksUsed);
      const sam3Output = this.processModelResult(sam3Result, 'sam3', fallbacksUsed);
      const gpt4Output = this.processModelResult(gpt4Result, 'gpt4', fallbacksUsed);

      // Step 4: Prepare fusion input
      const fusionInput = this.prepareFusionInput(yoloOutput, sam3Output, gpt4Output);

      // Step 5: Perform three-way Bayesian fusion
      const fusionStartTime = Date.now();
      const fusionOutput = EnhancedBayesianFusionService.fuseThreeWayEvidence(fusionInput);
      const fusionMs = Date.now() - fusionStartTime;

      // Step 6: Generate final assessment based on fusion
      const assessment = this.generateFinalAssessment(
        fusionOutput,
        yoloOutput,
        sam3Output,
        gpt4Output,
        imageUrls,
        context
      );

      // Step 7: Calculate agreement score
      const agreementScore = fusionOutput.modalityAgreement * 100;

      // Step 8: Determine route based on available models
      const route = this.determineRoute(yoloOutput, sam3Output, gpt4Output);

      // Step 9: Update adaptive weights if high agreement
      if (agreementScore > 80 && fusionOutput.adaptiveWeightUpdate) {
        await EnhancedBayesianFusionService.updateLearnedWeights(
          agreementScore / 100,
          fusionOutput.adaptiveWeightUpdate.suggested
        );
      }

      const result: EnhancedHybridInferenceResult = {
        assessment,
        route,
        fusionOutput,
        yoloOutput,
        sam3Output,
        gpt4Output,
        totalInferenceMs: Date.now() - startTime,
        parallelExecutionMs,
        fusionMs,
        agreementScore,
        fallbacksUsed
      };

      // Step 10: Record routing decision
      await this.recordRoutingDecision(result, imageUrls, context);

      // Step 11: Update performance metrics
      this.updatePerformanceMetrics(result);

      logger.info('Three-way fusion completed', {
        service: this.SERVICE_NAME,
        route,
        agreementScore,
        uncertaintyLevel: fusionOutput.uncertaintyLevel,
        totalInferenceMs: result.totalInferenceMs,
        fallbacksUsed
      });

      return result;
    } catch (error) {
      logger.error('Enhanced hybrid inference failed', error, {
        service: this.SERVICE_NAME
      });
      throw error;
    }
  }

  /**
   * Run YOLO inference
   */
  private static async runYOLOInference(
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Get YOLO detections
      const detections = await RoboflowDetectionService.detect(imageUrls);

      // Calculate statistics
      const damageTypes: Record<string, number> = {};
      let totalConfidence = 0;

      for (const detection of detections) {
        const damageType = detection.class || detection.label || 'unknown';
        damageTypes[damageType] = (damageTypes[damageType] || 0) + 1;
        totalConfidence += detection.confidence;
      }

      const avgConfidence = detections.length > 0
        ? totalConfidence / detections.length
        : 0;

      return {
        detections,
        confidence: avgConfidence,
        inferenceMs: Date.now() - startTime,
        damageTypes,
        totalDetections: detections.length
      };
    } catch (error) {
      logger.error('YOLO inference failed', error, {
        service: this.SERVICE_NAME
      });
      throw error;
    }
  }

  /**
   * Run SAM3 inference with presence detection
   */
  private static async runSAM3Inference(imageUrls: string[]): Promise<any> {
    const startTime = Date.now();

    try {
      // Check SAM3 availability
      const available = await SAM3Service.healthCheck();
      if (!available) {
        throw new Error('SAM3 service not available');
      }

      // Convert first image to base64
      const imageResponse = await fetch(imageUrls[0]);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

      // Run presence detection for common damage types
      const damageTypesToCheck = [
        'water damage',
        'water stain',
        'crack',
        'structural crack',
        'rot',
        'wood rot',
        'mold',
        'mildew',
        'stain',
        'damage',
        'deterioration',
        'structural damage',
        'peeling paint',
        'rust',
        'corrosion'
      ];

      const presenceResult = await SAM3Service.checkDamagePresence(
        imageBase64,
        damageTypesToCheck
      );

      if (!presenceResult || !presenceResult.success) {
        throw new Error('SAM3 presence check failed');
      }

      // Get segmentation masks for detected damage types
      let masks = null;
      if (presenceResult.damage_detected.length > 0) {
        const segmentationResult = await SAM3Service.segmentDamageTypes(
          imageUrls[0],
          presenceResult.damage_detected.slice(0, 5) // Limit to top 5 for performance
        );

        if (segmentationResult && segmentationResult.success) {
          masks = segmentationResult.damage_types;
        }
      }

      return {
        damageDetected: presenceResult.damage_detected.length > 0,
        damageTypes: presenceResult.damage_detected,
        damageNotDetected: presenceResult.damage_not_detected,
        averagePresenceScore: presenceResult.summary.average_presence_score,
        detectionRate: presenceResult.summary.detection_rate,
        masks,
        inferenceMs: Date.now() - startTime,
        presenceResults: presenceResult.presence_results
      };
    } catch (error) {
      logger.error('SAM3 inference failed', error, {
        service: this.SERVICE_NAME
      });
      throw error;
    }
  }

  /**
   * Run GPT-4 Vision inference
   */
  private static async runGPT4Inference(
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const assessment = await AssessmentOrchestrator.assessDamage(imageUrls, context);

      return {
        assessment,
        confidence: assessment.damageAssessment.confidence,
        inferenceMs: Date.now() - startTime
      };
    } catch (error) {
      logger.error('GPT-4 inference failed', error, {
        service: this.SERVICE_NAME
      });
      throw error;
    }
  }

  /**
   * Process model result and handle failures
   */
  private static processModelResult(
    result: PromiseSettledResult<any>,
    modelName: string,
    fallbacksUsed: string[]
  ): unknown {
    if (result.status === 'fulfilled') {
      // Update availability on success
      this.serviceAvailability[modelName as keyof typeof this.serviceAvailability].failures = 0;
      this.serviceAvailability[modelName as keyof typeof this.serviceAvailability].available = true;
      return result.value;
    } else {
      // Track failure
      const service = this.serviceAvailability[modelName as keyof typeof this.serviceAvailability];
      service.failures++;

      if (service.failures >= this.MAX_FAILURES_BEFORE_DISABLE) {
        service.available = false;
        logger.warn(`${modelName} service disabled after ${service.failures} failures`, {
          service: this.SERVICE_NAME
        });
      }

      fallbacksUsed.push(modelName);

      logger.warn(`${modelName} inference failed, using fallback`, {
        service: this.SERVICE_NAME,
        error: result.reason
      });

      return null;
    }
  }

  /**
   * Prepare fusion input from model outputs
   */
  private static prepareFusionInput(
    yoloOutput: unknown,
    sam3Output: unknown,
    gpt4Output: unknown
  ): EnhancedFusionInput {
    const fusionInput: EnhancedFusionInput = {};

    // Prepare YOLO evidence
    if (yoloOutput) {
      fusionInput.yoloEvidence = {
        detections: yoloOutput.detections,
        avgConfidence: yoloOutput.confidence,
        totalDetections: yoloOutput.totalDetections,
        damageTypes: yoloOutput.damageTypes
      };
    }

    // Prepare SAM3 evidence
    if (sam3Output) {
      const damageTypes: Record<string, any> = {};

      // Process presence results
      if (sam3Output.presenceResults) {
        for (const [damageType, result] of Object.entries(sam3Output.presenceResults)) {
          if ((result as any).damage_present) {
            damageTypes[damageType] = {
              confidence: (result as any).presence_score * 100,
              numInstances: 1, // Presence detection doesn't count instances
              presenceScore: (result as any).presence_score
            };
          }
        }
      }

      // Add mask data if available
      if (sam3Output.masks) {
        for (const [damageType, maskData] of Object.entries(sam3Output.masks)) {
          if (damageTypes[damageType]) {
            damageTypes[damageType].masks = (maskData as any).masks;
            damageTypes[damageType].boxes = (maskData as any).boxes;
            damageTypes[damageType].numInstances = (maskData as any).num_instances || 1;
          }
        }
      }

      fusionInput.sam3Evidence = {
        damageTypes,
        overallConfidence: sam3Output.averagePresenceScore * 100,
        presenceChecked: true,
        averagePresenceScore: sam3Output.averagePresenceScore
      };
    }

    // Prepare GPT-4 evidence
    if (gpt4Output && gpt4Output.assessment) {
      const assessment = gpt4Output.assessment;
      fusionInput.gpt4Assessment = {
        severity: assessment.damageAssessment.severity,
        confidence: assessment.damageAssessment.confidence,
        damageType: assessment.damageAssessment.damageType,
        hasCriticalHazards: assessment.safetyHazards.hasCriticalHazards,
        reasoning: assessment.damageAssessment.description
      };
    }

    return fusionInput;
  }

  /**
   * Generate final assessment based on fusion output
   */
  private static generateFinalAssessment(
    fusionOutput: EnhancedFusionOutput,
    yoloOutput: unknown,
    sam3Output: unknown,
    gpt4Output: unknown,
    imageUrls: string[],
    context?: AssessmentContext
  ): Phase1BuildingAssessment {
    // Use GPT-4 assessment as base if available
    if (gpt4Output && gpt4Output.assessment) {
      const assessment = { ...gpt4Output.assessment };

      // Enhance with fusion results
      assessment.damageAssessment.confidence = fusionOutput.mean * 100;

      // Add SAM3 evidence if available
      if (sam3Output && sam3Output.damageDetected) {
        if (!assessment.evidence) {
          assessment.evidence = {} as any;
        }
        assessment.evidence.sam3Segmentation = {
          presenceDetection: {
            damageDetected: sam3Output.damageTypes,
            averagePresenceScore: sam3Output.averagePresenceScore
          }
        };
      }

      // Add refined bounding boxes if available
      if (fusionOutput.refinedBoundingBoxes && assessment.evidence) {
        assessment.evidence.refinedBoxes = fusionOutput.refinedBoundingBoxes;
      }

      // Update urgency based on uncertainty level
      if (fusionOutput.uncertaintyLevel === 'high') {
        assessment.urgency.reasoning += ' (High uncertainty - professional inspection recommended)';
      }

      return assessment;
    }

    // Fallback: Generate assessment from fusion output
    return this.generateAssessmentFromFusion(
      fusionOutput,
      yoloOutput,
      sam3Output,
      imageUrls,
      context
    );
  }

  /**
   * Generate assessment when GPT-4 is unavailable
   */
  private static generateAssessmentFromFusion(
    fusionOutput: EnhancedFusionOutput,
    yoloOutput: unknown,
    sam3Output: unknown,
    imageUrls: string[],
    context?: AssessmentContext
  ): Phase1BuildingAssessment {
    // Determine damage type from available evidence
    let primaryDamageType = 'Unknown damage';
    let severity: DamageSeverity = 'early';

    if (sam3Output && sam3Output.damageTypes.length > 0) {
      primaryDamageType = sam3Output.damageTypes[0];
    } else if (yoloOutput && yoloOutput.damageTypes) {
      primaryDamageType = Object.keys(yoloOutput.damageTypes)[0] || 'Unknown damage';
    }

    // Map probability to severity
    if (fusionOutput.mean > 0.8) {
      severity = 'full';
    } else if (fusionOutput.mean > 0.5) {
      severity = 'midway';
    } else {
      severity = 'early';
    }

    // Determine urgency based on severity and uncertainty
    let urgency: UrgencyLevel = 'monitor';
    if (severity === 'full' || fusionOutput.uncertaintyLevel === 'high') {
      urgency = 'urgent';
    } else if (severity === 'midway') {
      urgency = 'soon';
    } else {
      urgency = 'planned';
    }

    return {
      damageAssessment: {
        damageType: primaryDamageType,
        severity,
        confidence: fusionOutput.mean * 100,
        location: context?.location || 'Property',
        description: `Fusion-based assessment: ${primaryDamageType} detected with ${(fusionOutput.mean * 100).toFixed(1)}% probability`,
        detectedItems: yoloOutput?.detections || []
      },
      safetyHazards: {
        hazards: [],
        hasCriticalHazards: fusionOutput.mean > 0.7,
        overallSafetyScore: (1 - fusionOutput.mean) * 100
      },
      compliance: {
        complianceIssues: [],
        requiresProfessionalInspection: fusionOutput.uncertaintyLevel === 'high',
        complianceScore: 100
      },
      insuranceRisk: {
        riskFactors: [],
        riskScore: fusionOutput.mean * 100,
        premiumImpact: severity === 'full' ? 'high' : severity === 'midway' ? 'medium' : 'low',
        mitigationSuggestions: []
      },
      urgency: {
        urgency,
        recommendedActionTimeline: this.getTimelineForUrgency(urgency),
        reasoning: `Based on fusion analysis (uncertainty: ${fusionOutput.uncertaintyLevel})`,
        priorityScore: fusionOutput.mean * 100
      },
      homeownerExplanation: {
        whatIsIt: primaryDamageType,
        whyItHappened: 'Assessment based on multi-model analysis',
        whatToDo: this.getRecommendationForSeverity(severity)
      },
      contractorAdvice: {
        repairNeeded: [primaryDamageType],
        materials: [],
        tools: [],
        estimatedTime: 'To be determined',
        estimatedCost: { min: 0, max: 0, recommended: 0 },
        complexity: severity === 'full' ? 'high' : severity === 'midway' ? 'medium' : 'low'
      },
      evidence: {
        roboflowDetections: yoloOutput?.detections || [],
        visionAnalysis: null,
        sam3Segmentation: sam3Output ? {
          presenceDetection: {
            damageDetected: sam3Output.damageTypes,
            averagePresenceScore: sam3Output.averagePresenceScore
          }
        } as any : undefined,
        refinedBoxes: fusionOutput.refinedBoundingBoxes
      }
    };
  }

  /**
   * Determine route based on available models
   */
  private static determineRoute(
    yoloOutput: unknown,
    sam3Output: unknown,
    gpt4Output: unknown
  ): EnhancedInferenceRoute {
    const hasYolo = yoloOutput !== null;
    const hasSam3 = sam3Output !== null;
    const hasGpt4 = gpt4Output !== null;

    if (hasYolo && hasSam3 && hasGpt4) {
      return 'three_way_fusion';
    } else if (hasGpt4 && hasSam3) {
      return 'gpt4_sam3';
    } else if (hasYolo && hasSam3) {
      return 'yolo_sam3';
    } else {
      // Fallback to whatever is available
      return 'three_way_fusion'; // Will use whatever models are available
    }
  }

  /**
   * Check service availability
   */
  private static async checkServiceAvailability(): Promise<void> {
    const now = Date.now();

    // Check YOLO (always available for now)
    this.serviceAvailability.yolo.available = true;
    this.serviceAvailability.yolo.lastCheck = now;

    // Check SAM3 if needed
    if (now - this.serviceAvailability.sam3.lastCheck > this.AVAILABILITY_CHECK_INTERVAL) {
      try {
        const available = await SAM3Service.healthCheck();
        this.serviceAvailability.sam3.available = available;
        this.serviceAvailability.sam3.lastCheck = now;
        if (available) {
          this.serviceAvailability.sam3.failures = 0;
        }
      } catch {
        this.serviceAvailability.sam3.available = false;
      }
    }

    // GPT-4 is generally available
    this.serviceAvailability.gpt4.available = true;
    this.serviceAvailability.gpt4.lastCheck = now;
  }

  /**
   * Record routing decision for analytics
   */
  private static async recordRoutingDecision(
    result: EnhancedHybridInferenceResult,
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('enhanced_routing_decisions')
        .insert({
          assessment_id: context?.assessmentId || null,
          route_selected: result.route,
          fusion_mean: result.fusionOutput.mean,
          fusion_variance: result.fusionOutput.variance,
          uncertainty_level: result.fusionOutput.uncertaintyLevel,
          modality_agreement: result.agreementScore,
          attention_weights: result.fusionOutput.attentionWeights,
          yolo_available: result.yoloOutput !== null,
          sam3_available: result.sam3Output !== null,
          gpt4_available: result.gpt4Output !== null,
          total_inference_ms: result.totalInferenceMs,
          parallel_execution_ms: result.parallelExecutionMs,
          fusion_ms: result.fusionMs,
          fallbacks_used: result.fallbacksUsed,
          refined_boxes_count: result.fusionOutput.refinedBoundingBoxes?.length || 0,
          entropy_reduction: result.fusionOutput.fusionMetrics.entropyReduction,
          information_gain: result.fusionOutput.fusionMetrics.informationGain,
          effective_sample_size: result.fusionOutput.fusionMetrics.effectiveSampleSize
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to record routing decision', error, {
          service: this.SERVICE_NAME
        });
      } else {
        result.routingDecisionId = data?.id;
      }
    } catch (error) {
      logger.error('Error recording routing decision', error, {
        service: this.SERVICE_NAME
      });
    }
  }

  /**
   * Update performance metrics
   */
  private static updatePerformanceMetrics(result: EnhancedHybridInferenceResult): void {
    this.performanceMetrics.totalInferences++;

    if (result.route === 'three_way_fusion') {
      this.performanceMetrics.threeWayFusions++;
    }

    // Update averages
    const n = this.performanceMetrics.totalInferences;
    this.performanceMetrics.averageInferenceMs =
      (this.performanceMetrics.averageInferenceMs * (n - 1) + result.totalInferenceMs) / n;
    this.performanceMetrics.averageFusionMs =
      (this.performanceMetrics.averageFusionMs * (n - 1) + result.fusionMs) / n;

    // Update rates
    this.performanceMetrics.sam3UsageRate =
      result.sam3Output !== null ?
      (this.performanceMetrics.sam3UsageRate * (n - 1) + 1) / n :
      (this.performanceMetrics.sam3UsageRate * (n - 1)) / n;

    this.performanceMetrics.fallbackRate =
      result.fallbacksUsed.length > 0 ?
      (this.performanceMetrics.fallbackRate * (n - 1) + 1) / n :
      (this.performanceMetrics.fallbackRate * (n - 1)) / n;

    // Log metrics periodically
    if (this.performanceMetrics.totalInferences % 100 === 0) {
      logger.info('Performance metrics update', {
        service: this.SERVICE_NAME,
        metrics: this.performanceMetrics
      });
    }
  }

  /**
   * Get performance metrics
   */
  static getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get service availability status
   */
  static getServiceAvailability(): typeof this.serviceAvailability {
    return { ...this.serviceAvailability };
  }

  /**
   * Reset performance metrics (for testing)
   */
  static resetMetrics(): void {
    this.performanceMetrics = {
      totalInferences: 0,
      threeWayFusions: 0,
      averageInferenceMs: 0,
      averageFusionMs: 0,
      sam3UsageRate: 0,
      fallbackRate: 0
    };
  }

  // Helper methods
  private static getTimelineForUrgency(urgency: UrgencyLevel): string {
    const timelines: Record<UrgencyLevel, string> = {
      immediate: 'Within 24 hours',
      urgent: 'Within 1 week',
      soon: 'Within 1 month',
      planned: 'Within 3 months',
      monitor: 'Monitor for changes'
    };
    return timelines[urgency];
  }

  private static getRecommendationForSeverity(severity: DamageSeverity): string {
    const recommendations: Record<DamageSeverity, string> = {
      early: 'Monitor and plan for preventive maintenance',
      midway: 'Schedule professional assessment and repairs',
      full: 'Immediate professional intervention required'
    };
    return recommendations[severity];
  }
}