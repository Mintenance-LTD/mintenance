/**
 * Push All SQL Migrations to Supabase
 * This script ensures exec_sql function exists and applies all pending migrations
 * 
 * Usage: npx tsx scripts/push-all-migrations-to-supabase.ts
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local files
function loadEnvFile() {
  const envPaths = [
    join(process.cwd(), 'apps', 'web', '.env.local'),
    join(process.cwd(), 'apps', 'web', '.env'),
    join(process.cwd(), '.env.local'),
    join(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
      
      console.log(`📄 Loaded environment variables from: ${envPath}\n`);
      return;
    }
  }
  
  console.warn('⚠️  No .env.local file found. Using system environment variables.\n');
}

// Load environment variables first (will be called before this code runs)
// But we need to check after loading
let supabaseUrl: string;
let serviceRoleKey: string;
let supabase: ReturnType<typeof createClient>;

function initializeSupabase() {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Expected in: apps/web/.env.local or .env.local');
    process.exit(1);
  }

  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface MigrationResult {
  filename: string;
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * Ensure exec_sql function exists
 */
async function ensureExecSqlFunction(): Promise<boolean> {
  console.log('🔧 Checking for exec_sql function...\n');

  const execSqlFunctionSQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated;
  `;

  try {
    // Try to use exec_sql to see if it exists
    const { error: testError } = await supabase.rpc('exec_sql', { 
      sql: 'SELECT 1;' 
    });

    if (testError && (
      testError.message.includes('function exec_sql') || 
      testError.message.includes('does not exist') ||
      testError.code === '42883'
    )) {
      console.log('📝 exec_sql function not found. Creating it...\n');
      console.log('⚠️  Note: exec_sql function must be created manually in Supabase Dashboard.');
      console.log('   Please run this SQL in Supabase Dashboard > SQL Editor:\n');
      console.log(execSqlFunctionSQL);
      console.log('\n   Or run: npx tsx scripts/create-exec-sql-function.ts\n');
      console.log('   After creating the function, re-run this script.\n');
      return false;
    } else if (testError) {
      // Some other error, but function might exist
      console.log('⚠️  Warning: Could not test exec_sql function:', testError.message);
      console.log('   Proceeding anyway...\n');
    } else {
      console.log('✅ exec_sql function exists!\n');
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking exec_sql function:', error);
    console.error('\n   Please ensure exec_sql function exists in Supabase.');
    console.error('   Run: npx tsx scripts/create-exec-sql-function.ts\n');
    return false;
  }
}

/**
 * Get all migration files sorted by name
 */
function getAllMigrationFiles(): string[] {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => !file.includes('README'))
      .sort();
    
    return files;
  } catch (error) {
    console.error('❌ Error reading migrations directory:', error);
    return [];
  }
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(): Promise<string[]> {
  try {
    // Check if migrations table exists
    const { data: migrations, error } = await supabase
      .from('migrations')
      .select('filename')
      .order('applied_at', { ascending: true });

    if (error) {
      // Table might not exist, return empty array
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    return migrations?.map(m => m.filename) || [];
  } catch (error) {
    console.warn('⚠️  Could not fetch applied migrations:', error);
    return [];
  }
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable(): Promise<void> {
  const createTableSQL = `
CREATE TABLE IF NOT EXISTS public.migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum VARCHAR(64),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_migrations_filename ON public.migrations(filename);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON public.migrations(applied_at);
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (error) {
      console.warn('⚠️  Could not create migrations table:', error.message);
    }
  } catch (error) {
    console.warn('⚠️  Could not create migrations table:', error);
  }
}

/**
 * Apply a single migration
 */
async function applyMigration(filename: string): Promise<MigrationResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Applying: ${filename}`);
    
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const filePath = join(migrationsDir, filename);
    const sql = readFileSync(filePath, 'utf-8');

    // Calculate checksum
    const crypto = require('crypto');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      throw new Error(error.message);
    }

    // Record migration as applied
    const { error: recordError } = await supabase
      .from('migrations')
      .insert({
        filename,
        checksum,
        applied_at: new Date().toISOString(),
      });

    if (recordError) {
      console.warn(`⚠️  Migration applied but failed to record: ${recordError.message}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Success: ${filename} (${duration}ms)\n`);

    return {
      filename,
      success: true,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ Failed: ${filename}`);
    console.error(`   Error: ${errorMessage}\n`);

    // Record failed migration
    try {
      await supabase
        .from('migrations')
        .insert({
          filename,
          error_message: errorMessage,
          applied_at: new Date().toISOString(),
        });
    } catch (recordError) {
      // Ignore recording errors
    }

    return {
      filename,
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Main function to push all migrations
 */
async function pushAllMigrations() {
  console.log('🚀 Pushing All SQL Migrations to Supabase\n');
  console.log(`📡 Supabase URL: ${supabaseUrl}\n`);

  // Step 1: Ensure exec_sql function exists
  const execSqlExists = await ensureExecSqlFunction();
  if (!execSqlExists) {
    console.error('❌ Cannot proceed without exec_sql function');
    process.exit(1);
  }

  // Step 2: Ensure migrations table exists
  await ensureMigrationsTable();

  // Step 3: Get all migrations and applied migrations
  const allMigrations = getAllMigrationFiles();
  const appliedMigrations = await getAppliedMigrations();

  console.log(`📊 Migration Status:`);
  console.log(`   Total migrations: ${allMigrations.length}`);
  console.log(`   Already applied: ${appliedMigrations.length}`);
  console.log(`   Pending: ${allMigrations.length - appliedMigrations.length}\n`);

  if (allMigrations.length === 0) {
    console.log('✅ No migration files found');
    process.exit(0);
  }

  // Step 4: Filter pending migrations
  const pendingMigrations = allMigrations.filter(
    migration => !appliedMigrations.includes(migration)
  );

  if (pendingMigrations.length === 0) {
    console.log('✅ All migrations are already applied!\n');
    process.exit(0);
  }

  console.log(`📋 Applying ${pendingMigrations.length} pending migrations:\n`);

  // Step 5: Apply each migration
  const results: MigrationResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const migration of pendingMigrations) {
    const result = await applyMigration(migration);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      // Optionally stop on first failure
      // break;
    }

    // Small delay between migrations to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Step 6: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📝 Total: ${results.length}\n`);

  if (failureCount > 0) {
    console.log('❌ Failed migrations:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.filename}`);
        console.log(`     Error: ${r.error}\n`);
      });
  }

  if (successCount > 0) {
    console.log('✅ Successfully applied migrations:');
    results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`   - ${r.filename} (${r.duration}ms)`);
      });
    console.log('');
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

// Load environment variables first
loadEnvFile();

// Initialize Supabase client after loading env vars
initializeSupabase();

// Run the script
pushAllMigrations().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

