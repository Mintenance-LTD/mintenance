import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import { AdaptiveUpdateEngine } from '../agents/AdaptiveUpdateEngine';
import { validateURLs } from '@/lib/security/url-validation';
import type {
  Phase1BuildingAssessment,
  AssessmentContext,
  DamageSeverity,
  UrgencyLevel,
  SafetyHazardSeverity,
  ComplianceSeverity,
  PremiumImpact,
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

const optionalNumber = () =>
  z
    .preprocess((value) => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
      }
      if (typeof value === 'string') {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return value;
    }, z.number())
    .optional();

const hazardSchema = z.object({
  type: z.string().optional(),
  severity: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  immediateAction: z.string().optional(),
  urgency: z.string().optional(),
});

const complianceIssueSchema = z.object({
  issue: z.string().optional(),
  regulation: z.string().optional(),
  severity: z.string().optional(),
  description: z.string().optional(),
  recommendation: z.string().optional(),
});

const riskFactorSchema = z.object({
  factor: z.string().optional(),
  severity: z.string().optional(),
  impact: z.string().optional(),
});

const materialSchema = z.object({
  name: z.string().optional(),
  quantity: z.string().optional(),
  estimatedCost: optionalNumber(),
});

const homeownerExplanationSchema = z.object({
  whatIsIt: z.string().optional(),
  whyItHappened: z.string().optional(),
  whatToDo: z.string().optional(),
});

const contractorAdviceSchema = z.object({
  repairNeeded: z.array(z.string()).optional().default([]),
  materials: z.array(materialSchema).optional().default([]),
  tools: z.array(z.string()).optional().default([]),
  estimatedTime: z.string().optional(),
  estimatedCost: z
    .object({
      min: optionalNumber(),
      max: optionalNumber(),
      recommended: optionalNumber(),
    })
    .optional(),
  complexity: z.string().optional(),
});

const AI_ASSESSMENT_SCHEMA = z.object({
  damageType: z.string().optional(),
  severity: z.string().optional(),
  confidence: optionalNumber(),
  location: z.string().optional(),
  description: z.string().optional(),
  detectedItems: z.array(z.string()).optional().default([]),
  safetyHazards: z.array(hazardSchema).optional().default([]),
  complianceIssues: z.array(complianceIssueSchema).optional().default([]),
  riskFactors: z.array(riskFactorSchema).optional().default([]),
  riskScore: optionalNumber(),
  premiumImpact: z.string().optional(),
  mitigationSuggestions: z.array(z.string()).optional().default([]),
  urgency: z.string().optional(),
  recommendedActionTimeline: z.string().optional(),
  estimatedTimeToWorsen: z.string().optional(),
  urgencyReasoning: z.string().optional(),
  homeownerExplanation: homeownerExplanationSchema.optional(),
  contractorAdvice: contractorAdviceSchema.optional(),
});

