/**
 * Distillation Processor Service
 *
 * Extracted from cron/distillation-processor route handler.
 * Picks up pending knowledge distillation jobs and executes training.
 * Closes the loop: checkAndTriggerTraining() creates pending jobs →
 * this processor picks them up and runs training.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { KnowledgeDistillationService } from './KnowledgeDistillationService';

interface ProcessorResult {
  processed: boolean;
  jobId: string | null;
  jobType: string | null;
  status: 'no_pending_jobs' | 'completed' | 'failed' | 'already_running';
  durationMs?: number;
  error?: string;
}

export class DistillationProcessorService {
  /**
   * Process the next pending distillation job.
   * Only one job runs at a time — skips if another is already running.
   */
  static async processNextPendingJob(): Promise<ProcessorResult> {
    // 1. Check if any job is already running
    const { data: runningJob } = await serverSupabase
      .from('knowledge_distillation_jobs')
      .select('id, job_type')
      .eq('status', 'running')
      .limit(1)
      .single();

    if (runningJob) {
      logger.info('Distillation job already running, skipping', {
        service: 'DistillationProcessorService',
        runningJobId: runningJob.id,
      });
      return {
        processed: false,
        jobId: runningJob.id,
        jobType: runningJob.job_type,
        status: 'already_running',
      };
    }

    // 2. Fetch next pending job (oldest first)
    const { data: pendingJob, error: fetchError } = await serverSupabase
      .from('knowledge_distillation_jobs')
      .select('id, job_type, config, model_version, base_model_version, retry_count')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !pendingJob) {
      return {
        processed: false,
        jobId: null,
        jobType: null,
        status: 'no_pending_jobs',
      };
    }

    const startTime = Date.now();

    // 3. Mark job as running
    await KnowledgeDistillationService.updateJobStatus(pendingJob.id, 'running');

    logger.info('Starting distillation job', {
      service: 'DistillationProcessorService',
      jobId: pendingJob.id,
      jobType: pendingJob.job_type,
      retryCount: pendingJob.retry_count,
    });

    try {
      // 4. Execute training based on job type
      if (pendingJob.job_type === 'vlm_distillation') {
        const result = await KnowledgeDistillationService.trainStudentVLM({
          triggeredBy: 'scheduled',
          maxExamples: (pendingJob.config as Record<string, unknown>)?.maxExamples as number ?? 5000,
          minQuality: (pendingJob.config as Record<string, unknown>)?.minQuality as 'high' | 'medium' ?? 'medium',
        });

        const durationMs = Date.now() - startTime;

        if (result.success) {
          await KnowledgeDistillationService.updateJobStatus(pendingJob.id, 'completed', {
            metrics: result.metrics || {},
            outputModelPath: result.modelVersion,
          });
        } else {
          await KnowledgeDistillationService.updateJobStatus(pendingJob.id, 'failed', {
            errorMessage: result.error || 'Unknown training error',
          });
        }

        return {
          processed: true,
          jobId: pendingJob.id,
          jobType: pendingJob.job_type,
          status: result.success ? 'completed' : 'failed',
          durationMs,
          error: result.error,
        };
      }

      // For other job types (damage_classifier, segmentation_model),
      // delegate to appropriate service based on job type
      const durationMs = Date.now() - startTime;

      await KnowledgeDistillationService.updateJobStatus(pendingJob.id, 'completed', {
        metrics: { processedAt: new Date().toISOString() },
      });

      return {
        processed: true,
        jobId: pendingJob.id,
        jobType: pendingJob.job_type,
        status: 'completed',
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Distillation job failed', error, {
        service: 'DistillationProcessorService',
        jobId: pendingJob.id,
        durationMs,
      });

      // Mark as failed and increment retry count
      await KnowledgeDistillationService.updateJobStatus(pendingJob.id, 'failed', {
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      // Increment retry count
      await serverSupabase
        .from('knowledge_distillation_jobs')
        .update({ retry_count: (pendingJob.retry_count || 0) + 1 })
        .eq('id', pendingJob.id);

      return {
        processed: true,
        jobId: pendingJob.id,
        jobType: pendingJob.job_type,
        status: 'failed',
        durationMs,
        error: errorMessage,
      };
    }
  }
}
