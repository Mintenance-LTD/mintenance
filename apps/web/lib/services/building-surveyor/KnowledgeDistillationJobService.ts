/**
 * KnowledgeDistillationJobService
 *
 * Training job lifecycle management extracted from KnowledgeDistillationService.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type {
  KnowledgeDistillationJobInput,
  KnowledgeDistillationJobType,
  KnowledgeDistillationJobStatus,
} from './training-data-types';
import { getTrainingStats } from './KnowledgeDistillationQueryService';

const MIN_SAMPLES_FOR_TRAINING = 100;
const MIN_VERIFIED_SAMPLES = 50;

function getDefaultTrainingConfig(jobType: KnowledgeDistillationJobType): Record<string, unknown> {
  const commonConfig = {
    validationSplit: 0.2,
    earlyStopping: { patience: 10, minDelta: 0.001 },
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
  }
  return { ...commonConfig, learningRate: 0.0005, batchSize: 24, epochs: 75 };
}

/**
 * Create a new training job.
 */
export async function createTrainingJob(input: KnowledgeDistillationJobInput): Promise<string> {
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
 * Update training job status.
 */
export async function updateJobStatus(
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
    const updateData: Record<string, unknown> = { status };

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

    const { error } = await serverSupabase
      .from('knowledge_distillation_jobs')
      .update(updateData)
      .eq('id', jobId);

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
 * Mark training data as used in a specific job.
 */
export async function markDataAsUsed(
  jobId: string,
  jobType: KnowledgeDistillationJobType,
  dataIds: string[]
): Promise<void> {
  try {
    const { data: job } = await serverSupabase
      .from('knowledge_distillation_jobs')
      .select('model_version')
      .eq('id', jobId)
      .single();

    const modelVersion = job?.model_version || 'unknown';

    if (jobType === 'damage_classifier') {
      await serverSupabase
        .from('gpt4_training_labels')
        .update({ used_in_training: true, training_version: modelVersion, training_job_id: jobId })
        .in('id', dataIds);
    } else if (jobType === 'segmentation_model') {
      await serverSupabase
        .from('sam3_training_masks')
        .update({ used_in_training: true, training_version: modelVersion, training_job_id: jobId })
        .in('id', dataIds);
    } else if (jobType === 'yolo_enhancement') {
      await serverSupabase
        .from('sam3_pseudo_labels')
        .update({ used_in_training: true, training_version: modelVersion })
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

/**
 * Check if training should be triggered based on accumulated data.
 */
export async function checkAndTriggerTraining(jobType: KnowledgeDistillationJobType): Promise<void> {
  try {
    const stats = await getTrainingStats();

    let shouldTrigger = false;
    let reason = '';

    if (jobType === 'damage_classifier') {
      const { unused, verified } = stats.gpt4Labels;
      if (unused >= MIN_SAMPLES_FOR_TRAINING && verified >= MIN_VERIFIED_SAMPLES) {
        shouldTrigger = true;
        reason = `Sufficient GPT-4 labels accumulated: ${unused} unused, ${verified} verified`;
      }
    } else if (jobType === 'segmentation_model') {
      const { unused, verified } = stats.sam3Masks;
      if (unused >= MIN_SAMPLES_FOR_TRAINING && verified >= MIN_VERIFIED_SAMPLES) {
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

      await createTrainingJob({
        jobType,
        config: getDefaultTrainingConfig(jobType),
        trainingSamplesCount: 0,
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
