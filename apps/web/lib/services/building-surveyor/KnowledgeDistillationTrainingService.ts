/**
 * KnowledgeDistillationTrainingService
 *
 * Training execution methods extracted from KnowledgeDistillationService:
 * trainDamageClassifier, trainStudentVLM.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { YOLORetrainingService } from './YOLORetrainingService';
import { YOLOTrainingDataEnhanced } from './YOLOTrainingDataEnhanced';
import type {
  KnowledgeDistillationJobInput,
  TrainingJobResult,
} from './training-data-types';
import { getJob } from './KnowledgeDistillationQueryService';
import {
  createTrainingJob,
  updateJobStatus,
  markDataAsUsed,
} from './KnowledgeDistillationJobService';

/**
 * Train damage classifier from GPT-4 labels.
 * NOTE: This is a stub - actual training would happen in a background worker.
 */
export async function trainDamageClassifier(jobId?: string): Promise<TrainingJobResult> {
  try {
    const job = jobId
      ? await getJob(jobId)
      : await createTrainingJob({
          jobType: 'damage_classifier',
          config: {
            validationSplit: 0.2,
            earlyStopping: { patience: 10, minDelta: 0.001 },
            learningRate: 0.001,
            batchSize: 32,
            epochs: 50,
            optimizer: 'adam',
            lossFunction: 'categorical_crossentropy',
          },
          trainingSamplesCount: 0,
          modelVersion: 'v' + Date.now(),
          triggeredBy: 'manual',
        });

    const actualJobId = typeof job === 'string' ? job : job.id;

    await updateJobStatus(actualJobId, 'running');

    const startTime = Date.now();

    // 1. Fetch unused GPT-4 labels (quality >= medium)
    const { data: gpt4Labels } = await serverSupabase
      .from('gpt4_training_labels')
      .select('id, image_urls, damage_type, severity, confidence')
      .eq('used_in_training', false)
      .in('response_quality', ['high', 'medium'])
      .order('confidence', { ascending: false })
      .limit(500);

    // 2. Fetch approved pseudo-labels from SAM3
    const { data: pseudoLabels } = await serverSupabase
      .from('sam3_pseudo_labels')
      .select('id, image_url, yolo_labels, quality_score')
      .eq('used_in_training', false)
      .eq('passes_quality_threshold', true)
      .order('quality_score', { ascending: false })
      .limit(500);

    // 3. Fetch approved YOLO corrections
    const { data: corrections } = await serverSupabase
      .from('yolo_corrections')
      .select('id')
      .eq('status', 'approved')
      .eq('used_in_training', false)
      .limit(500);

    const totalSamples =
      (gpt4Labels?.length || 0) +
      (pseudoLabels?.length || 0) +
      (corrections?.length || 0);

    if (totalSamples === 0) {
      await updateJobStatus(actualJobId, 'failed', {
        errorMessage: 'No training data available from any teacher source',
      });
      return {
        jobId: actualJobId,
        success: false,
        modelVersion: '',
        metrics: {},
        durationSeconds: 0,
        samplesUsed: 0,
        error: 'No training data available',
      };
    }

    logger.info('Training data collected from teachers', {
      service: 'KnowledgeDistillationService',
      jobId: actualJobId,
      gpt4Labels: gpt4Labels?.length || 0,
      pseudoLabels: pseudoLabels?.length || 0,
      corrections: corrections?.length || 0,
    });

    // 4. Export enhanced training dataset (creates YOLO-format files)
    await YOLOTrainingDataEnhanced.exportEnhancedTrainingData({
      outputDir: 'training-data/distillation-' + actualJobId,
      maxCorrections: 1000,
      includeSAM3Masks: true,
    });

    // 5. Delegate to YOLORetrainingService for actual Python training
    const retrainingJob = await YOLORetrainingService.triggerRetraining();

    // 6. Mark all teacher data as used
    if (gpt4Labels?.length) {
      const ids = gpt4Labels.map((l: { id: string }) => l.id);
      await markDataAsUsed(actualJobId, 'damage_classifier', ids);
    }
    if (pseudoLabels?.length) {
      const ids = pseudoLabels.map((l: { id: string }) => l.id);
      await markDataAsUsed(actualJobId, 'yolo_enhancement', ids);
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    const metrics = retrainingJob.metrics || {};

    // 7. Update job with real metrics
    await updateJobStatus(actualJobId, 'completed', {
      metrics: {
        ...metrics,
        gpt4LabelsUsed: gpt4Labels?.length || 0,
        pseudoLabelsUsed: pseudoLabels?.length || 0,
        correctionsUsed: corrections?.length || 0,
        retrainingJobId: retrainingJob.id,
      },
      outputModelPath: retrainingJob.onnxPath,
    });

    // 8. Trigger evaluation and A/B test deployment if model was produced
    if (retrainingJob.onnxPath && retrainingJob.modelVersion) {
      try {
        const { ContinuousLearningService } = await import('./ContinuousLearningService');
        await ContinuousLearningService.evaluateAndDeploy(
          retrainingJob.onnxPath,
          retrainingJob.modelVersion
        );
      } catch (evalError) {
        logger.warn('Model evaluation/deployment skipped', {
          service: 'KnowledgeDistillationService',
          error: evalError instanceof Error ? evalError.message : 'unknown',
        });
      }
    }

    logger.info('Damage classifier training completed', {
      service: 'KnowledgeDistillationService',
      jobId: actualJobId,
      totalSamples,
      durationSeconds,
      modelVersion: retrainingJob.modelVersion,
    });

    return {
      jobId: actualJobId,
      success: true,
      modelVersion: retrainingJob.modelVersion || 'v' + Date.now(),
      metrics,
      outputModelPath: retrainingJob.onnxPath,
      durationSeconds,
      samplesUsed: totalSamples,
    };
  } catch (error) {
    logger.error('Failed to train damage classifier', error, {
      service: 'KnowledgeDistillationService',
    });
    throw error;
  }
}

/**
 * Train student VLM by exporting buffer data and creating a distillation job.
 * Called by the vlm-retraining cron or manually via admin API.
 */
export async function trainStudentVLM(options?: {
  maxExamples?: number;
  minQuality?: 'high' | 'medium';
  triggeredBy?: 'scheduled' | 'manual' | 'accuracy_drop' | 'threshold_reached';
}): Promise<TrainingJobResult> {
  const { TrainingDataExporter } = await import('./distillation/TrainingDataExporter');

  const triggeredBy = options?.triggeredBy ?? 'manual';
  const maxExamples = options?.maxExamples ?? 5000;
  const minQuality = options?.minQuality ?? 'medium';

  // 1. Create the distillation job record
  const jobInput: KnowledgeDistillationJobInput = {
    jobType: 'vlm_distillation',
    config: {
      learningRate: 2e-4,
      batchSize: 2,
      epochs: 3,
      optimizer: 'adamw',
      lossFunction: 'cross_entropy',
      loraRank: 16,
      loraAlpha: 32,
      maxExamples,
      minQuality,
    },
    trainingSamplesCount: 0,
    modelVersion: 'mint-vlm-' + Date.now(),
    baseModelVersion: 'qwen2.5-vl-3b',
    triggeredBy,
    notes: 'VLM distillation: max ' + maxExamples + ' examples, min quality ' + minQuality,
  };

  const jobId = await createTrainingJob(jobInput);
  await updateJobStatus(jobId, 'running');
  const startTime = Date.now();

  try {
    // 2. Export training data from buffer
    const exportResult = await TrainingDataExporter.exportToQwenFormat({
      maxExamples,
      minQuality,
    });

    if (exportResult.count < 10) {
      await updateJobStatus(jobId, 'failed', {
        errorMessage: 'Insufficient training data: ' + exportResult.count + ' examples (need >= 10)',
      });
      return {
        jobId,
        success: false,
        modelVersion: jobInput.modelVersion,
        metrics: {},
        durationSeconds: (Date.now() - startTime) / 1000,
        samplesUsed: exportResult.count,
        error: 'Insufficient training data: ' + exportResult.count + ' examples',
      };
    }

    // 3. Upload JSONL to Supabase Storage
    const storagePath = 'vlm-training/' + jobId + '/training_data.jsonl';
    const { error: uploadError } = await serverSupabase.storage
      .from('training-data')
      .upload(storagePath, exportResult.jsonl, { contentType: 'application/jsonl', upsert: true });

    if (uploadError) {
      logger.warn('Failed to upload training JSONL to storage', {
        service: 'KnowledgeDistillationService',
        error: uploadError.message,
      });
    }

    // 4. POST to training webhook if configured (validated HTTPS only)
    const webhookUrl = process.env.VLM_TRAINING_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      let webhookValid = false;
      try {
        const parsed = new URL(webhookUrl);
        webhookValid = parsed.protocol === 'https:' ||
          (process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:');
      } catch { /* invalid URL */ }

      if (!webhookValid) {
        logger.warn('VLM_TRAINING_WEBHOOK_URL is not a valid HTTPS URL, skipping', {
          service: 'KnowledgeDistillationService',
        });
      } else {
        await serverSupabase.storage
          .from('training-data')
          .createSignedUrl(storagePath, 3600);

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            modelVersion: jobInput.modelVersion,
            storagePath,
            samplesCount: exportResult.count,
            config: jobInput.config,
          }),
        });
      }
    }

    // 5. Mark buffer rows as used
    await TrainingDataExporter.markExported(exportResult.ids, 1);

    const durationSeconds = (Date.now() - startTime) / 1000;
    const metrics = {
      samplesExported: exportResult.count,
      storagePath,
      webhookNotified: !!webhookUrl,
    };

    await updateJobStatus(jobId, 'completed', {
      metrics,
      outputModelPath: storagePath,
    });

    // Update training samples count
    await serverSupabase
      .from('knowledge_distillation_jobs')
      .update({
        training_samples_count: exportResult.count,
        duration_seconds: Math.round(durationSeconds),
      })
      .eq('id', jobId);

    return {
      jobId,
      success: true,
      modelVersion: jobInput.modelVersion,
      metrics,
      outputModelPath: storagePath,
      durationSeconds: Math.round(durationSeconds),
      samplesUsed: exportResult.count,
    };
  } catch (error) {
    const durationSeconds = (Date.now() - startTime) / 1000;
    await updateJobStatus(jobId, 'failed', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      jobId,
      success: false,
      modelVersion: jobInput.modelVersion,
      metrics: {},
      durationSeconds: Math.round(durationSeconds),
      samplesUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
