/**
 * Pure data-transformation helpers for assembling the final
 * Phase1BuildingAssessment from the raw AI response + auxiliary signals.
 *
 * Extracted from AssessmentOrchestrator to keep that file under the 700-line
 * cap. No class state, no I/O beyond the material-enrichment dynamic import.
 */
import { logger } from '@mintenance/shared';
import { SafetyAnalysisService } from '../SafetyAnalysisService';
import { ComplianceService } from '../ComplianceService';
import { InsuranceRiskService } from '../InsuranceRiskService';
import type {
  AssessmentContext,
  Phase1BuildingAssessment,
  RoboflowDetection,
  VisionAnalysisSummary,
  SAM3SegmentationData,
  DamageSeverity,
  UrgencyLevel,
  HomeownerExplanation,
  ContractorAdvice,
} from '../types';

/**
 * Priority score: weighted combination of urgency (40%), severity (30%),
 * and inverted safety (30%).
 */
function calculatePriorityScore(
  urgency: string,
  severity: string,
  safetyScore: number
): number {
  const urgencyScores: Record<string, number> = {
    immediate: 100,
    urgent: 80,
    soon: 60,
    planned: 40,
    monitor: 20,
  };
  const severityScores: Record<string, number> = {
    full: 100,
    midway: 60,
    early: 30,
  };

  const urgencyScore = urgencyScores[urgency] || 50;
  const severityScore = severityScores[severity] || 50;

  return Math.round(
    urgencyScore * 0.4 + severityScore * 0.3 + (100 - safetyScore) * 0.3
  );
}

interface AIAssessment {
  damageType?: string;
  severity?: string;
  confidence?: number;
  location?: string;
  description?: string;
  detectedItems?: string[];
  safetyHazards?: unknown[];
  complianceIssues?: unknown[];
  riskFactors?: unknown[];
  riskScore?: number;
  premiumImpact?: string;
  urgency?: string;
  recommendedActionTimeline?: string;
  estimatedTimeToWorsen?: string;
  urgencyReasoning?: string;
  homeownerExplanation?: unknown;
  contractorAdvice?: unknown;
  ricsConditionRating?: 1 | 2 | 3;
  specialistReferrals?: import('../types').SpecialistReferral[];
  taxonomyClassId?: string;
  probableCause?: string;
  needsOnsiteInspection?: boolean;
  onsiteInspectionReason?: string;
}

/**
 * Assemble the final Phase1BuildingAssessment from the AI response and
 * auxiliary analysis layers. Enriches material costs via the database when
 * contractorAdvice is well-formed.
 */
