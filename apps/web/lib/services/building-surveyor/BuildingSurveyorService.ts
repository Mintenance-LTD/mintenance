import { logger } from '@mintenance/shared';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { initializeMemorySystem, isLearnedFeaturesEnabled, getLearnedFeatureExtractor } from './initialization/BuildingSurveyorInitializationService';
import { learnFromRepairOutcome, learnFromProgression, learnFromValidation } from './learning-handler';
import { validateInput } from './stages/validate-input';
import { collectEvidence } from './stages/collect-evidence';
import { extractAllFeatures } from './stages/extract-features';
import { callGptAssessment } from './stages/call-gpt-assessment';
import { postProcessAssessment } from './stages/post-process-assessment';
import type {
  Phase1BuildingAssessment,
  AssessmentContext,
  DamageSeverity,
  UrgencyLevel,
  RoboflowDetection,
  VisionAnalysisSummary,
} from './types';
import type { DamageTypeSegmentation } from './SAM3Service';

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
 *
 * Implementation is split into focused stage modules under ./stages/
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

  private static readonly AGENT_NAME = 'building-surveyor';

  private static recordMetric(metric: string, payload: Record<string, unknown>): void {
    MonitoringService.record(metric, {
      agentName: this.AGENT_NAME,
      ...payload,
    });
  }

  /** Optional pre-run evidence from Mint AI agent tools (skips detector calls when set). */
  static async assessDamage(
    imageUrls: string[],
    context?: AssessmentContext,
    options?: {
      preRunEvidence?: {
        roboflowDetections: RoboflowDetection[];
        visionAnalysis: VisionAnalysisSummary | null;
        sam3Segmentation?: DamageTypeSegmentation;
      };
      /** Phase 6: damage types from taxonomy for prompt (new types appear without code change) */
      damageTypesForPrompt?: string[];
    }
  ): Promise<Phase1BuildingAssessment> {
    const startedAt = Date.now();
    try {
      // 1. Initialize memory system
      await initializeMemorySystem();

      // 2. Validate input and URLs
      const { openaiApiKey, validatedImageUrls } = await validateInput(imageUrls);

      // 3. Collect evidence from detectors
      const evidence = await collectEvidence(
        validatedImageUrls,
        this.DETECTOR_TIMEOUT_MS,
        this.VISION_TIMEOUT_MS,
        options?.preRunEvidence,
      );

      // 4. Extract features (scene graph, memory, image quality)
      const featureResult = await extractAllFeatures(
        validatedImageUrls,
        evidence.roboflowDetections,
        evidence.visionAnalysis,
        evidence.sam3Segmentation,
        context,
      );

      // 5. Call GPT-4o for assessment
      const aiResponse = await callGptAssessment(
        validatedImageUrls,
        openaiApiKey,
        evidence.roboflowDetections,
        evidence.visionAnalysis,
        evidence.hasMachineEvidence,
        context,
        options?.damageTypesForPrompt,
      );

      // 6. Post-process: structure, fusion, critic decision
      const assessment = await postProcessAssessment({
        aiResponse,
        roboflowDetections: evidence.roboflowDetections,
        visionAnalysis: evidence.visionAnalysis,
        sam3Segmentation: evidence.sam3Segmentation,
        sceneGraphFeatures: featureResult.sceneGraphFeatures,
        memoryAdjustments: featureResult.memoryAdjustments,
        imageQuality: featureResult.imageQuality,
        context,
      });

      logger.info('Building assessment completed', {
        service: 'BuildingSurveyorService',
        imageCount: validatedImageUrls.slice(0, 4).length,
        damageType: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        urgency: assessment.urgency.urgency,
        adjustmentsApplied: featureResult.memoryAdjustments.some(a => Math.abs(a) > 0.01),
        decision: assessment.decisionResult?.decision,
        shadowMode: process.env.SHADOW_MODE_ENABLED === 'true',
      });

      this.recordMetric('assessment.success', {
        durationMs: Date.now() - startedAt,
        imageCount: validatedImageUrls.slice(0, 4).length,
        hasMachineEvidence: evidence.hasMachineEvidence,
        adjustmentsApplied: featureResult.memoryAdjustments.some((a) => Math.abs(a) > 0.01),
        decision: assessment.decisionResult?.decision,
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
}
