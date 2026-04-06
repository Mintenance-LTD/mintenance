/**
 * Curriculum learning data exporter
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { TrainingDataOptions } from './types';

const SERVICE = 'YOLOTrainingDataEnhanced';

/**
 * Export training data sorted by difficulty for curriculum learning.
 *
 * Samples are sorted by teacher_agreement_score (high agreement = easy).
 * Returns data split into phases:
 *   Phase 1: Easy samples (agreement >= 0.8)
 *   Phase 2: Medium samples (agreement >= 0.5)
 *   Phase 3: Hard samples (all remaining)
 */
export async function exportCurriculumData(
  options: TrainingDataOptions & { curriculumPhases?: number } = {}
): Promise<{
  phases: Array<{ phase: number; difficulty: string; sampleCount: number; outputDir: string }>;
  totalSamples: number;
}> {
  const {
    outputDir = 'training-data/curriculum',
    curriculumPhases = 3,
    maxCorrections = 1000,
  } = options;

  try {
    // Fetch GPT-4 labels with agreement scores, sorted by difficulty
    const { data: labels } = await serverSupabase
      .from('gpt4_training_labels')
      .select('id, assessment_id, damage_type, severity, confidence, teacher_agreement_score, difficulty_score, image_urls')
      .eq('used_in_training', false)
      .not('teacher_agreement_score', 'is', null)
      .order('teacher_agreement_score', { ascending: false })
      .limit(maxCorrections);

    if (!labels?.length) {
      return { phases: [], totalSamples: 0 };
    }

    // Define phase thresholds
    const thresholds = [
      { phase: 1, difficulty: 'easy', minScore: 0.8 },
      { phase: 2, difficulty: 'medium', minScore: 0.5 },
      { phase: 3, difficulty: 'hard', minScore: 0.0 },
    ].slice(0, curriculumPhases);

    const phases: Array<{ phase: number; difficulty: string; sampleCount: number; outputDir: string }> = [];
    let totalSamples = 0;

    for (const threshold of thresholds) {
      const phaseDir = join(outputDir, `phase_${threshold.phase}`);
      mkdirSync(join(phaseDir, 'images'), { recursive: true });
      mkdirSync(join(phaseDir, 'labels'), { recursive: true });

      const nextThreshold = thresholds[thresholds.indexOf(threshold) + 1]?.minScore ?? -1;
      const phaseLabels = labels.filter((l: { teacher_agreement_score: number }) =>
        l.teacher_agreement_score >= threshold.minScore &&
        l.teacher_agreement_score > nextThreshold
      );

      // Write phase manifest
      const manifest = phaseLabels.map((l: { id: string; damage_type: string; teacher_agreement_score: number }) => ({
        id: l.id,
        damageType: l.damage_type,
        agreementScore: l.teacher_agreement_score,
      }));
      writeFileSync(
        join(phaseDir, 'manifest.json'),
        JSON.stringify({ phase: threshold.phase, difficulty: threshold.difficulty, samples: manifest }, null, 2)
      );

      phases.push({
        phase: threshold.phase,
        difficulty: threshold.difficulty,
        sampleCount: phaseLabels.length,
        outputDir: phaseDir,
      });
      totalSamples += phaseLabels.length;
    }

    logger.info('Curriculum data exported', {
      service: SERVICE,
      phases: phases.map(p => `${p.difficulty}: ${p.sampleCount}`),
      totalSamples,
    });

    return { phases, totalSamples };
  } catch (error) {
    logger.error('Failed to export curriculum data', {
      service: SERVICE,
      error,
    });
    return { phases: [], totalSamples: 0 };
  }
}
