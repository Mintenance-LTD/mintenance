/**
 * KnowledgeDistillationQueryService
 *
 * Read-only statistics and job retrieval methods extracted from KnowledgeDistillationService.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type {
  KnowledgeDistillationJob,
  KnowledgeDistillationJobType,
  KnowledgeDistillationJobStatus,
  DistillationStats,
} from './training-data-types';

/**
 * Get job by ID.
 */
export async function getJob(jobId: string): Promise<KnowledgeDistillationJob> {
  const { data, error } = await serverSupabase
    .from('knowledge_distillation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || \!data) {
    throw new Error(\);
  }

  return mapRowToJob(data);
}

/**
 * Get comprehensive training statistics.
 */
export async function getTrainingStats(): Promise<DistillationStats> {
  try {
    const { data, error } = await serverSupabase.rpc('get_training_data_stats');

    if (error) {
      throw new Error(\);
    }

    const dbStats = data[0] || {};

    const [gpt4ByType, gpt4BySeverity, sam3ByType, sam3ByQuality, jobsByType] = await Promise.all([
      getGPT4LabelsByType(),
      getGPT4LabelsBySeverity(),
      getSAM3MasksByType(),
      getSAM3MasksByQuality(),
      getJobsByType(),
    ]);

    const stats: DistillationStats = {
      gpt4Labels: {
        total: dbStats.gpt4_labels_total || 0,
        unused: dbStats.gpt4_labels_unused || 0,
        verified: dbStats.gpt4_labels_verified || 0,
        byDamageType: gpt4ByType,
        bySeverity: gpt4BySeverity,
        averageConfidence: 0,
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
          (dbStats.gpt4_labels_unused || 0) +
          (dbStats.sam3_masks_unused || 0) +
          (dbStats.pseudo_labels_quality || 0),
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

async function getGPT4LabelsByType(): Promise<Record<string, number>> {
  const { data } = await serverSupabase.from('gpt4_training_labels').select('damage_type');
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const type = row.damage_type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

async function getGPT4LabelsBySeverity(): Promise<Record<string, number>> {
  const { data } = await serverSupabase.from('gpt4_training_labels').select('severity');
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const severity = row.severity || 'unknown';
    counts[severity] = (counts[severity] || 0) + 1;
  }
  return counts;
}

async function getSAM3MasksByType(): Promise<Record<string, number>> {
  const { data } = await serverSupabase.from('sam3_training_masks').select('damage_type');
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const type = row.damage_type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

async function getSAM3MasksByQuality(): Promise<Record<string, number>> {
  const { data } = await serverSupabase.from('sam3_training_masks').select('segmentation_quality');
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const quality = row.segmentation_quality || 'unknown';
    counts[quality] = (counts[quality] || 0) + 1;
  }
  return counts;
}

async function getJobsByType(): Promise<Record<KnowledgeDistillationJobType, number>> {
  const { data } = await serverSupabase.from('knowledge_distillation_jobs').select('job_type');
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const type = row.job_type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts as Record<KnowledgeDistillationJobType, number>;
}

function mapRowToJob(row: Record<string, unknown>): KnowledgeDistillationJob {
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
