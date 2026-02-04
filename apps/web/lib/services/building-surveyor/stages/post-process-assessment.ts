import { logger } from '@mintenance/shared';
import crypto from 'crypto';
import { structureAssessment } from '../assessment-structurer';
import { applyMemoryAdjustments } from '../memory-adjustments';
import { formatSAM3EvidenceForFusion } from '../evidence-formatter';
import { BayesianFusionService } from '../BayesianFusionService';
import { mondrianConformalPrediction } from '../conformal-prediction';
import { computeOODScore, computeDetectorDisagreement } from '../detector-metrics';
import { normalizeDamageCategory, getSafetyThreshold } from '../normalization-utils';
import { ContextFeatureService } from '../ContextFeatureService';
import { CriticModule } from '../critic';
import { logDecisionForShadowMode } from '../shadow-mode-logger';
import type { AiAssessmentPayload } from '../validation-schemas';
import type {
  Phase1BuildingAssessment,
  AssessmentContext,
  RoboflowDetection,
  VisionAnalysisSummary,
} from '../types';
import type { DamageTypeSegmentation } from '../SAM3Service';

interface PostProcessInput {
  aiResponse: AiAssessmentPayload;
  roboflowDetections: RoboflowDetection[];
  visionAnalysis: VisionAnalysisSummary | null;
  sam3Segmentation: DamageTypeSegmentation | undefined;
  sceneGraphFeatures: unknown;
  memoryAdjustments: number[];
  imageQuality: { lightingQuality: number; imageClarity: number };
  context?: AssessmentContext;
}

/**
 * Post-processes the GPT assessment: structures it, applies memory adjustments,
 * runs Bayesian fusion, conformal prediction, and the Safe-LUCB critic.
 */
export async function postProcessAssessment(
  input: PostProcessInput,
): Promise<Phase1BuildingAssessment> {
  const {
    aiResponse,
    roboflowDetections,
    visionAnalysis,
    sam3Segmentation,
    sceneGraphFeatures,
    memoryAdjustments,
    imageQuality,
    context,
  } = input;

  // Structure into Phase1BuildingAssessment (now includes material database enrichment)
  let assessment = await structureAssessment(aiResponse, {
    roboflowDetections,
    visionAnalysis: visionAnalysis || undefined,
    sam3Segmentation: sam3Segmentation ? sam3Segmentation : undefined,
    sceneGraphFeatures: sceneGraphFeatures ? sceneGraphFeatures : undefined,
  });

  // Apply memory adjustments
  assessment = applyMemoryAdjustments(assessment, memoryAdjustments);

  // Bayesian Fusion
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

  // Mondrian Conformal Prediction
  const propertyType = context?.propertyType || 'residential';
  const propertyAge = context?.ageOfProperty || 50;
  const region = context?.location || 'unknown';
  const damageCategory = normalizeDamageCategory(assessment.damageAssessment.damageType);

  const cpResult = await mondrianConformalPrediction(
    bayesianFusionResult.mean,
    bayesianFusionResult.variance,
    { propertyType, propertyAge, region, damageCategory },
  );

  // Detector metrics
  const detectorDisagreement = computeDetectorDisagreement(
    roboflowDetections,
    visionAnalysis,
    assessment.damageAssessment.confidence,
  );
  const oodScore = computeOODScore(roboflowDetections, bayesianFusionResult);

  // Context vector for Safe-LUCB Critic
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

  // Safety threshold and critic decision
  const deltaSafety = getSafetyThreshold(propertyType);

  const criticDecision = await CriticModule.selectArm({
    context: contextVector,
    delta_safety: deltaSafety,
    stratum: cpResult.stratum,
    criticalHazardDetected: assessment.safetyHazards.hasCriticalHazards,
  });

  // Shadow mode logic
  const shadowModeEnabled = process.env.SHADOW_MODE_ENABLED === 'true';
  const shadowModeTestingEnabled = process.env.SHADOW_MODE_TESTING === 'true';
  const shadowModeProbability = parseFloat(process.env.SHADOW_MODE_PROBABILITY || '0.1');

  let finalDecision = criticDecision.arm;
  let decisionReason = criticDecision.reason;

  if (shadowModeEnabled) {
    await logDecisionForShadowMode({
      assessmentId: crypto.randomUUID(),
      decision: criticDecision.arm,
      contextVector,
      cpResult,
      bayesianFusionResult,
    });

    if (shadowModeTestingEnabled) {
      const useActualDecision = Math.random() > shadowModeProbability;
      if (useActualDecision) {
        logger.info('Shadow mode testing: Using actual AI decision', {
          decision: finalDecision,
          probability: 1 - shadowModeProbability,
        });
      } else {
        finalDecision = 'escalate';
        decisionReason = 'Shadow mode testing: Forced escalation for comparison';
        logger.info('Shadow mode testing: Forcing escalation for comparison', {
          originalDecision: criticDecision.arm,
          probability: shadowModeProbability,
        });
      }
    } else {
      finalDecision = 'escalate';
      decisionReason = 'Shadow mode: Forced escalation for safety';
    }
  }

  // Attach decision result
  assessment.decisionResult = {
    decision: finalDecision,
    reason: decisionReason,
    safetyUcb: criticDecision.safetyUcb,
    rewardUcb: criticDecision.rewardUcb,
    safetyThreshold: criticDecision.safetyThreshold,
    exploration: criticDecision.exploration,
    cpStratum: cpResult.stratum,
    cpPredictionSet: cpResult.predictionSet,
    fusionMean: bayesianFusionResult.mean,
    fusionVariance: bayesianFusionResult.variance,
  };

  return assessment;
}
