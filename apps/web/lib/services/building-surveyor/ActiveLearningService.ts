/**
 * Active Learning Service
 *
 * Selects the most informative samples for human review based on:
 * 1. Student model uncertainty (low internal confidence)
 * 2. Teacher disagreement (GPT-4 vs SAM3 conflict)
 * 3. Out-of-distribution score
 *
 * Surfaces these samples in the admin dashboard for prioritized human review,
 * maximizing label quality per human annotation effort.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

export interface ActiveLearningSample {
  assessmentId: string;
  imageUrls: string[];
  informativeness: number;
  reasons: string[];
  studentConfidence: number;
  teacherAgreement: number | null;
  oodScore: number | null;
  damageType: string;
  severity: string;
  createdAt: string;
}

export interface ActiveLearningConfig {
  maxSamples: number;
  minInformativeness: number;
  weightUncertainty: number;
  weightDisagreement: number;
  weightOOD: number;
}

const DEFAULT_CONFIG: ActiveLearningConfig = {
  maxSamples: 50,
  minInformativeness: 0.3,
  weightUncertainty: 0.4,
  weightDisagreement: 0.35,
  weightOOD: 0.25,
};

export class ActiveLearningService {
  /**
   * Select the most informative samples for human review.
   * Combines uncertainty sampling, query-by-committee (teacher disagreement),
   * and OOD detection to prioritize annotations.
   */
  static async selectSamplesForReview(
    config: Partial<ActiveLearningConfig> = {}
  ): Promise<ActiveLearningSample[]> {
    const {
      maxSamples,
      minInformativeness,
      weightUncertainty,
      weightDisagreement,
      weightOOD,
    } = { ...DEFAULT_CONFIG, ...config };

    try {
      // 1. Fetch recent unreviewed assessments with routing decisions
      const { data: routingDecisions } = await serverSupabase
        .from('hybrid_routing_decisions')
        .select('assessment_id, route, confidence, agreement_score, created_at')
        .eq('reviewed', false)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!routingDecisions?.length) {
        return [];
      }

      // 2. Fetch corresponding GPT-4 labels for teacher agreement
      const assessmentIds = routingDecisions.map(
        (r: { assessment_id: string }) => r.assessment_id
      );
      const { data: gpt4Labels } = await serverSupabase
        .from('gpt4_training_labels')
        .select('assessment_id, damage_type, severity, confidence, teacher_agreement_score, image_urls')
        .in('assessment_id', assessmentIds)
        .eq('human_verified', false);

      const labelMap = new Map<string, {
        damage_type: string;
        severity: string;
        confidence: number;
        teacher_agreement_score: number | null;
        image_urls: string[];
      }>();
      for (const label of gpt4Labels || []) {
        labelMap.set(label.assessment_id, label);
      }

      // 3. Score each sample for informativeness
      const scoredSamples: ActiveLearningSample[] = [];

      for (const decision of routingDecisions) {
        const label = labelMap.get(decision.assessment_id);
        const reasons: string[] = [];

        // Uncertainty score: lower student confidence = higher uncertainty
        const studentConfidence = (decision.confidence || 0) / 100;
        const uncertaintyScore = 1.0 - studentConfidence;
        if (uncertaintyScore > 0.5) {
          reasons.push(`Low student confidence (${(studentConfidence * 100).toFixed(0)}%)`);
        }

        // Disagreement score: low teacher agreement = high disagreement
        const teacherAgreement = label?.teacher_agreement_score ?? null;
        const disagreementScore = teacherAgreement !== null
          ? 1.0 - teacherAgreement
          : 0.5; // Unknown defaults to medium
        if (disagreementScore > 0.5) {
          reasons.push('Teacher disagreement detected');
        }

        // OOD score: from agreement_score in routing (low = potentially OOD)
        const agreementPercent = (decision.agreement_score || 0) / 100;
        const oodScore = decision.route === 'gpt4_vision'
          ? 0.7 // GPT-4 fallback suggests model couldn't handle it
          : 1.0 - agreementPercent;
        if (oodScore > 0.6) {
          reasons.push('Potential out-of-distribution sample');
        }

        // Combined informativeness score
        const informativeness =
          weightUncertainty * uncertaintyScore +
          weightDisagreement * disagreementScore +
          weightOOD * oodScore;

        if (informativeness >= minInformativeness) {
          scoredSamples.push({
            assessmentId: decision.assessment_id,
            imageUrls: label?.image_urls || [],
            informativeness,
            reasons,
            studentConfidence,
            teacherAgreement,
            oodScore,
            damageType: label?.damage_type || 'unknown',
            severity: label?.severity || 'unknown',
            createdAt: decision.created_at,
          });
        }
      }

      // 4. Sort by informativeness (most informative first) and limit
      scoredSamples.sort((a, b) => b.informativeness - a.informativeness);
      const selected = scoredSamples.slice(0, maxSamples);

      logger.info('Active learning samples selected', {
        service: 'ActiveLearningService',
        totalCandidates: routingDecisions.length,
        aboveThreshold: scoredSamples.length,
        selected: selected.length,
        avgInformativeness: selected.length > 0
          ? (selected.reduce((s, x) => s + x.informativeness, 0) / selected.length).toFixed(3)
          : 0,
      });

      return selected;
    } catch (error) {
      logger.error('Failed to select active learning samples', error, {
        service: 'ActiveLearningService',
      });
      return [];
    }
  }

  /**
   * Get summary statistics for the active learning queue.
   */
  static async getQueueStats(): Promise<{
    pendingReview: number;
    avgInformativeness: number;
    topReasons: Record<string, number>;
  }> {
    try {
      const samples = await this.selectSamplesForReview({ maxSamples: 100 });

      const topReasons: Record<string, number> = {};
      for (const sample of samples) {
        for (const reason of sample.reasons) {
          topReasons[reason] = (topReasons[reason] || 0) + 1;
        }
      }

      return {
        pendingReview: samples.length,
        avgInformativeness: samples.length > 0
          ? samples.reduce((s, x) => s + x.informativeness, 0) / samples.length
          : 0,
        topReasons,
      };
    } catch (error) {
      logger.error('Failed to get queue stats', error, {
        service: 'ActiveLearningService',
      });
      return { pendingReview: 0, avgInformativeness: 0, topReasons: {} };
    }
  }
}
