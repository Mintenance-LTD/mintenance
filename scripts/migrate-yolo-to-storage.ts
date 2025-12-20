#!/usr/bin/env tsx

/**
 * YOLO Model Migration Script
 *
 * Migrates YOLO models from PostgreSQL BYTEA storage to Supabase Object Storage.
 * Supports dry-run mode, checksum validation, and progress tracking.
 *
 * Usage:
 *   npm run migrate:yolo             # Run migration
 *   npm run migrate:yolo -- --dry-run # Dry run (no changes)
 *   npm run migrate:yolo -- --delete-bytea # Delete BYTEA after success
 */

import { YOLOModelMigrationService } from '../apps/web/lib/services/building-surveyor/YOLOModelMigrationService';
import { config } from 'dotenv';
import { join } from 'path';
import { parseArgs } from 'util';

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
    'delete-bytea': {
      type: 'boolean',
      default: false,
    },
    'batch-size': {
      type: 'string',
      default: '1',
    },
    help: {
      type: 'boolean',
      default: false,
    },
  },
});

// Show help if requested
if (values.help) {
  console.log(`
YOLO Model Migration Script

Migrates YOLO models from PostgreSQL BYTEA storage to Supabase Object Storage.

Usage:
  tsx scripts/migrate-yolo-to-storage.ts [options]

Options:
  --dry-run        Simulate migration without making changes
  --delete-bytea   Delete BYTEA data after successful migration
  --batch-size N   Process N models in parallel (default: 1)
  --help          Show this help message

Examples:
  tsx scripts/migrate-yolo-to-storage.ts
  tsx scripts/migrate-yolo-to-storage.ts --dry-run
  tsx scripts/migrate-yolo-to-storage.ts --delete-bytea --batch-size 2
`);
  process.exit(0);
}

async function runMigration() {
  console.log('🚀 Starting YOLO Model Migration to Storage');
  console.log('==========================================\n');

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease check your .env.local file.');
    process.exit(1);
  }

  const migrationService = new YOLOModelMigrationService(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const options = {
    dryRun: values['dry-run'] as boolean,
    deleteByteaAfterSuccess: values['delete-bytea'] as boolean,
    batchSize: parseInt(values['batch-size'] as string || '1', 10),
    validateChecksum: true,
  };

  if (options.dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  }

  if (options.deleteByteaAfterSuccess && !options.dryRun) {
    console.log('⚠️  WARNING: BYTEA data will be deleted after successful migration');
    console.log('   This action cannot be undone. Make sure you have backups!\n');
  }

  console.log('Configuration:');
  console.log(`   Dry Run: ${options.dryRun}`);
  console.log(`   Delete BYTEA: ${options.deleteByteaAfterSuccess}`);
  console.log(`   Batch Size: ${options.batchSize}`);
  console.log(`   Validate Checksum: ${options.validateChecksum}\n`);

  try {
    // Check current status
    const initialProgress = await migrationService.getMigrationProgress();

    console.log('📊 Current Status:');
    console.log(`   Total Models: ${initialProgress.total}`);
    console.log(`   Already Migrated: ${initialProgress.migrated}`);
    console.log(`   Failed: ${initialProgress.failed}`);
    console.log(`   In Progress: ${initialProgress.inProgress}`);
    console.log(`   Pending: ${initialProgress.pending}\n`);

    if (initialProgress.pending === 0 && initialProgress.failed === 0 && !options.dryRun) {
      console.log('✅ All models already migrated!');
      return;
    }

    // Run migration
    console.log('🔄 Starting migration...\n');

    const results = await migrationService.migrateAllModels(options);

    // Display results
    console.log('\n📋 Migration Results:');
    console.log('========================\n');

    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';

      console.log(`${index + 1}. ${status} ${result.modelName}${duration}`);

      if (result.success) {
        console.log(`   Storage Path: ${result.storagePath}`);
        console.log(`   Checksum: ${result.checksum?.substring(0, 16)}...`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    // Summary statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log('📊 Summary:');
    console.log(`   Total Processed: ${results.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total Time: ${(totalDuration / 1000).toFixed(2)}s`);

    if (results.length > 0) {
      console.log(`   Average Time: ${(totalDuration / results.length / 1000).toFixed(2)}s per model`);
    }

    if (failed > 0) {
      console.warn('\n⚠️  Some migrations failed. Check logs for details.');

      // Get final progress
      const finalProgress = await migrationService.getMigrationProgress();
      console.log('\n📊 Final Status:');
      console.log(`   Total Models: ${finalProgress.total}`);
      console.log(`   Successfully Migrated: ${finalProgress.migrated}`);
      console.log(`   Failed: ${finalProgress.failed}`);
      console.log(`   Remaining: ${finalProgress.pending}`);

      process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');

    // Verification reminder
    if (!options.dryRun) {
      console.log('\n💡 Next steps:');
      console.log('   1. Run verification script: npm run verify:yolo-migration');
      console.log('   2. Test model loading in application');
      console.log('   3. If everything works, consider cleanup script');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { runMigration };