export async function buildFinalAssessment(
  aiAssessment: AIAssessment,
  context?: AssessmentContext,
  roboflowDetections?: RoboflowDetection[],
  visionAnalysis?: VisionAnalysisSummary | null,
  sam3Segmentation?: SAM3SegmentationData
): Promise<Phase1BuildingAssessment> {
  const safetyAnalysis = SafetyAnalysisService.processSafetyHazards(
    (aiAssessment.safetyHazards || []) as Array<{
      type?: string;
      severity?: string;
      location?: string;
      description?: string;
      immediateAction?: string;
      urgency?: string;
    }>
  );

  const complianceAnalysis = ComplianceService.processCompliance(
    (aiAssessment.complianceIssues || []) as Array<{
      issue?: string;
      regulation?: string;
      severity?: string;
      description?: string;
      recommendation?: string;
    }>
  );

  const insuranceRisk = InsuranceRiskService.processInsuranceRisk(
    (aiAssessment.riskFactors || []) as Array<{
      factor?: string;
      severity?: string;
      impact?: string;
    }>,
    aiAssessment.riskScore,
    aiAssessment.premiumImpact
  );

  // Type-safe helpers
  const isValidSeverity = (s: string | undefined): s is DamageSeverity =>
    s === 'early' ||
    s === 'developing' ||
    s === 'significant' ||
    s === 'dangerous';
  const isValidUrgency = (u: string | undefined): u is UrgencyLevel =>
    u === 'immediate' ||
    u === 'urgent' ||
    u === 'soon' ||
    u === 'planned' ||
    u === 'monitor';
  const isValidHomeownerExplanation = (
    obj: unknown
  ): obj is HomeownerExplanation =>
    typeof obj === 'object' &&
    obj !== null &&
    'whatIsIt' in obj &&
    'whyItHappened' in obj &&
    'whatToDo' in obj;
  const isValidContractorAdvice = (obj: unknown): obj is ContractorAdvice =>
    typeof obj === 'object' &&
    obj !== null &&
    'repairNeeded' in obj &&
    'materials' in obj &&
    'tools' in obj &&
    'estimatedTime' in obj &&
    'estimatedCost' in obj &&
    'complexity' in obj;

  const defaultHomeownerExplanation: HomeownerExplanation = {
    whatIsIt: 'Building damage detected',
    whyItHappened: 'Cause unknown',
    whatToDo: 'Consult a professional',
  };
  const defaultContractorAdvice: ContractorAdvice = {
    repairNeeded: [],
    materials: [],
    tools: [],
    estimatedTime: 'Unknown',
    estimatedCost: { min: 0, max: 0, recommended: 0 },
    complexity: 'medium',
  };

  // Enrich materials with database pricing before returning assessment
  let finalContractorAdvice: ContractorAdvice;
  if (isValidContractorAdvice(aiAssessment.contractorAdvice)) {
    const contractorAdvice = aiAssessment.contractorAdvice;

    const normalizedMaterials: import('../types').Material[] = (
      contractorAdvice.materials || []
    ).map((material) => ({
      name: material.name || 'unspecified material',
      quantity: material.quantity || 'quantity not provided',
      estimatedCost: material.estimatedCost ?? 0,
      source: 'ai' as const,
    }));

    logger.info('BEFORE material enrichment in AssessmentOrchestrator', {
      service: 'AssessmentOrchestrator',
      materialsLength: normalizedMaterials.length,
      materialsSample:
        normalizedMaterials.length > 0 ? normalizedMaterials[0] : null,
    });

    let enrichedMaterials: import('../types').Material[] = normalizedMaterials;
    try {
      if (normalizedMaterials.length > 0) {
        const { enrichMaterialsWithDatabase } =
          await import('../material-enrichment');
        enrichedMaterials =
          await enrichMaterialsWithDatabase(normalizedMaterials);
      }
      logger.info('AFTER material enrichment in AssessmentOrchestrator', {
        service: 'AssessmentOrchestrator',
        enrichedLength: enrichedMaterials.length,
        hasDbMaterials: enrichedMaterials.some((m) => m.source === 'database'),
      });
    } catch (err) {
      logger.error(
        'Material database enrichment failed in AssessmentOrchestrator',
        err,
        {
          service: 'AssessmentOrchestrator',
          materialCount: normalizedMaterials.length,
          errorName: err instanceof Error ? err.name : 'unknown',
          errorMessage: err instanceof Error ? err.message : String(err),
        }
      );
    }

    finalContractorAdvice = {
      ...contractorAdvice,
      materials: enrichedMaterials,
    };
  } else {
    finalContractorAdvice = defaultContractorAdvice;
  }

  // Surveyor-report fields. ricsConditionRating/specialistReferrals were
  // previously dropped on this path (only assessment-structurer.ts passed
  // them through) — the prompt has asked for them since they were added.
  const surveyorFields: Partial<Phase1BuildingAssessment> = {
    ...(aiAssessment.ricsConditionRating && {
      ricsConditionRating: aiAssessment.ricsConditionRating,
    }),
    ...(aiAssessment.specialistReferrals?.length && {
      specialistReferrals: aiAssessment.specialistReferrals,
    }),
    ...(aiAssessment.taxonomyClassId && {
      taxonomyClassId: aiAssessment.taxonomyClassId,
    }),
    ...(aiAssessment.probableCause && {
      probableCause: aiAssessment.probableCause,
    }),
    ...(aiAssessment.needsOnsiteInspection && {
      needsOnsiteInspection: true,
      ...(aiAssessment.onsiteInspectionReason && {
        onsiteInspectionReason: aiAssessment.onsiteInspectionReason,
      }),
    }),
  };

  return {
    ...surveyorFields,
    damageAssessment: {
      damageType: aiAssessment.damageType || 'unknown_damage',
      severity: isValidSeverity(aiAssessment.severity)
        ? aiAssessment.severity
        : 'early',
      confidence: aiAssessment.confidence || 50,
      location: aiAssessment.location || 'Unknown',
      description: aiAssessment.description || 'No description available',
      detectedItems: aiAssessment.detectedItems || [],
    },
    safetyHazards: safetyAnalysis,
    compliance: complianceAnalysis,
    insuranceRisk,
    urgency: {
      urgency: isValidUrgency(aiAssessment.urgency)
        ? aiAssessment.urgency
        : 'monitor',
      recommendedActionTimeline:
        aiAssessment.recommendedActionTimeline || 'Monitor for changes',
      estimatedTimeToWorsen: aiAssessment.estimatedTimeToWorsen,
      reasoning: aiAssessment.urgencyReasoning || 'Standard assessment',
      priorityScore: calculatePriorityScore(
        isValidUrgency(aiAssessment.urgency) ? aiAssessment.urgency : 'monitor',
        isValidSeverity(aiAssessment.severity)
          ? aiAssessment.severity
          : 'early',
        safetyAnalysis.overallSafetyScore
      ),
    },
    homeownerExplanation: isValidHomeownerExplanation(
      aiAssessment.homeownerExplanation
    )
      ? aiAssessment.homeownerExplanation
      : defaultHomeownerExplanation,
    contractorAdvice: finalContractorAdvice,
    evidence: {
      roboflowDetections,
      visionAnalysis,
      ...(sam3Segmentation && { sam3Segmentation }),
    },
  };
}
