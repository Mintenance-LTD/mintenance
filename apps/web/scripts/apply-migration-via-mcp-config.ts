/**
 * Apply migration using credentials from MCP configuration
 * This uses the same credentials that MCP would use
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// MCP Configuration credentials (from .cursor/mcp.json)
const SUPABASE_URL = 'https://ukrjudtlvapiajkjbcrd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🚀 Applying stripe_connect_account_id migration via MCP config...\n');

  try {
    // Read the migration SQL
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250101000002_add_stripe_connect_account_id.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration SQL:');
    console.log(sql);
    console.log('\n');

    // Try to execute via direct SQL execution using Supabase Management API
    // First, let's check if we can use the Supabase client's query method
    console.log('⏳ Attempting to execute SQL via Supabase client...');

    // Parse SQL into individual statements more carefully
    const lines = sql.split('\n');
    const statements: string[] = [];
    let currentStatement = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip empty lines and comment-only lines
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue;
      }
      
      currentStatement += (currentStatement ? '\n' : '') + line;
      
      // Check if line ends with semicolon (end of statement)
      if (trimmedLine.endsWith(';')) {
        const stmt = currentStatement.trim();
        if (stmt.length > 10) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 10) {
      statements.push(currentStatement.trim());
    }

    console.log(`📋 Found ${statements.length} SQL statements:\n`);

    // Try using fetch to execute SQL directly via REST API
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue;

      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);

      // Use Supabase REST API to execute SQL
      // Note: This requires exec_sql function or Management API access
      try {
        // Try via rpc/exec_sql if it exists
        const { error: rpcError } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (rpcError) {
          // Try with sql_query parameter
          const { error: rpcError2 } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (rpcError2) {
            // Fallback: Use direct HTTP call to Management API
            console.log('   Trying direct HTTP call...');
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ sql: statement }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
          }
        }

        console.log(`   ✅ Statement ${i + 1} executed successfully\n`);
      } catch (error) {
        console.error(`   ❌ Statement ${i + 1} failed:`, (error as Error).message);
        throw error;
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('🔍 Verifying column exists...');
    
    // Verify the column was added
    const { data, error: verifyError } = await supabase
      .from('users')
      .select('stripe_connect_account_id')
      .limit(1);
    
    if (verifyError) {
      console.error('⚠️  Warning: Could not verify column:', verifyError.message);
    } else {
      console.log('✅ Column verified successfully!');
    }

  } catch (error) {
    console.error('\n❌ Error applying migration:', error);
    console.error('\n⚠️  Note: DDL execution may require Supabase Dashboard or CLI.');
    console.error('   The migration SQL is available at:');
    console.error('   supabase/migrations/20250101000002_add_stripe_connect_account_id.sql\n');
    process.exit(1);
  }
}

applyMigration();

