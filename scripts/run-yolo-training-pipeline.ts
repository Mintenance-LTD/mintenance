#!/usr/bin/env tsx

/**
 * YOLO Training Pipeline Automation Script
 *
 * Complete end-to-end automation for YOLO model training:
 * 1. Check if training conditions are met
 * 2. Export training data (with image download)
 * 3. Validate dataset quality
 * 4. Run Python training script
 * 5. Convert to ONNX format
 * 6. Evaluate model performance
 * 7. Deploy if metrics are acceptable
 * 8. Mark corrections as used
 *
 * Usage:
 *   npm run train:yolo                    # Full automatic training
 *   npm run train:yolo -- --dry-run      # Check conditions only
 *   npm run train:yolo -- --force        # Skip threshold checks
 */

import { YOLORetrainingService } from '../apps/web/lib/services/building-surveyor/YOLORetrainingService';
import { YOLOTrainingDataEnhanced } from '../apps/web/lib/services/building-surveyor/YOLOTrainingDataEnhanced';
import { YOLOCorrectionService } from '../apps/web/lib/services/building-surveyor/YOLOCorrectionService';
import { YOLOModelMigrationService } from '../apps/web/lib/services/building-surveyor/YOLOModelMigrationService';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { parseArgs } from 'util';
import { spawn } from 'child_process';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'dry-run': {
      type: 'boolean',
      default: false,
    },
    force: {
      type: 'boolean',
      default: false,
    },
    'skip-training': {
      type: 'boolean',
      default: false,
    },
    'skip-deployment': {
      type: 'boolean',
      default: false,
    },
    'min-corrections': {
      type: 'string',
      default: '50',
    },
    'output-dir': {
      type: 'string',
      default: 'training-data/continuous-learning',
    },
    help: {
      type: 'boolean',
      default: false,
    },
  },
});

if (values.help) {
  console.log(`
YOLO Training Pipeline Automation

Complete end-to-end automation for YOLO model training.

Usage:
  tsx scripts/run-yolo-training-pipeline.ts [options]

Options:
  --dry-run           Check conditions without running training
  --force            Skip threshold checks and train anyway
  --skip-training    Skip the training step (export data only)
  --skip-deployment  Skip automatic deployment
  --min-corrections  Minimum corrections required (default: 50)
  --output-dir       Output directory for training data
  --help            Show this help message

Examples:
  tsx scripts/run-yolo-training-pipeline.ts
  tsx scripts/run-yolo-training-pipeline.ts --dry-run
  tsx scripts/run-yolo-training-pipeline.ts --force --min-corrections 10
`);
  process.exit(0);
}

interface TrainingMetrics {
  mAP50: number;
  mAP50_95: number;
  precision: number;
  recall: number;
  f1: number;
  trainingTime: number;
}

interface ModelDeploymentConfig {
  minMAP50: number;
  minPrecision: number;
  minRecall: number;
}

