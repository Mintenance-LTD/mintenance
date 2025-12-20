/**
 * Apply A/B Testing Schema Migration
 * Uses Supabase API to execute SQL migration
 * 
 * Usage: npx tsx scripts/apply-ab-test-schema.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   These should be in your .env.local file');
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
    console.log('🚀 Applying A/B Testing Schema Migration...\n');
    console.log(`   Project: ${supabaseUrl}\n`);

    // Read the migration file
    const migrationFile = '20250229000001_ab_test_schema.sql';
    const filePath = join(process.cwd(), 'supabase', 'migrations', migrationFile);
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log(`📄 Read migration file: ${migrationFile}`);
    console.log(`   SQL length: ${sql.length} characters\n`);

    // Method 1: Try using Supabase REST API with exec_sql RPC
    console.log('⚙️  Attempting to execute via Supabase API...');
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Migration applied successfully via API!');
      console.log('\n🎉 A/B Testing schema is now deployed!\n');
      process.exit(0);
      
    } catch (apiError: any) {
      // If exec_sql doesn't exist, provide manual instructions
      if (apiError.message?.includes('function exec_sql') || 
          apiError.message?.includes('does not exist') ||
          apiError.code === 'P0001') {
        
        console.log('⚠️  Direct API execution not available');
        console.log('\n📋 Manual Application Required:\n');
        console.log('   Option 1: Supabase Dashboard (Recommended)');
        console.log('   ────────────────────────────────────────────');
        console.log('   1. Go to: https://app.supabase.com/project/ukrjudtlvapiajkjbcrd/sql');
        console.log('   2. Click "New query"');
        console.log('   3. Copy the contents of:');
        console.log(`      supabase/migrations/${migrationFile}`);
        console.log('   4. Paste into the SQL editor');
        console.log('   5. Click "Run" (or press Ctrl+Enter)\n');
        
        console.log('   Option 2: Using psql (if you have database password)');
        console.log('   ──────────────────────────────────────────────────────');
        console.log('   Get your database password from:');
        console.log('   https://app.supabase.com/project/ukrjudtlvapiajkjbcrd/settings/database');
        console.log('\n   Then run:');
        console.log(`   psql "postgresql://postgres:[PASSWORD]@db.ukrjudtlvapiajkjbcrd.supabase.co:5432/postgres" -f supabase/migrations/${migrationFile}\n`);
        
        console.log('   Option 3: Create exec_sql function first');
        console.log('   ──────────────────────────────────────────');
        console.log('   Run this SQL in Supabase Dashboard first:');
        console.log(`
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
        console.log('   Then re-run this script.\n');
        
        process.exit(1);
      } else {
        throw apiError;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error('\n💡 Tip: Use Supabase Dashboard SQL Editor for the most reliable method');
    process.exit(1);
  }
}

applyMigration();

