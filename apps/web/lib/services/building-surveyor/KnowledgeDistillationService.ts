/**
 * Knowledge Distillation Service
 *
 * Public API shell - all logic extracted into focused sub-services:
 *   KnowledgeDistillationQueryService     - stats, job retrieval, helper queries
 *   KnowledgeDistillationJobService       - job lifecycle (create, update, mark used)
 *   KnowledgeDistillationEnsembleService  - teacher agreement and soft labels
 *   KnowledgeDistillationTrainingService  - training execution (classifier, VLM)
 */

import { logger } from '@mintenance/shared';
import { SAM3TrainingDataService } from './SAM3TrainingDataService';
import type {
  GPT4TrainingLabelInput,
  KnowledgeDistillationJobInput,
  KnowledgeDistillationJobType,
  KnowledgeDistillationJobStatus,
  TrainingJobResult,
  DistillationStats,
} from './training-data-types';
import type { Phase1BuildingAssessment } from './types';
import type { DamageTypeSegmentation } from './SAM3Service';
import { serverSupabase } from '@/lib/api/supabaseServer';

import { getTrainingStats, getJob } from './KnowledgeDistillationQueryService';
import {
  createTrainingJob,
  updateJobStatus,
  markDataAsUsed,
  checkAndTriggerTraining,
} from './KnowledgeDistillationJobService';
import {
  computeTeacherAgreement,
  generateSoftLabel,
} from './KnowledgeDistillationEnsembleService';
import {
  trainDamageClassifier,
  trainStudentVLM,
} from './KnowledgeDistillationTrainingService';

export class KnowledgeDistillationService {
  // ── Record GPT-4 outputs ──────────────────────────────────────────────

  static async recordGPT4Output(
    assessmentId: string,
    gpt4Response: Phase1BuildingAssessment,
    imageUrls: string[],
    contextData?: Record<string, unknown>
  ): Promise<string> {
    try {
      const responseQuality = this.assessGPT4Quality(gpt4Response);

      const input: GPT4TrainingLabelInput = {
        assessmentId,
        imageUrls,
        gpt4Response,
        contextData,
        responseQuality,
      };

      const labelId = await this.storeGPT4Label(input);

      logger.info('GPT-4 Vision output recorded for training', {
        service: 'KnowledgeDistillationService',
        assessmentId,
        damageType: gpt4Response.damageAssessment.damageType,
        confidence: gpt4Response.damageAssessment.confidence,
        quality: responseQuality,
        labelId,
      });

      await checkAndTriggerTraining('damage_classifier');
      return labelId;
    } catch (error) {
      logger.error('Failed to record GPT-4 output', error, {
        service: 'KnowledgeDistillationService',
        assessmentId,
      });
      throw error;
    }
  }

  // ── Record SAM3 outputs ───────────────────────────────────────────────

  static async recordSAM3Output(
    assessmentId: string,
    imageUrl: string,
    sam3Data: DamageTypeSegmentation,
    imageIndex: number = 0
  ): Promise<string[]> {
    try {
      const maskIds = await SAM3TrainingDataService.captureSAM3Output(
        assessmentId, imageUrl, sam3Data, imageIndex
      );

      logger.info('SAM3 outputs recorded for training', {
        service: 'KnowledgeDistillationService',
        assessmentId,
        maskCount: maskIds.length,
      });

      await checkAndTriggerTraining('segmentation_model');
      return maskIds;
    } catch (error) {
      logger.error('Failed to record SAM3 output', error, {
        service: 'KnowledgeDistillationService',
        assessmentId,
      });
      throw error;
    }
  }

  // ── Record SAM2 temporal data ─────────────────────────────────────────

