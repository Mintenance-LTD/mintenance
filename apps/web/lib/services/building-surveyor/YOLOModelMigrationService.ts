/**
 * YOLO Model Migration Service
 *
 * Handles migration of YOLO models from PostgreSQL BYTEA storage
 * to Supabase Object Storage with zero downtime support.
 *
 * Features:
 * - Migrate models from BYTEA to Storage
 * - Checksum validation for integrity
 * - Progress tracking and reporting
 * - Rollback capability
 * - Batch migration support
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { logger } from '@mintenance/shared';

export interface MigrationProgress {
  total: number;
  migrated: number;
  failed: number;
  inProgress: number;
  pending: number;
}

export interface MigrationResult {
  modelId: string;
  modelName: string;
  success: boolean;
  storagePath?: string;
  checksum?: string;
  error?: string;
  duration?: number;
}

export interface ModelMigrationOptions {
  batchSize?: number;
  validateChecksum?: boolean;
  deleteByteaAfterSuccess?: boolean;
  dryRun?: boolean;
}

interface YOLOModel {
  id: string;
  model_name: string;
  model_version: string;
  model_data: unknown; // BYTEA data
  file_size: number;
  storage_migration_status: string | null;
  storage_path: string | null;
  checksum: string | null;
  created_at: string;
  updated_at: string;
}

export class YOLOModelMigrationService {
  private supabase: SupabaseClient;
  private serviceName = 'YOLOModelMigrationService';

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }

  /**
   * Migrate all models from BYTEA to Storage
   */
  async migrateAllModels(options: ModelMigrationOptions = {}): Promise<MigrationResult[]> {
    const {
      batchSize = 1,
      validateChecksum = true,
      deleteByteaAfterSuccess = false,
      dryRun = false
    } = options;

    const results: MigrationResult[] = [];

    try {
      // Get migration progress
      const progress = await this.getMigrationProgress();

      logger.info('Starting YOLO model migration', {
        service: this.serviceName,
        progress,
        options
      });

      if (progress.pending === 0 && progress.failed === 0) {
        logger.info('No models to migrate', {
          service: this.serviceName
        });
        return results;
      }

      // Get all models that need migration
      const { data: models, error } = await this.supabase
        .from('yolo_models')
        .select('*')
        .or('storage_migration_status.is.null,storage_migration_status.in.(pending,failed)')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch models: ${error.message}`);
      }

      if (!models || models.length === 0) {
        return results;
      }

      // Process models in batches
      for (let i = 0; i < models.length; i += batchSize) {
        const batch = models.slice(i, Math.min(i + batchSize, models.length));

        // Process batch in parallel
        const batchResults = await Promise.allSettled(
          batch.map(model => this.migrateModel(model, {
            validateChecksum,
            deleteByteaAfterSuccess,
            dryRun
          }))
        );

        // Collect results
        batchResults.forEach((result, index) => {
          const model = batch[index];
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              modelId: model.id,
              modelName: model.model_name,
              success: false,
              error: result.reason?.message || 'Unknown error'
            });
          }
        });
      }

      // Log final summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      logger.info('Migration completed', {
        service: this.serviceName,
        total: results.length,
        successful,
        failed
      });

      return results;
    } catch (error) {
      logger.error('Migration failed', {
        service: this.serviceName,
        error
      });
      throw error;
    }
  }

  /**
   * Migrate a single model to Storage
   */
  async migrateModel(
    model: YOLOModel,
    options: Partial<ModelMigrationOptions> = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const {
      validateChecksum = true,
      deleteByteaAfterSuccess = false,
      dryRun = false
    } = options;

    try {
      logger.info('Migrating model', {
        service: this.serviceName,
        modelId: model.id,
        modelName: model.model_name,
        version: model.model_version,
        fileSize: model.file_size,
        dryRun
      });

      // Mark as in progress (unless dry run)
      if (!dryRun) {
        await this.updateMigrationStatus(model.id, 'in_progress');
      }

      // Convert BYTEA to Buffer
      const modelBuffer = Buffer.from(model.model_data);

      // Calculate checksum for integrity verification
      const checksum = createHash('sha256').update(modelBuffer).digest('hex');

      // Storage path convention: models/{name}/{version}/model.onnx
      const storagePath = `models/${model.model_name}/${model.model_version}/model.onnx`;

      if (dryRun) {
        logger.info('Dry run - would upload model', {
          service: this.serviceName,
          modelId: model.id,
          storagePath,
          checksum,
          fileSizeMB: (model.file_size / (1024 * 1024)).toFixed(2)
        });

        return {
          modelId: model.id,
          modelName: model.model_name,
          success: true,
          storagePath,
          checksum,
          duration: Date.now() - startTime
        };
      }

      // Upload to Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('yolo-models')
        .upload(storagePath, modelBuffer, {
          contentType: 'application/octet-stream',
          upsert: true, // Overwrite if exists (for retries)
          cacheControl: '3600', // Cache for 1 hour
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL (or create signed URL for private bucket)
      const { data: urlData } = this.supabase.storage
        .from('yolo-models')
        .getPublicUrl(storagePath);

      // Validate upload if requested
      if (validateChecksum) {
        const isValid = await this.validateUpload(storagePath, checksum);
        if (!isValid) {
          throw new Error('Checksum validation failed after upload');
        }
      }

      // Update database record with storage info
      const updateData: unknown = {
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        storage_bucket: 'yolo-models',
        storage_migration_status: 'completed',
        storage_migrated_at: new Date().toISOString(),
        checksum,
      };

      // Optionally delete BYTEA data
      if (deleteByteaAfterSuccess) {
        updateData.model_data = null;
      }

      const { error: updateError } = await this.supabase
        .from('yolo_models')
        .update(updateData)
        .eq('id', model.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      const duration = Date.now() - startTime;

      logger.info('Model migrated successfully', {
        service: this.serviceName,
        modelId: model.id,
        modelName: model.model_name,
        storagePath,
        checksum,
        fileSizeMB: (model.file_size / (1024 * 1024)).toFixed(2),
        durationMs: duration
      });

      return {
        modelId: model.id,
        modelName: model.model_name,
        success: true,
        storagePath,
        checksum,
        duration
      };

    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      logger.error('Model migration failed', {
        service: this.serviceName,
        modelId: model.id,
        modelName: model.model_name,
        error: error.message,
        durationMs: duration
      });

      // Mark as failed (unless dry run)
      if (!dryRun) {
        await this.updateMigrationStatus(model.id, 'failed', error.message);
      }

      return {
        modelId: model.id,
        modelName: model.model_name,
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Verify migration integrity by comparing checksums
   */
  async verifyMigration(modelId: string): Promise<boolean> {
    try {
      // Get model from database
      const { data: model, error: dbError } = await this.supabase
        .from('yolo_models')
        .select('model_data, storage_path, checksum, model_name')
        .eq('id', modelId)
        .single();

      if (dbError || !model) {
        logger.error('Failed to fetch model for verification', {
          service: this.serviceName,
          modelId,
          error: dbError
        });
        return false;
      }

      if (!model.storage_path || !model.checksum) {
        logger.warn('Model not migrated yet', {
          service: this.serviceName,
          modelId,
          modelName: model.model_name
        });
        return false;
      }

      // Download from Storage
      const { data: storageData, error: downloadError } = await this.supabase.storage
        .from('yolo-models')
        .download(model.storage_path);

      if (downloadError || !storageData) {
        logger.error('Failed to download model from storage', {
          service: this.serviceName,
          modelId,
          storagePath: model.storage_path,
          error: downloadError
        });
        return false;
      }

      // Calculate checksum of downloaded file
      const downloadedBuffer = Buffer.from(await storageData.arrayBuffer());
      const downloadedChecksum = createHash('sha256')
        .update(downloadedBuffer)
        .digest('hex');

      // Compare checksums
      const isValid = downloadedChecksum === model.checksum;

      if (isValid) {
        logger.info('Migration verified successfully', {
          service: this.serviceName,
          modelId,
          modelName: model.model_name,
          checksum: model.checksum
        });
      } else {
        logger.error('Migration verification failed - checksum mismatch', {
          service: this.serviceName,
          modelId,
          modelName: model.model_name,
          expected: model.checksum,
          actual: downloadedChecksum
        });
      }

      return isValid;

    } catch (error) {
      logger.error('Verification failed', {
        service: this.serviceName,
        modelId,
        error
      });
      return false;
    }
  }

  /**
   * Rollback a migration by restoring from BYTEA
   */
  async rollbackMigration(modelId: string): Promise<boolean> {
    try {
      logger.info('Rolling back migration', {
        service: this.serviceName,
        modelId
      });

      // Get model with storage info
      const { data: model, error: fetchError } = await this.supabase
        .from('yolo_models')
        .select('storage_path, model_name, model_data')
        .eq('id', modelId)
        .single();

      if (fetchError || !model) {
        throw new Error(`Failed to fetch model: ${fetchError?.message}`);
      }

      // Check if BYTEA data still exists
      if (!model.model_data) {
        logger.error('Cannot rollback - BYTEA data already deleted', {
          service: this.serviceName,
          modelId,
          modelName: model.model_name
        });
        return false;
      }

      // Delete from storage if exists
      if (model.storage_path) {
        const { error: deleteError } = await this.supabase.storage
          .from('yolo-models')
          .remove([model.storage_path]);

        if (deleteError) {
          logger.warn('Failed to delete from storage during rollback', {
            service: this.serviceName,
            modelId,
            storagePath: model.storage_path,
            error: deleteError
          });
        }
      }

      // Clear storage references in database
      const { error: updateError } = await this.supabase
        .from('yolo_models')
        .update({
          storage_path: null,
          storage_url: null,
          storage_migration_status: null,
          storage_migrated_at: null,
          checksum: null
        })
        .eq('id', modelId);

      if (updateError) {
        throw new Error(`Failed to update database: ${updateError.message}`);
      }

      logger.info('Migration rolled back successfully', {
        service: this.serviceName,
        modelId,
        modelName: model.model_name
      });

      return true;

    } catch (error) {
      logger.error('Rollback failed', {
        service: this.serviceName,
        modelId,
        error
      });
      return false;
    }
  }

  /**
   * Get migration progress statistics
   */
  async getMigrationProgress(): Promise<MigrationProgress> {
    try {
      const { data, error } = await this.supabase
        .from('yolo_models')
        .select('storage_migration_status')
        .not('model_data', 'is', null);

      if (error || !data) {
        return {
          total: 0,
          migrated: 0,
          failed: 0,
          inProgress: 0,
          pending: 0
        };
      }

      const progress: MigrationProgress = {
        total: data.length,
        migrated: 0,
        failed: 0,
        inProgress: 0,
        pending: 0
      };

      data.forEach(model => {
        switch (model.storage_migration_status) {
          case 'completed':
            progress.migrated++;
            break;
          case 'failed':
            progress.failed++;
            break;
          case 'in_progress':
            progress.inProgress++;
            break;
          case 'pending':
          case null:
            progress.pending++;
            break;
        }
      });

      return progress;

    } catch (error) {
      logger.error('Failed to get migration progress', {
        service: this.serviceName,
        error
      });

      return {
        total: 0,
        migrated: 0,
        failed: 0,
        inProgress: 0,
        pending: 0
      };
    }
  }

  /**
   * Update migration status in database
   */
  private async updateMigrationStatus(
    modelId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const updateData: unknown = {
      storage_migration_status: status
    };

    if (status === 'failed' && errorMessage) {
      // Store error in migration tracking table
      await this.supabase
        .from('yolo_model_migrations')
        .insert({
          model_id: modelId,
          migration_type: 'bytea_to_storage',
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        });
    }

    await this.supabase
      .from('yolo_models')
      .update(updateData)
      .eq('id', modelId);
  }

  /**
   * Validate uploaded file by downloading and comparing checksum
   */
  private async validateUpload(storagePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from('yolo-models')
        .download(storagePath);

      if (error || !data) {
        return false;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const actualChecksum = createHash('sha256').update(buffer).digest('hex');

      return actualChecksum === expectedChecksum;

    } catch (error) {
      logger.error('Upload validation failed', {
        service: this.serviceName,
        storagePath,
        error
      });
      return false;
    }
  }

  /**
   * Clean up orphaned storage files (files without database records)
   */
  async cleanupOrphanedFiles(): Promise<number> {
    let deletedCount = 0;

    try {
      // List all files in storage
      const { data: files, error: listError } = await this.supabase.storage
        .from('yolo-models')
        .list('models', {
          limit: 1000,
          offset: 0
        });

      if (listError || !files) {
        throw new Error(`Failed to list storage files: ${listError?.message}`);
      }

      // Get all storage paths from database
      const { data: models, error: dbError } = await this.supabase
        .from('yolo_models')
        .select('storage_path')
        .not('storage_path', 'is', null);

      if (dbError) {
        throw new Error(`Failed to fetch model paths: ${dbError.message}`);
      }

      const validPaths = new Set(models?.map(m => m.storage_path) || []);

      // Find orphaned files
      const orphanedFiles = files.filter(file => {
        const fullPath = `models/${file.name}`;
        return !validPaths.has(fullPath);
      });

      if (orphanedFiles.length > 0) {
        logger.info('Found orphaned files', {
          service: this.serviceName,
          count: orphanedFiles.length
        });

        // Delete orphaned files
        const { error: deleteError } = await this.supabase.storage
          .from('yolo-models')
          .remove(orphanedFiles.map(f => `models/${f.name}`));

        if (deleteError) {
          throw new Error(`Failed to delete orphaned files: ${deleteError.message}`);
        }

        deletedCount = orphanedFiles.length;
      }

      logger.info('Cleanup completed', {
        service: this.serviceName,
        deletedCount
      });

    } catch (error) {
      logger.error('Cleanup failed', {
        service: this.serviceName,
        error
      });
    }

    return deletedCount;
  }
}