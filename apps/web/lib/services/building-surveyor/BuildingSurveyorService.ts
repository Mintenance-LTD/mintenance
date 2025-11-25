import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import crypto from 'crypto';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import { AdaptiveUpdateEngine } from '../agents/AdaptiveUpdateEngine';
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
import type { ImageAnalysisResult } from '@/lib/services/ImageAnalysisService';
import type { ContinuumMemoryConfig, MemoryQueryResult } from '../ml-engine/memory/types';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { SafetyAnalysisService } from './SafetyAnalysisService';
import { ComplianceService } from './ComplianceService';
import { InsuranceRiskService } from './InsuranceRiskService';
import { LearnedFeatureExtractor } from './LearnedFeatureExtractor';
import { AI_ASSESSMENT_SCHEMA, type AiAssessmentPayload } from './validation-schemas';
import {
  encodeLocation,
  encodeBuildingStyle,
  encodeDamageType,
  encodeDamageLocation,
  encodeUrgency,
} from './encoding-utils';
import { normalizeSeverity, normalizeUrgency } from './normalization-utils';
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder';
import { toVisionSummary, buildEvidenceSummary } from './evidence-processor';
import { structureAssessment } from './assessment-structurer';
import { applyMemoryAdjustments } from './memory-adjustments';
import { extractDetectionFeatures } from './feature-extractor';
import { queryMemoryAdjustments } from './memory-query-handler';
import { learnFromRepairOutcome, learnFromProgression } from './learning-handler';
import { BayesianFusionService } from './BayesianFusionService';
import { CriticModule } from './critic';
import { ContextFeatureService } from './ContextFeatureService';
import { ImageQualityService } from './ImageQualityService';
import type { DecisionResult } from './types';
import { formatSAM3EvidenceForFusion } from './evidence-formatter';
import { mondrianConformalPrediction } from './conformal-prediction';
import { computeOODScore, computeDetectorDisagreement } from './detector-metrics';
import { normalizeDamageCategory, normalizePropertyType, getSafetyThreshold } from './normalization-utils';
import { logDecisionForShadowMode } from './shadow-mode-logger';

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

  private static memorySystemInitialized = false;
  private static readonly AGENT_NAME = 'building-surveyor';
  private static adaptiveEngine: AdaptiveUpdateEngine | null = null;
  private static learnedFeatureExtractor: LearnedFeatureExtractor | null = null;
  private static useLearnedFeatures: boolean = 
    process.env.USE_LEARNED_FEATURES === 'true' || false;

  private static recordMetric(metric: string, payload: Record<string, unknown>): void {
    MonitoringService.record(metric, {
      agentName: this.AGENT_NAME,
      ...payload,
    });
  }

  /**
   * Initialize adaptive update engine
   */
  private static async initializeAdaptiveEngine(): Promise<void> {
    if (!this.adaptiveEngine) {
      this.adaptiveEngine = new AdaptiveUpdateEngine({
        agentName: this.AGENT_NAME,
      });
    }
  }

  /**
   * Trigger self-modification when accuracy drops
   */
  private static async triggerSelfModification(accuracyDrop: number): Promise<void> {
    await this.initializeAdaptiveEngine();

    logger.info('BuildingSurveyorService self-modification triggered', {
      agentName: this.AGENT_NAME,
      accuracyDrop,
    });

    if (this.adaptiveEngine) {
      await this.adaptiveEngine.recordPerformance(1 - accuracyDrop);
    }
  }

  /**
   * Initialize learned feature extractor
   */
  private static async initializeLearnedFeatureExtractor(): Promise<void> {
    if (this.learnedFeatureExtractor || !this.useLearnedFeatures) return;

    try {
      this.learnedFeatureExtractor = new LearnedFeatureExtractor(
        this.AGENT_NAME,
        {
          inputDim: 50,  // Raw input dimension (will be padded/truncated)
          outputDim: 40, // Fixed output dimension (matches handcrafted features)
          hiddenDims: [64, 48],
          learningRate: 0.001,
          regularization: 0.0001,
        }
      );

      await this.learnedFeatureExtractor.loadState();

      logger.info('Learned feature extractor initialized', {
        service: 'BuildingSurveyorService',
        agentName: this.AGENT_NAME,
      });
    } catch (error) {
      logger.error('Failed to initialize learned feature extractor', error, {
        service: 'BuildingSurveyorService',
      });
      // Fallback to handcrafted features
      this.useLearnedFeatures = false;
    }
  }

  /**
   * Initialize continuum memory system for building surveyor
   */
  private static async initializeMemorySystem(): Promise<void> {
    if (this.memorySystemInitialized) return;

    await this.initializeAdaptiveEngine();
    await this.initializeLearnedFeatureExtractor();

    try {
      const config: ContinuumMemoryConfig = {
        agentName: this.AGENT_NAME,
        defaultChunkSize: 10,
        defaultLearningRate: 0.001,
        levels: [
          {
            level: 0,
            frequency: 1, // Updates every assessment
            chunkSize: 10,
            learningRate: 0.01,
            mlpConfig: {
              inputSize: 40,
              hiddenSizes: [64, 32],
              outputSize: 5, // [damage_type_adjustment, severity_adjustment, cost_adjustment, urgency_adjustment, confidence_calibration]
              activation: 'relu',
            },
          },
          {
            level: 1,
            frequency: 16, // Updates daily (assuming ~16 assessments/day)
            chunkSize: 100,
            learningRate: 0.005,
            mlpConfig: {
              inputSize: 40,
              hiddenSizes: [128, 64],
              outputSize: 5,
              activation: 'relu',
            },
          },
          {
            level: 2,
            frequency: 1000000, // Updates weekly (low frequency)
            chunkSize: 1000,
            learningRate: 0.001,
            mlpConfig: {
              inputSize: 40,
              hiddenSizes: [256, 128, 64],
              outputSize: 5,
              activation: 'relu',
            },
          },
        ],
      };

      const memorySystem = await memoryManager.getOrCreateMemorySystem(config);
      
      // Enable Titans for self-modification
      const useTitans = process.env.USE_TITANS === 'true' || false;
      if (useTitans) {
        memorySystem.enableTitans(true);
        logger.info('Titans enabled for building surveyor', {
          agentName: this.AGENT_NAME,
        });
      }
      
      this.memorySystemInitialized = true;

      logger.info('BuildingSurveyorService memory system initialized', {
        agentName: this.AGENT_NAME,
        levels: config.levels.length,
        useLearnedFeatures: this.useLearnedFeatures,
        useTitans,
      });
    } catch (error) {
      logger.error('Failed to initialize memory system', error, {
        service: 'BuildingSurveyorService',
      });
      // Continue with fallback behavior
    }
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
      this.useLearnedFeatures,
      this.learnedFeatureExtractor
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
      await this.initializeMemorySystem();

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
        this.runWithTimeout(
          () => RoboflowDetectionService.detect(validatedImageUrls),
          this.DETECTOR_TIMEOUT_MS,
          'roboflow-detect',
        ),
        this.runWithTimeout(
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

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...imagesToAnalyze.map((url) => ({
              type: 'image_url',
              image_url: { url, detail: 'high' },
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
   * Compares original assessment with human-validated assessment and updates memory
   */
  static async learnFromValidation(
    assessmentId: string,
    humanValidatedAssessment: Phase1BuildingAssessment
  ): Promise<void> {
    await this.initializeMemorySystem();

    try {
      // Get original assessment from database
      const { data: assessmentRecord, error } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data, user_id')
        .eq('id', assessmentId)
        .single();

      if (error || !assessmentRecord) {
        logger.warn('Assessment not found for learning', {
          service: 'BuildingSurveyorService',
          assessmentId,
        });
        return;
      }

      const originalAssessment = assessmentRecord.assessment_data as Phase1BuildingAssessment;

      // Get context from database (if available)
      const { data: images } = await serverSupabase
        .from('assessment_images')
        .select('image_url')
        .eq('assessment_id', assessmentId)
        .order('image_index');

      const imageUrls = images?.map(img => img.image_url) || [];
      const context: AssessmentContext = {}; // Could be enhanced to fetch from user profile

      // Extract features for original assessment
      const originalFeatures = await this.extractDetectionFeaturesInternal(
        imageUrls,
        context,
        originalAssessment,
        originalAssessment.evidence?.roboflowDetections,
        originalAssessment.evidence?.visionAnalysis ?? null,
      );

      // Extract features for validated assessment (target features)
      const validatedFeatures = await this.extractDetectionFeaturesInternal(
        imageUrls,
        context,
        humanValidatedAssessment,
        originalAssessment.evidence?.roboflowDetections,
        originalAssessment.evidence?.visionAnalysis ?? null,
      );

      // Learn from surprise signal in feature extractor
      if (this.useLearnedFeatures && this.learnedFeatureExtractor) {
        try {
          // Build raw input for learning
          const rawInput = this.learnedFeatureExtractor['buildRawInput'](
            imageUrls,
            context,
            originalAssessment.evidence?.roboflowDetections,
            originalAssessment.evidence?.visionAnalysis ?? null
          );

          // Learn from surprise: validated features are the target
          await this.learnedFeatureExtractor.learnFromSurprise(
            rawInput,
            validatedFeatures
          );

          logger.debug('Feature extractor learned from validation', {
            service: 'BuildingSurveyorService',
            assessmentId,
            avgError: this.learnedFeatureExtractor.getAverageError(),
          });
        } catch (featureError) {
          logger.warn('Failed to learn in feature extractor', {
            service: 'BuildingSurveyorService',
            assessmentId,
            error: featureError,
          });
        }
      }

      // Calculate surprise signals for memory system
      const damageTypeAccuracy = originalAssessment.damageAssessment.damageType ===
        humanValidatedAssessment.damageAssessment.damageType ? 1.0 : 0.0;

      const severityAccuracy = originalAssessment.damageAssessment.severity ===
        humanValidatedAssessment.damageAssessment.severity ? 1.0 : 0.0;

      const confidenceError = Math.abs(
        originalAssessment.damageAssessment.confidence -
        humanValidatedAssessment.damageAssessment.confidence
      ) / 100;

      const costAccuracy = originalAssessment.contractorAdvice?.estimatedCost?.recommended &&
        humanValidatedAssessment.contractorAdvice?.estimatedCost?.recommended
        ? Math.max(-1, Math.min(1, 
            (humanValidatedAssessment.contractorAdvice.estimatedCost.recommended -
             originalAssessment.contractorAdvice.estimatedCost.recommended) /
            originalAssessment.contractorAdvice.estimatedCost.recommended
          ))
        : 0.0;

      const urgencyAccuracy = originalAssessment.urgency.urgency ===
        humanValidatedAssessment.urgency.urgency ? 1.0 : 0.0;

      // Values: [damage_type_accuracy, severity_accuracy, cost_accuracy, urgency_accuracy, confidence_error]
      const values = [
        damageTypeAccuracy,
        severityAccuracy,
        costAccuracy,
        urgencyAccuracy,
        confidenceError,
      ];

      // Add context flow to all memory levels (with Titans if enabled)
      const memorySystem = memoryManager.getMemorySystem(this.AGENT_NAME);
      const useTitans = process.env.USE_TITANS === 'true' || false;

      if (useTitans && memorySystem) {
        // Use Titans-enhanced learning
        for (let level = 0; level < 3; level++) {
          try {
            await memorySystem.learnFromSurpriseWithTitans(
              originalFeatures,
              values,
              level
            );
          } catch (levelError) {
            logger.warn('Failed to learn with Titans at memory level', {
              service: 'BuildingSurveyorService',
              level,
              error: levelError,
            });
          }
        }
      } else {
        // Standard memory learning
        for (let level = 0; level < 3; level++) {
          try {
            await memoryManager.addContextFlow(
              this.AGENT_NAME,
              originalFeatures,
              values,
              level
            );
          } catch (levelError) {
            logger.warn('Failed to add context flow to memory level', {
              service: 'BuildingSurveyorService',
              level,
              error: levelError,
            });
          }
        }
      }

      // Calculate overall accuracy
      const overallAccuracy = (
        damageTypeAccuracy * 0.3 +
        severityAccuracy * 0.25 +
        urgencyAccuracy * 0.15 +
        (1 - Math.min(1, confidenceError)) * 0.1 +
        (1 - Math.min(1, Math.abs(costAccuracy))) * 0.2
      );

      // Trigger self-modification if accuracy is low
      if (overallAccuracy < 0.7) {
        await this.triggerSelfModification(1 - overallAccuracy);
      }

      logger.info('Learning from validation completed', {
        service: 'BuildingSurveyorService',
        assessmentId,
        overallAccuracy,
        damageTypeAccuracy,
        severityAccuracy,
      });
    } catch (error) {
      logger.error('Failed to learn from validation', error, {
        service: 'BuildingSurveyorService',
        assessmentId,
      });
    }
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
    await this.initializeMemorySystem();
    await learnFromRepairOutcome(
      assessmentId,
      actualSeverity,
      actualCost,
      actualUrgency,
      this.useLearnedFeatures,
      this.learnedFeatureExtractor
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
    await this.initializeMemorySystem();
    await learnFromProgression(
      originalAssessmentId,
      followUpAssessmentId,
      this.useLearnedFeatures,
      this.learnedFeatureExtractor
    );
  }


  private static async runWithTimeout<T>(
    task: () => Promise<T>,
    timeoutMs: number,
    label: string,
  ): Promise<{
    success: boolean;
    data?: T;
    error?: unknown;
    durationMs: number;
    timedOut: boolean;
  }> {
    const start = Date.now();
    const timeoutError = new Error(`${label} timed out after ${timeoutMs}ms`);
    let timeoutHandle: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(timeoutError), timeoutMs);
    });

    try {
      const data = await Promise.race([task(), timeoutPromise]);
      return {
        success: true,
        data: data as T,
        durationMs: Date.now() - start,
        timedOut: false,
      };
    } catch (error) {
      return {
        success: false,
        error,
        durationMs: Date.now() - start,
        timedOut: error === timeoutError,
      };
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
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

