import { logger } from '@mintenance/shared';
import crypto from 'crypto';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import { validateURLs } from '@/lib/security/url-validation';
import { getConfig } from './config/BuildingSurveyorConfig';
import { fetchWithOpenAIRetry } from '@/lib/utils/openai-rate-limit';
import type {
  Phase1BuildingAssessment,
  AssessmentContext,
  DamageSeverity,
  UrgencyLevel,
  RoboflowDetection,
  VisionAnalysisSummary,
} from './types';
import { RoboflowDetectionService } from './RoboflowDetectionService';
import { ImageAnalysisService } from '@/lib/services/ImageAnalysisService';
import type { MemoryQueryResult } from '../ml-engine/memory/types';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { AI_ASSESSMENT_SCHEMA, type AiAssessmentPayload } from './validation-schemas';
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder';
import { toVisionSummary, buildEvidenceSummary } from './evidence-processor';
import { structureAssessment } from './assessment-structurer';
import { applyMemoryAdjustments } from './memory-adjustments';
import { extractDetectionFeatures } from './feature-extractor';
import { learnFromRepairOutcome, learnFromProgression, learnFromValidation } from './learning-handler';
import { BayesianFusionService } from './BayesianFusionService';
import { CriticModule } from './critic';
import { ContextFeatureService } from './ContextFeatureService';
import { ImageQualityService } from './ImageQualityService';
import { formatSAM3EvidenceForFusion } from './evidence-formatter';
import { mondrianConformalPrediction } from './conformal-prediction';
import { computeOODScore, computeDetectorDisagreement } from './detector-metrics';
import { normalizeDamageCategory, normalizePropertyType, getSafetyThreshold } from './normalization-utils';
import { logDecisionForShadowMode } from './shadow-mode-logger';
import { initializeMemorySystem, getLearnedFeatureExtractor, isLearnedFeaturesEnabled } from './initialization/BuildingSurveyorInitializationService';
import { runWithTimeout } from './utils/timeout-utils';

/**
 * Building Surveyor Service
 *
 * Uses GPT-4 Vision to analyze building damage photos and provide
 * comprehensive assessments including:
 * - Damage detection (early/midway/full)
 * - Safety hazard identification
 * - Compliance flags
 * - Insurance risk scoring
 * - Urgency classification
 * - Homeowner-friendly explanations
 * - Contractor technical advice
 */
export class BuildingSurveyorService {
  private static readonly DETECTOR_TIMEOUT_MS = Number.parseInt(
    process.env.BUILDING_SURVEYOR_DETECTOR_TIMEOUT_MS || '',
    10,
  ) || 7000;

  private static readonly VISION_TIMEOUT_MS = Number.parseInt(
    process.env.BUILDING_SURVEYOR_VISION_TIMEOUT_MS || '',
    10,
  ) || 9000;

  private static readonly DEFAULT_IMAGE_AREA = Number.parseInt(
    process.env.BUILDING_SURVEYOR_IMAGE_BASE_AREA || '',
    10,
  ) || 1024 * 768;

  private static readonly AGENT_NAME = 'building-surveyor';

  private static recordMetric(metric: string, payload: Record<string, unknown>): void {
    MonitoringService.record(metric, {
      agentName: this.AGENT_NAME,
      ...payload,
    });
  }

  /**
   * Extract detection features from images and context
   * Delegates to feature-extractor module
   */
  private static async extractDetectionFeaturesInternal(
    imageUrls: string[],
    context?: AssessmentContext,
    assessment?: Phase1BuildingAssessment,
    roboflowDetections?: RoboflowDetection[],
    visionSummary?: VisionAnalysisSummary | null
  ): Promise<number[]> {
    return extractDetectionFeatures(
      imageUrls,
      context,
      assessment,
      roboflowDetections,
      visionSummary,
      isLearnedFeaturesEnabled(),
      getLearnedFeatureExtractor()
    );
  }


