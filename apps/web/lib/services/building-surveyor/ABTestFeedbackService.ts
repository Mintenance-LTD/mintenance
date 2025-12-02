/**
 * A/B Test Feedback Service
 * 
 * Collects feedback from validated assessments and updates Safe-LUCB critic models.
 * This enables online learning for the reward (θ) and safety (φ) models.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { CriticModule } from './critic';
import { ContextFeatureService, type ContextFeatures } from './ContextFeatureService';
import type { Phase1BuildingAssessment } from './types';

export interface FeedbackData {
  assessmentId: string;
  decisionId: string;
  context: number[]; // d_eff = 12 dimensional context vector
  arm: 'automate' | 'escalate';
  reward: number; // 1.0 if correct, 0.0 if incorrect
  safetyViolation: boolean; // True if SFN (Safety False Negative) occurred
  validatedBy: string;
  validatedAt: string;
}

export class ABTestFeedbackService {
  /**
   * Collect feedback from validated assessment
   * 
   * This should be called when an assessment is validated or rejected.
   * It updates the Safe-LUCB critic models with the outcome.
   */
  static async collectFeedback(
    assessmentId: string,
    validatedBy: string,
    isCorrect: boolean,
    hasSafetyViolation: boolean
  ): Promise<void> {
    try {
      // 1. Find the A/B test decision for this assessment
      const { data: decision } = await serverSupabase
        .from('ab_decisions')
        .select('*, ab_assignments!inner(experiment_id)')
        .eq('assessment_id', assessmentId)
        .single();

      if (!decision) {
        // Not part of A/B test, skip feedback collection
        logger.debug('Assessment not part of A/B test, skipping feedback', {
          service: 'ABTestFeedbackService',
          assessmentId,
        });
        return;
      }

      // 2. Get context features from decision
      const contextFeatures = decision.context_features as ContextFeatures | null;
      if (!contextFeatures) {
        logger.warn('No context features found in decision', {
          service: 'ABTestFeedbackService',
          decisionId: decision.id,
        });
        return;
      }

      // 3. Construct context vector (d_eff = 12)
      // Use ContextFeatureService to ensure consistency
      const context = ContextFeatureService.extractContextVector(contextFeatures);

      // 4. Determine reward and safety violation
      const reward = isCorrect ? 1.0 : 0.0;
      const safetyViolation = hasSafetyViolation;

      // 5. Get arm from decision
      const arm = decision.decision as 'automate' | 'escalate';

      // 6. Update critic models
      await CriticModule.updateFromFeedback({
        context,
        arm,
        reward,
        safetyViolation,
      });

      // 7. Log outcome to ab_outcomes table
      await this.logOutcome({
        decisionId: decision.id,
        assessmentId,
        reward,
        safetyViolation,
        validatedBy,
      });

      logger.info('Feedback collected and models updated', {
        service: 'ABTestFeedbackService',
        assessmentId,
        decisionId: decision.id,
        arm,
        reward,
        safetyViolation,
      });
    } catch (error) {
      logger.error('Failed to collect feedback', {
        service: 'ABTestFeedbackService',
        assessmentId,
        error,
      });
      // Don't throw - feedback collection is non-critical
    }
  }

  // Context vector extraction moved to ContextFeatureService

  /**
   * Log outcome to ab_outcomes table
   */
  private static async logOutcome(params: {
    decisionId: string;
    assessmentId: string;
    reward: number;
    safetyViolation: boolean;
    validatedBy: string;
  }): Promise<void> {
    // Get decision details
    const { data: decision } = await serverSupabase
      .from('ab_decisions')
      .select('experiment_id, assignment_id, arm_id')
      .eq('id', params.decisionId)
      .single();

    if (!decision) {
      logger.warn('Decision not found for outcome logging', {
        service: 'ABTestFeedbackService',
        decisionId: params.decisionId,
      });
      return;
    }

    // Get assessment details for true class
    const { data: assessment } = await serverSupabase
      .from('building_assessments')
      .select('damage_type, assessment_data')
      .eq('id', params.assessmentId)
      .single();

    const trueClass = assessment?.damage_type || 'unknown';
    const assessmentData = assessment?.assessment_data as Phase1BuildingAssessment | null;
    const predictedClass = assessmentData?.damageAssessment?.damageType || 'unknown';

    const { error: logError } = await serverSupabase.rpc('log_ab_outcome', {
      p_decision_id: params.decisionId,
      p_assessment_id: params.assessmentId,
      p_experiment_id: decision.experiment_id,
      p_assignment_id: decision.assignment_id,
      p_arm_id: decision.arm_id,
      p_reward: params.reward,
      p_sfn: params.safetyViolation,
      p_true_class: trueClass,
      p_predicted_class: predictedClass,
      p_validated_by: params.validatedBy,
      p_validated_at: new Date().toISOString(),
    });

    if (logError) {
      throw logError;
    }
  }

  /**
   * Batch collect feedback from multiple validated assessments
   */
  static async batchCollectFeedback(
    assessmentIds: string[],
    validatedBy: string
  ): Promise<{
    processed: number;
    skipped: number;
    errors: number;
  }> {
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    let cursor = 0;
    const CONCURRENCY = Math.min(5, assessmentIds.length || 1);

    const worker = async () => {
      while (cursor < assessmentIds.length) {
        const currentIndex = cursor++;
        const assessmentId = assessmentIds[currentIndex];
        try {
          const { data: assessment, error: assessmentError } = await serverSupabase
            .from('building_assessments')
            .select('validation_status, damage_type, assessment_data')
            .eq('id', assessmentId)
            .single();

          if (assessmentError || !assessment) {
            skipped++;
            continue;
          }

          const isCorrect = assessment.validation_status === 'validated';
          const hasSafetyViolation = this.determineSafetyViolation({
            validation_status: assessment.validation_status,
            damage_type: assessment.damage_type,
            assessment_data: assessment.assessment_data as Phase1BuildingAssessment | null,
          });

          await this.collectFeedback(
            assessmentId,
            validatedBy,
            isCorrect,
            hasSafetyViolation
          );

          processed++;
        } catch (error) {
          logger.error('Error processing feedback for assessment', {
            service: 'ABTestFeedbackService',
            assessmentId,
            error,
          });
          errors++;
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }).map(() => worker()));

    return { processed, skipped, errors };
  }

  /**
   * Determine if assessment had safety violation (SFN)
   */
  private static determineSafetyViolation(assessment: {
    validation_status?: string;
    damage_type?: string;
    assessment_data?: Phase1BuildingAssessment | null;
  }): boolean {
    // SFN occurs if:
    // 1. Assessment was rejected (incorrect)
    // 2. AND the damage type is safety-critical
    // 3. AND the AI missed it or had low confidence

    if (assessment.validation_status !== 'rejected') {
      return false; // Only rejected assessments can have SFN
    }

    const damageType = assessment.damage_type?.toLowerCase() || '';
    const isCriticalDamage = this.isCriticalDamageType(damageType);

    const assessmentData = assessment.assessment_data;
    const hazards = assessmentData?.safetyHazards?.hazards ?? [];
    const hasCriticalHazards =
      assessmentData?.safetyHazards?.hasCriticalHazards ||
      hazards.some(
        hazard =>
          ['high', 'critical'].includes(hazard.severity) &&
          ['immediate', 'urgent'].includes(hazard.urgency)
      );

    const complianceViolation = assessmentData?.compliance?.requiresProfessionalInspection ||
      assessmentData?.compliance?.complianceIssues?.some(issue => issue.severity === 'violation');

    const lowConfidenceCritical =
      isCriticalDamage &&
      typeof assessmentData?.damageAssessment?.confidence === 'number' &&
      assessmentData.damageAssessment.confidence < 40;

    return isCriticalDamage || hasCriticalHazards || complianceViolation || lowConfidenceCritical;
  }

  private static isCriticalDamageType(damageType: string): boolean {
    if (!damageType) {
      return false;
    }

    const criticalTypes = [
      'structural_failure',
      'electrical_hazard',
      'fire_hazard',
      'gas_leak',
      'carbon_monoxide',
      'roof_collapse',
      'foundation_crack',
      'asbestos',
      'mold_toxicity',
      'lead_paint',
    ];

    return criticalTypes.some(type => damageType.includes(type));
  }
}
