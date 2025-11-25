/**
 * Training Pipeline Runner Script
 * 
 * Orchestrates the complete training pipeline:
 * 1. Export shadow mode data
 * 2. Train Bayesian Fusion weights
 * 3. Populate calibration data
 * 4. Warm up critic
 * 
 * Usage: npx tsx scripts/run-training-pipeline.ts [--skip-export] [--skip-training] [--skip-calibration] [--skip-warmup]
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { execSync } from 'child_process';
import { logger } from '@mintenance/shared';

interface PipelineOptions {
  skipExport?: boolean;
  skipTraining?: boolean;
  skipCalibration?: boolean;
  skipWarmup?: boolean;
}

/**
 * Run a command and log output
 */
function runCommand(command: string, description: string): void {
  try {
    logger.info(`Running: ${description}`);
    console.log(`\n▶ ${description}`);
    execSync(command, { stdio: 'inherit' });
    logger.info(`✓ Completed: ${description}`);
  } catch (error) {
    logger.error(`Failed: ${description}`, { error });
    throw error;
  }
}

/**
 * Main pipeline execution
 */
async function runTrainingPipeline(options: PipelineOptions = {}) {
  try {
    logger.info('Starting training pipeline...');
    console.log('\n🚀 Building Surveyor AI Training Pipeline');
    console.log('==========================================\n');

    const steps: Array<{ name: string; command: string; skip?: boolean }> = [
      {
        name: 'Export Shadow Mode Data',
        command: 'npx tsx scripts/export-shadow-mode-data.ts',
        skip: options.skipExport,
      },
      {
        name: 'Train Bayesian Fusion Weights',
        command: 'python scripts/train-bayesian-fusion.py',
        skip: options.skipTraining,
      },
      {
        name: 'Populate Calibration Data',
        command: 'npx tsx scripts/populate-calibration-data-from-ground-truth.ts',
        skip: options.skipCalibration,
      },
      {
        name: 'Warm Up Critic',
        command: 'npx tsx scripts/warm-up-critic.ts',
        skip: options.skipWarmup,
      },
    ];

    let completed = 0;
    let skipped = 0;

    for (const step of steps) {
      if (step.skip) {
        logger.info(`Skipping: ${step.name}`);
        console.log(`⏭  Skipping: ${step.name}`);
        skipped++;
        continue;
      }

      try {
        runCommand(step.command, step.name);
        completed++;
      } catch (error) {
        logger.error(`Pipeline step failed: ${step.name}`, { error });
        console.error(`\n❌ Pipeline failed at step: ${step.name}`);
        console.error('   Fix the error and re-run the pipeline.');
        process.exit(1);
      }
    }

    console.log('\n✅ Training Pipeline Completed!');
    console.log(`   Completed: ${completed} steps`);
    if (skipped > 0) {
      console.log(`   Skipped: ${skipped} steps`);
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Verify fusion_weights.json was created');
    console.log('   2. Check ab_calibration_data table has entries');
    console.log('   3. Verify ab_critic_models table has updated matrices');
    console.log('   4. Test the trained models with new assessments');

  } catch (error) {
    logger.error('Training pipeline failed', { error });
    console.error('\n❌ Training pipeline failed:', error);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
  return {
    skipExport: args.includes('--skip-export'),
    skipTraining: args.includes('--skip-training'),
    skipCalibration: args.includes('--skip-calibration'),
    skipWarmup: args.includes('--skip-warmup'),
  };
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  await runTrainingPipeline(options);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