  /**
   * Assess building damage from photos using GPT-4 Vision
   * Enhanced with nested learning memory adjustments
   */
  static async assessDamage(
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<Phase1BuildingAssessment> {
    const startedAt = Date.now();
    try {
      // Initialize memory system
      await initializeMemorySystem();

      // Get config with fallback to process.env
      const config = getConfig();
      if (!config.openaiApiKey) {
        logger.warn('OpenAI API key not configured', {
          service: 'BuildingSurveyorService',
        });
        throw new Error('AI assessment service is not configured');
      }

      // Store config for use in API calls
      const openaiApiKey = config.openaiApiKey;

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error('At least one image is required for assessment');
      }

      // SECURITY: Validate all image URLs before sending to OpenAI
      const urlValidation = await validateURLs(imageUrls, true);
      if (urlValidation.invalid.length > 0) {
        logger.warn('Invalid image URLs rejected for building assessment', {
          service: 'BuildingSurveyorService',
          invalidUrls: urlValidation.invalid,
        });
        throw new Error(`Invalid image URLs: ${urlValidation.invalid.map(i => i.error).join(', ')}`);
      }

      // Use only validated URLs
      const validatedImageUrls = urlValidation.valid;

      // Run external detectors in parallel with timeouts
      const [roboflowResult, visionResult] = await Promise.all([
        runWithTimeout(
          () => RoboflowDetectionService.detect(validatedImageUrls),
          this.DETECTOR_TIMEOUT_MS,
          'roboflow-detect',
        ),
        runWithTimeout(
          () => ImageAnalysisService.analyzePropertyImages(validatedImageUrls),
          this.VISION_TIMEOUT_MS,
          'vision-analyze',
        ),
      ]);

      const roboflowDetections =
        roboflowResult.success && Array.isArray(roboflowResult.data)
          ? roboflowResult.data
          : [];
      const visionAnalysis = visionResult.success
        ? toVisionSummary(visionResult.data ?? null)
        : null;

      // Extract image quality metrics for context vector
      const imageQuality = await ImageQualityService.getAverageQualityMetrics(
        validatedImageUrls,
        visionAnalysis
      );

      if (!roboflowResult.success) {
        logger.warn('Roboflow detection unavailable', {
          service: 'BuildingSurveyorService',
          timedOut: roboflowResult.timedOut,
          error:
            roboflowResult.error instanceof Error
              ? roboflowResult.error.message
              : roboflowResult.error,
        });
      }

      if (!visionResult.success) {
        logger.warn('Google Vision analysis unavailable', {
          service: 'BuildingSurveyorService',
          timedOut: visionResult.timedOut,
          error:
            visionResult.error instanceof Error
              ? visionResult.error.message
              : visionResult.error,
        });
      }

      this.recordMetric('detector.roboflow', {
        success: roboflowResult.success,
        durationMs: roboflowResult.durationMs,
        timedOut: roboflowResult.timedOut,
        detectionCount: roboflowDetections.length,
      });

      this.recordMetric('detector.vision', {
        success: visionResult.success,
        durationMs: visionResult.durationMs,
        timedOut: visionResult.timedOut,
        detectedLabels: visionAnalysis?.labels.length ?? 0,
      });

      const hasMachineEvidence =
        (roboflowResult.success && roboflowDetections.length > 0) ||
        (visionResult.success && !!visionAnalysis);

      if (!hasMachineEvidence) {
        logger.warn('Proceeding with GPT-only assessment (no machine evidence)', {
          service: 'BuildingSurveyorService',
          roboflowSuccess: roboflowResult.success,
          visionSuccess: visionResult.success,
        });
        this.recordMetric('detector.fallback', {
          reason: 'no_machine_evidence',
          roboflowSuccess: roboflowResult.success,
          visionSuccess: visionResult.success,
        });
      }

      // 1. Build scene graph from detections and vision analysis
      // This implements the paper's Perception Layer → Scene Graph Builder
      const { SceneGraphBuilder } = await import('./scene_graph');
      const { SceneGraphFeatureExtractor } = await import('./scene_graph_features');
      const { SAM3Service } = await import('./SAM3Service');
      
      // Try to get SAM 3 segmentation if available
      let sam3Segmentation: import('./SAM3Service').DamageTypeSegmentation | undefined = undefined;
      if (process.env.ENABLE_SAM3_SEGMENTATION === 'true' && validatedImageUrls.length > 0) {
        try {
          const isSAM3Available = await SAM3Service.healthCheck();
          if (isSAM3Available) {
            // Segment first image with common damage types
            const damageTypes = ['water damage', 'crack', 'rot', 'mold', 'stain', 'structural damage'];
            const result = await SAM3Service.segmentDamageTypes(
              validatedImageUrls[0],
              damageTypes
            );
            sam3Segmentation = result || undefined;
          }
        } catch (error) {
          logger.warn('SAM 3 segmentation failed, falling back to Roboflow', {
            service: 'BuildingSurveyorService',
            error,
          });
        }
      }
      
      const sceneGraph = SceneGraphBuilder.buildSceneGraph(
        roboflowDetections,
        visionAnalysis,
        validatedImageUrls.length,
        sam3Segmentation
      );

      // 2. Extract features from scene graph (flatten to vector)
      // This implements the paper's Feature Extraction: Graph → Vector
      const sceneGraphFeatures = SceneGraphFeatureExtractor.extractFeatures(sceneGraph);

      // 3. Extract features with detection evidence (fallback for compatibility)
      const features = await this.extractDetectionFeaturesInternal(
        validatedImageUrls,
        context,
        undefined,
        roboflowDetections,
        visionAnalysis,
      );

      // 4. Use scene graph features if available, otherwise fall back to detection features
      // Scene graph features take priority as they include structural dependencies
      const finalFeatures = sceneGraph.nodes.length > 0
        ? sceneGraphFeatures.featureVector
        : features;

      // Query memory for learned adjustments
      // Use Titans-enhanced query if enabled
      let memoryAdjustments: number[] = [0, 0, 0, 0, 0]; // Default: no adjustments
      try {
        const memorySystem = memoryManager.getMemorySystem(this.AGENT_NAME);
        const useTitans = process.env.USE_TITANS === 'true' || false;

        let processedFeatures = finalFeatures;
        if (useTitans && memorySystem) {
          // Use Titans-enhanced processing
          processedFeatures = await memorySystem.processWithTitans(finalFeatures);
        }

        const memoryResults: MemoryQueryResult[] = [];
        for (let level = 0; level < 3; level++) {
          const result = await memoryManager.query(this.AGENT_NAME, processedFeatures.slice(0, 40), level);
          if (result.values && result.values.length === 5) {
            memoryResults.push(result);
          }
        }

        // Combine adjustments from all levels (weighted by confidence)
        if (memoryResults.length > 0) {
          let totalWeight = 0;
          const combined = [0, 0, 0, 0, 0];
          for (const result of memoryResults) {
            const weight = result.confidence;
            totalWeight += weight;
            for (let i = 0; i < 5; i++) {
              combined[i] += result.values[i] * weight;
            }
          }
          if (totalWeight > 0) {
            for (let i = 0; i < 5; i++) {
              memoryAdjustments[i] = combined[i] / totalWeight;
            }
          }
        }
      } catch (memoryError) {
        logger.warn('Memory query failed, continuing without adjustments', {
          service: 'BuildingSurveyorService',
          error: memoryError,
        });
      }

      // Limit to 4 images (GPT-4 Vision limit)
      const imagesToAnalyze = validatedImageUrls.slice(0, 4);

      // Prepare GPT-4 Vision request
      const systemPrompt = buildSystemPrompt();
      const evidenceSummary = buildEvidenceSummary(roboflowDetections, visionAnalysis);
      const hasDetectionEvidence = roboflowDetections.length > 0 || !!visionAnalysis;
      const userPrompt = buildUserPrompt(context, evidenceSummary, hasDetectionEvidence);

      interface ChatMessage {
        role: 'system' | 'user' | 'assistant';
        content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' | 'auto' } }>;
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...imagesToAnalyze.map((url) => ({
              type: 'image_url' as const,
              image_url: { url, detail: 'high' as const },
            })),
          ],
        },
      ];

