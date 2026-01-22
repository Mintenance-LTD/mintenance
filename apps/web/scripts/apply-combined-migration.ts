/**
 * Apply Combined Platform Enhancements Migration
 * Uses the existing MigrationRunner to apply the combined migration
 * 
 * Usage: npx tsx scripts/apply-combined-migration.ts
 */

import { MigrationRunner } from '../apps/web/lib/migration-runner';

async function main() {
  try {
    console.log('🚀 Applying Combined Platform Enhancements Migration...\n');
    
    const runner = new MigrationRunner();
    
    // Apply the combined migration
    const result = await runner.applySpecific('20250228000000_combined_platform_enhancements.sql');
    
    if (result.success) {
      console.log('\n✅ Migration applied successfully!');
      console.log(`   Duration: ${result.duration}ms\n`);
      process.exit(0);
    } else {
      console.error('\n❌ Migration failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