class YOLOTrainingPipeline {
  private supabase: ReturnType<typeof createClient>;
  private config = {
    minCorrections: parseInt(values['min-corrections'] as string || '50'),
    outputDir: values['output-dir'] as string || 'training-data/continuous-learning',
    dryRun: values['dry-run'] as boolean,
    force: values.force as boolean,
    skipTraining: values['skip-training'] as boolean,
    skipDeployment: values['skip-deployment'] as boolean,
    deployment: {
      minMAP50: 0.70,
      minPrecision: 0.75,
      minRecall: 0.70,
    } as ModelDeploymentConfig,
  };

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );
  }

  /**
   * Main pipeline execution
   */
  async run(): Promise<void> {
    console.log('🚀 Starting YOLO Training Pipeline');
    console.log('=====================================\n');

    try {
      // Step 1: Check training conditions
      const shouldTrain = await this.checkTrainingConditions();
      if (!shouldTrain && !this.config.force) {
        console.log('ℹ️  Training conditions not met. Use --force to override.');
        return;
      }

      if (this.config.dryRun) {
        console.log('✅ Dry run complete. Training would proceed.');
        return;
      }

      // Step 2: Export training data
      const dataset = await this.exportTrainingData();

      // Step 3: Validate dataset
      const validation = await this.validateDataset(dataset.dataYaml.path);
      if (!validation.valid) {
        throw new Error(`Dataset validation failed: ${validation.issues.join(', ')}`);
      }

      // Step 4: Run training (if not skipped)
      let modelPath: string | null = null;
      let metrics: TrainingMetrics | null = null;

      if (!this.config.skipTraining) {
        const trainingResult = await this.runTraining(dataset.dataYaml.path);
        modelPath = trainingResult.modelPath;
        metrics = trainingResult.metrics;

        // Step 5: Evaluate model
        const shouldDeploy = await this.evaluateModel(metrics);

        // Step 6: Deploy model (if metrics pass and not skipped)
        if (shouldDeploy && !this.config.skipDeployment) {
          await this.deployModel(modelPath, metrics);
        }
      }

      // Step 7: Mark corrections as used
      await this.markCorrectionsAsUsed();

      console.log('\n✅ Training pipeline completed successfully!');

    } catch (error: any) {
      console.error('\n❌ Training pipeline failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  }

  /**
   * Check if training conditions are met
   */
  private async checkTrainingConditions(): Promise<boolean> {
    console.log('📋 Checking training conditions...\n');

    // Get correction statistics
    const stats = await YOLOCorrectionService.getCorrectionStats();
    const approvedCount = stats.approved - stats.used;

    console.log(`   Approved corrections available: ${approvedCount}`);
    console.log(`   Minimum required: ${this.config.minCorrections}`);

    // Check last training time
    const { data: lastJob } = await this.supabase
      .from('yolo_retraining_jobs')
      .select('completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastJob) {
      const daysSinceLastTraining = Math.floor(
        (Date.now() - new Date(lastJob.completed_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`   Days since last training: ${daysSinceLastTraining}`);
    }

    const conditionsMet = approvedCount >= this.config.minCorrections;
    console.log(`\n   Conditions met: ${conditionsMet ? '✅' : '❌'}`);

    return conditionsMet;
  }

  /**
   * Export training data with enhanced features
   */
  private async exportTrainingData() {
    console.log('\n📦 Exporting training data...\n');

    const dataset = await YOLOTrainingDataEnhanced.exportEnhancedTrainingData({
      outputDir: this.config.outputDir,
      trainSplit: 0.8,
      valSplit: 0.1,
      downloadImages: true,
      includeBaseDataset: true,
      includeSAM3Masks: true,
      maxCorrections: 1000,
    });

    console.log('   Dataset statistics:');
    console.log(`   - Base dataset: ${dataset.stats.baseDataset.train} train, ${dataset.stats.baseDataset.val} val, ${dataset.stats.baseDataset.test} test`);
    console.log(`   - Corrections: ${dataset.stats.corrections.train} train, ${dataset.stats.corrections.val} val, ${dataset.stats.corrections.test} test`);
    console.log(`   - Total: ${dataset.stats.total.train} train, ${dataset.stats.total.val} val, ${dataset.stats.total.test} test`);
    console.log(`   - Output directory: ${dataset.dataYaml.path}`);

    return dataset;
  }

  /**
   * Validate dataset quality
   */
  private async validateDataset(datasetPath: string) {
    console.log('\n🔍 Validating dataset...\n');

    const validation = await YOLOTrainingDataEnhanced.validateTrainingData(datasetPath);

    if (validation.valid) {
      console.log('   ✅ Dataset validation passed');
      console.log(`   - Total images: ${validation.stats.totalImages}`);
      console.log(`   - Total labels: ${validation.stats.totalLabels}`);
    } else {
      console.log('   ❌ Dataset validation failed');
      validation.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }

    return validation;
  }

  /**
   * Run Python training script
   */
  private async runTraining(datasetPath: string): Promise<{
    modelPath: string;
    metrics: TrainingMetrics;
  }> {
    console.log('\n🏋️ Running YOLO training...\n');

    return new Promise((resolve, reject) => {
      const pythonScript = join(__dirname, '..', 'scripts', 'retrain-yolo-continuous.py');
      const baseModel = join(__dirname, '..', 'runs', 'detect', 'building-defect-v2-normalized-cpu', 'weights', 'best.pt');

      // Check if base model exists
      if (!existsSync(baseModel)) {
        console.warn('   ⚠️  Base model not found, training from scratch');
      }

      const args = [
        pythonScript,
        '--output-dir', datasetPath,
        '--base-model', baseModel,
        '--epochs', '50',
        '--batch', '16',
        '--lr0', '0.001',
        '--imgsz', '640',
        '--device', 'cpu', // Use 'cuda' if GPU available
      ];

      console.log('   Command:', 'python', args.join(' '));

      const pythonProcess = spawn('python', args, {
        cwd: join(__dirname, '..'),
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Show training progress
        if (output.includes('Epoch') || output.includes('mAP')) {
          process.stdout.write(`   ${output}`);
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('   Training failed:', stderr);
          reject(new Error(`Training process exited with code ${code}`));
          return;
        }

        // Parse metrics from output
        const metrics = this.parseTrainingMetrics(stdout);

        // Find the output model
        const modelPath = this.findTrainedModel(datasetPath);

        if (!modelPath) {
          reject(new Error('Could not find trained model'));
          return;
        }

        console.log('\n   ✅ Training completed successfully');
        console.log(`   Model saved: ${modelPath}`);
        console.log(`   Metrics:`, metrics);

        resolve({ modelPath, metrics });
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse training metrics from Python output
   */
  private parseTrainingMetrics(output: string): TrainingMetrics {
    // Parse metrics from training output
    // This depends on the format of your Python script output
    const mAP50Match = output.match(/mAP50:\s*([\d.]+)/);
    const mAP50_95Match = output.match(/mAP50-95:\s*([\d.]+)/);
    const precisionMatch = output.match(/Precision:\s*([\d.]+)/);
    const recallMatch = output.match(/Recall:\s*([\d.]+)/);

    const metrics: TrainingMetrics = {
      mAP50: mAP50Match ? parseFloat(mAP50Match[1]) : 0,
      mAP50_95: mAP50_95Match ? parseFloat(mAP50_95Match[1]) : 0,
      precision: precisionMatch ? parseFloat(precisionMatch[1]) : 0,
      recall: recallMatch ? parseFloat(recallMatch[1]) : 0,
      f1: 0,
      trainingTime: 0,
    };

    // Calculate F1 score
    if (metrics.precision > 0 && metrics.recall > 0) {
      metrics.f1 = 2 * (metrics.precision * metrics.recall) / (metrics.precision + metrics.recall);
    }

    return metrics;
  }

  /**
   * Find the trained model file
   */
  private findTrainedModel(datasetPath: string): string | null {
    // Look for ONNX model in expected locations
    const possiblePaths = [
      join(datasetPath, 'weights', 'best.onnx'),
      join(__dirname, '..', 'apps', 'web', 'models', 'yolov11-continuous.onnx'),
      join(__dirname, '..', 'runs', 'detect', 'latest', 'weights', 'best.onnx'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Look for PyTorch model and note it needs conversion
    const ptPath = join(datasetPath, 'weights', 'best.pt');
    if (existsSync(ptPath)) {
      console.log('   ℹ️  Found PyTorch model, needs ONNX conversion: ' + ptPath);
      return ptPath;
    }

    return null;
  }

  /**
   * Evaluate model performance
   */
  private async evaluateModel(metrics: TrainingMetrics): Promise<boolean> {
    console.log('\n📊 Evaluating model performance...\n');

    const passed =
      metrics.mAP50 >= this.config.deployment.minMAP50 &&
      metrics.precision >= this.config.deployment.minPrecision &&
      metrics.recall >= this.config.deployment.minRecall;

    console.log(`   mAP@50: ${metrics.mAP50.toFixed(3)} (min: ${this.config.deployment.minMAP50})`);
    console.log(`   Precision: ${metrics.precision.toFixed(3)} (min: ${this.config.deployment.minPrecision})`);
    console.log(`   Recall: ${metrics.recall.toFixed(3)} (min: ${this.config.deployment.minRecall})`);
    console.log(`   F1 Score: ${metrics.f1.toFixed(3)}`);
    console.log(`\n   Evaluation: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (!passed) {
      console.log('   ⚠️  Model does not meet minimum performance requirements');
    }

    return passed;
  }

  /**
   * Deploy model to production
   */
  private async deployModel(modelPath: string, metrics: TrainingMetrics): Promise<void> {
    console.log('\n🚀 Deploying model...\n');

    // Check if it's an ONNX model
    if (!modelPath.endsWith('.onnx')) {
      console.log('   ⚠️  Model needs ONNX conversion before deployment');
      // TODO: Run ONNX conversion script
      return;
    }

    // Read model file
    const modelBuffer = readFileSync(modelPath);
    const fileSize = modelBuffer.length;
    const checksum = createHash('sha256').update(modelBuffer).digest('hex');

    console.log(`   Model size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Checksum: ${checksum.substring(0, 16)}...`);

    // Upload to Supabase Storage
    const version = `continuous-${Date.now()}`;
    const storagePath = `models/yolov11/${version}/model.onnx`;

    console.log(`   Uploading to storage: ${storagePath}`);

    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('yolo-models')
      .upload(storagePath, modelBuffer, {
        contentType: 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload model: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from('yolo-models')
      .getPublicUrl(storagePath);

    // Update database with new model
    const { data: modelRecord, error: dbError } = await this.supabase
      .from('yolo_models')
      .insert({
        model_name: 'yolov11',
        model_version: version,
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        storage_bucket: 'yolo-models',
        file_size: fileSize,
        checksum,
        performance_metrics: metrics,
        is_active: true,
        status: 'deployed',
        model_type: 'onnx',
        description: `Continuous learning model - mAP50: ${metrics.mAP50.toFixed(3)}`,
        storage_migration_status: 'completed',
        storage_migrated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to register model: ${dbError.message}`);
    }

    // Deactivate previous models
    await this.supabase
      .from('yolo_models')
      .update({ is_active: false })
      .eq('model_name', 'yolov11')
      .neq('id', modelRecord.id);

    console.log('   ✅ Model deployed successfully');
    console.log(`   Model ID: ${modelRecord.id}`);
    console.log(`   Version: ${version}`);
  }

  /**
   * Mark corrections as used in training
   */
  private async markCorrectionsAsUsed(): Promise<void> {
    console.log('\n📝 Marking corrections as used...\n');

    const corrections = await YOLOCorrectionService.getApprovedCorrections(1000);
    const correctionIds = corrections.map(c => c.id);

    if (correctionIds.length > 0) {
      await YOLOCorrectionService.markAsUsedInTraining(
        correctionIds,
        `training-${Date.now()}`
      );

      console.log(`   Marked ${correctionIds.length} corrections as used`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const pipeline = new YOLOTrainingPipeline();

  pipeline.run()
    .then(() => {
      console.log('\n👋 Pipeline complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Pipeline error:', error);
      process.exit(1);
    });
}

export { YOLOTrainingPipeline };