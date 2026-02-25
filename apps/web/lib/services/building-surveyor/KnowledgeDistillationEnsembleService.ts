/**
 * KnowledgeDistillationEnsembleService
 *
 * Multi-teacher ensemble methods extracted from KnowledgeDistillationService.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Compute teacher agreement for an assessment.
 * Compares GPT-4 and SAM3 outputs to score how much teachers agree.
 * High-agreement labels are more reliable for training.
 */
export async function computeTeacherAgreement(assessmentId: string): Promise<{
  agreementScore: number;
  difficultyScore: number;
  details: { damageTypeMatch: boolean; severityMatch: boolean; confidenceDelta: number };
}> {
  try {
    const { data: gpt4Label } = await serverSupabase
      .from('gpt4_training_labels')
      .select('damage_type, severity, confidence')
      .eq('assessment_id', assessmentId)
      .limit(1)
      .single();

    const { data: sam3Masks } = await serverSupabase
      .from('sam3_training_masks')
      .select('damage_type, scores')
      .eq('assessment_id', assessmentId);

    if (!gpt4Label || !sam3Masks?.length) {
      return {
        agreementScore: 0,
        difficultyScore: 1.0,
        details: { damageTypeMatch: false, severityMatch: false, confidenceDelta: 1.0 },
      };
    }

    const sam3DamageTypes = sam3Masks.map((m: { damage_type: string }) => m.damage_type);
    const sam3AvgConfidence =
      sam3Masks.reduce((sum: number, m: { scores: number[] }) => {
        const maskAvg = m.scores?.length
          ? m.scores.reduce((a: number, b: number) => a + b, 0) / m.scores.length
          : 0;
        return sum + maskAvg;
      }, 0) / sam3Masks.length;

    const damageTypeMatch = sam3DamageTypes.some(
      (t: string) =>
        t.toLowerCase().includes(gpt4Label.damage_type.toLowerCase()) ||
        gpt4Label.damage_type.toLowerCase().includes(t.toLowerCase())
    );

    const confidenceDelta = Math.abs((gpt4Label.confidence / 100) - sam3AvgConfidence);

    let agreementScore = 0.2;
    if (damageTypeMatch) agreementScore += 0.5;
    agreementScore += Math.max(0, 0.3 - confidenceDelta);

    const difficultyScore = 1.0 - agreementScore;

    await serverSupabase
      .from('gpt4_training_labels')
      .update({
        teacher_agreement_score: agreementScore,
        difficulty_score: difficultyScore,
        sam3_agreement: damageTypeMatch,
      })
      .eq('assessment_id', assessmentId);

    logger.debug('Teacher agreement computed', {
      service: 'KnowledgeDistillationService',
      assessmentId,
      agreementScore,
      difficultyScore,
      damageTypeMatch,
    });

    return {
      agreementScore,
      difficultyScore,
      details: { damageTypeMatch, severityMatch: false, confidenceDelta },
    };
  } catch (error) {
    logger.error('Failed to compute teacher agreement', error, {
      service: 'KnowledgeDistillationService',
      assessmentId,
    });
    return {
      agreementScore: 0,
      difficultyScore: 1.0,
      details: { damageTypeMatch: false, severityMatch: false, confidenceDelta: 1.0 },
    };
  }
}

/**
 * Generate soft label (probability distribution) for an assessment.
 * Instead of a hard one-hot label, produces weighted probabilities across
 * all damage classes using Bayesian fusion weights.
 *
 * Weights: SAM3=0.40, GPT4=0.35, SceneGraph=0.25
 */
export async function generateSoftLabel(assessmentId: string): Promise<{
  softLabel: Record<string, number>;
  assessmentId: string;
  teacherSources: string[];
} | null> {
  try {
    const FUSION_WEIGHTS = { gpt4: 0.35, sam3: 0.40, sceneGraph: 0.25 };

    const { data: gpt4Label } = await serverSupabase
      .from('gpt4_training_labels')
      .select('damage_type, severity, confidence')
      .eq('assessment_id', assessmentId)
      .limit(1)
      .single();

    const { data: sam3Masks } = await serverSupabase
      .from('sam3_training_masks')
      .select('damage_type, scores')
      .eq('assessment_id', assessmentId);

    if (!gpt4Label && !sam3Masks?.length) {
      return null;
    }

    const softLabel: Record<string, number> = {};
    const teacherSources: string[] = [];

    if (gpt4Label) {
      const gpt4Confidence = (gpt4Label.confidence || 0) / 100;
      softLabel[gpt4Label.damage_type] =
        (softLabel[gpt4Label.damage_type] || 0) + FUSION_WEIGHTS.gpt4 * gpt4Confidence;
      teacherSources.push('gpt4');
    }

    if (sam3Masks?.length) {
      for (const mask of sam3Masks) {
        const m = mask as { damage_type: string; scores: number[] };
        const maskAvg = m.scores?.length
          ? m.scores.reduce((a: number, b: number) => a + b, 0) / m.scores.length
          : 0;
        softLabel[m.damage_type] =
          (softLabel[m.damage_type] || 0) + FUSION_WEIGHTS.sam3 * maskAvg;
      }
      teacherSources.push('sam3');
    }

    const totalWeight = Object.values(softLabel).reduce((a, b) => a + b, 0);
    if (totalWeight > 0) {
      for (const key of Object.keys(softLabel)) {
        softLabel[key] /= totalWeight;
      }
    }

    return { softLabel, assessmentId, teacherSources };
  } catch (error) {
    logger.error('Failed to generate soft label', error, {
      service: 'KnowledgeDistillationService',
      assessmentId,
    });
    return null;
  }
}
