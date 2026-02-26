/**
 * VLM Retraining Service
 *
 * Extracted from cron/vlm-retraining route handler.
 * Checks training buffer size, last training date, and triggers
 * VLM student retraining + calibration when thresholds are met.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { KnowledgeDistillationService } from './KnowledgeDistillationService';

const MIN_BUFFER_SIZE = 200;
const MIN_DAYS_BETWEEN_TRAINING = 7;

interface RetrainingResult {
  retraining: boolean;
  message?: string;
  jobId?: string;
  samplesUsed?: number;
  modelVersion?: string;
  durationSeconds?: number;
  calibrationRecalculated?: boolean;
  error?: string;
}

export class VLMRetrainingService {
  /**
   * Check buffer and timing thresholds, then trigger VLM retraining if needed.
   */
  static async checkAndRetrain(): Promise<RetrainingResult> {
    // 1. Check buffer size
    const { count: bufferCount } = await serverSupabase
      .from('vlm_training_buffer')
      .select('id', { count: 'exact', head: true })
      .eq('used_in_training', false);

    if (!bufferCount || bufferCount < MIN_BUFFER_SIZE) {
      return {
        retraining: false,
        message: `No retraining needed: buffer has ${bufferCount ?? 0} unused examples (need >= ${MIN_BUFFER_SIZE})`,
      };
    }

    // 2. Check last VLM training job
    const { data: lastJob } = await serverSupabase
      .from('knowledge_distillation_jobs')
      .select('completed_at, status')
      .eq('job_type', 'vlm_distillation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastJob?.status === 'running') {
      return {
        retraining: false,
        message: 'VLM training already in progress',
      };
    }

    if (lastJob?.completed_at) {
      const daysSinceLastTraining =
        (Date.now() - new Date(lastJob.completed_at).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastTraining < MIN_DAYS_BETWEEN_TRAINING) {
        return {
          retraining: false,
          message: `No retraining needed: last training was ${daysSinceLastTraining.toFixed(1)} days ago (need >= ${MIN_DAYS_BETWEEN_TRAINING})`,
        };
      }
    }

    // 3. Trigger training
    logger.info('VLM retraining triggered', {
      service: 'VLMRetrainingService',
      bufferCount,
    });

    const result = await KnowledgeDistillationService.trainStudentVLM({
      triggeredBy: 'scheduled',
      maxExamples: 5000,
      minQuality: 'medium',
    });

    // 4. Recalibrate after successful training
    let calibrationRecalculated = false;
    if (result.success) {
      try {
        const { CalibrationFeedbackService } = await import(
          './distillation/CalibrationFeedbackService'
        );
        await CalibrationFeedbackService.recalculateAll();
        calibrationRecalculated = true;
        logger.info('Calibration recalculated after VLM retraining', {
          service: 'VLMRetrainingService',
        });
      } catch (calError) {
        logger.warn('Calibration recalculation failed (non-blocking)', {
          service: 'VLMRetrainingService',
          error: calError instanceof Error ? calError.message : String(calError),
        });
      }
    }

    return {
      retraining: true,
      jobId: result.jobId,
      samplesUsed: result.samplesUsed,
      modelVersion: result.modelVersion,
      durationSeconds: result.durationSeconds,
      calibrationRecalculated,
      error: result.error,
    };
  }
}
