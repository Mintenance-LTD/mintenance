/**
 * YOLO Retraining Service
 * 
 * Manages scheduled retraining of YOLO model with continuous learning.
 * 
 * Features:
 * - Check if enough corrections collected
 * - Trigger retraining automatically
 * - Track retraining jobs
 * - Deploy new models
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { YOLOCorrectionService } from './YOLOCorrectionService';
import { YOLOTrainingDataService } from './YOLOTrainingDataService';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFileSync } from 'fs';

const execAsync = promisify(exec);

export interface RetrainingConfig {
  minCorrections: number; // Minimum corrections before retraining
  maxCorrections: number; // Maximum corrections per training run
  retrainingIntervalDays: number; // Days between retraining checks
  autoApprove: boolean; // Auto-approve corrections (for testing)
}

const DEFAULT_CONFIG: RetrainingConfig = {
  minCorrections: 100,
  maxCorrections: 1000,
  retrainingIntervalDays: 7,
  autoApprove: false,
};

export interface RetrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  correctionsCount: number;
  modelVersion?: string;
  onnxPath?: string;
  metrics?: {
    mAP50?: number;
    mAP50_95?: number;
    precision?: number;
    recall?: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * YOLO Retraining Service
 */
export class YOLORetrainingService {
  private static config: RetrainingConfig = DEFAULT_CONFIG;
  private static isRetraining = false;

  /**
   * Configure retraining parameters
   */
  static configure(config: Partial<RetrainingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('YOLO retraining configured', {
      service: 'YOLORetrainingService',
      config: this.config,
    });
  }

