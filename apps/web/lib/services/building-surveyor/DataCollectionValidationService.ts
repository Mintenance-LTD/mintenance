/**
 * DataCollectionValidationService
 *
 * Validation workflow methods extracted from DataCollectionService:
 * collectAssessment, validateAssessment, rejectAssessment, recordFeedback.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BuildingSurveyorService } from './BuildingSurveyorService';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { ABTestFeedbackService } from './ABTestFeedbackService';

/**
 * Collect assessment for training data.
 * Called automatically when assessment is created.
 */
export async function collectAssessment(
  assessment: Phase1BuildingAssessment,
  _imageUrls: string[],
  userId: string
): Promise<void> {
  try {
    logger.info('Assessment collected for training data', {
      service: 'DataCollectionService',
      userId,
      damageType: assessment.damageAssessment.damageType,
      severity: assessment.damageAssessment.severity,
    });
  } catch (error) {
    logger.error('Error collecting assessment', error, {
      service: 'DataCollectionService',
      userId,
    });
    // Don't throw - data collection is non-critical
  }
}

/**
 * Mark assessment as validated by admin.
 * Triggers learning from validation outcome.
 */
export async function validateAssessment(
  assessmentId: string,
  validatedBy: string,
  notes?: string
): Promise<void> {
  try {
    const { data: assessmentRecord, error: fetchError } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data, auto_validated, auto_validation_review_status')
      .eq('id', assessmentId)
      .single();

    if (fetchError || !assessmentRecord) {
      throw new Error('Assessment not found');
    }

    const { error } = await serverSupabase
      .from('building_assessments')
      .update({
        validation_status: 'validated',
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
        validation_notes: notes,
        auto_validation_review_status: assessmentRecord.auto_validated
          ? 'confirmed'
          : 'not_applicable',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (error) {
      throw error;
    }

    logger.info('Assessment validated', {
      service: 'DataCollectionService',
      assessmentId,
      validatedBy,
    });

    try {
      const validatedAssessment = assessmentRecord.assessment_data as Phase1BuildingAssessment;
      await BuildingSurveyorService.learnFromValidation(assessmentId, validatedAssessment);
    } catch (learningError) {
      logger.warn('Failed to trigger learning from validation', {
        service: 'DataCollectionService',
        assessmentId,
        error: learningError,
      });
    }

    try {
      await ABTestFeedbackService.collectFeedback(
        assessmentId,
        validatedBy,
        true,
        false
      );
    } catch (feedbackError) {
      logger.warn('Failed to collect A/B test feedback', {
        service: 'DataCollectionService',
        assessmentId,
        error: feedbackError,
      });
    }

    try {
      const assessment = assessmentRecord.assessment_data as Phase1BuildingAssessment;
      const category = assessment?.damageAssessment?.damageType?.toLowerCase() || 'unknown';
      const { CalibrationFeedbackService } = await import('./distillation/CalibrationFeedbackService');
      await CalibrationFeedbackService.updateFromHumanValidation(category, true, 1.0);
    } catch {
      // Non-fatal: VLM calibration update failure doesn't block validation
    }
  } catch (error) {
    logger.error('Error validating assessment', error, {
      service: 'DataCollectionService',
      assessmentId,
    });
    throw error;
  }
}

/**
 * Reject assessment (mark as invalid).
 */
export async function rejectAssessment(
  assessmentId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  try {
    const { data: assessmentRecord, error: fetchError } = await serverSupabase
      .from('building_assessments')
      .select('auto_validated')
      .eq('id', assessmentId)
      .single();

    if (fetchError || !assessmentRecord) {
      throw new Error('Assessment not found');
    }

    const { error } = await serverSupabase
      .from('building_assessments')
      .update({
        validation_status: 'rejected',
        validated_by: rejectedBy,
        validated_at: new Date().toISOString(),
        validation_notes: reason,
        auto_validation_review_status: assessmentRecord.auto_validated
          ? 'overturned'
          : 'not_applicable',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (error) {
      throw error;
    }

    logger.info('Assessment rejected', {
      service: 'DataCollectionService',
      assessmentId,
      rejectedBy,
      reason,
    });

    try {
      const { data: assessmentData } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data')
        .eq('id', assessmentId)
        .single();

      const assessment = assessmentData?.assessment_data as Phase1BuildingAssessment | undefined;
      const damageType = assessment?.damageAssessment?.damageType || '';
      const criticalTypes = [
        'structural_failure',
        'electrical_hazard',
        'fire_hazard',
        'asbestos',
        'mold_toxicity',
      ];
      const hasSafetyViolation = criticalTypes.some(type =>
        damageType.toLowerCase().includes(type)
      );

      await ABTestFeedbackService.collectFeedback(
        assessmentId,
        rejectedBy,
        false,
        hasSafetyViolation
      );
    } catch (feedbackError) {
      logger.warn('Failed to collect A/B test feedback', {
        service: 'DataCollectionService',
        assessmentId,
        error: feedbackError,
      });
    }
  } catch (error) {
    logger.error('Error rejecting assessment', error, {
      service: 'DataCollectionService',
      assessmentId,
    });
    throw error;
  }
}

/**
 * Record feedback from shadow phase.
 * Compares AI decision with human decision and updates critic models.
 */
export async function recordFeedback(
  assessmentId: string,
  aiDecision: 'automate' | 'escalate',
  humanDecision: 'automate' | 'escalate',
  actualOutcome: {
    hasCriticalHazard: boolean;
    wasCorrect: boolean;
  }
): Promise<void> {
  try {
    const { data: assessmentRecord } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data, ab_decision_id')
      .eq('id', assessmentId)
      .single();

    if (!assessmentRecord) {
      logger.warn('Assessment not found for feedback', {
        service: 'DataCollectionService',
        assessmentId,
      });
      return;
    }

    const isCorrect = aiDecision === humanDecision;
    const hasSafetyViolation = actualOutcome.hasCriticalHazard && aiDecision === 'automate';

    const { data: assessment } = await serverSupabase
      .from('building_assessments')
      .select('validated_by')
      .eq('id', assessmentId)
      .single();

    const validatedBy = assessment?.validated_by || 'system';

    await ABTestFeedbackService.collectFeedback(
      assessmentId,
      validatedBy,
      isCorrect,
      hasSafetyViolation
    );

    if (aiDecision === 'automate') {
      // Note: stratum would come from assessment metadata; using default for now
      const stratum = 'residential_50-100_unknown_structural';

      await import('./critic').then(({ CriticModule }) => {
        CriticModule.recordOutcome(
          stratum,
          aiDecision,
          actualOutcome.hasCriticalHazard
        ).catch((error) => {
          logger.error('Failed to record FNR outcome', {
            service: 'DataCollectionService',
            assessmentId,
            error,
          });
        });
      });
    }

    logger.info('Feedback recorded', {
      service: 'DataCollectionService',
      assessmentId,
      aiDecision,
      humanDecision,
      agreement: aiDecision === humanDecision,
      hasCriticalHazard: actualOutcome.hasCriticalHazard,
    });
  } catch (error) {
    logger.error('Error recording feedback', error, {
      service: 'DataCollectionService',
      assessmentId,
    });
    // Don't throw - feedback collection is non-critical
  }
}
