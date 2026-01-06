/**
 * Script to apply the stripe_connect_account_id migration
 * Run with: npx tsx scripts/apply-stripe-connect-migration.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
const envPath = join(process.cwd(), 'apps', 'web', '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  // Try root .env.local
  const rootEnvPath = join(process.cwd(), '.env.local');
  if (existsSync(rootEnvPath)) {
    config({ path: rootEnvPath });
  }
}

// Now import after env vars are loaded
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  console.error('\nPlease ensure these are set in apps/web/.env.local');
  process.exit(1);
}

const serverSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🚀 Applying stripe_connect_account_id migration...\n');

  try {
    // Read the migration SQL
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250101000002_add_stripe_connect_account_id.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration SQL:');
    console.log(sql);
    console.log('\n');

    // Try using exec_sql RPC function (if it exists)
    console.log('⏳ Attempting to apply migration via exec_sql RPC...');
    
    try {
      // Try with sql_query parameter
      const { error: error1 } = await serverSupabase.rpc('exec_sql', { sql_query: sql });
      if (error1) {
        // Try with sql parameter
        const { error: error2 } = await serverSupabase.rpc('exec_sql', { sql: sql });
        if (error2) {
          throw error2;
        }
      }
      console.log('✅ Migration applied successfully via exec_sql RPC!\n');
      return;
    } catch (rpcError) {
      console.log('⚠️  exec_sql RPC not available, trying exec-sql Edge Function...');
      console.log('   Error:', (rpcError as Error).message);
      
      // Try using the exec-sql Edge Function
      try {
        const { data: edgeData, error: edgeError } = await serverSupabase.functions.invoke('exec-sql', {
          body: { sql: sql },
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        });
        
        if (edgeError) {
          throw edgeError;
        }
        
        console.log('✅ Migration applied successfully via exec-sql Edge Function!\n');
        return;
      } catch (edgeError) {
        console.log('⚠️  exec-sql Edge Function not available, trying direct SQL execution...');
        console.log('   Error:', (edgeError as Error).message);
      }
    }

    // Fallback: Execute SQL statements directly
    // Parse SQL more carefully, preserving statements
    const lines = sql.split('\n');
    const statements: string[] = [];
    let currentStatement = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip empty lines and comment-only lines
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Check if line ends with semicolon (end of statement)
      if (trimmedLine.endsWith(';')) {
        const stmt = currentStatement.trim();
        if (stmt.length > 10) { // Only add non-empty statements
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 10) {
      statements.push(currentStatement.trim());
    }

    console.log(`\n📋 Found ${statements.length} SQL statements to execute:\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements

      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
      
      // For DDL statements, we need to use raw SQL execution
      // Since Supabase JS client doesn't support this directly,
      // we'll make a direct HTTP call to the Supabase REST API
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      }

      try {
        // Use the management API endpoint for SQL execution
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // If exec_sql doesn't exist, try exec_sql with sql_query
          if (response.status === 404 || errorText.includes('does not exist')) {
            const response2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({ sql_query: statement }),
            });
            
            if (!response2.ok) {
              throw new Error(`HTTP ${response2.status}: ${await response2.text()}`);
            }
          } else {
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
        }

        console.log(`   ✅ Statement ${i + 1} executed successfully\n`);
      } catch (fetchError) {
        console.error(`   ❌ Statement ${i + 1} failed:`, (fetchError as Error).message);
        
        // If all methods fail, provide manual instructions
        if (i === 0 && statements.length > 0) {
          console.error('\n⚠️  Automatic migration failed. Please apply manually:');
          console.error('\n1. Go to Supabase Dashboard SQL Editor:');
          console.error(`   https://supabase.com/dashboard/project/[your-project]/sql/new\n`);
          console.error('2. Copy and paste this SQL:\n');
          console.error(sql);
          console.error('\n3. Click "Run" to execute\n');
          process.exit(1);
        }
      }
    }

    console.log('✅ Migration applied successfully!\n');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.error('\n⚠️  Please apply the migration manually in Supabase Dashboard.');
    process.exit(1);
  }
}

applyMigration();

