/**
 * Apply Platform Enhancements Migrations to Supabase
 * Uses the exec_sql RPC function to execute SQL migrations
 * 
 * Usage: npx tsx scripts/apply-platform-migrations.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { serverSupabase } from '../apps/web/lib/api/supabaseServer';

async function applyCombinedMigration() {
  console.log('🚀 Applying Platform Enhancements Migration to Supabase...\n');

  try {
    // Read the combined migration file
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const filePath = join(migrationsDir, '20250228000000_combined_platform_enhancements.sql');
    
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`📄 Read migration file: ${filePath}`);
    console.log(`   SQL length: ${sql.length} characters\n`);

    // Execute SQL using exec_sql RPC function
    console.log('⚙️  Executing SQL migration...');
    const { data, error } = await serverSupabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('   Error details:', error);
      
      // If exec_sql doesn't exist, provide alternative instructions
      if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
        console.error('\n⚠️  The exec_sql RPC function does not exist in your database.');
        console.error('   Please create it first or use one of these alternatives:');
        console.error('   1. Supabase Dashboard > SQL Editor > Paste the SQL');
        console.error('   2. Supabase CLI: supabase db push');
        console.error('   3. Create the exec_sql function (see supabase/migrations/)');
      }
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('   Result:', data);
    console.log('\n🎉 Platform enhancements migration complete!\n');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.error('\n⚠️  Alternative methods:');
    console.error('   1. Copy SQL from: supabase/migrations/20250228000000_combined_platform_enhancements.sql');
    console.error('   2. Paste into Supabase Dashboard > SQL Editor');
    console.error('   3. Execute the SQL');
    process.exit(1);
  }
}

applyCombinedMigration();

