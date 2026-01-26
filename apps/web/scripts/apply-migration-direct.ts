/**
 * Apply Combined Platform Enhancements Migration Directly
 * Uses Supabase client to execute SQL via RPC
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  try {
    console.log('🚀 Applying Combined Platform Enhancements Migration...\n');

    // Read the combined migration file
    const filePath = join(process.cwd(), 'supabase', 'migrations', '20250228000000_combined_platform_enhancements.sql');
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log(`📄 Read migration file`);
    console.log(`   SQL length: ${sql.length} characters\n`);

    // Execute SQL using exec_sql RPC function
    console.log('⚙️  Executing SQL via exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      
      if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
        console.error('\n⚠️  The exec_sql RPC function does not exist.');
        console.error('   To create it, run this SQL in Supabase Dashboard:');
        console.error(`
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
        `);
        console.error('\n   Or apply the migration manually:');
        console.error('   1. Go to Supabase Dashboard > SQL Editor');
        console.error('   2. Copy SQL from: supabase/migrations/20250228000000_combined_platform_enhancements.sql');
        console.error('   3. Paste and execute');
      }
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('   Result:', data);
    console.log('\n🎉 Platform enhancements migration complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

applyMigration();