type AiAssessmentPayload = z.infer<typeof AI_ASSESSMENT_SCHEMA>;

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
   * Returns 40-dimension feature vector normalized to 0-1 range
   * 
   * Uses learned feature extractor if enabled, otherwise falls back to handcrafted features
   */
  private static async extractDetectionFeatures(
    imageUrls: string[],
    context?: AssessmentContext,
    assessment?: Phase1BuildingAssessment,
    roboflowDetections?: RoboflowDetection[],
    visionSummary?: VisionAnalysisSummary | null
  ): Promise<number[]> {
    // Use learned feature extractor if available and enabled
    if (this.useLearnedFeatures && this.learnedFeatureExtractor) {
      try {
        return await this.learnedFeatureExtractor.extractFeatures(
          imageUrls,
          context,
          roboflowDetections,
          visionSummary
        );
      } catch (error) {
        logger.warn('Learned feature extraction failed, falling back to handcrafted', {
          service: 'BuildingSurveyorService',
          error: error instanceof Error ? error.message : 'unknown',
        });
        // Fall through to handcrafted features
      }
    }

    // Fallback to handcrafted features
    return this.extractDetectionFeaturesHandcrafted(
      imageUrls,
      context,
      assessment,
      roboflowDetections,
      visionSummary
    );
  }

  /**
   * Handcrafted feature extraction (original implementation)
   * Kept as fallback and for comparison
   */
  private static async extractDetectionFeaturesHandcrafted(
    imageUrls: string[],
    context?: AssessmentContext,
    assessment?: Phase1BuildingAssessment,
    roboflowDetections?: RoboflowDetection[],
    visionSummary?: VisionAnalysisSummary | null
  ): Promise<number[]> {
    const features: number[] = [];

    // 1. Property context (5 features)
    const propertyType = context?.propertyType || 'residential';
    features.push(propertyType === 'residential' ? 1.0 : propertyType === 'commercial' ? 0.5 : 0.0);
    features.push(Math.min(1.0, (context?.ageOfProperty || 50) / 200)); // Normalized age
    features.push(this.encodeLocation(context?.location || '')); // Encoded location
    features.push(this.encodeBuildingStyle(context?.propertyDetails || '')); // Encoded style
    features.push(0.5); // Property value tier (placeholder, can be enhanced)

    // 2. Detection evidence metrics
    const detectionCount = roboflowDetections?.length ?? 0;
    const avgDetectionConfidence =
      detectionCount > 0
        ? (roboflowDetections || []).reduce((sum, det) => sum + det.confidence, 0) / detectionCount
        : 0;
    const moldDetections =
      roboflowDetections?.filter((det) => det.className.toLowerCase().includes('mold')).length || 0;
    const crackDetections =
      roboflowDetections?.filter((det) => det.className.toLowerCase().includes('crack')).length || 0;
    const moistureDetections =
      roboflowDetections?.filter((det) => det.className.toLowerCase().includes('moist')).length || 0;
    const visionConfidenceNormalized = Math.min(1.0, (visionSummary?.confidence ?? 50) / 100);
    const visionHasWater = Boolean(
      visionSummary?.labels?.some((label) => label.description.toLowerCase().includes('water')),
    );
    const visionHasStructural = Boolean(
      visionSummary?.detectedFeatures?.some((feature) =>
        feature.toLowerCase().includes('structural'),
      ),
    );
    const visionHasElectrical = Boolean(
      visionSummary?.detectedFeatures?.some((feature) =>
        feature.toLowerCase().includes('electrical'),
      ),
    );
    const visionHasMold =
      Boolean(
        visionSummary?.detectedFeatures?.some((feature) => feature.toLowerCase().includes('mold')),
      ) ||
      Boolean(
        visionSummary?.labels?.some((label) => label.description.toLowerCase().includes('mold')),
      );
    const uniqueDetectionClasses =
      detectionCount > 0 ? new Set((roboflowDetections || []).map((det) => det.className)).size : 0;
    const detectionConfidenceNormalized =
      detectionCount > 0 ? Math.min(1.0, avgDetectionConfidence / 100) : visionConfidenceNormalized;
    const classDiversity =
      detectionCount > 0 ? Math.min(1.0, uniqueDetectionClasses / detectionCount) : 0;
    const hazardSignal =
      detectionCount > 0
        ? Math.min(
            1.0,
            (moldDetections + crackDetections + moistureDetections) / Math.max(1, detectionCount),
          )
        : visionHasStructural || visionHasMold
        ? 0.7
        : 0.3;

    // 3. Image features (5 features)
    features.push(Math.min(1.0, imageUrls.length / 4)); // Image count normalized
    features.push(visionConfidenceNormalized); // Image quality proxy
    features.push(detectionConfidenceNormalized); // Lighting/clarity proxy
    features.push(classDiversity); // Angle/diversity proxy
    features.push(hazardSignal); // Damage visibility proxy

    const detectionAreas = (roboflowDetections || []).map(
      (det) => (det.boundingBox.width || 0) * (det.boundingBox.height || 0),
    );
    const totalDetectionArea = detectionAreas.reduce((sum, area) => sum + area, 0);
    const largestDetectionArea = detectionAreas.reduce((max, area) => Math.max(max, area), 0);
    const normalizedTotalArea =
      detectionCount > 0
        ? Math.min(1.0, totalDetectionArea / this.DEFAULT_IMAGE_AREA)
        : 0;
    const averageDetectionAreaNormalized =
      detectionCount > 0
        ? Math.min(1.0, (totalDetectionArea / detectionCount) / this.DEFAULT_IMAGE_AREA)
        : 0;
    const maxDetectionAreaNormalized =
      detectionCount > 0 ? Math.min(1.0, largestDetectionArea / this.DEFAULT_IMAGE_AREA) : 0;
    const moldRatio = detectionCount > 0 ? moldDetections / detectionCount : 0;
    const structuralRatio = detectionCount > 0 ? crackDetections / detectionCount : 0;

    features.push(Math.min(1.0, detectionCount / 25)); // detection density
    features.push(normalizedTotalArea);
    features.push(averageDetectionAreaNormalized);
    features.push(moldRatio);
    features.push(structuralRatio);

    // 4. Damage characteristics (10 features)
    if (assessment) {
      features.push(this.encodeDamageType(assessment.damageAssessment.damageType));
      const severityValue = assessment.damageAssessment.severity === 'early' ? 0.33 : 
                           assessment.damageAssessment.severity === 'midway' ? 0.66 : 1.0;
      features.push(severityValue);
      features.push(assessment.damageAssessment.confidence / 100);
      features.push(this.encodeDamageLocation(assessment.damageAssessment.location));
      features.push(0.5); // Size indicators (placeholder)
      features.push(0.5); // Age indicators (placeholder)
      features.push(0.5); // Progression indicators (placeholder)
      features.push(Math.min(1.0, assessment.safetyHazards.hazards.length / 10));
      features.push(Math.min(1.0, assessment.compliance.complianceIssues.length / 10));
      features.push(assessment.insuranceRisk.riskScore / 100);
    } else {
      // Default values when assessment not yet available, informed by detections
      const inferredDamageType = visionHasMold
        ? 0.8
        : visionHasWater
        ? 0.4
        : visionHasStructural
        ? 0.6
        : 0.1;
      features.push(inferredDamageType); // Damage type (inferred)
      features.push(visionHasStructural ? 0.66 : 0.5); // Severity (structural risk indicator)
      features.push(visionConfidenceNormalized); // Confidence proxy
      features.push(visionHasWater ? 0.2 : 0.5); // Location proxy
      features.push(
        Math.min(1.0, detectionCount / 20),
        visionHasMold ? 0.7 : 0.5,
        visionHasStructural ? 0.6 : 0.5,
        0.0,
        0.0,
        visionConfidenceNormalized,
      ); // Placeholders influenced by evidence
    }

    // 5. Assessment scores (5 features)
    if (assessment) {
      features.push(assessment.safetyHazards.overallSafetyScore / 100);
      features.push(assessment.compliance.complianceScore / 100);
      features.push(assessment.insuranceRisk.riskScore / 100);
      features.push(this.encodeUrgency(assessment.urgency.urgency));
      features.push(assessment.urgency.priorityScore / 100);
    } else {
      features.push(
        visionHasStructural ? 0.4 : 0.7,
        visionHasElectrical ? 0.5 : 0.8,
        detectionCount > 0 ? detectionConfidenceNormalized : 0.5,
        visionHasStructural ? 0.6 : 0.4,
        visionConfidenceNormalized,
      );
    }

    // 6. Cost features (5 features)
    if (assessment?.contractorAdvice?.estimatedCost) {
      const cost = assessment.contractorAdvice.estimatedCost;
      features.push(Math.min(1.0, cost.min / 10000));
      features.push(Math.min(1.0, cost.max / 10000));
      features.push(Math.min(1.0, cost.recommended / 10000));
      features.push(Math.min(1.0, (cost.max - cost.min) / 10000));
      const complexityValue = assessment.contractorAdvice.complexity === 'low' ? 0.33 :
                            assessment.contractorAdvice.complexity === 'medium' ? 0.66 : 1.0;
      features.push(complexityValue);
    } else {
      const structuralRisk = visionHasStructural || crackDetections > 0;
      features.push(
        Math.min(1.0, detectionCount / 20),
        Math.min(1.0, (moldDetections + moistureDetections) / 10),
        detectionConfidenceNormalized,
        hazardSignal,
        structuralRisk ? 0.7 : visionHasMold ? 0.6 : 0.4,
      );
    }

    // 7. Temporal features (5 features)
    const now = new Date();
    features.push((now.getMonth() / 11) * 0.25 + (now.getDate() / 30) * 0.25); // Time of year
    features.push(0.5); // Weather context (placeholder)
    features.push(0.0); // Assessment frequency (placeholder)
    features.push(0.0); // Days since first detection (placeholder)
    features.push(0.0); // Follow-up indicator (0 = initial)

    // Ensure exactly 40 features
    while (features.length < 40) {
      features.push(0.0);
    }

    return features.slice(0, 40);
  }

  /**
   * Encode location string to 0-1 value
   */
  private static encodeLocation(location: string): number {
    if (!location) return 0.5;
    // Simple hash-based encoding
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      hash = ((hash << 5) - hash) + location.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 1000) / 1000;
  }

  /**
   * Encode building style from property details
   */
  private static encodeBuildingStyle(propertyDetails: string): number {
    if (!propertyDetails) return 0.5;
    const details = propertyDetails.toLowerCase();
    if (details.includes('victorian') || details.includes('period')) return 0.2;
    if (details.includes('modern') || details.includes('contemporary')) return 0.8;
    if (details.includes('new build')) return 0.9;
    return 0.5;
  }

  /**
   * Encode damage type to 0-1 value
   */
  private static encodeDamageType(damageType: string): number {
    const types: Record<string, number> = {
      'water_damage': 0.1,
      'structural_crack': 0.2,
      'damp': 0.3,
      'roof_damage': 0.4,
      'electrical_issue': 0.5,
      'plumbing_issue': 0.6,
      'foundation_issue': 0.7,
      'mold': 0.8,
      'fire_damage': 0.9,
      'unknown_damage': 0.0,
    };
    return types[damageType] || 0.0;
  }

  /**
   * Encode damage location to 0-1 value
   */
  private static encodeDamageLocation(location: string): number {
    const loc = location.toLowerCase();
    if (loc.includes('ceiling')) return 0.1;
    if (loc.includes('wall')) return 0.2;
    if (loc.includes('floor')) return 0.3;
    if (loc.includes('roof')) return 0.4;
    if (loc.includes('basement')) return 0.5;
    if (loc.includes('foundation')) return 0.6;
    return 0.5;
  }

  /**
   * Encode urgency level to 0-1 value
   */
  private static encodeUrgency(urgency: UrgencyLevel): number {
    const values: Record<UrgencyLevel, number> = {
      'immediate': 1.0,
      'urgent': 0.8,
      'soon': 0.6,
      'planned': 0.4,
      'monitor': 0.2,
    };
    return values[urgency] || 0.5;
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

      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured', {
          service: 'BuildingSurveyorService',
        });
        throw new Error('AI assessment service is not configured');
      }

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
        ? this.toVisionSummary(visionResult.data ?? null)
        : null;

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

      // Extract features with detection evidence
      const features = await this.extractDetectionFeatures(
        validatedImageUrls,
        context,
        undefined,
        roboflowDetections,
        visionAnalysis,
      );

      // Query memory for learned adjustments
      // Use Titans-enhanced query if enabled
      let memoryAdjustments: number[] = [0, 0, 0, 0, 0]; // Default: no adjustments
      try {
        const memorySystem = memoryManager.getMemorySystem(this.AGENT_NAME);
        const useTitans = process.env.USE_TITANS === 'true' || false;

        let processedFeatures = features;
        if (useTitans && memorySystem) {
          // Use Titans-enhanced processing
          processedFeatures = await memorySystem.processWithTitans(features);
        }

        const memoryResults: MemoryQueryResult[] = [];
        for (let level = 0; level < 3; level++) {
          const result = await memoryManager.query(this.AGENT_NAME, processedFeatures, level);
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
      const systemPrompt = this.buildSystemPrompt();
      const evidenceSummary = this.buildEvidenceSummary(roboflowDetections, visionAnalysis);
      const hasDetectionEvidence = roboflowDetections.length > 0 || !!visionAnalysis;
      const userPrompt = this.buildUserPrompt(context, evidenceSummary, hasDetectionEvidence);

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

      // Call GPT-4 Vision API
      const gptStart = Date.now();
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Using gpt-4o for vision
          messages,
          max_tokens: 2000,
          temperature: 0.1, // Low temperature for factual analysis
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI API error', {
          service: 'BuildingSurveyorService',
          status: response.status,
          error: errorText,
        });
        throw new Error(`AI assessment failed: ${response.status}`);
      }

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
      let assessment = this.structureAssessment(aiResponse, {
        roboflowDetections,
        visionAnalysis: visionAnalysis || undefined,
      });

      // Apply memory adjustments
      assessment = this.applyMemoryAdjustments(assessment, memoryAdjustments);

      logger.info('Building assessment completed', {
        service: 'BuildingSurveyorService',
        imageCount: imagesToAnalyze.length,
        damageType: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        urgency: assessment.urgency.urgency,
        adjustmentsApplied: memoryAdjustments.some(a => Math.abs(a) > 0.01),
      });

      this.recordMetric('assessment.success', {
        durationMs: Date.now() - startedAt,
        imageCount: imagesToAnalyze.length,
        hasMachineEvidence,
        adjustmentsApplied: memoryAdjustments.some((a) => Math.abs(a) > 0.01),
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
   * Build system prompt for GPT-4 Vision
   */
  private static buildSystemPrompt(): string {
    return `You are a professional UK building surveyor with expertise in residential and commercial property inspections. Your role is to analyze building damage photos and provide comprehensive assessments.

You must analyze photos and provide a detailed JSON assessment with the following structure:

{
  "damageType": "string (e.g., 'water_damage', 'structural_crack', 'damp', 'roof_damage', 'electrical_issue', etc.)",
  "severity": "early" | "midway" | "full",
  "confidence": number (0-100),
  "location": "string (specific location in building)",
  "description": "string (detailed description of damage)",
  "detectedItems": ["array", "of", "specific", "items", "detected"],
  "safetyHazards": [
    {
      "type": "string (e.g., 'electrical_hazard', 'structural_risk', 'fire_hazard', etc.)",
      "severity": "low" | "medium" | "high" | "critical",
      "location": "string",
      "description": "string",
      "immediateAction": "string (if critical)",
      "urgency": "immediate" | "urgent" | "soon" | "planned" | "monitor"
    }
  ],
  "complianceIssues": [
    {
      "issue": "string (e.g., 'potential_electrical_non_compliance', 'building_regulation_violation', etc.)",
      "regulation": "string (e.g., 'Part P', 'Building Regulations', etc.)",
      "severity": "info" | "warning" | "violation",
      "description": "string",
      "recommendation": "string"
    }
  ],
  "riskFactors": [
    {
      "factor": "string",
      "severity": "low" | "medium" | "high",
      "impact": "string (how this affects insurance)"
    }
  ],
  "riskScore": number (0-100),
  "premiumImpact": "none" | "low" | "medium" | "high",
  "mitigationSuggestions": ["array", "of", "suggestions"],
  "urgency": "immediate" | "urgent" | "soon" | "planned" | "monitor",
  "recommendedActionTimeline": "string (e.g., 'Within 24 hours', 'Within 1 week')",
  "estimatedTimeToWorsen": "string (if applicable)",
  "urgencyReasoning": "string (explanation of urgency level)",
  "homeownerExplanation": {
    "whatIsIt": "string (simple explanation of the problem)",
    "whyItHappened": "string (likely causes)",
    "whatToDo": "string (actionable steps)"
  },
  "contractorAdvice": {
    "repairNeeded": ["array", "of", "repair", "steps"],
    "materials": [
      {
        "name": "string",
        "quantity": "string",
        "estimatedCost": number (in GBP)
      }
    ],
    "tools": ["array", "of", "required", "tools"],
    "estimatedTime": "string (e.g., '2-4 hours', '1-2 days')",
    "estimatedCost": {
      "min": number (in GBP),
      "max": number (in GBP),
      "recommended": number (in GBP)
    },
    "complexity": "low" | "medium" | "high"
  }
}

Guidelines:
- Be thorough and accurate in your analysis
- Use UK building regulations and standards
- Prioritize safety hazards - if you see electrical hazards near water, structural risks, or fire hazards, mark them as critical
- Provide realistic cost estimates based on UK market rates
- Use clear, professional language
- If damage is minimal or cosmetic, classify as "early"
- If damage is moderate and progressing, classify as "midway"
- If damage is severe or structural, classify as "full"
- Always consider safety implications when determining urgency
- Be conservative with compliance flags - only flag if you're reasonably certain
- Provide actionable advice for both homeowners and contractors`;
  }

  /**
   * Build user prompt with context
   */
  private static buildUserPrompt(
    context?: AssessmentContext,
    evidenceSummary?: string,
    hasMachineEvidence = true,
  ): string {
    let prompt = `Analyze these building damage photos and provide a comprehensive assessment.\n\n`;

    if (context?.location) {
      prompt += `Location: ${context.location}\n`;
    }

    if (context?.propertyType) {
      prompt += `Property Type: ${context.propertyType}\n`;
    }

    if (context?.ageOfProperty) {
      prompt += `Property Age: ${context.ageOfProperty} years\n`;
    }

    if (context?.propertyDetails) {
      prompt += `Additional Context: ${context.propertyDetails}\n`;
    }

    if (!hasMachineEvidence) {
      prompt += `\nMachine detectors could not identify clear defects. Conduct a thorough manual review and only report issues you can confidently verify from the photos.`;
    }

    if (evidenceSummary) {
      prompt += `\nMachine detections summary:\n${evidenceSummary}\n`;
      prompt += `\nCross-check these detections. Verify accuracy and expand with professional insights.`;
    }

    prompt += `\nPlease analyze all photos carefully and provide a complete assessment following the JSON structure specified.`;

    return prompt;
  }

  /**
   * Map detailed Google Vision result into compact summary structure
   */
  private static toVisionSummary(
    result: ImageAnalysisResult | null,
  ): VisionAnalysisSummary | null {
    if (!result) {
      return null;
    }

    return {
      provider: 'google-vision',
      confidence: result.confidence,
      labels: result.labels,
      objects: result.objects,
      detectedFeatures: result.detectedFeatures,
      suggestedCategories: result.suggestedCategories,
      propertyType: result.propertyType,
      condition: result.condition,
      complexity: result.complexity,
    };
  }

  /**
   * Build textual summary from multimodal evidence sources
   */
  private static buildEvidenceSummary(
    roboflowDetections: RoboflowDetection[],
    visionAnalysis: VisionAnalysisSummary | null,
  ): string | undefined {
    const summaryParts: string[] = [];

    if (roboflowDetections.length > 0) {
      const topClasses = roboflowDetections
        .reduce<Record<string, { count: number; maxConfidence: number }>>((acc, detection) => {
          const key = detection.className.toLowerCase();
          const existing = acc[key] || { count: 0, maxConfidence: 0 };
          acc[key] = {
            count: existing.count + 1,
            maxConfidence: Math.max(existing.maxConfidence, detection.confidence),
          };
          return acc;
        }, {});

      const classSummary = Object.entries(topClasses)
        .map(
          ([name, stats]) =>
            `${stats.count} × ${name} (max confidence ${Math.round(stats.maxConfidence)}%)`,
        )
        .slice(0, 5);

      summaryParts.push(`Roboflow detected: ${classSummary.join('; ')}`);
    }

    if (visionAnalysis) {
      const topLabels = visionAnalysis.labels.slice(0, 5).map(
        (label) => `${label.description} (${Math.round(label.score * 100)}%)`,
      );
      const topObjects = visionAnalysis.objects.slice(0, 5).map(
        (obj) => `${obj.name} (${Math.round(obj.score * 100)}%)`,
      );
      const features = visionAnalysis.detectedFeatures.slice(0, 6).join(', ');

      summaryParts.push(`Google Vision confidence ${Math.round(visionAnalysis.confidence)}%`);
      if (topLabels.length > 0) {
        summaryParts.push(`Top labels: ${topLabels.join(', ')}`);
      }
      if (topObjects.length > 0) {
        summaryParts.push(`Objects: ${topObjects.join(', ')}`);
      }
      if (features) {
        summaryParts.push(`Features: ${features}`);
      }
    }

    if (summaryParts.length === 0) {
      return undefined;
    }

    return summaryParts.join('\n');
  }

  /**
   * Structure AI response into Phase1BuildingAssessment
   */
  private static structureAssessment(
    aiResponse: AiAssessmentPayload,
    evidence?: {
      roboflowDetections?: RoboflowDetection[];
      visionAnalysis?: VisionAnalysisSummary | null;
    },
  ): Phase1BuildingAssessment {
    // Validate and normalize severity
    const severity = this.normalizeSeverity(aiResponse.severity);
    const urgency = this.normalizeUrgency(aiResponse.urgency);

    // Calculate safety score using SafetyAnalysisService
    const safetyHazards = SafetyAnalysisService.processSafetyHazards(aiResponse.safetyHazards || []);
    const overallSafetyScore = safetyHazards.overallSafetyScore;

    // Process compliance using ComplianceService
    const compliance = ComplianceService.processCompliance(aiResponse.complianceIssues || []);

    // Process insurance risk using InsuranceRiskService
    const insuranceRisk = InsuranceRiskService.processInsuranceRisk(
      aiResponse.riskFactors || [],
      aiResponse.riskScore,
      aiResponse.premiumImpact
    );

    // Process urgency
    const urgencyData = this.processUrgency(aiResponse, urgency);

    // Ensure homeowner explanation exists
    const homeownerExplanation = {
      whatIsIt:
        aiResponse.homeownerExplanation?.whatIsIt ||
        aiResponse.description ||
        'Damage detected in building',
      whyItHappened:
        aiResponse.homeownerExplanation?.whyItHappened ||
        'Requires professional inspection to determine cause',
      whatToDo:
        aiResponse.homeownerExplanation?.whatToDo ||
        'Contact a qualified contractor for assessment and repair',
    };

    // Ensure contractor advice exists
    const normalizedMaterials = (aiResponse.contractorAdvice?.materials || []).map((material) => ({
      name: material.name || 'unspecified material',
      quantity: material.quantity || 'quantity not provided',
      estimatedCost: material.estimatedCost ?? 0,
    }));

    const contractorAdvice = {
      repairNeeded:
        aiResponse.contractorAdvice?.repairNeeded &&
        aiResponse.contractorAdvice.repairNeeded.length > 0
          ? aiResponse.contractorAdvice.repairNeeded
          : ['Professional inspection required', 'Determine root cause', 'Plan repair approach'],
      materials: normalizedMaterials,
      tools: aiResponse.contractorAdvice?.tools || [],
      estimatedTime: aiResponse.contractorAdvice?.estimatedTime || 'TBD',
      estimatedCost: {
        min: aiResponse.contractorAdvice?.estimatedCost?.min ?? 0,
        max: aiResponse.contractorAdvice?.estimatedCost?.max ?? 0,
        recommended: aiResponse.contractorAdvice?.estimatedCost?.recommended ?? 0,
      },
      complexity:
        (aiResponse.contractorAdvice?.complexity as 'low' | 'medium' | 'high' | undefined) || 'medium',
    };

    const evidencePayload =
      evidence && (evidence.roboflowDetections?.length || evidence.visionAnalysis)
        ? {
            roboflowDetections: evidence.roboflowDetections,
            visionAnalysis: evidence.visionAnalysis ?? undefined,
          }
        : undefined;

    const assessment: Phase1BuildingAssessment = {
      damageAssessment: {
        damageType: aiResponse.damageType || 'unknown_damage',
        severity,
        confidence: Math.max(0, Math.min(100, aiResponse.confidence || 50)),
        location: aiResponse.location || 'location_not_specified',
        description: aiResponse.description || 'Damage detected',
        detectedItems: Array.isArray(aiResponse.detectedItems)
          ? aiResponse.detectedItems
          : [],
      },
      safetyHazards: {
        hazards: safetyHazards.hazards,
        hasCriticalHazards: safetyHazards.hasCriticalHazards,
        overallSafetyScore: safetyHazards.overallSafetyScore,
      },
      compliance,
      insuranceRisk,
      urgency: urgencyData,
      homeownerExplanation,
      contractorAdvice,
    };

    if (evidencePayload) {
      assessment.evidence = evidencePayload;
    }

    return assessment;
  }

  /**
   * Apply memory adjustments to assessment
   * adjustments: [damage_type_adjustment, severity_adjustment, cost_adjustment, urgency_adjustment, confidence_calibration]
   */
  private static applyMemoryAdjustments(
    assessment: Phase1BuildingAssessment,
    adjustments: number[]
  ): Phase1BuildingAssessment {
    const [damageTypeAdj, severityAdj, costAdj, urgencyAdj, confidenceCal] = adjustments;

    // Apply confidence calibration
    const calibratedConfidence = this.calibrateConfidence(
      assessment.damageAssessment.confidence,
      confidenceCal
    );

    // Apply severity adjustment
    const adjustedSeverity = this.applySeverityAdjustment(
      assessment.damageAssessment.severity,
      severityAdj
    );

    // Apply urgency adjustment
    const adjustedUrgency = this.applyUrgency(
      assessment.urgency.urgency,
      urgencyAdj
    );

    // Apply cost adjustment
    const adjustedCost = this.adjustCostEstimate(
      assessment.contractorAdvice.estimatedCost,
      costAdj
    );

    // Create adjusted assessment
    return {
      ...assessment,
      damageAssessment: {
        ...assessment.damageAssessment,
        severity: adjustedSeverity,
        confidence: calibratedConfidence,
      },
      urgency: {
        ...assessment.urgency,
        urgency: adjustedUrgency,
      },
      contractorAdvice: {
        ...assessment.contractorAdvice,
        estimatedCost: adjustedCost,
      },
    };
  }

  /**
   * Apply damage type adjustment (currently not modifying type, but could be enhanced)
   */
  private static applyDamageTypeAdjustment(originalType: string, adjustment: number): string {
    // For now, return original type
    // Future: Could adjust confidence or suggest alternative types
    return originalType;
  }

  /**
   * Apply severity adjustment
   */
  private static applySeverityAdjustment(
    originalSeverity: DamageSeverity,
    adjustment: number
  ): DamageSeverity {
    // Adjustment is in range [-1, 1], where:
    // -1 = downgrade severity (full -> midway -> early)
    // +1 = upgrade severity (early -> midway -> full)
    // 0 = no change

    if (Math.abs(adjustment) < 0.1) {
      return originalSeverity; // No significant adjustment
    }

    const severityOrder: DamageSeverity[] = ['early', 'midway', 'full'];
    const currentIndex = severityOrder.indexOf(originalSeverity);

    if (adjustment > 0.3) {
      // Upgrade severity
      if (currentIndex < severityOrder.length - 1) {
        return severityOrder[currentIndex + 1];
      }
    } else if (adjustment < -0.3) {
      // Downgrade severity
      if (currentIndex > 0) {
        return severityOrder[currentIndex - 1];
      }
    }

    return originalSeverity;
  }

  /**
   * Calibrate confidence score
   */
  private static calibrateConfidence(originalConfidence: number, calibration: number): number {
    // Calibration is in range [-1, 1], where:
    // -1 = reduce confidence by up to 20%
    // +1 = increase confidence by up to 20%
    // 0 = no change

    const adjustment = calibration * 20; // Max 20% adjustment
    const calibrated = originalConfidence + adjustment;

    return Math.max(0, Math.min(100, calibrated));
  }

  /**
   * Adjust cost estimate
   */
  private static adjustCostEstimate(
    originalCost: { min: number; max: number; recommended: number },
    adjustment: number
  ): { min: number; max: number; recommended: number } {
    // Adjustment is in range [-1, 1], where:
    // -1 = reduce cost by up to 30%
    // +1 = increase cost by up to 30%
    // 0 = no change

    const multiplier = 1 + (adjustment * 0.3); // Max 30% adjustment

    return {
      min: Math.max(0, Math.round(originalCost.min * multiplier)),
      max: Math.max(0, Math.round(originalCost.max * multiplier)),
      recommended: Math.max(0, Math.round(originalCost.recommended * multiplier)),
    };
  }

  /**
   * Adjust urgency level
   */
  private static applyUrgency(originalUrgency: UrgencyLevel, adjustment: number): UrgencyLevel {
    // Adjustment is in range [-1, 1], where:
    // -1 = reduce urgency (immediate -> urgent -> soon -> planned -> monitor)
    // +1 = increase urgency (monitor -> planned -> soon -> urgent -> immediate)
    // 0 = no change

    if (Math.abs(adjustment) < 0.1) {
      return originalUrgency; // No significant adjustment
    }

    const urgencyOrder: UrgencyLevel[] = ['monitor', 'planned', 'soon', 'urgent', 'immediate'];
    const currentIndex = urgencyOrder.indexOf(originalUrgency);

    if (adjustment > 0.3) {
      // Increase urgency
      if (currentIndex < urgencyOrder.length - 1) {
        return urgencyOrder[currentIndex + 1];
      }
    } else if (adjustment < -0.3) {
      // Decrease urgency
      if (currentIndex > 0) {
        return urgencyOrder[currentIndex - 1];
      }
    }

    return originalUrgency;
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
      const originalFeatures = await this.extractDetectionFeatures(
        imageUrls,
        context,
        originalAssessment,
        originalAssessment.evidence?.roboflowDetections,
        originalAssessment.evidence?.visionAnalysis ?? null,
      );

      // Extract features for validated assessment (target features)
      const validatedFeatures = await this.extractDetectionFeatures(
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
   * Compares predicted cost/severity/urgency with actual repair outcomes
   */
  static async learnFromRepairOutcome(
    assessmentId: string,
    actualSeverity?: DamageSeverity,
    actualCost?: number,
    actualUrgency?: UrgencyLevel
  ): Promise<void> {
    await this.initializeMemorySystem();

    try {
      // Get original assessment
      const { data: assessmentRecord, error } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data')
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

      // Get images for feature extraction
      const { data: images } = await serverSupabase
        .from('assessment_images')
        .select('image_url')
        .eq('assessment_id', assessmentId)
        .order('image_index');

      const imageUrls = images?.map(img => img.image_url) || [];
      const features = await this.extractDetectionFeatures(
        imageUrls,
        {},
        originalAssessment,
        originalAssessment.evidence?.roboflowDetections,
        originalAssessment.evidence?.visionAnalysis ?? null,
      );

      // Calculate surprise signals
      const severityAccuracy = actualSeverity &&
        originalAssessment.damageAssessment.severity === actualSeverity ? 1.0 : 0.0;

      const costAccuracy = actualCost && originalAssessment.contractorAdvice?.estimatedCost?.recommended
        ? Math.max(-1, Math.min(1,
            (actualCost - originalAssessment.contractorAdvice.estimatedCost.recommended) /
            originalAssessment.contractorAdvice.estimatedCost.recommended
          ))
        : 0.0;

      const urgencyAccuracy = actualUrgency &&
        originalAssessment.urgency.urgency === actualUrgency ? 1.0 : 0.0;

      // Values: [damage_type_accuracy (0), severity_accuracy, cost_accuracy, urgency_accuracy, confidence_error (0)]
      const values = [
        0.0, // Damage type not changed in repair outcome
        severityAccuracy,
        costAccuracy,
        urgencyAccuracy,
        0.0, // Confidence error not applicable for repair outcome
      ];

      // Add context flow to all memory levels
      for (let level = 0; level < 3; level++) {
        try {
          await memoryManager.addContextFlow(
            this.AGENT_NAME,
            features,
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

      logger.info('Learning from repair outcome completed', {
        service: 'BuildingSurveyorService',
        assessmentId,
        severityAccuracy,
        costAccuracy,
        urgencyAccuracy,
      });
    } catch (error) {
      logger.error('Failed to learn from repair outcome', error, {
        service: 'BuildingSurveyorService',
        assessmentId,
      });
    }
  }

  /**
   * Learn from damage progression
   * Compares original assessment with follow-up assessment to learn progression rates
   */
  static async learnFromProgression(
    originalAssessmentId: string,
    followUpAssessmentId: string
  ): Promise<void> {
    await this.initializeMemorySystem();

    try {
      // Get both assessments
      const { data: originalRecord, error: originalError } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data, created_at')
        .eq('id', originalAssessmentId)
        .single();

      const { data: followUpRecord, error: followUpError } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data, created_at')
        .eq('id', followUpAssessmentId)
        .single();

      if (originalError || !originalRecord || followUpError || !followUpRecord) {
        logger.warn('Assessments not found for progression learning', {
          service: 'BuildingSurveyorService',
          originalAssessmentId,
          followUpAssessmentId,
        });
        return;
      }

      const originalAssessment = originalRecord.assessment_data as Phase1BuildingAssessment;
      const followUpAssessment = followUpRecord.assessment_data as Phase1BuildingAssessment;

      // Calculate time difference
      const originalDate = new Date(originalRecord.created_at);
      const followUpDate = new Date(followUpRecord.created_at);
      const daysDiff = (followUpDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24);

      // Compare severity progression
      const severityOrder: DamageSeverity[] = ['early', 'midway', 'full'];
      const originalIndex = severityOrder.indexOf(originalAssessment.damageAssessment.severity);
      const followUpIndex = severityOrder.indexOf(followUpAssessment.damageAssessment.severity);

      const severityProgression = followUpIndex > originalIndex ? 1.0 : 
                                 followUpIndex < originalIndex ? -1.0 : 0.0;

      // Get images for feature extraction
      const { data: images } = await serverSupabase
        .from('assessment_images')
        .select('image_url')
        .eq('assessment_id', originalAssessmentId)
        .order('image_index');

      const imageUrls = images?.map(img => img.image_url) || [];
      const features = await this.extractDetectionFeatures(
        imageUrls,
        {},
        originalAssessment,
        originalAssessment.evidence?.roboflowDetections,
        originalAssessment.evidence?.visionAnalysis ?? null,
      );

      // Values: [damage_type_accuracy (0), severity_progression, cost_accuracy (0), urgency_accuracy (0), progression_rate]
      const progressionRate = daysDiff > 0 ? severityProgression / daysDiff : 0.0;
      const values = [
        0.0,
        severityProgression,
        0.0,
        0.0,
        Math.max(-1, Math.min(1, progressionRate)), // Normalized progression rate
      ];

      // Add context flow to all memory levels
      for (let level = 0; level < 3; level++) {
        try {
          await memoryManager.addContextFlow(
            this.AGENT_NAME,
            features,
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

      logger.info('Learning from progression completed', {
        service: 'BuildingSurveyorService',
        originalAssessmentId,
        followUpAssessmentId,
        severityProgression,
        daysDiff,
      });
    } catch (error) {
      logger.error('Failed to learn from progression', error, {
        service: 'BuildingSurveyorService',
        originalAssessmentId,
        followUpAssessmentId,
      });
    }
  }

  /**
   * Normalize severity to valid type
   */
  private static normalizeSeverity(severity: any): DamageSeverity {
    if (severity === 'early' || severity === 'midway' || severity === 'full') {
      return severity;
    }
    // Default based on string matching
    const s = String(severity).toLowerCase();
    if (s.includes('early') || s.includes('minor') || s.includes('initial')) {
      return 'early';
    }
    if (s.includes('full') || s.includes('severe') || s.includes('complete')) {
      return 'full';
    }
    return 'midway'; // Default
  }

  /**
   * Normalize urgency to valid type
   */
  private static normalizeUrgency(urgency: any): UrgencyLevel {
    const validUrgencies: UrgencyLevel[] = [
      'immediate',
      'urgent',
      'soon',
      'planned',
      'monitor',
    ];
    if (validUrgencies.includes(urgency)) {
      return urgency;
    }
    // Default based on string matching
    const u = String(urgency).toLowerCase();
    if (u.includes('immediate') || u.includes('emergency')) {
      return 'immediate';
    }
    if (u.includes('urgent')) {
      return 'urgent';
    }
    if (u.includes('soon') || u.includes('quick')) {
      return 'soon';
    }
    if (u.includes('planned') || u.includes('schedule')) {
      return 'planned';
    }
    return 'monitor'; // Default
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

  /**
   * Process urgency data
   */
  private static processUrgency(aiResponse: any, urgency: UrgencyLevel): any {
    const priorityScore = this.calculatePriorityScore(urgency, aiResponse);

    return {
      urgency,
      recommendedActionTimeline:
        aiResponse.recommendedActionTimeline || this.getDefaultTimeline(urgency),
      estimatedTimeToWorsen: aiResponse.estimatedTimeToWorsen,
      reasoning: aiResponse.urgencyReasoning || this.getDefaultReasoning(urgency),
      priorityScore,
    };
  }

  /**
   * Calculate priority score (0-100)
   */
  private static calculatePriorityScore(urgency: UrgencyLevel, aiResponse: any): number {
    const baseScores: Record<UrgencyLevel, number> = {
      immediate: 95,
      urgent: 80,
      soon: 60,
      planned: 40,
      monitor: 20,
    };

    let score = baseScores[urgency] || 50;

    // Adjust based on safety hazards
    if (aiResponse.safetyHazards?.some((h: any) => h.severity === 'critical')) {
      score = Math.min(100, score + 10);
    }

    // Adjust based on damage severity
    if (aiResponse.severity === 'full') {
      score = Math.min(100, score + 10);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get default timeline for urgency
   */
  private static getDefaultTimeline(urgency: UrgencyLevel): string {
    const timelines: Record<UrgencyLevel, string> = {
      immediate: 'Within 24 hours',
      urgent: 'Within 1 week',
      soon: 'Within 2-4 weeks',
      planned: 'Within 1-3 months',
      monitor: 'Regular monitoring recommended',
    };
    return timelines[urgency];
  }

  /**
   * Get default reasoning for urgency
   */
  private static getDefaultReasoning(urgency: UrgencyLevel): string {
    const reasonings: Record<UrgencyLevel, string> = {
      immediate: 'Critical safety hazard requires immediate attention',
      urgent: 'Damage is progressing and requires prompt repair',
      soon: 'Damage should be addressed to prevent further deterioration',
      planned: 'Damage can be scheduled for repair',
      monitor: 'Minor damage that should be monitored',
    };
    return reasonings[urgency];
  }
}

