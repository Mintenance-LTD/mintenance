/**
 * Script to apply SQL migrations to Supabase using the Supabase REST API
 * This script reads migration files and applies them via Supabase API
 * 
 * Usage: npx tsx scripts/apply-migrations-to-supabase.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role (has admin privileges)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Supabase JS client doesn't support raw SQL execution directly
    // We need to use the REST API or a database function
    // For migrations, the best approach is to use Supabase CLI or Dashboard
    
    // Alternative: Use PostgREST REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function applyMigrations() {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  
  // Use the combined migration file
  const migrationFile = '20250228000000_combined_platform_enhancements.sql';

  try {
    const filePath = join(migrationsDir, migrationFile);
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log(`\n📦 Applying migration: ${migrationFile}`);
    console.log(`   SQL length: ${sql.length} characters\n`);
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements

      console.log(`   [${i + 1}/${statements.length}] Executing statement...`);
      
      const result = await executeSQL(statement + ';');
      
      if (result.success) {
        console.log(`   ✓ Statement ${i + 1} executed successfully`);
      } else {
        console.error(`   ✗ Statement ${i + 1} failed: ${result.error}`);
        // Continue with other statements
      }
    }

    console.log('\n✅ Migration application complete!\n');
    
  } catch (error) {
    console.error('Error applying migration:', error);
    console.error('\n⚠️  Note: If exec_sql RPC function does not exist,');
    console.error('   please apply migrations manually using:');
    console.error('   1. Supabase Dashboard SQL Editor');
    console.error('   2. Supabase CLI: supabase db push');
    process.exit(1);
  }
}

applyMigrations();

