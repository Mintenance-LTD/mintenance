/**
 * DataCollectionAutoValidateService
 *
 * Auto-validation decision logic extracted from DataCollectionService.
 * Contains shadow-phase logic, canAutoValidate checks, and statistics.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';

const AUTO_VALIDATION_CONFIG = {
  MIN_CONFIDENCE: 90,
  MAX_INSURANCE_RISK: 50,
  MIN_SAFETY_SCORE: 70,
  EDGE_CASE_DAMAGE_TYPES: [
    'unknown_damage',
    'structural_failure',
    'foundation_issue',
    'asbestos',
    'mold_toxicity',
    'lead_paint',
  ],
  ENABLED: process.env.BUILDING_SURVEYOR_AUTO_VALIDATION_ENABLED === 'true',
  MIN_VALIDATED_COUNT: 100,
  SHADOW_PHASE_ENABLED: process.env.BUILDING_SURVEYOR_SHADOW_PHASE_ENABLED === 'true',
  MIN_SHADOW_PHASE_COUNT: 500,
};

function recordMetric(metric: string, payload: Record<string, unknown>): void {
  MonitoringService.record(metric, {
    service: 'DataCollectionService',
    ...payload,
  });
}

export function isShadowPhaseEnabled(): boolean {
  return AUTO_VALIDATION_CONFIG.SHADOW_PHASE_ENABLED;
}

/**
 * Get AI decision in shadow phase (for logging and learning).
 * Returns what the AI would decide, but always escalates in practice.
 */
export async function getShadowPhaseDecision(
  assessment: Phase1BuildingAssessment,
  assessmentId: string
): Promise<{ aiDecision: 'automate' | 'escalate'; reason?: string; confidence?: number }> {
  try {
    const { canAutoValidate: can, reason } = await canAutoValidate(assessment, assessmentId);
    return {
      aiDecision: can ? 'automate' : 'escalate',
      reason,
      confidence: assessment.damageAssessment.confidence,
    };
  } catch (error) {
    logger.error('Error getting shadow phase decision', error, {
      service: 'DataCollectionService',
      assessmentId,
    });
    return { aiDecision: 'escalate', reason: 'Error in shadow phase decision' };
  }
}

/**
 * Check if assessment meets criteria for auto-validation.
 */
export async function canAutoValidate(
  assessment: Phase1BuildingAssessment,
  assessmentId: string
): Promise<{ canAutoValidate: boolean; reason?: string }> {
  try {
    if (AUTO_VALIDATION_CONFIG.SHADOW_PHASE_ENABLED) {
      const shadowDecision = await getShadowPhaseDecision(assessment, assessmentId);
      recordMetric('shadow_phase.decision', {
        assessmentId,
        aiDecision: shadowDecision.aiDecision,
        reason: shadowDecision.reason,
        confidence: shadowDecision.confidence,
      });
      return {
        canAutoValidate: false,
        reason: `Shadow phase: AI would ${shadowDecision.aiDecision}, but escalating for learning`,
      };
    }

    if (!AUTO_VALIDATION_CONFIG.ENABLED) {
      return { canAutoValidate: false, reason: 'Auto-validation disabled' };
    }

    const stats = await getStatistics();
    if (stats.validated < AUTO_VALIDATION_CONFIG.MIN_VALIDATED_COUNT) {
      return {
        canAutoValidate: false,
        reason: `Insufficient validated data (${stats.validated}/${AUTO_VALIDATION_CONFIG.MIN_VALIDATED_COUNT} required)`,
      };
    }

    if (assessment.damageAssessment.confidence < AUTO_VALIDATION_CONFIG.MIN_CONFIDENCE) {
      return {
        canAutoValidate: false,
        reason: `Low confidence (${assessment.damageAssessment.confidence}% < ${AUTO_VALIDATION_CONFIG.MIN_CONFIDENCE}%)`,
      };
    }

    if (assessment.safetyHazards.hasCriticalHazards) {
      return {
        canAutoValidate: false,
        reason: 'Critical safety hazards detected - requires human review',
      };
    }

    if (assessment.safetyHazards.overallSafetyScore < AUTO_VALIDATION_CONFIG.MIN_SAFETY_SCORE) {
      return {
        canAutoValidate: false,
        reason: `Low safety score (${assessment.safetyHazards.overallSafetyScore} < ${AUTO_VALIDATION_CONFIG.MIN_SAFETY_SCORE})`,
      };
    }

    if (assessment.insuranceRisk.riskScore > AUTO_VALIDATION_CONFIG.MAX_INSURANCE_RISK) {
      return {
        canAutoValidate: false,
        reason: `High insurance risk (${assessment.insuranceRisk.riskScore} > ${AUTO_VALIDATION_CONFIG.MAX_INSURANCE_RISK})`,
      };
    }

    const damageType = assessment.damageAssessment.damageType.toLowerCase();
    if (AUTO_VALIDATION_CONFIG.EDGE_CASE_DAMAGE_TYPES.some(
      (edgeCase) => damageType.includes(edgeCase.toLowerCase())
    )) {
      return {
        canAutoValidate: false,
        reason: `Edge case damage type (${assessment.damageAssessment.damageType}) - requires human review`,
      };
    }

    if (assessment.urgency.urgency === 'immediate' || assessment.urgency.urgency === 'urgent') {
      return {
        canAutoValidate: false,
        reason: `High urgency (${assessment.urgency.urgency}) - requires human review`,
      };
    }

    const hasViolations = assessment.compliance.complianceIssues.some(
      (issue) => issue.severity === 'violation'
    );
    if (hasViolations) {
      return {
        canAutoValidate: false,
        reason: 'Compliance violations detected - requires human review',
      };
    }

    return { canAutoValidate: true };
  } catch (error) {
    logger.error('Error checking auto-validation criteria', error, {
      service: 'DataCollectionService',
      assessmentId,
    });
    return { canAutoValidate: false, reason: 'Error checking criteria' };
  }
}

