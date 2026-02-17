/**
 * Safety Recall Gate
 *
 * Hard safety constraint that validates student VLM output before serving
 * it to users. Ensures the student never misses critical hazards that the
 * teacher would catch. Falls back to teacher GPT-4o on any safety concern.
 *
 * Phase 5 of the teacher-student distillation pipeline.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { Phase1BuildingAssessment } from '../types';
import type { SafetyValidationResult } from './types';

// Damage categories where hazards are almost always present
const ALWAYS_HAZARDOUS_CATEGORIES = new Set([
  'structural_failure',
  'electrical_hazard',
  'fire_hazard',
  'asbestos',
  'mold_toxicity',
  'gas_leak',
  'lead_paint',
]);

export class SafetyRecallGate {
  /**
   * Validate that a student assessment meets safety requirements.
   * Returns { safe: true } or { safe: false, failReason } with specific reason.
   */
  static validateStudentSafety(
    studentAssessment: Phase1BuildingAssessment,
    category: string
  ): SafetyValidationResult {
    // Check 1: If damage category is always-hazardous but student reports no hazards
    if (
      ALWAYS_HAZARDOUS_CATEGORIES.has(category) &&
      !studentAssessment.safetyHazards.hasCriticalHazards &&
      studentAssessment.safetyHazards.hazards.length === 0
    ) {
      return {
        safe: false,
        failReason: `Category ${category} expected hazards but student found none`,
      };
    }

    // Check 2: Student confidence too low — can't trust the output
    if (studentAssessment.damageAssessment.confidence < 40) {
      return {
        safe: false,
        failReason: `Student confidence too low (${studentAssessment.damageAssessment.confidence})`,
      };
    }

    // Check 3: Safety score is high (no danger) but urgency is immediate — contradiction
    if (
      studentAssessment.safetyHazards.overallSafetyScore > 80 &&
      studentAssessment.urgency.urgency === 'immediate'
    ) {
      return {
        safe: false,
        failReason: 'Contradiction: high safety score but immediate urgency',
      };
    }

    return { safe: true };
  }

  /**
   * Record a safety violation for monitoring and calibration degradation.
   */
  static async recordSafetyViolation(
    assessmentId: string,
    category: string,
    failReason: string,
    studentAssessment: Phase1BuildingAssessment,
    teacherAssessment?: Phase1BuildingAssessment
  ): Promise<void> {
    const { error } = await serverSupabase.from('vlm_safety_violations').insert({
      assessment_id: assessmentId,
      category,
      fail_reason: failReason,
      student_assessment: studentAssessment,
      teacher_assessment: teacherAssessment ?? null,
    });

    if (error) {
      logger.warn('Failed to record safety violation', {
        service: 'SafetyRecallGate',
        error: error.message,
      });
    }

    logger.warn('Student VLM safety violation recorded', {
      service: 'SafetyRecallGate',
      assessmentId,
      category,
      failReason,
    });
  }
}
