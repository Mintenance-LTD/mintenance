/**
 * Apply Contractor Certifications Migration to Supabase
 * Uses Supabase client to execute SQL via RPC or direct connection
 * 
 * Usage: npx tsx scripts/apply-certifications-migration.ts
 * 
 * Requires environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), 'apps', 'web', '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error(`   Checked: ${envPath}`);
  console.error('\n   Please set these in apps/web/.env.local');
  process.exit(1);
}

const serverSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  try {
    console.log('🚀 Applying Contractor Certifications Migration to Supabase...\n');

    // Read the migration file
    const migrationFile = '20250113000002_create_contractor_certifications.sql';
    const filePath = join(process.cwd(), 'supabase', 'migrations', migrationFile);
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log(`📄 Read migration file: ${migrationFile}`);
    console.log(`   SQL length: ${sql.length} characters\n`);

    // Method 1: Try using exec_sql RPC function if it exists
    console.log('⚙️  Attempting to execute via exec_sql RPC...');
    
    try {
      const { data, error } = await serverSupabase.rpc('exec_sql', { sql });

      if (error) {
        throw error;
      }

      console.log('✅ Migration applied successfully via exec_sql RPC!');
      console.log('   Result:', data);
      console.log('\n🎉 Contractor certifications table created!\n');
      process.exit(0);
      
    } catch (rpcError: any) {
      // Try alternative: Use Supabase REST API directly
      console.log('⚠️  exec_sql RPC not available. Trying REST API method...\n');
      
      try {
        // Use Supabase REST API to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ sql }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Migration applied successfully via REST API!');
          console.log('   Result:', result);
          console.log('\n🎉 Contractor certifications table created!\n');
          process.exit(0);
        } else {
          const errorText = await response.text();
          throw new Error(`REST API error: ${response.status} - ${errorText}`);
        }
      } catch (restError: any) {
        // If all methods fail, provide manual instructions
        console.log('\n⚠️  Automated migration application failed.\n');
        console.log('📋 Please apply this migration manually using one of these methods:\n');
        console.log('Method 1: Supabase Dashboard (Recommended)');
        console.log('   a. Go to https://supabase.com/dashboard');
        console.log('   b. Select your project');
        console.log('   c. Navigate to SQL Editor');
        console.log(`   d. Copy the SQL from: supabase/migrations/${migrationFile}`);
        console.log('   e. Paste and click "Run"\n');
        console.log('Method 2: Supabase CLI (if installed)');
        console.log('   supabase db push\n');
        console.log('Method 3: Create exec_sql function first, then re-run this script:');
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
        
        console.log('\n📄 Migration file location:');
        console.log(`   ${filePath}\n`);
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error instanceof Error ? error.message : String(error));
    console.error('\n📋 Alternative: Apply manually via Supabase Dashboard SQL Editor');
    process.exit(1);
  }
}

applyMigration();