      // Call GPT-4 Vision API with retry logic for rate limits
      const gptStart = Date.now();
      const response = await fetchWithOpenAIRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o', // Using gpt-4o for vision
            messages,
            max_tokens: 2000,
            temperature: 0.1, // Low temperature for factual analysis
            response_format: { type: 'json_object' },
          }),
        },
        {
          maxAttempts: 5,
          baseDelayMs: 2000,
          maxDelayMs: 60000,
          backoffMultiplier: 2,
        }
      );

      const data = await response.json();
      const gptDuration = Date.now() - gptStart;
      this.recordMetric('gpt.assessment', {
        durationMs: gptDuration,
        imageCount: imagesToAnalyze.length,
        hasMachineEvidence,
      });
      const content = data.choices[0]?.message?.content || '{}';

      // Parse JSON response
      let aiResponseRaw: unknown;
      try {
        aiResponseRaw = JSON.parse(content);
      } catch (parseError) {
        logger.error('Failed to parse OpenAI response', {
          service: 'BuildingSurveyorService',
          content: content.substring(0, 500),
        });
        throw new Error('Failed to parse AI assessment response');
      }

      let aiResponse: AiAssessmentPayload;
      try {
        aiResponse = AI_ASSESSMENT_SCHEMA.parse(aiResponseRaw);
      } catch (validationError) {
        logger.error('AI assessment response failed validation', validationError, {
          service: 'BuildingSurveyorService',
        });
        throw new Error('AI assessment response failed validation');
      }

      // Structure into Phase1BuildingAssessment
      let assessment = structureAssessment(aiResponse, {
        roboflowDetections,
        visionAnalysis: visionAnalysis || undefined,
        sam3Segmentation: sam3Segmentation ? sam3Segmentation : undefined,
        sceneGraphFeatures: sceneGraphFeatures ? sceneGraphFeatures : undefined,
      });

      // Apply memory adjustments
      assessment = applyMemoryAdjustments(assessment, memoryAdjustments);

      // 5. Bayesian Fusion: Fuse evidence from SAM 3, GPT-4, and Scene Graph
      const sam3EvidenceFormatted = formatSAM3EvidenceForFusion(sam3Segmentation);
      const bayesianFusionResult = BayesianFusionService.fuseEvidence({
        sam3Evidence: sam3EvidenceFormatted,
        gpt4Assessment: {
          severity: assessment.damageAssessment.severity,
          confidence: assessment.damageAssessment.confidence,
          damageType: assessment.damageAssessment.damageType,
          hasCriticalHazards: assessment.safetyHazards.hasCriticalHazards,
        },
        sceneGraphFeatures: sceneGraphFeatures || null,
      });

      // 6. Mondrian Conformal Prediction: Calibrate uncertainty per stratum
      const propertyType = context?.propertyType || 'residential';
      const propertyAge = context?.ageOfProperty || 50;
      const region = context?.location || 'unknown';
      const damageCategory = normalizeDamageCategory(assessment.damageAssessment.damageType);
      
      const cpResult = await mondrianConformalPrediction(
        bayesianFusionResult.mean,
        bayesianFusionResult.variance,
        {
          propertyType,
          propertyAge,
          region,
          damageCategory,
        }
      );

      // 7. Compute additional metrics for context vector
      const detectorDisagreement = computeDetectorDisagreement(
        roboflowDetections,
        visionAnalysis,
        assessment.damageAssessment.confidence
      );
      const oodScore = computeOODScore(roboflowDetections, bayesianFusionResult);

      // 8. Build context vector for Safe-LUCB Critic
      const contextVector = ContextFeatureService.constructContextVector({
        fusion_confidence: bayesianFusionResult.mean,
        fusion_variance: bayesianFusionResult.variance,
        cp_set_size: cpResult.predictionSet.length,
        safety_critical_candidate: assessment.safetyHazards.hasCriticalHazards ? 1 : 0,
        lighting_quality: imageQuality.lightingQuality,
        image_clarity: imageQuality.imageClarity,
        property_age: propertyAge,
        property_age_bin: ContextFeatureService.getPropertyAgeBin(propertyAge),
        num_damage_sites: assessment.damageAssessment.detectedItems?.length || 1,
        detector_disagreement: detectorDisagreement,
        ood_score: oodScore,
        region: region,
      });

      // 9. Determine safety threshold based on property type
      const deltaSafety = getSafetyThreshold(propertyType);

      // 10. Safe-LUCB Critic: Make automate/escalate decision
      const criticDecision = await CriticModule.selectArm({
        context: contextVector,
        delta_safety: deltaSafety,
        stratum: cpResult.stratum,
        criticalHazardDetected: assessment.safetyHazards.hasCriticalHazards,
      });

      // 11. Shadow mode: Log decision but always escalate for human review
      const shadowModeEnabled = process.env.SHADOW_MODE_ENABLED === 'true';
      let finalDecision = criticDecision.arm;
      
      if (shadowModeEnabled) {
        // Log decision for learning but force escalation
        await logDecisionForShadowMode({
          assessmentId: crypto.randomUUID(), // Would be passed in real implementation
          decision: criticDecision.arm,
          contextVector,
          cpResult,
          bayesianFusionResult,
        });
        finalDecision = 'escalate';
      }

      // 12. Attach decision result to assessment
      assessment.decisionResult = {
        decision: finalDecision,
        reason: shadowModeEnabled ? 'Shadow mode: forced escalation for learning' : criticDecision.reason,
        safetyUcb: criticDecision.safetyUcb,
        rewardUcb: criticDecision.rewardUcb,
        safetyThreshold: criticDecision.safetyThreshold,
        exploration: criticDecision.exploration,
        cpStratum: cpResult.stratum,
        cpPredictionSet: cpResult.predictionSet,
        fusionMean: bayesianFusionResult.mean,
        fusionVariance: bayesianFusionResult.variance,
      };

      logger.info('Building assessment completed', {
        service: 'BuildingSurveyorService',
        imageCount: imagesToAnalyze.length,
        damageType: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        urgency: assessment.urgency.urgency,
        adjustmentsApplied: memoryAdjustments.some(a => Math.abs(a) > 0.01),
        decision: finalDecision,
        shadowMode: shadowModeEnabled,
      });

      this.recordMetric('assessment.success', {
        durationMs: Date.now() - startedAt,
        imageCount: imagesToAnalyze.length,
        hasMachineEvidence,
        adjustmentsApplied: memoryAdjustments.some((a) => Math.abs(a) > 0.01),
        decision: finalDecision,
      });

      return assessment;
    } catch (error) {
      logger.error('Error assessing building damage', error, {
        service: 'BuildingSurveyorService',
      });
      this.recordMetric('assessment.failure', {
        error: error instanceof Error ? error.message : 'unknown_error',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }



  /**
   * Learn from human validation outcome
   * Delegates to learning-handler module
   */
  static async learnFromValidation(
    assessmentId: string,
    humanValidatedAssessment: Phase1BuildingAssessment
  ): Promise<void> {
    await initializeMemorySystem();
    await learnFromValidation(assessmentId, humanValidatedAssessment);
  }

  /**
   * Learn from repair outcome
   * Delegates to learning-handler module
   */
  static async learnFromRepairOutcome(
    assessmentId: string,
    actualSeverity?: DamageSeverity,
    actualCost?: number,
    actualUrgency?: UrgencyLevel
  ): Promise<void> {
    await initializeMemorySystem();
    await learnFromRepairOutcome(
      assessmentId,
      actualSeverity,
      actualCost,
      actualUrgency,
      isLearnedFeaturesEnabled(),
      getLearnedFeatureExtractor()
    );
  }

  /**
   * Learn from damage progression
   * Delegates to learning-handler module
   */
  static async learnFromProgression(
    originalAssessmentId: string,
    followUpAssessmentId: string
  ): Promise<void> {
    await initializeMemorySystem();
    await learnFromProgression(
      originalAssessmentId,
      followUpAssessmentId,
      isLearnedFeaturesEnabled(),
      getLearnedFeatureExtractor()
    );
  }

  // Safety, compliance, and insurance risk processing moved to dedicated services:
  // - SafetyAnalysisService.processSafetyHazards()
  // - ComplianceService.processCompliance()
  // - InsuranceRiskService.processInsuranceRisk()
  
  // Evidence formatting, conformal prediction, detector metrics, normalization, and shadow mode logging
  // have been moved to dedicated modules:
  // - evidence-formatter.ts: formatSAM3EvidenceForFusion()
  // - conformal-prediction.ts: mondrianConformalPrediction(), getCalibrationData(), weightedQuantile(), betaQuantile()
  // - detector-metrics.ts: computeOODScore(), computeDetectorDisagreement()
  // - normalization-utils.ts: normalizeDamageCategory(), normalizePropertyType(), getSafetyThreshold()
  // - shadow-mode-logger.ts: logDecisionForShadowMode()
}

