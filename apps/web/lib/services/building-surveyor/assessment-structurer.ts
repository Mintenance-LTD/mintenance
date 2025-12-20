/**
 * Assessment Structurer for Building Surveyor Service
 * Structures AI responses into Phase1BuildingAssessment format
 */

import type { Phase1BuildingAssessment, VisionAnalysisSummary } from './types';
import type { AiAssessmentPayload } from './validation-schemas';
import { SafetyAnalysisService } from './SafetyAnalysisService';
import { ComplianceService } from './ComplianceService';
import { InsuranceRiskService } from './InsuranceRiskService';
import { normalizeSeverity, normalizeUrgency } from './normalization-utils';
import { processUrgency } from './urgency-processor';

/**
 * Structure AI response into Phase1BuildingAssessment
 */
export function structureAssessment(
  aiResponse: AiAssessmentPayload,
  evidence?: {
    roboflowDetections?: import('./types').RoboflowDetection[];
    visionAnalysis?: VisionAnalysisSummary | null;
    sam3Segmentation?: import('./SAM3Service').DamageTypeSegmentation | import('./types').SAM3SegmentationData | null | undefined;
    sceneGraphFeatures?: import('./scene_graph_features').SceneGraphFeatures | null | undefined;
  },
): Phase1BuildingAssessment {
  // Validate and normalize severity
  const severity = normalizeSeverity(aiResponse.severity);
  const urgency = normalizeUrgency(aiResponse.urgency);

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
  const urgencyData = processUrgency(aiResponse, urgency);

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
    evidence && (evidence.roboflowDetections?.length || evidence.visionAnalysis || evidence.sam3Segmentation || evidence.sceneGraphFeatures)
      ? {
          roboflowDetections: evidence.roboflowDetections,
          visionAnalysis: evidence.visionAnalysis ?? undefined,
          sam3Segmentation: evidence.sam3Segmentation,
          sceneGraphFeatures: evidence.sceneGraphFeatures,
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