  static async recordSAM2TemporalData(
    assessmentId: string,
    videoResult: {
      trajectories: Array<{
        track_id: string;
        damage_type: string;
        average_confidence: number;
        max_confidence: number;
        consistency_score: number;
        is_consistent: boolean;
        tracking_points: Array<{
          frame_number: number;
          bounding_box: { x1: number; y1: number; x2: number; y2: number };
          confidence: number;
        }>;
      }>;
    }
  ): Promise<number> {
    try {
      let storedCount = 0;

      for (const trajectory of videoResult.trajectories) {
        if (
          trajectory.average_confidence < 0.6 ||
          trajectory.consistency_score < 0.7 ||
          !trajectory.is_consistent
        ) {
          continue;
        }

        const peakPoint = trajectory.tracking_points.reduce((best, point) =>
          point.confidence > best.confidence ? point : best
        );

        const bbox = peakPoint.bounding_box;
        const cx = ((bbox.x1 + bbox.x2) / 2) / 640;
        const cy = ((bbox.y1 + bbox.y2) / 2) / 640;
        const w = (bbox.x2 - bbox.x1) / 640;
        const h = (bbox.y2 - bbox.y1) / 640;
        const yoloLabel =
          '0 ' + cx.toFixed(6) + ' ' + cy.toFixed(6) + ' ' + w.toFixed(6) + ' ' + h.toFixed(6);

        const { error } = await serverSupabase
          .from('sam3_pseudo_labels')
          .insert({
            image_url: 'sam2://assessment/' + assessmentId + '/frame/' + peakPoint.frame_number,
            image_hash: 'sam2-' + assessmentId + '-' + trajectory.track_id,
            damage_types_detected: [trajectory.damage_type],
            segmentation_data: { [trajectory.damage_type]: {
              masks: [],
              boxes: [[bbox.x1, bbox.y1, bbox.x2 - bbox.x1, bbox.y2 - bbox.y1]],
              scores: [peakPoint.confidence],
              numInstances: 1,
            }},
            overall_confidence: peakPoint.confidence,
            min_confidence: trajectory.average_confidence,
            max_confidence: trajectory.max_confidence,
            yolo_labels: yoloLabel,
            passes_quality_threshold: true,
            quality_score: trajectory.consistency_score,
            used_in_training: false,
            human_reviewed: false,
            source: 'sam2_temporal',
          });

        if (!error) {
          storedCount++;
        }
      }

      if (storedCount > 0) {
        logger.info('SAM2 temporal data recorded as pseudo-labels', {
          service: 'KnowledgeDistillationService',
          assessmentId,
          trajectoriesProcessed: videoResult.trajectories.length,
          pseudoLabelsStored: storedCount,
        });

        await checkAndTriggerTraining('damage_classifier');
      }

      return storedCount;
    } catch (error) {
      logger.error('Failed to record SAM2 temporal data', error, {
        service: 'KnowledgeDistillationService',
        assessmentId,
      });
      return 0;
    }
  }

  // ── Private helpers (kept inline — short, tightly coupled) ────────────

  private static async storeGPT4Label(input: GPT4TrainingLabelInput): Promise<string> {
    const { data, error } = await serverSupabase
      .from('gpt4_training_labels')
      .insert({
        assessment_id: input.assessmentId,
        image_urls: input.imageUrls,
        gpt4_response: input.gpt4Response,
        damage_type: input.gpt4Response.damageAssessment.damageType,
        severity: input.gpt4Response.damageAssessment.severity,
        confidence: input.gpt4Response.damageAssessment.confidence,
        safety_hazards: input.gpt4Response.safetyHazards.hazards || [],
        compliance_issues: input.gpt4Response.compliance.complianceIssues || [],
        insurance_risk: input.gpt4Response.insuranceRisk,
        context_data: input.contextData || {},
        response_quality: input.responseQuality,
        used_in_training: false,
        human_verified: false,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error('Failed to store GPT-4 label: ' + error.message);
    }
    return data.id;
  }

  private static assessGPT4Quality(
    response: Phase1BuildingAssessment
  ): 'high' | 'medium' | 'low' | 'uncertain' {
    const confidence = response.damageAssessment.confidence;
    if (
      confidence >= 80 &&
      response.damageAssessment.description &&
      response.damageAssessment.detectedItems.length > 0
    ) {
      return 'high';
    }
    if (confidence >= 60) return 'medium';
    if (confidence >= 40) return 'low';
    return 'uncertain';
  }

  // ── Delegated methods ─────────────────────────────────────────────────

  static async createTrainingJob(input: KnowledgeDistillationJobInput) {
    return createTrainingJob(input);
  }

  static async updateJobStatus(
    jobId: string,
    status: KnowledgeDistillationJobStatus,
    updates?: { metrics?: Record<string, unknown>; outputModelPath?: string; errorMessage?: string; errorStack?: string }
  ) {
    return updateJobStatus(jobId, status, updates);
  }

  static async markDataAsUsed(jobId: string, jobType: KnowledgeDistillationJobType, dataIds: string[]) {
    return markDataAsUsed(jobId, jobType, dataIds);
  }

  static async trainDamageClassifier(jobId?: string): Promise<TrainingJobResult> {
    return trainDamageClassifier(jobId);
  }

  static async trainStudentVLM(options?: {
    maxExamples?: number;
    minQuality?: 'high' | 'medium';
    triggeredBy?: 'scheduled' | 'manual' | 'accuracy_drop' | 'threshold_reached';
  }): Promise<TrainingJobResult> {
    return trainStudentVLM(options);
  }

  static async computeTeacherAgreement(assessmentId: string) {
    return computeTeacherAgreement(assessmentId);
  }

  static async generateSoftLabel(assessmentId: string) {
    return generateSoftLabel(assessmentId);
  }

  static async getTrainingStats(): Promise<DistillationStats> {
    return getTrainingStats();
  }

  static async getJob(jobId: string) {
    return getJob(jobId);
  }
}
