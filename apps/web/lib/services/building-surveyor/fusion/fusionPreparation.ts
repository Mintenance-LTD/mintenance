/**
 * Fusion Preparation & Assessment Generation
 *
 * Transforms raw model outputs into fusion inputs and generates
 * final assessments from fused evidence.
 */

import type {
  AssessmentContext,
  Phase1BuildingAssessment,
  DamageSeverity,
  UrgencyLevel
} from '../types';
import type { EnhancedFusionInput, EnhancedFusionOutput } from '../EnhancedBayesianFusionService';
import type { YOLOOutput, SAM3Output, GPT4Output } from './modelRunners';

/**
 * Prepare fusion input from model outputs
 */
export function prepareFusionInput(
  yoloOutput: YOLOOutput | null,
  sam3Output: SAM3Output | null,
  gpt4Output: GPT4Output | null
): EnhancedFusionInput {
  const fusionInput: EnhancedFusionInput = {};

  if (yoloOutput) {
    fusionInput.yoloEvidence = {
      detections: yoloOutput.detections,
      avgConfidence: yoloOutput.confidence,
      totalDetections: yoloOutput.totalDetections,
      damageTypes: yoloOutput.damageTypes
    };
  }

  if (sam3Output) {
    const damageTypes: Record<string, {
      confidence: number;
      numInstances: number;
      presenceScore: number;
      masks?: unknown;
      boxes?: unknown;
    }> = {};

    if (sam3Output.presenceResults) {
      for (const [damageType, result] of Object.entries(sam3Output.presenceResults)) {
        const typedResult = result as { damage_present?: boolean; presence_score?: number };
        if (typedResult.damage_present) {
          damageTypes[damageType] = {
            confidence: (typedResult.presence_score ?? 0) * 100,
            numInstances: 1,
            presenceScore: typedResult.presence_score ?? 0
          };
        }
      }
    }

    if (sam3Output.masks) {
      for (const [damageType, maskData] of Object.entries(sam3Output.masks as Record<string, Record<string, unknown>>)) {
        if (damageTypes[damageType]) {
          damageTypes[damageType].masks = maskData.masks;
          damageTypes[damageType].boxes = maskData.boxes;
          damageTypes[damageType].numInstances = (maskData.num_instances as number) || 1;
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
 * Generate final assessment based on fusion output.
 * Uses GPT-4 assessment as base when available, otherwise falls back to fusion-only.
 */
export function generateFinalAssessment(
  fusionOutput: EnhancedFusionOutput,
  yoloOutput: YOLOOutput | null,
  sam3Output: SAM3Output | null,
  gpt4Output: GPT4Output | null,
  imageUrls: string[],
  context?: AssessmentContext
): Phase1BuildingAssessment {
  if (gpt4Output && gpt4Output.assessment) {
    return enhanceGPT4Assessment(fusionOutput, gpt4Output, sam3Output);
  }

  return generateAssessmentFromFusion(fusionOutput, yoloOutput, sam3Output, imageUrls, context);
}

function enhanceGPT4Assessment(
  fusionOutput: EnhancedFusionOutput,
  gpt4Output: GPT4Output,
  sam3Output: SAM3Output | null
): Phase1BuildingAssessment {
  const assessment = { ...gpt4Output.assessment };

  assessment.damageAssessment.confidence = fusionOutput.mean * 100;

  if (sam3Output && sam3Output.damageDetected) {
    if (!assessment.evidence) {
      assessment.evidence = {} as Phase1BuildingAssessment['evidence'];
    }
    assessment.evidence.sam3Segmentation = {
      presenceDetection: {
        damageDetected: sam3Output.damageTypes,
        averagePresenceScore: sam3Output.averagePresenceScore
      }
    } as unknown as Phase1BuildingAssessment['evidence']['sam3Segmentation'];
  }

  if (fusionOutput.refinedBoundingBoxes && assessment.evidence) {
    assessment.evidence.refinedBoxes = fusionOutput.refinedBoundingBoxes;
  }

  if (fusionOutput.uncertaintyLevel === 'high') {
    assessment.urgency.reasoning += ' (High uncertainty - professional inspection recommended)';
  }

  return assessment;
}

function generateAssessmentFromFusion(
  fusionOutput: EnhancedFusionOutput,
  yoloOutput: YOLOOutput | null,
  sam3Output: SAM3Output | null,
  _imageUrls: string[],
  context?: AssessmentContext
): Phase1BuildingAssessment {
  let primaryDamageType = 'Unknown damage';
  let severity: DamageSeverity = 'early';

  if (sam3Output && sam3Output.damageTypes.length > 0) {
    primaryDamageType = sam3Output.damageTypes[0];
  } else if (yoloOutput && yoloOutput.damageTypes) {
    primaryDamageType = Object.keys(yoloOutput.damageTypes)[0] || 'Unknown damage';
  }

  if (fusionOutput.mean > 0.8) {
    severity = 'full';
  } else if (fusionOutput.mean > 0.5) {
    severity = 'midway';
  }

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
      recommendedActionTimeline: getTimelineForUrgency(urgency),
      reasoning: `Based on fusion analysis (uncertainty: ${fusionOutput.uncertaintyLevel})`,
      priorityScore: fusionOutput.mean * 100
    },
    homeownerExplanation: {
      whatIsIt: primaryDamageType,
      whyItHappened: 'Assessment based on multi-model analysis',
      whatToDo: getRecommendationForSeverity(severity)
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
      } as unknown as Phase1BuildingAssessment['evidence']['sam3Segmentation'] : undefined,
      refinedBoxes: fusionOutput.refinedBoundingBoxes
    }
  };
}

export function getTimelineForUrgency(urgency: UrgencyLevel): string {
  const timelines: Record<UrgencyLevel, string> = {
    immediate: 'Within 24 hours',
    urgent: 'Within 1 week',
    soon: 'Within 1 month',
    planned: 'Within 3 months',
    monitor: 'Monitor for changes'
  };
  return timelines[urgency];
}

export function getRecommendationForSeverity(severity: DamageSeverity): string {
  const recommendations: Record<DamageSeverity, string> = {
    early: 'Monitor and plan for preventive maintenance',
    midway: 'Schedule professional assessment and repairs',
    full: 'Immediate professional intervention required'
  };
  return recommendations[severity];
}
