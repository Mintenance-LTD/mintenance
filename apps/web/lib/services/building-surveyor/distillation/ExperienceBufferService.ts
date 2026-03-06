/**
 * Experience Buffer Service
 *
 * Manages a prioritized queue of (image, teacher_output, student_output) triples
 * for VLM fine-tuning. Priority is computed from surprise score (how much the
 * student disagreed with the teacher), category underrepresentation, and
 * teacher difficulty.
 *
 * Phase 2 of the teacher-student distillation pipeline.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { Phase1BuildingAssessment } from '../types';
import type {
  ShadowComparisonResult,
  VLMTrainingExample,
  ExperienceBufferStats,
} from './types';

export class ExperienceBufferService {
  /**
   * Record a teacher/student pair as a training example in the buffer.
   * Called after every shadow comparison.
   */
  static async recordExperience(
    comparison: ShadowComparisonResult,
    shadowComparisonId: string | undefined,
    imageUrls: string[],
    systemPrompt: string,
    userPrompt: string,
    teacherResponse: Phase1BuildingAssessment,
    studentResponse: Phase1BuildingAssessment | null,
    teacherReasoning?: string | null
  ): Promise<string | null> {
    try {
      const surpriseScore = this.computeSurpriseScore(comparison);
      const categoryStats = await this.getCategoryCount(comparison.damageCategory);
      const priorityScore = this.computePriorityScore(
        surpriseScore,
        comparison.teacherConfidence,
        categoryStats.count,
        categoryStats.targetPerCategory
      );

      // Determine teacher quality from confidence
      const teacherQuality = comparison.teacherConfidence >= 80
        ? 'high'
        : comparison.teacherConfidence >= 60
          ? 'medium'
          : comparison.teacherConfidence >= 40
            ? 'low'
            : 'uncertain';

      const { data, error } = await serverSupabase
        .from('vlm_training_buffer')
        .insert({
          assessment_id: comparison.assessmentId,
          shadow_comparison_id: shadowComparisonId,
          image_urls: imageUrls,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          teacher_response: teacherResponse,
          student_response: studentResponse,
          teacher_reasoning: teacherReasoning ?? null,
          surprise_score: surpriseScore,
          priority_score: priorityScore,
          damage_category: comparison.damageCategory,
          severity: teacherResponse.damageAssessment.severity,
          teacher_confidence: comparison.teacherConfidence,
          teacher_quality: teacherQuality,
        })
        .select('id')
        .single();

      if (error) {
        logger.warn('Failed to record experience', {
          service: 'ExperienceBufferService',
          error: error.message,
        });
        return null;
      }

      return data?.id ?? null;
    } catch (error) {
      logger.warn('ExperienceBufferService.recordExperience failed', {
        service: 'ExperienceBufferService',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Surprise score: how much the student disagreed with the teacher.
   * Higher = more learning value.
   */
  static computeSurpriseScore(comparison: ShadowComparisonResult): number {
    if (!comparison.studentParseSuccess) return 1.0; // Max surprise if student can't even parse
    return 1.0 - comparison.overallAgreement;
  }

  /**
   * Priority score combining surprise, teacher quality, and category balance.
   */
  static computePriorityScore(
    surprise: number,
    teacherConfidence: number,
    categoryCount: number,
    targetPerCategory: number
  ): number {
    const teacherQualityScore = Math.min(teacherConfidence / 100, 1);
    const categoryBalanceScore = categoryCount < targetPerCategory
      ? 1 - (categoryCount / targetPerCategory)
      : 0;

    return (
      surprise * 0.5 +
      categoryBalanceScore * 0.3 +
      teacherQualityScore * 0.2
    );
  }

  /**
   * Fetch the top-priority unused examples for training data export.
   */
  static async getTopExamples(
    limit: number,
    minQuality?: 'high' | 'medium'
  ): Promise<VLMTrainingExample[]> {
    let query = serverSupabase
      .from('vlm_training_buffer')
      .select('*')
      .eq('used_in_training', false)
      .order('priority_score', { ascending: false })
      .limit(limit);

    if (minQuality === 'high') {
      query = query.eq('teacher_quality', 'high');
    } else if (minQuality === 'medium') {
      query = query.in('teacher_quality', ['high', 'medium']);
    }

    const { data, error } = await query;

    if (error || !data) {
      logger.warn('Failed to fetch top examples', {
        service: 'ExperienceBufferService',
        error: error?.message,
      });
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      assessmentId: row.assessment_id,
      imageUrls: row.image_urls,
      systemPrompt: row.system_prompt,
      userPrompt: row.user_prompt,
      teacherResponse: row.teacher_response as Phase1BuildingAssessment,
      studentResponse: row.student_response as Phase1BuildingAssessment | null,
      teacherReasoning: row.teacher_reasoning as string | null ?? null,
      humanCorrectedResponse: row.human_corrected_response as Phase1BuildingAssessment | null ?? null,
      surpriseScore: row.surprise_score,
      priorityScore: row.priority_score,
      difficultyScore: row.difficulty_score,
      damageCategory: row.damage_category,
      severity: row.severity,
      teacherConfidence: row.teacher_confidence,
      teacherQuality: row.teacher_quality,
      humanVerified: row.human_verified,
      usedInTraining: row.used_in_training,
      trainingRound: row.training_round,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Mark examples as used after exporting for a training round.
   */
  static async markUsed(ids: string[], trainingRound: number): Promise<void> {
    const { error } = await serverSupabase
      .from('vlm_training_buffer')
      .update({
        used_in_training: true,
        training_round: trainingRound,
        marked_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) {
      logger.warn('Failed to mark examples as used', {
        service: 'ExperienceBufferService',
        error: error.message,
      });
    }
  }

  /**
   * Buffer statistics for monitoring dashboard.
   */
  static async getBufferStats(): Promise<ExperienceBufferStats> {
    const { data, error } = await serverSupabase
      .from('vlm_training_buffer')
      .select('damage_category, surprise_score, priority_score, used_in_training');

    if (error || !data || data.length === 0) {
      return { total: 0, unused: 0, byCategory: {}, avgSurprise: 0, avgPriority: 0 };
    }

    const total = data.length;
    const unused = data.filter((r) => !r.used_in_training).length;
    const avgSurprise = data.reduce((s, r) => s + (r.surprise_score ?? 0), 0) / total;
    const avgPriority = data.reduce((s, r) => s + (r.priority_score ?? 0), 0) / total;

    const byCategory: Record<string, number> = {};
    for (const row of data) {
      const cat = row.damage_category ?? 'unknown';
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }

    return { total, unused, byCategory, avgSurprise, avgPriority };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private static async getCategoryCount(
    category: string
  ): Promise<{ count: number; targetPerCategory: number }> {
    const { count, error } = await serverSupabase
      .from('vlm_training_buffer')
      .select('*', { count: 'exact', head: true })
      .eq('damage_category', category)
      .eq('used_in_training', false);

    if (error) {
      return { count: 0, targetPerCategory: 50 };
    }

    // Target is dynamic: aim for roughly equal distribution across categories
    const { count: totalCount } = await serverSupabase
      .from('vlm_training_buffer')
      .select('*', { count: 'exact', head: true })
      .eq('used_in_training', false);

    const numCategories = Math.max(1, Object.keys(await this.getDistinctCategories()).length);
    const targetPerCategory = Math.max(50, Math.ceil((totalCount ?? 0) / numCategories));

    return { count: count ?? 0, targetPerCategory };
  }

  private static async getDistinctCategories(): Promise<Record<string, boolean>> {
    const { data } = await serverSupabase
      .from('vlm_training_buffer')
      .select('damage_category')
      .eq('used_in_training', false);

    const cats: Record<string, boolean> = {};
    if (data) {
      for (const row of data) {
        cats[row.damage_category] = true;
      }
    }
    return cats;
  }
}