  /**
   * Check if retraining should be triggered
   */
  static async shouldRetrain(): Promise<boolean> {
    try {
      const stats = await YOLOCorrectionService.getCorrectionStats();
      
      // Check if enough approved corrections
      if (stats.approved < this.config.minCorrections) {
        logger.debug('Not enough corrections for retraining', {
          service: 'YOLORetrainingService',
          approved: stats.approved,
          required: this.config.minCorrections,
        });
        return false;
      }

      // Check if already retraining
      if (this.isRetraining) {
        logger.debug('Retraining already in progress', {
          service: 'YOLORetrainingService',
        });
        return false;
      }

      // Check last retraining time
      const lastRetraining = await this.getLastRetrainingTime();
      if (lastRetraining) {
        const daysSince = (Date.now() - lastRetraining.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < this.config.retrainingIntervalDays) {
          logger.debug('Too soon since last retraining', {
            service: 'YOLORetrainingService',
            daysSince: daysSince.toFixed(1),
            required: this.config.retrainingIntervalDays,
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to check if should retrain', error, {
        service: 'YOLORetrainingService',
      });
      return false;
    }
  }

  /**
   * Trigger retraining (if conditions met)
   */
  static async checkAndRetrain(): Promise<RetrainingJob | null> {
    try {
      if (!(await this.shouldRetrain())) {
        return null;
      }

      logger.info('Triggering YOLO retraining', {
        service: 'YOLORetrainingService',
        config: this.config,
      });

      return await this.triggerRetraining();
    } catch (error) {
      logger.error('Failed to check and retrain', error, {
        service: 'YOLORetrainingService',
      });
      return null;
    }
  }

  /**
   * Trigger retraining manually
   */
  static async triggerRetraining(): Promise<RetrainingJob> {
    if (this.isRetraining) {
      throw new Error('Retraining already in progress');
    }

    this.isRetraining = true;
    const jobId = `retrain-${Date.now()}`;

    try {
      logger.info('Starting YOLO retraining', {
        service: 'YOLORetrainingService',
        jobId,
      });

      // 1. Get approved corrections
      const corrections = await YOLOCorrectionService.getApprovedCorrections(
        this.config.maxCorrections
      );

      if (corrections.length === 0) {
        throw new Error('No approved corrections available');
      }

      logger.info('Preparing training data', {
        service: 'YOLORetrainingService',
        correctionsCount: corrections.length,
      });

      // 2. Export corrections to YOLO format
      const outputDir = 'training-data/continuous-learning';
      await YOLOTrainingDataService.exportCorrectionsToYOLO(outputDir);

      // 3. Execute Python retraining script
      const scriptPath = join(process.cwd(), 'scripts', 'retrain-yolo-continuous.py');
      const command = `python "${scriptPath}" --output-dir "${outputDir}"`;

      logger.info('Executing retraining script', {
        service: 'YOLORetrainingService',
        command,
      });

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr && !stderr.includes('WARNING')) {
        logger.warn('Retraining script warnings', {
          service: 'YOLORetrainingService',
          stderr,
        });
      }

      // 4. Parse results from stdout or metadata file
      const modelVersion = this.extractModelVersion(stdout);
      const onnxPath = this.findLatestONNXModel();
      const metrics = await this.loadModelMetrics(modelVersion);

      // 5. Mark corrections as used
      const correctionIds = corrections.map(c => c.id!).filter(Boolean);
      await YOLOCorrectionService.markAsUsedInTraining(
        correctionIds,
        modelVersion || 'unknown'
      );

      // 6. Save retraining job record
      const job: RetrainingJob = {
        id: jobId,
        status: 'completed',
        correctionsCount: corrections.length,
        modelVersion,
        onnxPath,
        metrics,
        startedAt: new Date(),
        completedAt: new Date(),
      };

      await this.saveRetrainingJob(job);

      logger.info('YOLO retraining completed', {
        service: 'YOLORetrainingService',
        jobId,
        modelVersion,
        correctionsCount: corrections.length,
        metrics,
      });

      return job;
    } catch (error) {
      const job: RetrainingJob = {
        id: jobId,
        status: 'failed',
        correctionsCount: 0,
        startedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      await this.saveRetrainingJob(job);

      logger.error('YOLO retraining failed', error, {
        service: 'YOLORetrainingService',
        jobId,
      });

      throw error;
    } finally {
      this.isRetraining = false;
    }
  }

  /**
   * Get last retraining time
   */
  private static async getLastRetrainingTime(): Promise<Date | null> {
    try {
      const { data } = await serverSupabase
        .from('yolo_retraining_jobs')
        .select('completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (data?.completed_at) {
        return new Date(data.completed_at);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract model version from stdout
   */
  private static extractModelVersion(stdout: string): string | undefined {
    const match = stdout.match(/Model version: (continuous-learning-v[\d_]+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Find latest ONNX model
   */
  private static findLatestONNXModel(): string | undefined {
    try {
      const modelsDir = join(process.cwd(), 'apps', 'web', 'models');
      const fs = require('fs');
      
      if (!fs.existsSync(modelsDir)) {
        return undefined;
      }

      interface FileWithMtime {
        name: string;
        path: string;
        mtime: Date;
      }
      
      const files = fs.readdirSync(modelsDir)
        .filter((f: string) => f.startsWith('yolov11-continuous-') && f.endsWith('.onnx'))
        .map((f: string): FileWithMtime => ({
          name: f,
          path: join(modelsDir, f),
          mtime: fs.statSync(join(modelsDir, f)).mtime,
        }))
        .sort((a: FileWithMtime, b: FileWithMtime) => b.mtime.getTime() - a.mtime.getTime());

      return files.length > 0 ? files[0].path : undefined;
    } catch (error) {
      logger.warn('Failed to find latest ONNX model', {
        service: 'YOLORetrainingService',
        error,
      });
      return undefined;
    }
  }

  /**
   * Load model metrics from metadata file
   */
  private static async loadModelMetrics(modelVersion?: string): Promise<RetrainingJob['metrics']> {
    if (!modelVersion) return undefined;

    try {
      const modelsDir = join(process.cwd(), 'apps', 'web', 'models');
      const metadataPath = join(modelsDir, `model-metadata-${modelVersion}.json`);

      if (!require('fs').existsSync(metadataPath)) {
        return undefined;
      }

      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      return metadata.metrics;
    } catch (error) {
      logger.warn('Failed to load model metrics', {
        service: 'YOLORetrainingService',
        error,
      });
      return undefined;
    }
  }

  /**
   * Save retraining job to database
   */
  private static async saveRetrainingJob(job: RetrainingJob): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('yolo_retraining_jobs')
        .upsert({
          id: job.id,
          status: job.status,
          corrections_count: job.correctionsCount,
          model_version: job.modelVersion,
          onnx_path: job.onnxPath,
          metrics_jsonb: job.metrics || {},
          started_at: job.startedAt?.toISOString(),
          completed_at: job.completedAt?.toISOString(),
          error_message: job.error,
        }, {
          onConflict: 'id',
        });

      if (error) {
        logger.error('Failed to save retraining job to database', {
          service: 'YOLORetrainingService',
          error: error.message,
        });
      } else {
        logger.info('Retraining job saved to database', {
          service: 'YOLORetrainingService',
          jobId: job.id,
        });
      }
    } catch (error) {
      logger.error('Failed to save retraining job', error, {
        service: 'YOLORetrainingService',
      });
    }
  }

  /**
   * Get retraining status
   */
  static getStatus(): {
    isRetraining: boolean;
    config: RetrainingConfig;
  } {
    return {
      isRetraining: this.isRetraining,
      config: this.config,
    };
  }

  /**
   * Get last retraining job from database
   */
  static async getLastJob(): Promise<RetrainingJob | null> {
    try {
      const { data, error } = await serverSupabase
        .from('yolo_retraining_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        status: data.status as 'pending' | 'running' | 'completed' | 'failed',
        correctionsCount: data.corrections_count,
        modelVersion: data.model_version || undefined,
        onnxPath: data.onnx_path || undefined,
        metrics: data.metrics_jsonb || undefined,
        startedAt: data.started_at ? new Date(data.started_at) : undefined,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        error: data.error_message || undefined,
      };
    } catch (error) {
      logger.error('Failed to get last retraining job', {
        service: 'YOLORetrainingService',
        error,
      });
      return null;
    }
  }
}

