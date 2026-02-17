/**
 * Student Routing Gate
 *
 * Decides whether an assessment request should go to the student VLM
 * (fast, cheap) or the teacher GPT-4o (slow, accurate), based on
 * per-category student accuracy and safety constraints.
 *
 * Phase 4 of the teacher-student distillation pipeline.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { AssessmentContext } from '../types';
import type { StudentRoutingResult, StudentCalibrationEntry } from './types';

const MINT_AI_VLM_ENDPOINT = process.env.MINT_AI_VLM_ENDPOINT?.trim() || '';
const VLM_ROUTING_MODE = process.env.VLM_ROUTING_MODE?.trim() || 'shadow_only';
const MIN_ACCURACY = parseFloat(process.env.VLM_MIN_ACCURACY_FOR_ROUTING || '0.85');
const MIN_SAFETY_RECALL = parseFloat(process.env.VLM_MIN_SAFETY_RECALL || '0.95');
const MIN_PREDICTIONS_FOR_ROUTING = 50;

// Categories where safety stakes are too high for student-only routing
const ALWAYS_TEACHER_CATEGORIES = new Set([
  'structural_failure',
  'electrical_hazard',
  'fire_hazard',
  'asbestos',
  'mold_toxicity',
  'gas_leak',
]);

export class StudentRoutingGate {
  /**
   * Decide whether the student VLM can handle this request.
   */
  static async shouldUseStudent(
    context?: AssessmentContext,
    estimatedCategory?: string
  ): Promise<StudentRoutingResult> {
    // Gate 1: VLM endpoint must be configured
    if (!MINT_AI_VLM_ENDPOINT) {
      return { decision: 'teacher_only', reasoning: 'MINT_AI_VLM_ENDPOINT not set' };
    }

    // Gate 2: Routing mode check
    if (VLM_ROUTING_MODE === 'shadow_only') {
      return { decision: 'shadow_compare', reasoning: 'VLM_ROUTING_MODE is shadow_only' };
    }

    if (VLM_ROUTING_MODE !== 'auto') {
      return { decision: 'teacher_only', reasoning: `Unknown VLM_ROUTING_MODE: ${VLM_ROUTING_MODE}` };
    }

    // Gate 3: Hard overrides — high-stakes contexts always go to teacher
    if (context?.propertyType === 'commercial' || context?.propertyType === 'industrial') {
      return {
        decision: 'teacher_only',
        reasoning: `Property type ${context.propertyType} requires teacher`,
        category: estimatedCategory,
      };
    }

    // Gate 4: Always-teacher damage categories
    if (estimatedCategory && ALWAYS_TEACHER_CATEGORIES.has(estimatedCategory)) {
      return {
        decision: 'teacher_only',
        reasoning: `Category ${estimatedCategory} is safety-critical, requires teacher`,
        category: estimatedCategory,
      };
    }

    // Gate 5: Per-category calibration check
    const category = estimatedCategory ?? 'general';
    const calibration = await this.getCalibration(category);

    if (!calibration || calibration.totalPredictions < MIN_PREDICTIONS_FOR_ROUTING) {
      return {
        decision: 'shadow_compare',
        reasoning: `Insufficient data for ${category} (${calibration?.totalPredictions ?? 0}/${MIN_PREDICTIONS_FOR_ROUTING})`,
        category,
        studentAccuracy: calibration?.emaAccuracy,
        safetyRecall: calibration?.emaSafetyRecall,
      };
    }

    // Gate 6: Accuracy + safety recall check
    if (calibration.emaAccuracy >= MIN_ACCURACY && calibration.emaSafetyRecall >= MIN_SAFETY_RECALL) {
      await this.logRoutingDecision(context?.assessmentId, 'student_only', category, calibration);
      return {
        decision: 'student_only',
        reasoning: `Student calibrated: accuracy=${calibration.emaAccuracy.toFixed(2)}, safety=${calibration.emaSafetyRecall.toFixed(2)}`,
        category,
        studentAccuracy: calibration.emaAccuracy,
        safetyRecall: calibration.emaSafetyRecall,
      };
    }

    // Moderate confidence — run shadow
    if (calibration.emaAccuracy >= 0.70 && calibration.emaSafetyRecall >= 0.90) {
      await this.logRoutingDecision(context?.assessmentId, 'shadow_compare', category, calibration);
      return {
        decision: 'shadow_compare',
        reasoning: `Student moderate: accuracy=${calibration.emaAccuracy.toFixed(2)}, safety=${calibration.emaSafetyRecall.toFixed(2)}`,
        category,
        studentAccuracy: calibration.emaAccuracy,
        safetyRecall: calibration.emaSafetyRecall,
      };
    }

    // Below threshold — teacher only
    await this.logRoutingDecision(context?.assessmentId, 'teacher_only', category, calibration);
    return {
      decision: 'teacher_only',
      reasoning: `Student below threshold: accuracy=${calibration.emaAccuracy.toFixed(2)}, safety=${calibration.emaSafetyRecall.toFixed(2)}`,
      category,
      studentAccuracy: calibration.emaAccuracy,
      safetyRecall: calibration.emaSafetyRecall,
    };
  }

  /**
   * Update calibration for a category using exponential moving average.
   */
  static async updateCalibration(
    category: string,
    wasCorrect: boolean,
    safetyRecall: number
  ): Promise<void> {
    const EMA_ALPHA = 0.05;

    const existing = await this.getCalibration(category);

    if (!existing) {
      // First observation — insert
      await serverSupabase.from('vlm_student_calibration').insert({
        category,
        total_predictions: 1,
        correct_predictions: wasCorrect ? 1 : 0,
        accuracy: wasCorrect ? 1 : 0,
        safety_recall: safetyRecall,
        safety_total: 1,
        safety_correct: safetyRecall,
        ema_accuracy: wasCorrect ? 1 : 0,
        ema_safety_recall: safetyRecall,
      });
      return;
    }

    const newTotal = existing.totalPredictions + 1;
    const newCorrect = existing.correctPredictions + (wasCorrect ? 1 : 0);
    const newAccuracy = newCorrect / newTotal;
    const newSafetyTotal = existing.safetyTotal + 1;
    const newSafetyCorrect = existing.safetyCorrect + safetyRecall;

    const emaAccuracy = EMA_ALPHA * (wasCorrect ? 1 : 0) + (1 - EMA_ALPHA) * existing.emaAccuracy;
    const emaSafetyRecall = EMA_ALPHA * safetyRecall + (1 - EMA_ALPHA) * existing.emaSafetyRecall;

    await serverSupabase
      .from('vlm_student_calibration')
      .update({
        total_predictions: newTotal,
        correct_predictions: newCorrect,
        accuracy: newAccuracy,
        safety_recall: newSafetyCorrect / newSafetyTotal,
        safety_total: newSafetyTotal,
        safety_correct: newSafetyCorrect,
        ema_accuracy: emaAccuracy,
        ema_safety_recall: emaSafetyRecall,
        last_updated: new Date().toISOString(),
      })
      .eq('category', category);
  }

  /**
   * Get all calibration entries for dashboard.
   */
  static async getCalibrationDashboard(): Promise<StudentCalibrationEntry[]> {
    const { data, error } = await serverSupabase
      .from('vlm_student_calibration')
      .select('*')
      .order('total_predictions', { ascending: false });

    if (error || !data) return [];

    return data.map((r) => ({
      category: r.category,
      totalPredictions: r.total_predictions,
      correctPredictions: r.correct_predictions,
      accuracy: r.accuracy,
      safetyRecall: r.safety_recall,
      safetyTotal: r.safety_total,
      safetyCorrect: r.safety_correct,
      emaAccuracy: r.ema_accuracy,
      emaSafetyRecall: r.ema_safety_recall,
      lastUpdated: new Date(r.last_updated),
    }));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private static async getCalibration(
    category: string
  ): Promise<StudentCalibrationEntry | null> {
    const { data, error } = await serverSupabase
      .from('vlm_student_calibration')
      .select('*')
      .eq('category', category)
      .single();

    if (error || !data) return null;

    return {
      category: data.category,
      totalPredictions: data.total_predictions,
      correctPredictions: data.correct_predictions,
      accuracy: data.accuracy,
      safetyRecall: data.safety_recall,
      safetyTotal: data.safety_total,
      safetyCorrect: data.safety_correct,
      emaAccuracy: data.ema_accuracy,
      emaSafetyRecall: data.ema_safety_recall,
      lastUpdated: new Date(data.last_updated),
    };
  }

  private static async logRoutingDecision(
    assessmentId: string | undefined,
    decision: string,
    category: string,
    calibration: StudentCalibrationEntry
  ): Promise<void> {
    serverSupabase
      .from('vlm_routing_decisions')
      .insert({
        assessment_id: assessmentId,
        decision,
        reasoning: `accuracy=${calibration.emaAccuracy.toFixed(2)}, safety=${calibration.emaSafetyRecall.toFixed(2)}, n=${calibration.totalPredictions}`,
        category,
        student_accuracy: calibration.emaAccuracy,
        safety_recall: calibration.emaSafetyRecall,
      })
      .then(({ error }) => {
        if (error) {
          logger.debug('Failed to log routing decision', {
            service: 'StudentRoutingGate',
            error: error.message,
          });
        }
      });
  }
}
