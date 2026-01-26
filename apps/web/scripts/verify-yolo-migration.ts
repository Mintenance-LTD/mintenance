#!/usr/bin/env tsx

/**
 * YOLO Migration Verification Script
 *
 * Verifies the integrity of migrated YOLO models by comparing checksums
 * between the original BYTEA data and the uploaded Storage files.
 *
 * Usage:
 *   npm run verify:yolo-migration     # Verify all migrated models
 *   npm run verify:yolo-migration -- --model yolov11  # Verify specific model
 */

import { YOLOModelMigrationService } from '../apps/web/lib/services/building-surveyor/YOLOModelMigrationService';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { parseArgs } from 'util';

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    model: {
      type: 'string',
    },
    help: {
      type: 'boolean',
      default: false,
    },
  },
});

if (values.help) {
  console.log(`
YOLO Migration Verification Script

Verifies the integrity of migrated YOLO models.

Usage:
  tsx scripts/verify-yolo-migration.ts [options]

Options:
  --model NAME   Verify specific model by name
  --help        Show this help message

Examples:
  tsx scripts/verify-yolo-migration.ts
  tsx scripts/verify-yolo-migration.ts --model yolov11
`);
  process.exit(0);
}

async function verifyMigration() {
  console.log('🔍 Verifying YOLO Model Migration');
  console.log('==================================\n');

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const migrationService = new YOLOModelMigrationService(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  );

  try {
    // Build query based on options
    let query = supabase
      .from('yolo_models')
      .select('id, model_name, model_version, storage_migration_status, checksum, storage_path, file_size');

    // Filter by model name if specified
    if (values.model) {
      query = query.eq('model_name', values.model);
    }

    // Only verify migrated models
    query = query.eq('storage_migration_status', 'completed');

    const { data: models, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch models: ${error.message}`);
    }

    if (!models || models.length === 0) {
      console.log('No migrated models found to verify.');
      if (values.model) {
        console.log(`Model '${values.model}' may not exist or hasn't been migrated yet.`);
      }
      return;
    }

    console.log(`Found ${models.length} migrated model(s) to verify\n`);

    const results: Array<{
      modelName: string;
      version: string;
      valid: boolean;
      error?: string;
    }> = [];

    // Verify each model
    for (const model of models) {
      process.stdout.write(`Verifying ${model.model_name} v${model.model_version}... `);

      try {
        const isValid = await migrationService.verifyMigration(model.id);

        if (isValid) {
          console.log('✅ Valid');
          results.push({
            modelName: model.model_name,
            version: model.model_version,
            valid: true,
          });
        } else {
          console.log('❌ Invalid (checksum mismatch)');
          results.push({
            modelName: model.model_name,
            version: model.model_version,
            valid: false,
            error: 'Checksum mismatch',
          });
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.push({
          modelName: model.model_name,
          version: model.model_version,
          valid: false,
          error: error.message,
        });
      }
    }

    // Display summary
    console.log('\n📊 Verification Results:');
    console.log('========================\n');

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;

    console.log(`   Total Checked: ${results.length}`);
    console.log(`   Valid: ${validCount}`);
    console.log(`   Invalid: ${invalidCount}`);

    if (invalidCount > 0) {
      console.log('\n❌ Failed Verifications:');
      results
        .filter(r => !r.valid)
        .forEach(r => {
          console.log(`   - ${r.modelName} v${r.version}: ${r.error}`);
        });

      console.error('\n❌ Some models failed verification!');
      console.error('   You may need to re-run the migration for these models.');
      process.exit(1);
    }

    console.log('\n✅ All models verified successfully!');

    // Additional checks
    console.log('\n📋 Additional Verification:');
    console.log('============================\n');

    // Check for models without checksums
    const { data: noChecksumModels } = await supabase
      .from('yolo_models')
      .select('model_name, model_version')
      .eq('storage_migration_status', 'completed')
      .is('checksum', null);

    if (noChecksumModels && noChecksumModels.length > 0) {
      console.warn('⚠️  Models without checksums (cannot verify):');
      noChecksumModels.forEach(m => {
        console.warn(`   - ${m.model_name} v${m.model_version}`);
      });
    }

    // Check for orphaned storage files
    const progress = await migrationService.getMigrationProgress();
    if (progress.inProgress > 0) {
      console.warn(`\n⚠️  ${progress.inProgress} model(s) still marked as 'in_progress'`);
      console.warn('   These may be stuck from a previous failed migration.');
    }

    // Storage health check
    console.log('\n🏥 Storage Health Check:');

    // Try to list files in storage
    const { data: storageFiles, error: listError } = await supabase.storage
      .from('yolo-models')
      .list('models', {
        limit: 100,
        offset: 0,
      });

    if (listError) {
      console.error(`   ❌ Cannot access storage: ${listError.message}`);
    } else {
      console.log(`   ✅ Storage accessible`);
      console.log(`   📁 Files in storage: ${storageFiles?.length || 0}`);
    }

    // Model size analysis
    console.log('\n📏 Model Size Analysis:');

    const totalSize = models.reduce((sum, m) => sum + (m.file_size || 0), 0);
    const avgSize = models.length > 0 ? totalSize / models.length : 0;

    console.log(`   Total Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Average Size: ${(avgSize / (1024 * 1024)).toFixed(2)} MB`);

    models.forEach(m => {
      const sizeMB = (m.file_size / (1024 * 1024)).toFixed(2);
      console.log(`   - ${m.model_name} v${m.model_version}: ${sizeMB} MB`);
    });

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  verifyMigration()
    .then(() => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { verifyMigration };