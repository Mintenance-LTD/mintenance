/**
 * Knowledge Distillation Service
 *
 * Orchestrates knowledge distillation from GPT-4 Vision and SAM3 to internal models:
 * 1. Records GPT-4 Vision outputs as training labels
 * 2. Records SAM3 outputs as segmentation ground truth
 * 3. Triggers training jobs when thresholds are met
 * 4. Manages training lifecycle and metrics
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { SAM3TrainingDataService } from './SAM3TrainingDataService';
import type {
  GPT4TrainingLabel,
  GPT4TrainingLabelInput,
  SAM3TrainingMask,
  KnowledgeDistillationJob,
  KnowledgeDistillationJobInput,
  KnowledgeDistillationJobType,
  KnowledgeDistillationJobStatus,
  TrainingJobResult,
  DistillationStats,
} from './training-data-types';
import type { Phase1BuildingAssessment } from './types';
import type { DamageTypeSegmentation } from './SAM3Service';

export class KnowledgeDistillationService {
  // Training thresholds
  private static readonly MIN_SAMPLES_FOR_TRAINING = 100;
  private static readonly MIN_VERIFIED_SAMPLES = 50;
  private static readonly TRAINING_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // ========================================================================
  // RECORD GPT-4 OUTPUTS
  // ========================================================================

  /**
   * Record GPT-4 Vision assessment output as training label
   */
  static async recordGPT4Output(
    assessmentId: string,
    gpt4Response: Phase1BuildingAssessment,
    imageUrls: string[],
    contextData?: Record<string, unknown>
  ): Promise<string> {
    try {
      // Assess response quality based on confidence and completeness
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

      // Check if we should trigger training
      await this.checkAndTriggerTraining('damage_classifier');

      return labelId;
    } catch (error) {
      logger.error('Failed to record GPT-4 output', error, {
        service: 'KnowledgeDistillationService',
        assessmentId,
      });
      throw error;
    }
  }

  /**
   * Store GPT-4 training label in database
   */
  private static async storeGPT4Label(input: GPT4TrainingLabelInput): Promise<string> {
    try {
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
        throw new Error(`Failed to store GPT-4 label: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      logger.error('Failed to store GPT-4 label', error, {
        service: 'KnowledgeDistillationService',
      });
      throw error;
    }
  }

  /**
   * Assess GPT-4 response quality
   */
  private static assessGPT4Quality(response: Phase1BuildingAssessment): 'high' | 'medium' | 'low' | 'uncertain' {
    const confidence = response.damageAssessment.confidence;

    // High quality: confident, complete data
    if (
      confidence >= 80 &&
      response.damageAssessment.description &&
      response.damageAssessment.detectedItems.length > 0
    ) {
      return 'high';
    }

    // Medium quality: moderate confidence
    if (confidence >= 60) {
      return 'medium';
    }

    // Low quality: low confidence but still has data
    if (confidence >= 40) {
      return 'low';
    }

    // Uncertain: very low confidence
    return 'uncertain';
  }

  // ========================================================================
  // RECORD SAM3 OUTPUTS
  // ========================================================================

  /**
   * Record SAM3 segmentation output as ground truth
   */
  static async recordSAM3Output(
    assessmentId: string,
    imageUrl: string,
    sam3Data: DamageTypeSegmentation,
    imageIndex: number = 0
  ): Promise<string[]> {
    try {
      const maskIds = await SAM3TrainingDataService.captureSAM3Output(assessmentId, imageUrl, sam3Data, imageIndex);

      logger.info('SAM3 outputs recorded for training', {
        service: 'KnowledgeDistillationService',
        assessmentId,
        maskCount: maskIds.length,
      });

      // Check if we should trigger training
      await this.checkAndTriggerTraining('segmentation_model');

      return maskIds;
    } catch (error) {
      logger.error('Failed to record SAM3 output', error, {
        service: 'KnowledgeDistillationService',
        assessmentId,
      });
      throw error;
    }
  }

  // ========================================================================
  // TRAINING ORCHESTRATION
  // ========================================================================

  /**
   * Check if training should be triggered based on accumulated data
   */
  private static async checkAndTriggerTraining(jobType: KnowledgeDistillationJobType): Promise<void> {
    try {
      const stats = await this.getTrainingStats();

      let shouldTrigger = false;
      let reason = '';

      if (jobType === 'damage_classifier') {
        const { unused, verified } = stats.gpt4Labels;
        if (unused >= this.MIN_SAMPLES_FOR_TRAINING && verified >= this.MIN_VERIFIED_SAMPLES) {
          shouldTrigger = true;
          reason = `Sufficient GPT-4 labels accumulated: ${unused} unused, ${verified} verified`;
        }
      } else if (jobType === 'segmentation_model') {
        const { unused, verified } = stats.sam3Masks;
        if (unused >= this.MIN_SAMPLES_FOR_TRAINING && verified >= this.MIN_VERIFIED_SAMPLES) {
          shouldTrigger = true;
          reason = `Sufficient SAM3 masks accumulated: ${unused} unused, ${verified} verified`;
        }
      }

      if (shouldTrigger) {
        logger.info('Training threshold reached, triggering training job', {
          service: 'KnowledgeDistillationService',
          jobType,
          reason,
        });

        // Create training job (would be picked up by background worker)
        await this.createTrainingJob({
          jobType,
          config: this.getDefaultTrainingConfig(jobType),
          trainingSamplesCount: 0, // Will be updated by worker
          modelVersion: `v${Date.now()}`,
          triggeredBy: 'threshold_reached',
          notes: reason,
        });
      }
    } catch (error) {
      logger.error('Failed to check training trigger', error, {
        service: 'KnowledgeDistillationService',
        jobType,
      });
    }
  }

  /**
   * Get default training configuration for job type
   */
  private static getDefaultTrainingConfig(jobType: KnowledgeDistillationJobType): Record<string, unknown> {
    const commonConfig = {
      validationSplit: 0.2,
      earlyStopping: {
        patience: 10,
        minDelta: 0.001,
      },
    };

    if (jobType === 'damage_classifier') {
      return {
        ...commonConfig,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 50,
        optimizer: 'adam',
        lossFunction: 'categorical_crossentropy',
      };
    } else if (jobType === 'segmentation_model') {
      return {
        ...commonConfig,
        learningRate: 0.0001,
        batchSize: 16,
        epochs: 100,
        optimizer: 'adam',
        lossFunction: 'binary_crossentropy',
      };
    } else {
      return {
        ...commonConfig,
        learningRate: 0.0005,
        batchSize: 24,
        epochs: 75,
      };
    }
  }

  /**
   * Create a new training job
   */
  static async createTrainingJob(input: KnowledgeDistillationJobInput): Promise<string> {
    try {
      const jobId = `kd-${Date.now()}-${input.jobType}`;

      const { error } = await serverSupabase.from('knowledge_distillation_jobs').insert({
        id: jobId,
        job_type: input.jobType,
        status: 'pending',
        config: input.config,
        training_samples_count: input.trainingSamplesCount,
        validation_samples_count: input.validationSamplesCount,
        gpt4_label_ids: input.gpt4LabelIds,
        sam3_mask_ids: input.sam3MaskIds,
        yolo_correction_ids: input.yoloCorrectionIds,
        model_version: input.modelVersion,
        base_model_version: input.baseModelVersion,
        metrics_jsonb: {},
        retry_count: 0,
        triggered_by: input.triggeredBy || 'manual',
        notes: input.notes,
      });

      if (error) {
        throw new Error(`Failed to create training job: ${error.message}`);
      }

      logger.info('Training job created', {
        service: 'KnowledgeDistillationService',
        jobId,
        jobType: input.jobType,
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to create training job', error, {
        service: 'KnowledgeDistillationService',
      });
      throw error;
    }
  }

  /**
   * Update training job status
   */
  static async updateJobStatus(
    jobId: string,
    status: KnowledgeDistillationJobStatus,
    updates?: {
      metrics?: Record<string, unknown>;
      outputModelPath?: string;
      errorMessage?: string;
      errorStack?: string;
    }
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        status,
      };

      if (status === 'running' && !updates) {
        updateData.started_at = new Date().toISOString();
      }

      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      }

      if (updates) {
        if (updates.metrics) updateData.metrics_jsonb = updates.metrics;
        if (updates.outputModelPath) updateData.output_model_path = updates.outputModelPath;
        if (updates.errorMessage) updateData.error_message = updates.errorMessage;
        if (updates.errorStack) updateData.error_stack = updates.errorStack;
      }

      const { error } = await serverSupabase.from('knowledge_distillation_jobs').update(updateData).eq('id', jobId);

      if (error) {
        throw new Error(`Failed to update job status: ${error.message}`);
      }

      logger.info('Training job status updated', {
        service: 'KnowledgeDistillationService',
        jobId,
        status,
      });
    } catch (error) {
      logger.error('Failed to update job status', error, {
        service: 'KnowledgeDistillationService',
        jobId,
      });
      throw error;
    }
  }

  /**
   * Mark training data as used in a specific job
   */
  static async markDataAsUsed(
    jobId: string,
    jobType: KnowledgeDistillationJobType,
    dataIds: string[]
  ): Promise<void> {
    try {
      // Get job details for version info
      const { data: job } = await serverSupabase
        .from('knowledge_distillation_jobs')
        .select('model_version')
        .eq('id', jobId)
        .single();

      const modelVersion = job?.model_version || 'unknown';

      if (jobType === 'damage_classifier') {
        await serverSupabase
          .from('gpt4_training_labels')
          .update({
            used_in_training: true,
            training_version: modelVersion,
            training_job_id: jobId,
          })
          .in('id', dataIds);
      } else if (jobType === 'segmentation_model') {
        await serverSupabase
          .from('sam3_training_masks')
          .update({
            used_in_training: true,
            training_version: modelVersion,
            training_job_id: jobId,
          })
          .in('id', dataIds);
      } else if (jobType === 'yolo_enhancement') {
        await serverSupabase
          .from('sam3_pseudo_labels')
          .update({
            used_in_training: true,
            training_version: modelVersion,
          })
          .in('id', dataIds);
      }

      logger.info('Training data marked as used', {
        service: 'KnowledgeDistillationService',
        jobId,
        jobType,
        count: dataIds.length,
      });
    } catch (error) {
      logger.error('Failed to mark data as used', error, {
        service: 'KnowledgeDistillationService',
        jobId,
      });
      throw error;
    }
  }

  // ========================================================================
  // TRAINING EXECUTION (stub - actual training would be in separate worker)
  // ========================================================================

  /**
   * Train damage classifier from GPT-4 labels
   * NOTE: This is a stub - actual training would happen in a background worker
   */
  static async trainDamageClassifier(jobId?: string): Promise<TrainingJobResult> {
    try {
      const job = jobId
        ? await this.getJob(jobId)
        : await this.createTrainingJob({
            jobType: 'damage_classifier',
            config: this.getDefaultTrainingConfig('damage_classifier'),
            trainingSamplesCount: 0,
            modelVersion: `v${Date.now()}`,
            triggeredBy: 'manual',
          });

      const actualJobId = typeof job === 'string' ? job : job.id;

      await this.updateJobStatus(actualJobId, 'running');

      // Actual training would happen here in a background worker
      // For now, this is a placeholder

      logger.info('Damage classifier training job created', {
        service: 'KnowledgeDistillationService',
        jobId: actualJobId,
      });

      return {
        jobId: actualJobId,
        success: true,
        modelVersion: `v${Date.now()}`,
        metrics: {},
        durationSeconds: 0,
        samplesUsed: 0,
      };
    } catch (error) {
      logger.error('Failed to train damage classifier', error, {
        service: 'KnowledgeDistillationService',
      });
      throw error;
    }
  }

  // ========================================================================
  // STATISTICS AND MONITORING
  // ========================================================================

  /**
   * Get comprehensive training statistics
   */
  static async getTrainingStats(): Promise<DistillationStats> {
    try {
      // Query database for stats using helper function
      const { data, error } = await serverSupabase.rpc('get_training_data_stats');

      if (error) {
        throw new Error(`Failed to get training stats: ${error.message}`);
      }

      const dbStats = data[0] || {};

      // Get detailed breakdowns
      const [gpt4ByType, gpt4BySeverity, sam3ByType, sam3ByQuality, jobsByType] = await Promise.all([
        this.getGPT4LabelsByType(),
        this.getGPT4LabelsBySeverity(),
        this.getSAM3MasksByType(),
        this.getSAM3MasksByQuality(),
        this.getJobsByType(),
      ]);

      const stats: DistillationStats = {
        gpt4Labels: {
          total: dbStats.gpt4_labels_total || 0,
          unused: dbStats.gpt4_labels_unused || 0,
          verified: dbStats.gpt4_labels_verified || 0,
          byDamageType: gpt4ByType,
          bySeverity: gpt4BySeverity,
          averageConfidence: 0, // Would calculate from DB
        },
        sam3Masks: {
          total: dbStats.sam3_masks_total || 0,
          unused: dbStats.sam3_masks_unused || 0,
          verified: dbStats.sam3_masks_verified || 0,
          byDamageType: sam3ByType,
          byQuality: sam3ByQuality,
          averageNumInstances: 0,
          totalAffectedArea: 0,
        },
        pseudoLabels: {
          total: dbStats.pseudo_labels_total || 0,
          qualityPassing: dbStats.pseudo_labels_quality || 0,
          approved: dbStats.pseudo_labels_approved || 0,
          rejected: 0,
          needsReview: 0,
          averageQualityScore: 0,
        },
        jobs: {
          active: dbStats.active_jobs || 0,
          completed: dbStats.completed_jobs || 0,
          failed: 0,
          byType: jobsByType,
        },
        readyForTraining: {
          gpt4LabelsCount: dbStats.gpt4_labels_unused || 0,
          sam3MasksCount: dbStats.sam3_masks_unused || 0,
          pseudoLabelsCount: dbStats.pseudo_labels_quality || 0,
          totalSamplesReady:
            (dbStats.gpt4_labels_unused || 0) + (dbStats.sam3_masks_unused || 0) + (dbStats.pseudo_labels_quality || 0),
        },
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get training stats', error, {
        service: 'KnowledgeDistillationService',
      });
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  private static async getJob(jobId: string): Promise<KnowledgeDistillationJob> {
    const { data, error } = await serverSupabase.from('knowledge_distillation_jobs').select('*').eq('id', jobId).single();

    if (error || !data) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return this.mapRowToJob(data);
  }

  /**
   * Helper: Get GPT-4 labels by damage type
   */
  private static async getGPT4LabelsByType(): Promise<Record<string, number>> {
    const { data } = await serverSupabase.from('gpt4_training_labels').select('damage_type');

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const type = row.damage_type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Get GPT-4 labels by severity
   */
  private static async getGPT4LabelsBySeverity(): Promise<Record<string, number>> {
    const { data } = await serverSupabase.from('gpt4_training_labels').select('severity');

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const severity = row.severity || 'unknown';
      counts[severity] = (counts[severity] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Get SAM3 masks by damage type
   */
  private static async getSAM3MasksByType(): Promise<Record<string, number>> {
    const { data } = await serverSupabase.from('sam3_training_masks').select('damage_type');

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const type = row.damage_type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Get SAM3 masks by quality
   */
  private static async getSAM3MasksByQuality(): Promise<Record<string, number>> {
    const { data } = await serverSupabase.from('sam3_training_masks').select('segmentation_quality');

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const quality = row.segmentation_quality || 'unknown';
      counts[quality] = (counts[quality] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Get jobs by type
   */
  private static async getJobsByType(): Promise<Record<KnowledgeDistillationJobType, number>> {
    const { data } = await serverSupabase.from('knowledge_distillation_jobs').select('job_type');

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const type = row.job_type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts as Record<KnowledgeDistillationJobType, number>;
  }

  /**
   * Map database row to KnowledgeDistillationJob
   */
  private static mapRowToJob(row: Record<string, unknown>): KnowledgeDistillationJob {
    return {
      id: row.id as string,
      jobType: row.job_type as KnowledgeDistillationJobType,
      status: row.status as KnowledgeDistillationJobStatus,
      config: (row.config as Record<string, unknown>) || {},
      trainingSamplesCount: row.training_samples_count as number,
      validationSamplesCount: row.validation_samples_count as number | undefined,
      gpt4LabelIds: row.gpt4_label_ids as string[] | undefined,
      sam3MaskIds: row.sam3_mask_ids as string[] | undefined,
      yoloCorrectionIds: row.yolo_correction_ids as string[] | undefined,
      modelVersion: row.model_version as string,
      baseModelVersion: row.base_model_version as string | undefined,
      metricsJsonb: (row.metrics_jsonb as Record<string, unknown>) || {},
      outputModelPath: row.output_model_path as string | undefined,
      startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      durationSeconds: row.duration_seconds as number | undefined,
      errorMessage: row.error_message as string | undefined,
      errorStack: row.error_stack as string | undefined,
      retryCount: row.retry_count as number,
      triggeredBy: row.triggered_by as 'scheduled' | 'manual' | 'accuracy_drop' | 'threshold_reached',
      notes: row.notes as string | undefined,
      createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
    };
  }
}