/**
 * Auto-validate assessment if it meets high-confidence criteria.
 */
export async function autoValidateIfHighConfidence(
  assessment: Phase1BuildingAssessment,
  assessmentId: string
): Promise<{ autoValidated: boolean; reason?: string }> {
  try {
    const { canAutoValidate: can, reason } = await canAutoValidate(assessment, assessmentId);

    if (!can) {
      if (reason) {
        recordMetric('auto_validation.skipped', {
          assessmentId,
          reason,
          confidence: assessment.damageAssessment.confidence,
          safetyScore: assessment.safetyHazards.overallSafetyScore,
          insuranceRisk: assessment.insuranceRisk.riskScore,
        });
      }
      return { autoValidated: false, reason };
    }

    const confidence = Math.round(assessment.damageAssessment.confidence);
    const reasonMessage = `Auto-validated: high confidence (${confidence}%), low risk profile. Meets auto-validation criteria.`;

    const { error } = await serverSupabase
      .from('building_assessments')
      .update({
        validation_status: 'validated',
        validated_by: null,
        validated_at: new Date().toISOString(),
        validation_notes: reasonMessage,
        auto_validated: true,
        auto_validated_at: new Date().toISOString(),
        auto_validation_reason: reasonMessage,
        auto_validation_confidence: confidence,
        auto_validation_review_status: 'pending_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (error) {
      throw error;
    }

    logger.info('Assessment auto-validated', {
      service: 'DataCollectionService',
      assessmentId,
      confidence: assessment.damageAssessment.confidence,
      damageType: assessment.damageAssessment.damageType,
      severity: assessment.damageAssessment.severity,
      reason: 'High confidence, low risk',
    });

    recordMetric('auto_validation.outcome', {
      assessmentId,
      autoValidated: true,
      confidence,
      damageType: assessment.damageAssessment.damageType,
      severity: assessment.damageAssessment.severity,
    });

    return { autoValidated: true };
  } catch (error) {
    logger.error('Error auto-validating assessment', error, {
      service: 'DataCollectionService',
      assessmentId,
    });
    recordMetric('auto_validation.outcome', {
      assessmentId,
      autoValidated: false,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return { autoValidated: false, reason: 'Error during auto-validation' };
  }
}

/**
 * Get assessment statistics.
 */
export async function getStatistics() {
  try {
    const { data: stats, error } = await serverSupabase
      .from('building_assessments')
      .select('validation_status, severity, damage_type, auto_validated, auto_validation_review_status')
      .limit(10000);

    if (error) {
      throw error;
    }

    const total = stats?.length || 0;
    const pending = stats?.filter((s) => s.validation_status === 'pending').length || 0;
    const validated = stats?.filter((s) => s.validation_status === 'validated').length || 0;
    const rejected = stats?.filter((s) => s.validation_status === 'rejected').length || 0;

    const bySeverity = {
      early: stats?.filter((s) => s.severity === 'early').length || 0,
      midway: stats?.filter((s) => s.severity === 'midway').length || 0,
      full: stats?.filter((s) => s.severity === 'full').length || 0,
    };

    const byDamageType: Record<string, number> = {};
    stats?.forEach((s) => {
      byDamageType[s.damage_type] = (byDamageType[s.damage_type] || 0) + 1;
    });

    const autoValidated = stats?.filter((s) => s.auto_validated).length || 0;
    const autoPendingReview = stats?.filter(
      (s) => s.auto_validated && s.auto_validation_review_status === 'pending_review'
    ).length || 0;
    const autoConfirmed = stats?.filter(
      (s) => s.auto_validated && s.auto_validation_review_status === 'confirmed'
    ).length || 0;
    const autoOverturned = stats?.filter(
      (s) => s.auto_validated && s.auto_validation_review_status === 'overturned'
    ).length || 0;

    const autoReviewed = autoConfirmed + autoOverturned;
    const autoValidationPrecision = autoReviewed > 0 ? autoConfirmed / autoReviewed : null;
    const autoValidationRecall = autoValidated > 0 ? autoConfirmed / autoValidated : null;
    const autoValidationCoverage = validated > 0 ? autoValidated / validated : null;
    const autoValidationPendingRate = autoValidated > 0 ? autoPendingReview / autoValidated : null;

    recordMetric('auto_validation.metrics', {
      total,
      validated,
      autoValidatedTotal: autoValidated,
      autoValidationPrecision,
      autoValidationRecall,
      autoValidationCoverage,
      autoValidationPendingRate,
    });

    return {
      total,
      pending,
      validated,
      rejected,
      bySeverity,
      byDamageType,
      autoValidationEnabled: AUTO_VALIDATION_CONFIG.ENABLED,
      minValidatedForAutoValidation: AUTO_VALIDATION_CONFIG.MIN_VALIDATED_COUNT,
      canAutoValidate:
        AUTO_VALIDATION_CONFIG.ENABLED &&
        validated >= AUTO_VALIDATION_CONFIG.MIN_VALIDATED_COUNT,
      autoValidation: {
        total: autoValidated,
        pendingReview: autoPendingReview,
        confirmed: autoConfirmed,
        overturned: autoOverturned,
        precision: autoValidationPrecision,
        recall: autoValidationRecall,
        coverage: autoValidationCoverage,
        pendingRate: autoValidationPendingRate,
      },
    };
  } catch (error) {
    logger.error('Error fetching statistics', error, {
      service: 'DataCollectionService',
    });
    throw error;
  }
}
