/**
 * Calibration Feedback Service
 *
 * Closes the feedback loop: updates vlm_student_calibration from shadow
 * comparisons (automatic) and human validations (gold standard). This
 * keeps the StudentRoutingGate's per-category accuracy data current.
 *
 * Phase 5 of the teacher-student distillation pipeline.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { StudentRoutingGate } from './StudentRoutingGate';
import type { ShadowComparisonResult } from './types';

export class CalibrationFeedbackService {
  /**
   * Update calibration from a shadow comparison (teacher vs student).
   * Called after every shadow comparison in Phase 1.
   */
  static async updateFromShadowComparison(
    comparison: ShadowComparisonResult
  ): Promise<void> {
    if (!comparison.studentParseSuccess) {
      // Student failed to produce valid JSON — count as incorrect
      await StudentRoutingGate.updateCalibration(
        comparison.damageCategory,
        false,
        0
      );
      return;
    }

    // "Correct" means the student matched the teacher on damage type
    const wasCorrect = comparison.damageTypeMatch;
    const safetyRecall = comparison.safetyRecall;

    await StudentRoutingGate.updateCalibration(
      comparison.damageCategory,
      wasCorrect,
      safetyRecall
    );
  }

  /**
   * Update calibration from a human validation (gold standard signal).
   * Called from DataCollectionService.validateAssessment() when an admin
   * validates an assessment that was produced by the student VLM.
   */
  static async updateFromHumanValidation(
    category: string,
    wasCorrect: boolean,
    safetyRecall: number
  ): Promise<void> {
    // Audit trail: log every human validation for traceability
    await serverSupabase.from('vlm_routing_decisions').insert({
      decision: wasCorrect ? 'student_only' : 'teacher_only',
      reasoning: `human_validation: correct=${wasCorrect}, safetyRecall=${safetyRecall.toFixed(2)}, weight=3x`,
      category,
      student_accuracy: wasCorrect ? 1 : 0,
      safety_recall: safetyRecall,
    }).then(({ error }) => {
      if (error) {
        logger.debug('Failed to log human validation audit', {
          service: 'CalibrationFeedbackService',
          error: error.message,
        });
      }
    });

    // Human validations carry 3x weight (call updateCalibration 3 times)
    // This makes human feedback converge faster in the EMA
    for (let i = 0; i < 3; i++) {
      await StudentRoutingGate.updateCalibration(
        category,
        wasCorrect,
        safetyRecall
      );
    }
  }

  /**
   * Full recalculation of calibration from all shadow comparisons.
   * Used after retraining when the student model changes and old
   * calibration data is no longer valid.
   *
   * Uses compute-then-upsert pattern to avoid data loss if the
   * process crashes mid-way (no delete-first approach).
   */
  static async recalculateAll(): Promise<void> {
    logger.info('Starting full calibration recalculation', {
      service: 'CalibrationFeedbackService',
    });

    // Fetch all shadow comparisons
    const { data, error } = await serverSupabase
      .from('vlm_shadow_comparisons')
      .select('damage_category, damage_type_match, safety_recall, student_parse_success')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      logger.info('No shadow comparisons to recalculate from', {
        service: 'CalibrationFeedbackService',
      });
      return;
    }

    // Build calibration in-memory first (safe — no DB mutation until the end)
    const EMA_ALPHA = 0.05;
    const calibrations = new Map<string, {
      total: number; correct: number; accuracy: number;
      safetyTotal: number; safetyCorrect: number; safetyRecall: number;
      emaAccuracy: number; emaSafetyRecall: number;
    }>();

    for (const row of data) {
      const category = row.damage_category ?? 'unknown';
      const wasCorrect = row.student_parse_success ? Boolean(row.damage_type_match) : false;
      const recall = row.student_parse_success ? (row.safety_recall ?? 0) : 0;

      const existing = calibrations.get(category);
      if (!existing) {
        calibrations.set(category, {
          total: 1,
          correct: wasCorrect ? 1 : 0,
          accuracy: wasCorrect ? 1 : 0,
          safetyTotal: 1,
          safetyCorrect: recall,
          safetyRecall: recall,
          emaAccuracy: wasCorrect ? 1 : 0,
          emaSafetyRecall: recall,
        });
      } else {
        existing.total++;
        existing.correct += wasCorrect ? 1 : 0;
        existing.accuracy = existing.correct / existing.total;
        existing.safetyTotal++;
        existing.safetyCorrect += recall;
        existing.safetyRecall = existing.safetyCorrect / existing.safetyTotal;
        existing.emaAccuracy = EMA_ALPHA * (wasCorrect ? 1 : 0) + (1 - EMA_ALPHA) * existing.emaAccuracy;
        existing.emaSafetyRecall = EMA_ALPHA * recall + (1 - EMA_ALPHA) * existing.emaSafetyRecall;
      }
    }

    // Upsert all categories atomically (no delete needed — overwrites existing rows)
    for (const [category, cal] of calibrations) {
      await serverSupabase
        .from('vlm_student_calibration')
        .upsert({
          category,
          total_predictions: cal.total,
          correct_predictions: cal.correct,
          accuracy: cal.accuracy,
          safety_recall: cal.safetyRecall,
          safety_total: cal.safetyTotal,
          safety_correct: cal.safetyCorrect,
          ema_accuracy: cal.emaAccuracy,
          ema_safety_recall: cal.emaSafetyRecall,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'category' });
    }

    logger.info('Calibration recalculation complete', {
      service: 'CalibrationFeedbackService',
      samplesProcessed: data.length,
      categoriesUpdated: calibrations.size,
    });
  }
}
